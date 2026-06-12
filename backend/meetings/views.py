from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from django.contrib.auth.models import User
from datetime import date, datetime, timedelta
from .models import Meeting, Team, Waitlist, MeetingParticipant, Room, UserTeamMembership, ActivityLog
from .serializers import MeetingSerializer, UserTeamMembershipWriteSerializer, UserTeamMembershipSerializer, TeamSerializer, WaitlistSerializer, UserSerializer, RoomSerializer
from .tasks import (
    send_booking_confirmation, send_cancellation_email,
    send_reminder_email, notify_waitlist,
    send_meeting_started_email, send_meeting_ended_email,
    send_extension_conflict_email,
)


# Custom Permissions
class IsTeamMember(IsAuthenticated):
    """Check if user is a member of the team"""
    def has_object_permission(self, request, view, obj):
        team = getattr(obj, 'team', None)
        if not team:
            return False
        return UserTeamMembership.objects.filter(user=request.user, team=team).exists()


class IsTeamMemberOrAdmin(IsAuthenticated):
    """Allow team members or admin"""
    def has_permission(self, request, view):
        if request.user.is_staff:
            return True
        return UserTeamMembership.objects.filter(user=request.user).exists()


def log_activity(user, action, description, ip_address=None):
    """Helper to log user activity"""
    try:
        ActivityLog.objects.create(user=user, action=action, description=description, ip_address=ip_address)
    except Exception:
        pass


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = [IsTeamMemberOrAdmin]

    def get_queryset(self):
        qs = Meeting.objects.select_related('team', 'organizer', 'conductor').prefetch_related('attendees', 'participants').order_by('-date', '-start_time')
        
        # Filter by team for non-admin users
        if not self.request.user.is_staff:
            user_teams = UserTeamMembership.objects.filter(user=self.request.user).values_list('team_id', flat=True)
            qs = qs.filter(team_id__in=user_teams)
        
        team = self.request.query_params.get('team')
        status_filter = self.request.query_params.get('status')
        date_filter = self.request.query_params.get('date')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        room = self.request.query_params.get('room')
        
        if room:
            qs = qs.filter(room_id=room)
        if team:
            qs = qs.filter(team_id=team)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if date_filter:
            qs = qs.filter(date=date_filter)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        return qs

    def perform_create(self, serializer):
        participants_input = self.request.data.get('participants_input', [])
        meeting = serializer.save(organizer=self.request.user)
        self._save_participants(meeting, participants_input)
        log_activity(self.request.user, 'create_meeting', f"Created meeting: {meeting.title}")
        try:
            send_booking_confirmation.delay(meeting.id)
            meeting_dt = datetime.combine(meeting.date, meeting.start_time)
            reminder_time = meeting_dt - timedelta(minutes=15)
            if reminder_time > datetime.now():
                send_reminder_email.apply_async(args=[meeting.id], eta=reminder_time)
        except Exception:
            pass
        if meeting.recurrence != 'none':
            self._create_recurrences(meeting)

    def perform_destroy(self, instance):
        log_activity(self.request.user, 'delete_meeting', f"Deleted meeting: {instance.title}")
        instance.delete()

    def _save_participants(self, meeting, participants_input):
        for p in participants_input:
            name = p.get('name', '').strip()
            email = p.get('email', '').strip()
            user_id = p.get('user_id')
            if not name or not email:
                continue
            user = None
            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    pass
            MeetingParticipant.objects.update_or_create(
                meeting=meeting, email=email,
                defaults={'name': name, 'user': user}
            )

    def _create_recurrences(self, parent):
        delta = timedelta(days=1 if parent.recurrence == 'daily' else 7)
        current_date = parent.date + delta
        end = parent.recurrence_end_date or (parent.date + timedelta(weeks=4))
        while current_date <= end:
            Meeting.objects.create(
                title=parent.title, description=parent.description,
                team=parent.team, organizer=parent.organizer,
                conductor=parent.conductor, date=current_date,
                start_time=parent.start_time, end_time=parent.end_time,
                recurrence=parent.recurrence, parent_meeting=parent,
            )
            current_date += delta

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        meeting = self.get_object()
        extra_minutes = int(request.data.get('minutes', 30))

        if meeting.status != 'in_progress':
            return Response({'error': 'Only in-progress meetings can be extended.'}, status=400)
        if not meeting.end_time:
            return Response({'error': 'Open-ended meetings cannot be extended.'}, status=400)

        from datetime import datetime, timedelta
        current_end_dt = datetime.combine(meeting.date, meeting.end_time)
        new_end_dt = current_end_dt + timedelta(minutes=extra_minutes)
        new_end_time = new_end_dt.time()

        # Find conflicts — meetings that start before the new end time but after current end
        conflicts = Meeting.objects.filter(
            date=meeting.date,
            status__in=['scheduled', 'in_progress'],
            start_time__lt=new_end_time,
            start_time__gte=meeting.end_time,
        ).exclude(id=meeting.id)

        if meeting.room:
            conflicts = conflicts.filter(room=meeting.room)

        postponed = []
        for conflict in conflicts:
            old_start = conflict.start_time
            # Shift start_time to new_end_time
            conflict.start_time = new_end_time
            # If end_time exists, shift it by same delta to preserve duration
            if conflict.end_time:
                old_end_dt = datetime.combine(conflict.date, conflict.end_time)
                old_start_dt = datetime.combine(conflict.date, old_start)
                duration = old_end_dt - old_start_dt
                conflict.end_time = (datetime.combine(conflict.date, new_end_time) + duration).time()
            # If it was in_progress, revert to scheduled since it hasn't actually started yet
            if conflict.status == 'in_progress':
                conflict.status = 'scheduled'
            conflict.save(update_fields=['start_time', 'end_time', 'status'])
            postponed.append(conflict.id)
            try:
                send_extension_conflict_email.delay(meeting.id, conflict.id, extra_minutes, old_start.strftime('%H:%M'))
            except Exception:
                pass

        meeting.end_time = new_end_time
        meeting.save(update_fields=['end_time'])

        return Response({
            'status': 'extended',
            'new_end_time': new_end_time.strftime('%H:%M'),
            'postponed': postponed,
        })

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        meeting = self.get_object()
        meeting.status = 'in_progress'
        meeting.save()
        log_activity(request.user, 'start_meeting', f"Started meeting: {meeting.title}")
        try:
            send_meeting_started_email.delay(meeting.id)
        except Exception:
            pass
        return Response({'status': 'started'})

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        meeting = self.get_object()
        meeting.status = 'completed'
        meeting.end_time = timezone.now().time()
        meeting.save()
        log_activity(request.user, 'end_meeting', f"Ended meeting: {meeting.title}")
        try:
            send_meeting_ended_email.delay(meeting.id)
            notify_waitlist.delay()
        except Exception:
            pass
        return Response({'status': 'ended'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        meeting = self.get_object()
        meeting.status = 'cancelled'
        meeting.save()
        log_activity(request.user, 'cancel_meeting', f"Cancelled meeting: {meeting.title}")
        try:
            send_cancellation_email.delay(meeting.id)
            notify_waitlist.delay()
        except Exception:
            pass
        return Response({'status': 'cancelled'})

    @action(detail=True, methods=['post'])
    def checkin(self, request, pk=None):
        meeting = self.get_object()
        meeting.checked_in = True
        meeting.checked_in_at = timezone.now()
        meeting.save()
        return Response({'status': 'checked_in'})

    @action(detail=False, methods=['get'])
    def room_status(self, request):
        rooms = Room.objects.filter(is_active=True)
        return Response(RoomSerializer(rooms, many=True).data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Comprehensive analytics endpoint"""
        if not self.request.user.is_staff:
            user_teams = UserTeamMembership.objects.filter(user=request.user).values_list('team_id', flat=True)
            meetings = Meeting.objects.filter(team_id__in=user_teams)
        else:
            meetings = Meeting.objects.all()

        total = meetings.count()
        completed = meetings.filter(status='completed').count()
        cancelled = meetings.filter(status='cancelled').count()
        scheduled = meetings.filter(status='scheduled').count()

        by_team = {}
        for team in Team.objects.all():
            team_meetings = meetings.filter(team=team)
            by_team[team.name] = {
                'total': team_meetings.count(),
                'completed': team_meetings.filter(status='completed').count(),
                'cancelled': team_meetings.filter(status='cancelled').count(),
            }

        from django.db.models import Count, Q, Avg, F
        from django.db.models.functions import TruncHour

        peak = (
            meetings.values('start_time__hour')
            .annotate(count=Count('id')).order_by('-count')[:5]
        )

        return Response({
            'total_meetings': total,
            'completed': completed,
            'cancelled': cancelled,
            'scheduled': scheduled,
            'by_team': by_team,
            'peak_hours': list(peak),
        })

    @action(detail=False, methods=['post'])
    def quick_book(self, request):
        duration = int(request.data.get('duration', 30))
        now = timezone.now()
        start = now.time().replace(second=0, microsecond=0)
        from datetime import timedelta
        start_dt = datetime.combine(now.date(), start)
        end_dt = start_dt + timedelta(minutes=duration)
        data = {
            'title': request.data.get('title', 'Quick Meeting'),
            'team': request.data.get('team'),
            'date': now.date(),
            'start_time': start,
            'end_time': end_dt.time(),
            'status': 'in_progress',
            'conductor': request.data.get('conductor'),
        }
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WaitlistViewSet(viewsets.ModelViewSet):
    queryset = Waitlist.objects.all()
    serializer_class = WaitlistSerializer

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class UserViewSet(viewsets.ModelViewSet):          # ✅ was ReadOnlyModelViewSet
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
 
    def get_queryset(self):
        if self.request.user.is_staff:
            return User.objects.all()
        user_teams = UserTeamMembership.objects.filter(user=self.request.user).values_list('team_id', flat=True)
        return User.objects.filter(team_memberships__team_id__in=user_teams).distinct()
 
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user dashboard data"""
        user = request.user
        user_teams = UserTeamMembership.objects.filter(user=user).values_list('team_id', flat=True)
        
        # Get upcoming meetings
        now = timezone.now()
        upcoming = Meeting.objects.filter(
            team_id__in=user_teams,
            date__gte=now.date(),
            status='scheduled'
        ).order_by('date', 'start_time')[:5]

        # Get recent activity
        activity = ActivityLog.objects.filter(user=user).order_by('-timestamp')[:10]

        return Response({
            'user': UserSerializer(user).data,
            'upcoming_meetings': MeetingSerializer(upcoming, many=True).data,
            'stats': {
                'total_meetings': Meeting.objects.filter(team_id__in=user_teams).count(),
                'completed_meetings': Meeting.objects.filter(team_id__in=user_teams, status='completed').count(),
                'teams': UserTeamMembership.objects.filter(user=user).count(),
            },
            'recent_activity': [
                {
                    'id': a.id,
                    'action': a.get_action_display(),
                    'description': a.description,
                    'timestamp': a.timestamp
                } for a in activity
            ]
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard with stats and overview"""
        user = request.user
        if user.is_staff:
            user_teams = Team.objects.all()
            meetings = Meeting.objects.all()
        else:
            user_teams_ids = UserTeamMembership.objects.filter(user=user).values_list('team_id', flat=True)
            user_teams = Team.objects.filter(id__in=user_teams_ids)
            meetings = Meeting.objects.filter(team_id__in=user_teams_ids)

        now = timezone.now()

        # Stats
        total_meetings = meetings.count()
        today_meetings = meetings.filter(date=now.date()).count()
        upcoming = meetings.filter(date__gte=now.date(), status='scheduled').count()
        in_progress = meetings.filter(status='in_progress').count()
        completed = meetings.filter(status='completed').count()
        cancelled = meetings.filter(status='cancelled').count()

        # Room status
        rooms_data = []
        for room in Room.objects.filter(is_active=True):
            current = room.meetings.filter(date=now.date(), status='in_progress').first()
            next_m = room.meetings.filter(date=now.date(), status='scheduled', start_time__gte=now.time()).order_by('start_time').first()
            rooms_data.append({
                'id': room.id,
                'name': room.name,
                'capacity': room.capacity,
                'status': 'occupied' if current else 'available',
                'current_meeting': MeetingSerializer(current).data if current else None,
                'next_meeting': MeetingSerializer(next_m).data if next_m else None,
            })

        return Response({
            'stats': {
                'total_meetings': total_meetings,
                'today_meetings': today_meetings,
                'upcoming': upcoming,
                'in_progress': in_progress,
                'completed': completed,
                'cancelled': cancelled,
            },
            'teams': TeamSerializer(user_teams, many=True).data,
            'rooms': rooms_data,
            'today_schedule': MeetingSerializer(
                meetings.filter(date=now.date()).order_by('start_time'),
                many=True
            ).data,
        })

from .models import Meeting, Team, Waitlist, MeetingParticipant, Room
from .serializers import MeetingSerializer, TeamSerializer, WaitlistSerializer, UserSerializer, RoomSerializer


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
    
class TeamMembershipViewSet(viewsets.ModelViewSet):
    queryset = UserTeamMembership.objects.select_related('user', 'team').all()
    permission_classes = [permissions.IsAdminUser]
 
    def get_serializer_class(self):
        # Write actions need user+team fields; reads can use the nested serializer
        if self.action in ['create', 'update', 'partial_update']:
            return UserTeamMembershipWriteSerializer   # ✅ has 'user' field
        return UserTeamMembershipSerializer            # nested team detail for reads
 
    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs