from celery import shared_task
from django.core.mail import EmailMultiAlternatives, send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import Meeting, Waitlist

FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')


def _meeting_url(meeting):
    return f"{FRONTEND_URL}/meetings/{meeting.id}"


def _send_to_organizer(meeting, subject, plain_body, template_name):
    recipient = None
    name = None

    if meeting.conductor and meeting.conductor.email:
        recipient = meeting.conductor.email
        name = meeting.conductor.get_full_name() or meeting.conductor.username
    elif meeting.organizer and meeting.organizer.email:
        recipient = meeting.organizer.email
        name = meeting.organizer.get_full_name() or meeting.organizer.username

    if not recipient:
        print(f"[EMAIL] No recipient for meeting {meeting.id}, skipping.")
        return

    full_plain_body = f"Hi {name},\n\n{plain_body}\n\nMeetEZ"
    context = {
        'meeting': meeting,
        'recipient_name': name,
        'meeting_url': _meeting_url(meeting),
        'app_url': FRONTEND_URL,
    }

    try:
        html_body = render_to_string(template_name, context)
    except Exception as e:
        print(f"[EMAIL] Template error for {template_name}: {e}")
        # Fall back to plain text if template is missing
        html_body = f"<p>{full_plain_body.replace(chr(10), '<br>')}</p>"

    email = EmailMultiAlternatives(
        subject=subject,
        body=full_plain_body,
        from_email=settings.EMAIL_HOST_USER,
        to=[recipient],
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)


def _meeting_summary(meeting):
    team_name = meeting.team.name if meeting.team else 'N/A'
    time_str = meeting.start_time.strftime('%H:%M')
    if meeting.end_time:
        time_str += f' – {meeting.end_time.strftime("%H:%M")}'
    return (
        f"Title : {meeting.title}\n"
        f"Team  : {team_name}\n"
        f"Date  : {meeting.date.strftime('%A, %d %B %Y')}\n"
        f"Time  : {time_str}\n"
    )


# ── Booking / confirmation ────────────────────────────────────────────────────

@shared_task
def send_booking_confirmation(meeting_id):
    try:
        print(f"[TASK] send_booking_confirmation: meeting_id={meeting_id}")
        meeting = Meeting.objects.select_related(
            'team', 'organizer', 'conductor'
        ).get(id=meeting_id)
        _send_to_organizer(
            meeting,
            f"[MeetEZ] Booking Confirmed: {meeting.title}",
            f"Your meeting has been booked.\n\n{_meeting_summary(meeting)}",
            'emails/booking_confirmation.html',
        )
        print(f"[TASK] Confirmation sent for meeting {meeting_id}")
    except Exception as e:
        print(f"[TASK] send_booking_confirmation ERROR: {e}")


@shared_task
def send_welcome_email(user_id, password):
    try:
        from django.contrib.auth.models import User
        user = User.objects.get(id=user_id)
        if not user.email:
            return

        name = user.get_full_name() or user.username
        subject = "[MeetEZ] Welcome to MeetEZ"
        plain_body = (
            f"Hi {name},\n\n"
            f"Your account has been created.\n\n"
            f"Username : {user.username}\n"
            f"Password : {password}\n\n"
            f"Login at: {FRONTEND_URL}/login\n\nMeetEZ"
        )

        try:
            html_body = render_to_string('emails/welcome.html', {
                'name': name,
                'username': user.username,
                'password': password,
                'app_url': FRONTEND_URL,
                'login_url': f"{FRONTEND_URL}/login",
            })
        except Exception as e:
            print(f"[EMAIL] Welcome template error: {e}")
            html_body = f"<p>{plain_body.replace(chr(10), '<br>')}</p>"

        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_body,
            from_email=settings.EMAIL_HOST_USER,
            to=[user.email],
        )
        email.attach_alternative(html_body, "text/html")
        email.send(fail_silently=False)
        print(f"[TASK] Welcome email sent to {user.email}")
    except Exception as e:
        print(f"[TASK] send_welcome_email ERROR: {e}")

@shared_task
def send_reminder_email(meeting_id):
    try:
        meeting = Meeting.objects.select_related(
            'team', 'organizer', 'conductor'
        ).get(id=meeting_id)
        if meeting.status != 'scheduled':
            return
        _send_to_organizer(
            meeting,
            f"[MeetEZ] Reminder: {meeting.title} starts in 15 minutes",
            f"Your meeting starts in 15 minutes.\n\n{_meeting_summary(meeting)}",
            'emails/reminder.html',
        )
    except Exception as e:
        print(f"[TASK] send_reminder_email ERROR: {e}")


