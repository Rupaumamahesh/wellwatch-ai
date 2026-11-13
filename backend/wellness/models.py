from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        EMPLOYEE = "employee", "Employee"
        MANAGER = "manager", "Manager"
        ADMIN = "admin", "Admin"
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    share_with_manager = models.BooleanField(default=False)

class Team(models.Model):
    name = models.CharField(max_length=120, unique=True)
    manager = models.ForeignKey(User, on_delete=models.PROTECT, related_name="managed_teams")
    members = models.ManyToManyField(User, related_name="teams", blank=True)

class CheckIn(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="checkins")
    date = models.DateField()
    mood = models.PositiveSmallIntegerField()
    stress = models.PositiveSmallIntegerField()
    energy = models.PositiveSmallIntegerField()
    sleep = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    sentiment = models.FloatField(default=0)
    sentiment_label = models.CharField(max_length=20, default="neutral")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "date"], name="one_checkin_per_user_day")]
        ordering = ["-date"]

class RiskScore(models.Model):
    class Level(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="risk_scores")
    checkin = models.OneToOneField(CheckIn, on_delete=models.CASCADE, related_name="risk")
    score = models.FloatField()
    level = models.CharField(max_length=10, choices=Level.choices)
    explanation = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
