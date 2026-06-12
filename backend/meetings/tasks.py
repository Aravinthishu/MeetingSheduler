from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from .models import Meeting, Waitlist


def _get_recipients(meeting):
    emails = set()
    if meeting.organizer.email:
        emails.add(meeting.organizer.email)
    if meeting.conductor and meeting.conductor.email:
        emails.add(meeting.conductor.email)
    for a in meeting.attendees.all():
        if a.email:
            emails.add(a.email)
    return list(emails)


def _send_html_email(subject, template_name, context, recipient_list):
    if not recipient_list:
        return
    html_content = render_to_string(template_name, context)
    meeting = context.get('meeting')
    waitlist = context.get('waitlist')
    if meeting:
        plain = (
            f"{subject}\n\nTitle: {meeting.title}\nTeam: {meeting.team.name}\n"
            f"Date: {meeting.date.strftime('%A, %d %B %Y')}\n"
            f"Time: {meeting.start_time.strftime('%H:%M')}"
            f"{ ' – ' + meeting.end_time.strftime('%H:%M') if meeting.end_time else ' (open-ended)'}\n"
        )
        if meeting.conductor:
            plain += f"Conducted by: {meeting.conductor.get_full_name() or meeting.conductor.username}\n"
    elif waitlist:
        plain = f"{subject}\n\nYour waitlisted meeting '{waitlist.title}' can now be booked.\n"
    else:
        plain = subject
    msg = EmailMultiAlternatives(subject=subject, body=plain, from_email=settings.EMAIL_HOST_USER, to=recipient_list)
    msg.attach_alternative(html_content, "text/html")
    msg.send()


# def _notify_users(meeting, subject, template_name):
#     all_emails = set()
#     users = [meeting.organizer] + ([meeting.conductor] if meeting.conductor else []) + list(meeting.attendees.all())
#     for user in users:
#         if user and user.email and user.email not in all_emails:
#             all_emails.add(user.email)
#             _send_html_email(subject, template_name, {'meeting': meeting, 'recipient_name': user.get_full_name() or user.username}, [user.email])


def _notify_users(meeting, subject, template_name):
    all_emails = set()
    users = [meeting.organizer] + ([meeting.conductor] if meeting.conductor else []) + list(meeting.attendees.all())
    for user in users:
        if user and user.email and user.email not in all_emails:
            all_emails.add(user.email)
            _send_html_email(subject, template_name, {'meeting': meeting, 'recipient_name': user.get_full_name() or user.username}, [user.email])
    # Also notify free-text participants
    for p in meeting.participants.all():
        if p.email not in all_emails:
            all_emails.add(p.email)
            _send_html_email(subject, template_name, {'meeting': meeting, 'recipient_name': p.name}, [p.email])


@shared_task
def send_booking_confirmation(meeting_id):
    try:
        meeting = Meeting.objects.select_related('team', 'organizer', 'conductor').prefetch_related('attendees').get(id=meeting_id)
        _notify_users(meeting, f"[MeetSync] Booking Confirmed: {meeting.title}", 'emails/booking_confirmation.html')
    except Meeting.DoesNotExist:
        pass


@shared_task
def send_reminder_email(meeting_id):
    try:
        meeting = Meeting.objects.select_related('team', 'organizer', 'conductor').prefetch_related('attendees').get(id=meeting_id)
        if meeting.status != 'scheduled':
            return
        _notify_users(meeting, f"[MeetSync] Reminder: {meeting.title} in 15 minutes", 'emails/reminder.html')
    except Meeting.DoesNotExist:
        pass


@shared_task
def send_cancellation_email(meeting_id):
    try:
        meeting = Meeting.objects.select_related('team', 'organizer', 'conductor').prefetch_related('attendees').get(id=meeting_id)
        _notify_users(meeting, f"[MeetSync] Cancelled: {meeting.title}", 'emails/cancellation.html')
    except Meeting.DoesNotExist:
        pass


@shared_task
def send_meeting_started_email(meeting_id):
    try:
        meeting = Meeting.objects.select_related('team', 'organizer', 'conductor').prefetch_related('attendees').get(id=meeting_id)
        _notify_users(meeting, f"[MeetSync] Started: {meeting.title}", 'emails/meeting_started.html')
    except Meeting.DoesNotExist:
        pass


@shared_task
def send_meeting_ended_email(meeting_id):
    try:
        meeting = Meeting.objects.select_related('team', 'organizer', 'conductor').prefetch_related('attendees').get(id=meeting_id)
        _notify_users(meeting, f"[MeetSync] Ended: {meeting.title}", 'emails/meeting_ended.html')
    except Meeting.DoesNotExist:
        pass


@shared_task
def notify_waitlist():
    from datetime import date
    waitlist = Waitlist.objects.filter(date=date.today(), notified=False).first()
    if not waitlist:
        return
    _send_html_email(
        subject="[MeetSync] Meeting Room is now available!",
        template_name='emails/waitlist_notify.html',
        context={'waitlist': waitlist, 'app_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')},
        recipient_list=[waitlist.organizer.email],
    )
    waitlist.notified = True
    waitlist.save()


@shared_task
def auto_release_no_shows():
    """Run every 5 mins via celery-beat."""
    from django.utils import timezone
    from datetime import timedelta, datetime

    now_local = timezone.localtime(timezone.now())
    today = now_local.date()
    now_naive = datetime(today.year, today.month, today.day, now_local.hour, now_local.minute, now_local.second)

    for m in Meeting.objects.filter(status='scheduled', date=today, checked_in=False):
        start_dt = datetime.combine(m.date, m.start_time)
        if now_naive > start_dt + timedelta(minutes=m.auto_release_minutes):
            m.status = 'cancelled'
            m.save()
            send_cancellation_email.delay(m.id)
            notify_waitlist.delay()


@shared_task
def auto_start_meetings():
    """
    Run every minute via celery-beat.
    Uses naive Python datetime comparison — safe on Windows/SQLite.
    """
    from django.utils import timezone
    from datetime import datetime

    now_local = timezone.localtime(timezone.now())
    today = now_local.date()
    now_naive = datetime(today.year, today.month, today.day, now_local.hour, now_local.minute, now_local.second)

    for meeting in Meeting.objects.filter(date=today, status='scheduled').select_related('team', 'organizer', 'conductor'):
        if now_naive >= datetime.combine(meeting.date, meeting.start_time):
            meeting.status = 'in_progress'
            meeting.save(update_fields=['status'])
            send_meeting_started_email.delay(meeting.id)


@shared_task
def auto_complete_meetings():
    """
    Run every minute via celery-beat.
    Uses naive Python datetime comparison — safe on Windows/SQLite.
    """
    from django.utils import timezone
    from datetime import datetime

    now_local = timezone.localtime(timezone.now())
    today = now_local.date()
    now_naive = datetime(today.year, today.month, today.day, now_local.hour, now_local.minute, now_local.second)

    for meeting in Meeting.objects.filter(date=today, status='in_progress', end_time__isnull=False).select_related('team', 'organizer', 'conductor'):
        if now_naive >= datetime.combine(meeting.date, meeting.end_time):
            meeting.status = 'completed'
            meeting.save(update_fields=['status'])
            send_meeting_ended_email.delay(meeting.id)
            notify_waitlist.delay()

@shared_task
def send_extension_conflict_email(extending_meeting_id, conflict_meeting_id, extra_minutes, old_start_str):
    try:
        extending = Meeting.objects.select_related('team', 'organizer', 'conductor').get(id=extending_meeting_id)
        conflict = Meeting.objects.select_related('team', 'organizer', 'conductor').get(id=conflict_meeting_id)

        recipient_email = conflict.organizer.email
        if not recipient_email:
            return

        recipient_name = conflict.organizer.get_full_name() or conflict.organizer.username
        conductor_name = (
            extending.conductor.get_full_name() if extending.conductor
            else extending.organizer.get_full_name() or extending.organizer.username
        )

        subject = f"[MeetSync] Your meeting '{conflict.title}' has been postponed"
        plain = (
            f"Hi {recipient_name},\n\n"
            f"The meeting '{extending.title}' currently using the room has been extended by {extra_minutes} minutes.\n\n"
            f"As a result, your meeting '{conflict.title}' has been postponed:\n"
            f"  Original start: {old_start_str}\n"
            f"  New start: {conflict.start_time.strftime('%H:%M')}\n"
            f"  New end: {conflict.end_time.strftime('%H:%M') if conflict.end_time else 'Open-ended'}\n\n"
            f"Extended by: {conductor_name} ({extending.team.name})\n\n"
            f"MeetSync"
        )

        from django.core.mail import send_mail
        from django.conf import settings
        send_mail(
            subject, plain,
            settings.EMAIL_HOST_USER,
            [recipient_email],
            fail_silently=True
        )
    except Exception:
        pass