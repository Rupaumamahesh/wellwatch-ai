from django.urls import path
from . import views
urlpatterns = [
    path("login", views.login_view), path("logout", views.logout_view), path("checkin", views.checkin),
    path("me/dashboard", views.dashboard), path("me/trends", views.trends),
    path("me/recommendations", views.recommendations), path("me/share", views.share),
    path("team/stats", views.team_stats), path("team/members", views.team_members), path("team/notify-hr", views.notify_hr),
]
