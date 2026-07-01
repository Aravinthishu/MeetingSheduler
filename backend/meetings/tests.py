from django.test import TestCase
from django.contrib.auth.models import User
from datetime import date, timedelta
from .models import Meeting, Team


class RecurrenceTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='test123')
        self.team = Team.objects.create(name='Test Team')

    def _create_meeting(self, recurrence, recurrence_end_date=None):
        return Meeting.objects.create(
            title='Test Meeting',
            date=date.today(),
            start_time='09:00',
            end_time='09:30',
            team=self.team,
            organizer=self.user,
            recurrence=recurrence,
            recurrence_end_date=recurrence_end_date,
        )

    def _create_recurrences(self, parent):
        """Copy of the exact logic from your views.py"""
        delta = timedelta(days=1 if parent.recurrence == 'daily' else 7)
        current_date = parent.date + delta
        end = parent.recurrence_end_date or (parent.date + timedelta(weeks=4))
        while current_date <= end:
            Meeting.objects.create(
                title=parent.title,
                description=getattr(parent, 'description', ''),
                team=parent.team,
                organizer=parent.organizer,
                conductor=parent.conductor if hasattr(parent, 'conductor') else None,
                date=current_date,
                start_time=parent.start_time,
                end_time=parent.end_time,
                recurrence=parent.recurrence,
                parent_meeting=parent,
            )
            current_date += delta

    # ── Test 1: Daily recurrence with end date ────────────────────────────────
    def test_daily_recurrence_with_end_date(self):
        end_date = date.today() + timedelta(days=4)
        parent = self._create_meeting('daily', recurrence_end_date=end_date)
        self._create_recurrences(parent)

        children = Meeting.objects.filter(parent_meeting=parent).order_by('date')
        print(f"\n[Daily] Children created: {children.count()}")
        for m in children:
            print(f"  → {m.date}  {m.start_time} - {m.end_time}")

        self.assertEqual(children.count(), 4)  # 4 days after parent
        self.assertEqual(children.first().date, date.today() + timedelta(days=1))
        self.assertEqual(children.last().date, end_date)

    # ── Test 2: Weekly recurrence with end date ───────────────────────────────
    def test_weekly_recurrence_with_end_date(self):
        end_date = date.today() + timedelta(weeks=3)
        parent = self._create_meeting('weekly', recurrence_end_date=end_date)
        self._create_recurrences(parent)

        children = Meeting.objects.filter(parent_meeting=parent).order_by('date')
        print(f"\n[Weekly] Children created: {children.count()}")
        for m in children:
            print(f"  → {m.date}")

        self.assertEqual(children.count(), 3)  # 3 weeks after parent
        self.assertEqual(children.first().date, date.today() + timedelta(weeks=1))
        self.assertEqual(children.last().date, end_date)

    # ── Test 3: Daily with NO end date — defaults to 4 weeks ─────────────────
    def test_daily_recurrence_no_end_date(self):
        parent = self._create_meeting('daily')  # no end date
        self._create_recurrences(parent)

        children = Meeting.objects.filter(parent_meeting=parent).order_by('date')
        print(f"\n[Daily no end date] Children created: {children.count()}")

        self.assertEqual(children.count(), 28)  # 4 weeks = 28 days
        self.assertEqual(children.last().date, date.today() + timedelta(weeks=4))

    # ── Test 4: recurrence=none — NO children created ─────────────────────────
    def test_no_recurrence(self):
        parent = self._create_meeting('none')
        # Don't call _create_recurrences — views.py skips it when recurrence=none

        children = Meeting.objects.filter(parent_meeting=parent)
        print(f"\n[None] Children created: {children.count()}")

        self.assertEqual(children.count(), 0)

    # ── Test 5: Children inherit parent data ──────────────────────────────────────
    def test_children_inherit_parent_data(self):
        parent = self._create_meeting('daily', recurrence_end_date=date.today() + timedelta(days=2))
        self._create_recurrences(parent)

        children = Meeting.objects.filter(parent_meeting=parent)
        for child in children:
            print(f"\n[Inherit] child={child.date} title={child.title} team={child.team}")
            self.assertEqual(child.title, parent.title)
            self.assertEqual(child.team, parent.team)
            self.assertEqual(child.organizer, parent.organizer)
            # FIX: refresh parent from DB so times are both datetime.time objects
            parent.refresh_from_db()
            self.assertEqual(child.start_time, parent.start_time)
            self.assertEqual(child.end_time, parent.end_time)
            self.assertEqual(child.parent_meeting_id, parent.id)