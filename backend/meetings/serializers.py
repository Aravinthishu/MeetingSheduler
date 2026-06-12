from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Meeting, Team, Waitlist, MeetingParticipant, UserTeamMembership, ActivityLog
from datetime import datetime


class TeamSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'color', 'created_at', 'member_count']

    def get_member_count(self, obj):
        return obj.members.count()

class UserTeamMembershipWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTeamMembership
        fields = ['id', 'user', 'team', 'role', 'joined_at']

class UserTeamMembershipSerializer(serializers.ModelSerializer):
    team = TeamSerializer(read_only=True)

    class Meta:
        model = UserTeamMembership
        fields = ['id', 'team', 'role', 'joined_at']


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    team = serializers.SerializerMethodField()
    teams = UserTeamMembershipSerializer(source='team_memberships', many=True, read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'is_staff', 'password', 'team', 'teams', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_team(self, obj):
        # Return primary team (first team membership)
        membership = obj.team_memberships.first()
        if membership:
            return {
                'id': membership.team.id,
                'name': membership.team.name,
                'role': membership.role
            }
        return None

    def get_role(self, obj):
        if obj.is_staff:
            return 'admin'
        membership = obj.team_memberships.first()
        return membership.role if membership else 'member'

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class MeetingParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingParticipant
        fields = ['id', 'name', 'email', 'user']


# class MeetingSerializer(serializers.ModelSerializer):
#     team_detail = TeamSerializer(source='team', read_only=True)
#     organizer_detail = UserSerializer(source='organizer', read_only=True)
#     conductor_detail = UserSerializer(source='conductor', read_only=True)
#     attendees_detail = UserSerializer(source='attendees', many=True, read_only=True)
#     participants = MeetingParticipantSerializer(many=True, read_only=True)
#     is_open_ended = serializers.SerializerMethodField()

#     organizer = serializers.PrimaryKeyRelatedField(read_only=True)
#     conductor = serializers.PrimaryKeyRelatedField(
#         queryset=User.objects.all(), required=False, allow_null=True,
#     )
#     # Write-only participants input
#     participants_input = serializers.ListField(
#         child=serializers.DictField(), write_only=True, required=False
#     )

#     class Meta:
#         model = Meeting
#         fields = '__all__'

#     def get_is_open_ended(self, obj):
#         return obj.end_time is None

#     def validate(self, data):
#         data.pop('participants_input', None)  # handled in view
#         date = data.get('date')
#         start_time = data.get('start_time')
#         end_time = data.get('end_time')
#         instance_id = self.instance.id if self.instance else None

#         if end_time and end_time <= start_time:
#             raise serializers.ValidationError("End time must be after start time.")

#         conflicts = Meeting.objects.filter(
#             date=date, status__in=['scheduled', 'in_progress']
#         ).exclude(id=instance_id)

#         for meeting in conflicts:
#             m_start = meeting.start_time
#             m_end = meeting.end_time
#             if m_end is None or end_time is None:
#                 if start_time >= m_start or (m_end is None and start_time <= m_start):
#                     raise serializers.ValidationError(
#                         f"Conflict with '{meeting.title}' at {m_start.strftime('%H:%M')}."
#                     )
#             elif not (end_time <= m_start or start_time >= m_end):
#                 raise serializers.ValidationError(
#                     f"Time conflict with '{meeting.title}' ({m_start.strftime('%H:%M')}–{m_end.strftime('%H:%M')})"
#                 )
#         return data


class WaitlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Waitlist
        fields = '__all__'

from .models import Meeting, Team, Waitlist, MeetingParticipant, Room


class RoomSerializer(serializers.ModelSerializer):
    current_meeting = serializers.SerializerMethodField()
    next_meeting = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ['id', 'name', 'capacity', 'location', 'description', 'is_active', 'current_meeting', 'next_meeting']

    def get_current_meeting(self, obj):
        from django.utils import timezone
        now_local = timezone.localtime()
        m = obj.meetings.filter(date=now_local.date(), status='in_progress').first()
        if m:
            return {'id': m.id, 'title': m.title, 'end_time': m.end_time.strftime('%H:%M') if m.end_time else None}
        return None

    def get_next_meeting(self, obj):
        from django.utils import timezone
        now_local = timezone.localtime()
        m = obj.meetings.filter(
            date=now_local.date(),
            status='scheduled',
            start_time__gte=now_local.time()
        ).order_by('start_time').first()
        if m:
            return {'id': m.id, 'title': m.title, 'start_time': m.start_time.strftime('%H:%M')}
        return None


class MeetingSerializer(serializers.ModelSerializer):
    team_detail = TeamSerializer(source='team', read_only=True)
    organizer_detail = UserSerializer(source='organizer', read_only=True)
    conductor_detail = UserSerializer(source='conductor', read_only=True)
    attendees_detail = UserSerializer(source='attendees', many=True, read_only=True)
    participants = MeetingParticipantSerializer(many=True, read_only=True)
    room_detail = RoomSerializer(source='room', read_only=True)
    is_open_ended = serializers.SerializerMethodField()

    organizer = serializers.PrimaryKeyRelatedField(read_only=True)
    conductor = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True,
    )
    room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.filter(is_active=True),
        required=False, allow_null=True,
    )
    participants_input = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )

    class Meta:
        model = Meeting
        fields = '__all__'

    def get_is_open_ended(self, obj):
        return obj.end_time is None

    def validate(self, data):
        data.pop('participants_input', None)
        date = data.get('date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        room = data.get('room')
        instance_id = self.instance.id if self.instance else None

        if end_time and end_time <= start_time:
            raise serializers.ValidationError("End time must be after start time.")

        # Conflict detection scoped to room
        conflicts = Meeting.objects.filter(
            date=date,
            status__in=['scheduled', 'in_progress']
        ).exclude(id=instance_id)

        if room:
            conflicts = conflicts.filter(room=room)

        for meeting in conflicts:
            m_start = meeting.start_time
            m_end = meeting.end_time
            if m_end is None or end_time is None:
                if start_time >= m_start or (m_end is None and start_time <= m_start):
                    raise serializers.ValidationError(
                        f"Conflict with '{meeting.title}' at {m_start.strftime('%H:%M')} in this room."
                    )
            elif not (end_time <= m_start or start_time >= m_end):
                raise serializers.ValidationError(
                    f"Time conflict with '{meeting.title}' ({m_start.strftime('%H:%M')}–{m_end.strftime('%H:%M')}) in this room."
                )
        return data