from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, SAFE_METHODS
from django.utils import timezone
from django.contrib.auth.models import User
from datetime import date, datetime, timedelta
from .models import Meeting, Team, Waitlist, MeetingParticipant, Room, UserTeamMembership, ActivityLog
from .serializers import (
    MeetingSerializer, UserTeamMembershipWriteSerializer,
    UserTeamMembershipSerializer, TeamSerializer,
    WaitlistSerializer, UserSerializer, RoomSerializer
)
from .tasks_old import (
    send_booking_confirmation, send_cancellation_email,
    send_reminder_email, notify_waitlist,
    send_meeting_started_email, send_meeting_ended_email,
    send_extension_conflict_email, send_welcome_email,
)


# ── Permission Classes ─────────────────────────────────────────────────────────

class IsAdminOrReadOnly(IsAuthenticated):
    """Authenticated users can read. Only staff can create / update / delete."""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff


class IsTeamMember(IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        team = getattr(obj, 'team', None)
        if not team:
            return False
        return UserTeamMembership.objects.filter(user=request.user, team=team).exists()


class IsTeamMemberOrAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.user.is_staff:
            return True
        return UserTeamMembership.objects.filter(user=request.user).exists()


# ── Activity Log Helper ────────────────────────────────────────────────────────

def log_activity(user, action, description, ip_address=None):
    try:
        ActivityLog.objects.create(
            user=user, action=action,
            description=description, ip_address=ip_address
        )
    except Exception:
        pass


# ── Team ViewSet ───────────────────────────────────────────────────────────────

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAdminOrReadOnly]


# ── Meeting ViewSet ────────────────────────────────────────────────────────────

