from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('meetings', views.MeetingViewSet)
router.register('teams', views.TeamViewSet)
router.register('waitlist', views.WaitlistViewSet)
router.register('users', views.UserViewSet)
router.register('rooms', views.RoomViewSet)
router.register('team-memberships', views.TeamMembershipViewSet)

urlpatterns = [path('', include(router.urls))]