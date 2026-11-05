from django.urls import path
from . import views
urlpatterns = [
    path("login", views.login_view), path("logout", views.logout_view), path("checkin", views.checkin),
    path("me/profile", views.profile), path("me/password", views.change_password),
    path("me/dashboard", views.dashboard), path("me/trends", views.trends), path("me/team-stats", views.personal_team_stats),
    path("me/history", views.history),
    path("me/recommendations", views.recommendations), path("me/share", views.share),
    path("team", views.team_profile), path("team/stats", views.team_stats), path("team/report", views.team_stats),
    path("team/members", views.team_members), path("team/notify-hr", views.notify_hr),
    path("password/forgot", views.forgot_password), path("password/reset", views.reset_password),
]
