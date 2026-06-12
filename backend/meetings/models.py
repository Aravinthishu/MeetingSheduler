from django.db import models
from django.contrib.auth.models import User


class Team(models.Model):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#378ADD')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class UserTeamMembership(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('lead', 'Team Lead'),
        ('member', 'Member'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='team_memberships')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'team')

    def __str__(self):
        return f"{self.user.username} - {self.team.name} ({self.role})"


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create_meeting', 'Created Meeting'),
        ('delete_meeting', 'Deleted Meeting'),
        ('cancel_meeting', 'Cancelled Meeting'),
        ('start_meeting', 'Started Meeting'),
        ('end_meeting', 'Ended Meeting'),
        ('create_team', 'Created Team'),
        ('add_member', 'Added Member'),
        ('remove_member', 'Removed Member'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action}"


class Room(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.IntegerField(default=10)
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Meeting(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    RECURRENCE_CHOICES = [
        ('none', 'None'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='meetings')
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_meetings')
    conductor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conducted_meetings',
        help_text="The person who will conduct/run this meeting"
    )
    attendees = models.ManyToManyField(User, related_name='attending_meetings', blank=True)

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    recurrence = models.CharField(max_length=10, choices=RECURRENCE_CHOICES, default='none')
    recurrence_end_date = models.DateField(null=True, blank=True)
    parent_meeting = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='recurrences'
    )

    checked_in = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    auto_release_minutes = models.IntegerField(default=15)
    room = models.ForeignKey(
        Room,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='meetings'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.title} — {self.date} {self.start_time}"


class Waitlist(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notified = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']


class MeetingParticipant(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='participants')
    name = models.CharField(max_length=100)
    email = models.EmailField()
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('meeting', 'email')

    def __str__(self):
        return f"{self.name} <{self.email}>"
    