@shared_task
def send_cancellation_email(meeting_id):
    try:
        meeting = Meeting.objects.select_related(
            'team', 'organizer', 'conductor'
        ).get(id=meeting_id)
        _send_to_organizer(
            meeting,
            f"[MeetEZ] Cancelled: {meeting.title}",
            f"Your meeting has been cancelled.\n\n{_meeting_summary(meeting)}",
            'emails/cancellation.html',
        )
    except Exception as e:
        print(f"[TASK] send_cancellation_email ERROR: {e}")


@shared_task
def send_meeting_started_email(meeting_id):
    try:
        meeting = Meeting.objects.select_related(
            'team', 'organizer', 'conductor'
        ).get(id=meeting_id)
        _send_to_organizer(
            meeting,
            f"[MeetEZ] Started: {meeting.title}",
            f"Your meeting has started.\n\n{_meeting_summary(meeting)}",
            'emails/meeting_started.html',
        )
        print(f"[TASK] Started email sent for meeting {meeting_id}")
    except Exception as e:
        print(f"[TASK] send_meeting_started_email ERROR: {e}")


@shared_task
def send_meeting_ended_email(meeting_id):
    try:
        meeting = Meeting.objects.select_related(
            'team', 'organizer', 'conductor'
        ).get(id=meeting_id)
        _send_to_organizer(
            meeting,
            f"[MeetEZ] Ended: {meeting.title}",
            f"Your meeting has ended. The room is now free.\n\n{_meeting_summary(meeting)}",
            'emails/meeting_ended.html',
        )
        print(f"[TASK] Ended email sent for meeting {meeting_id}")
    except Exception as e:
        print(f"[TASK] send_meeting_ended_email ERROR: {e}")


@shared_task
def notify_waitlist():
    try:
        from datetime import date
        waitlist = Waitlist.objects.filter(date=date.today(), notified=False).first()
        if not waitlist:
            return
        if not waitlist.organizer.email:
            return

        name = waitlist.organizer.get_full_name() or waitlist.organizer.username
        plain_body = (
            f"Hi {name},\n\n"
            f"The room is now available. Your waitlisted meeting '{waitlist.title}' can now be booked.\n\nMeetEZ"
        )
        try:
            html_body = render_to_string('emails/waitlist_notify.html', {
                'waitlist': waitlist,
                'app_url': FRONTEND_URL,
            })
        except Exception:
            html_body = f"<p>{plain_body.replace(chr(10), '<br>')}</p>"

        email = EmailMultiAlternatives(
            subject="[MeetEZ] Meeting Room is now available!",
            body=plain_body,
            from_email=settings.EMAIL_HOST_USER,
            to=[waitlist.organizer.email],
        )
        email.attach_alternative(html_body, "text/html")
        email.send(fail_silently=True)
        waitlist.notified = True
        waitlist.save()
    except Exception as e:
        print(f"[TASK] notify_waitlist ERROR: {e}")


@shared_task
def send_extension_conflict_email(extending_meeting_id, conflict_meeting_id, extra_minutes, old_start_str):
    try:
        extending = Meeting.objects.select_related('team', 'organizer', 'conductor').get(id=extending_meeting_id)
        conflict = Meeting.objects.select_related('team', 'organizer', 'conductor').get(id=conflict_meeting_id)

        if conflict.conductor and conflict.conductor.email:
            recipient = conflict.conductor.email
            name = conflict.conductor.get_full_name() or conflict.conductor.username
        elif conflict.organizer.email:
            recipient = conflict.organizer.email
            name = conflict.organizer.get_full_name() or conflict.organizer.username
        else:
            return

        extended_by = (
            extending.conductor.get_full_name() if extending.conductor
            else extending.organizer.get_full_name() or extending.organizer.username
        )

        body = (
            f"Hi {name},\n\n"
            f"The meeting '{extending.title}' has been extended by {extra_minutes} minutes.\n\n"
            f"Your meeting '{conflict.title}' has been postponed:\n"
            f"  Original start : {old_start_str}\n"
            f"  New start      : {conflict.start_time.strftime('%H:%M')}\n"
            f"  New end        : {conflict.end_time.strftime('%H:%M') if conflict.end_time else 'Open-ended'}\n\n"
            f"Extended by: {extended_by}\n\nMeetEZ"
        )

        send_mail(
            f"[MeetEZ] Your meeting '{conflict.title}' has been postponed",
            body,
            settings.EMAIL_HOST_USER,
            [recipient],
            fail_silently=True,
        )
    except Exception as e:
        print(f"[TASK] send_extension_conflict_email ERROR: {e}")