class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = [IsTeamMemberOrAdmin]

    def get_queryset(self):
        qs = (
            Meeting.objects
            .select_related('team', 'organizer', 'conductor', 'room')
            .prefetch_related('attendees', 'participants')
            .order_by('-date', '-start_time')
        )

        params = self.request.query_params
        if params.get('room'):
            qs = qs.filter(room_id=params['room'])
        if params.get('team'):
            qs = qs.filter(team_id=params['team'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('date'):
            qs = qs.filter(date=params['date'])
        if params.get('start_date'):
            qs = qs.filter(date__gte=params['start_date'])
        if params.get('end_date'):
            qs = qs.filter(date__lte=params['end_date'])
        return qs

    def perform_create(self, serializer):
        participants_input = self.request.data.get('participants_input', [])
        meeting = serializer.save(organizer=self.request.user)
        self._save_participants(meeting, participants_input)
        log_activity(self.request.user, 'create_meeting', f"Created meeting: {meeting.title}")

        print("Before confirmation task")
        result = send_booking_confirmation.delay(meeting.id)
        print("Task queued:", result.id)

        try:
            meeting_dt = datetime.combine(meeting.date, meeting.start_time)
            reminder_time = meeting_dt - timedelta(minutes=5)
            if reminder_time > datetime.now():
                send_reminder_email.apply_async(args=[meeting.id], eta=reminder_time)
            else:
                print(f"Reminder skipped — meeting starts in less than 5 mins or already past")
        except Exception as e:
            print(f"Reminder scheduling failed: {e}")

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
            return Response(
                {'error': 'Only in-progress meetings can be extended.'},
                status=400
            )
        if not meeting.end_time:
            return Response(
                {'error': 'Open-ended meetings cannot be extended.'},
                status=400
            )

        current_end_dt = datetime.combine(meeting.date, meeting.end_time)
        new_end_dt = current_end_dt + timedelta(minutes=extra_minutes)
        new_end_time = new_end_dt.time()

        subsequent = list(
            Meeting.objects
            .filter(
                date=meeting.date,
                status__in=['scheduled', 'in_progress'],
                start_time__gte=meeting.end_time,
            )
            .exclude(id=meeting.id)
            .order_by('start_time')
        )
        if meeting.room:
            subsequent = [m for m in subsequent if m.room_id == meeting.room_id]

        postponed = []
        push_from = new_end_time

        for conflict in subsequent:
            old_start = conflict.start_time
            old_start_dt = datetime.combine(conflict.date, old_start)

            if old_start < push_from:
                if conflict.end_time:
                    old_end_dt = datetime.combine(conflict.date, conflict.end_time)
                    duration = old_end_dt - old_start_dt
                    new_start_dt = datetime.combine(conflict.date, push_from)
                    conflict.start_time = push_from
                    conflict.end_time = (new_start_dt + duration).time()
                    push_from = conflict.end_time
                else:
                    conflict.start_time = push_from
                    push_from = conflict.start_time

                if conflict.status == 'in_progress':
                    conflict.status = 'scheduled'

                conflict.save(update_fields=['start_time', 'end_time', 'status'])
                postponed.append({
                    'id': conflict.id,
                    'title': conflict.title,
                    'new_start': conflict.start_time.strftime('%H:%M'),
                    'new_end': conflict.end_time.strftime('%H:%M') if conflict.end_time else None,
                })

                try:
                    send_extension_conflict_email.delay(
                        meeting.id,
                        conflict.id,
                        extra_minutes,
                        old_start.strftime('%H:%M'),
                    )
                except Exception:
                    pass
            else:
                if conflict.end_time:
                    push_from = conflict.end_time

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
        meetings = Meeting.objects.all()

        total = meetings.count()
        completed = meetings.filter(status='completed').count()
        cancelled = meetings.filter(status='cancelled').count()
        scheduled = meetings.filter(status='scheduled').count()

        by_team = {}
        for team in Team.objects.all():
            tm = meetings.filter(team=team)
            by_team[team.name] = {
                'total': tm.count(),
                'completed': tm.filter(status='completed').count(),
                'cancelled': tm.filter(status='cancelled').count(),
            }

        from django.db.models import Count
        peak = (
            meetings.values('start_time__hour')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
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
# In views.py, replace the quick_book action with this:

    @action(detail=False, methods=['post'])
    def quick_book(self, request):
        duration = int(request.data.get('duration', 30))
        room_id = request.data.get('room') or None
        conductor_id = request.data.get('conductor') or None

        now = timezone.localtime()
        start_time = now.time().replace(second=0, microsecond=0)
        start_dt = datetime.combine(now.date(), start_time)
        end_dt = start_dt + timedelta(minutes=duration)
        end_time = end_dt.time()

        data = {
            'title': request.data.get('title', f'Quick Meeting ({duration}m)'),
            'date': now.date(),
            'start_time': start_time,
            'end_time': end_time,
            'status': 'in_progress',
        }
        if room_id:
            data['room'] = room_id
        if conductor_id:
            data['conductor'] = conductor_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        meeting = serializer.save(organizer=request.user)

        log_activity(request.user, 'create_meeting', f"Quick booked: {meeting.title}")
        try:
            send_booking_confirmation.delay(meeting.id)
        except Exception:
            pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)

# ── Waitlist ViewSet ───────────────────────────────────────────────────────────

class WaitlistViewSet(viewsets.ModelViewSet):
    queryset = Waitlist.objects.all()
    serializer_class = WaitlistSerializer
    permission_classes = [IsTeamMemberOrAdmin]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


# ── User ViewSet ───────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return User.objects.all()
    
    def perform_create(self, serializer):
        # Grab raw password before it gets hashed
        raw_password = self.request.data.get('password', '')
        user = serializer.save()
        try:
            send_welcome_email.delay(user.id, raw_password)
        except Exception as e:
            print(f"Welcome email failed: {e}")

    @action(detail=False, methods=['get'])
    def me(self, request):
        user = request.user
        now = timezone.now()
        upcoming = Meeting.objects.filter(
            date__gte=now.date(),
            status='scheduled'
        ).order_by('date', 'start_time')[:5]
        activity = ActivityLog.objects.filter(user=user).order_by('-timestamp')[:10]
        return Response({
            'user': UserSerializer(user).data,
            'upcoming_meetings': MeetingSerializer(upcoming, many=True).data,
            'stats': {
                'total_meetings': Meeting.objects.count(),
                'completed_meetings': Meeting.objects.filter(status='completed').count(),
                'teams': UserTeamMembership.objects.filter(user=user).count(),
            },
            'recent_activity': [
                {
                    'id': a.id,
                    'action': a.get_action_display(),
                    'description': a.description,
                    'timestamp': a.timestamp,
                }
                for a in activity
            ],
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        meetings = Meeting.objects.all()
        user_teams = Team.objects.all()

        now = timezone.now()
        total_meetings = meetings.count()
        today_meetings = meetings.filter(date=now.date()).count()
        upcoming = meetings.filter(date__gte=now.date(), status='scheduled').count()
        in_progress = meetings.filter(status='in_progress').count()
        completed = meetings.filter(status='completed').count()
        cancelled = meetings.filter(status='cancelled').count()

        rooms_data = []
        for room in Room.objects.filter(is_active=True):
            current = room.meetings.filter(date=now.date(), status='in_progress').first()
            next_m = room.meetings.filter(
                date=now.date(), status='scheduled',
                start_time__gte=now.time()
            ).order_by('start_time').first()
            rooms_data.append({
                'id': room.id,
                'name': room.name,
                'capacity': room.capacity,
                'status': 'occupied' if current else 'available',
                'current_meeting': MeetingSerializer(current).data if current else None,
                'next_meeting': MeetingSerializer(next_m).data if next_m else None,
            })

        # TODAY — in_progress + scheduled for today only
        today_schedule = meetings.filter(
            date=now.date()
        ).order_by('start_time')

        # UPCOMING — scheduled meetings from today onwards (next 7 days)
        # This is what feeds the "Upcoming" stat and the upcoming tab
        upcoming_schedule = meetings.filter(
            date__gte=now.date(),
            status='scheduled'
        ).order_by('date', 'start_time')

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
                meetings.filter(date=now.date()).order_by('-start_time'),
                many=True
            ).data,
            'upcoming_schedule': MeetingSerializer(upcoming_schedule[:10], many=True).data,
        })


# ── Room ViewSet ───────────────────────────────────────────────────────────────

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAdminOrReadOnly]


# ── Team Membership ViewSet ────────────────────────────────────────────────────

class TeamMembershipViewSet(viewsets.ModelViewSet):
    queryset = UserTeamMembership.objects.select_related('user', 'team').all()
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserTeamMembershipWriteSerializer
        return UserTeamMembershipSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs