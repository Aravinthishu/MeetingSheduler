from django.contrib import admin
from .models import (
    Team,
    UserTeamMembership,
    ActivityLog,
    Room,
    Meeting,
    Waitlist,
    MeetingParticipant,
)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "color", "created_at")
    search_fields = ("name",)
    list_filter = ("created_at",)


@admin.register(UserTeamMembership)
class UserTeamMembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "team", "role", "joined_at")
    list_filter = ("role", "team", "joined_at")
    search_fields = ("user__username", "user__email", "team__name")


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "action", "timestamp", "ip_address")
    list_filter = ("action", "timestamp")
    search_fields = (
        "user__username",
        "description",
        "ip_address",
    )
    readonly_fields = ("timestamp",)
    date_hierarchy = "timestamp"


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "capacity",
        "location",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "location")


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "team",
        "organizer",
        "conductor",
        "room",
        "date",
        "start_time",
        "end_time",
        "status",
        "recurrence",
    )
    list_filter = (
        "status",
        "recurrence",
        "date",
        "team",
        "room",
    )
    search_fields = (
        "title",
        "description",
        "organizer__username",
        "conductor__username",
        "team__name",
    )
    filter_horizontal = ("attendees",)
    date_hierarchy = "date"


@admin.register(Waitlist)
class WaitlistAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "team",
        "organizer",
        "date",
        "start_time",
        "end_time",
        "notified",
        "created_at",
    )
    list_filter = ("notified", "date", "team")
    search_fields = (
        "title",
        "team__name",
        "organizer__username",
    )


@admin.register(MeetingParticipant)
class MeetingParticipantAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "meeting",
        "name",
        "email",
        "user",
    )
    search_fields = (
        "name",
        "email",
        "meeting__title",
        "user__username",
    )
    list_filter = ("meeting",)