# ── Auto transition tasks ─────────────────────────────────────────────────────

@shared_task
def auto_start_meetings():
    """
    Run every minute via Celery Beat.
    Finds all 'scheduled' meetings whose start_time has passed and marks
    them 'in_progress', then emails the organizer.
    Uses only time comparisons — no naive/aware mixing.
    """
    from django.utils import timezone

    now_local = timezone.localtime(timezone.now())
    today = now_local.date()
    now_time = now_local.time().replace(second=0, microsecond=0)

    print(f"[auto_start] Running at {now_time} on {today}")

    meetings = Meeting.objects.filter(
        date=today,
        status='scheduled',
        start_time__lte=now_time,   # start_time has passed or is now
    ).select_related('team', 'organizer', 'conductor')

    count = meetings.count()
    print(f"[auto_start] Found {count} meetings to start")

    for meeting in meetings:
        print(f"[auto_start] Starting: '{meeting.title}' (id={meeting.id}, start={meeting.start_time})")
        meeting.status = 'in_progress'
        meeting.save(update_fields=['status', 'updated_at'])

        # Send email directly (inline) — avoids delay() issues in solo worker
        try:
            send_meeting_started_email(meeting.id)
        except Exception as e:
            print(f"[auto_start] Email error for meeting {meeting.id}: {e}")


@shared_task
def auto_complete_meetings():
    """
    Run every minute via Celery Beat.
    Finds all 'in_progress' meetings whose end_time has passed and marks
    them 'completed', then emails the organizer.
    """
    from django.utils import timezone

    now_local = timezone.localtime(timezone.now())
    today = now_local.date()
    now_time = now_local.time().replace(second=0, microsecond=0)

    print(f"[auto_complete] Running at {now_time} on {today}")

    meetings = Meeting.objects.filter(
        date=today,
        status='in_progress',
        end_time__isnull=False,
        end_time__lte=now_time,     # end_time has passed
    ).select_related('team', 'organizer', 'conductor')

    count = meetings.count()
    print(f"[auto_complete] Found {count} meetings to complete")

    for meeting in meetings:
        print(f"[auto_complete] Completing: '{meeting.title}' (id={meeting.id}, end={meeting.end_time})")
        meeting.status = 'completed'
        meeting.save(update_fields=['status', 'updated_at'])

        try:
            send_meeting_ended_email(meeting.id)
        except Exception as e:
            print(f"[auto_complete] Email error for meeting {meeting.id}: {e}")

        try:
            notify_waitlist()
        except Exception as e:
            print(f"[auto_complete] Waitlist notify error: {e}")


@shared_task
def auto_release_no_shows():
    """
    Run every minute via Celery Beat.
    Cancels meetings that started but nobody checked in within auto_release_minutes.
    Only acts on 'scheduled' meetings (not yet started by auto_start).
    Runs AFTER auto_start_meetings in the beat schedule so there's no race.
    """
    from django.utils import timezone
    from datetime import timedelta

    now_local = timezone.localtime(timezone.now())
    today = now_local.date()
    now_time = now_local.time()

    print(f"[auto_release] Running at {now_time} on {today}")

    # Only check meetings that are still 'scheduled' — auto_start already
    # moved meetings to 'in_progress', so this only catches true no-shows
    # where auto_start hasn't fired yet (edge case) or check-in is required.
    meetings = Meeting.objects.filter(
        date=today,
        status='scheduled',
        checked_in=False,
        start_time__lte=now_time,
    ).select_related('team', 'organizer', 'conductor')

    for meeting in meetings:
        # Calculate how many minutes past start_time we are
        from datetime import datetime
        start_dt = datetime.combine(today, meeting.start_time)
        now_dt = datetime.combine(today, now_time)
        minutes_past = (now_dt - start_dt).seconds // 60

        if minutes_past >= meeting.auto_release_minutes:
            print(f"[auto_release] No-show cancelling: '{meeting.title}' (id={meeting.id}, {minutes_past}min past start)")
            meeting.status = 'cancelled'
            meeting.save(update_fields=['status', 'updated_at'])

            try:
                send_cancellation_email(meeting.id)
            except Exception as e:
                print(f"[auto_release] Email error for meeting {meeting.id}: {e}")

            try:
                notify_waitlist()
            except Exception as e:
                print(f"[auto_release] Waitlist notify error: {e}")