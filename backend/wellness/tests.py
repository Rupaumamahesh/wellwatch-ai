from datetime import timedelta
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from .models import CheckIn, RiskScore, Team, User

class ApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employee = User.objects.create_user(username="employee", email="e@example.com", password="test-password")
        self.manager = User.objects.create_user(username="manager", password="test-password", role="manager")
        self.team = Team.objects.create(name="Engineering", manager=self.manager)
        self.team.members.add(self.employee)

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def payload(self, **overrides):
        return {"mood": 4, "stress": 20, "energy": 80, "sleep": 80, "comment": "Doing well", **overrides}

    def test_private_endpoints_require_authentication(self):
        self.assertEqual(self.client.get("/api/me/dashboard").status_code, 401)
        self.assertEqual(self.client.post("/api/checkin", self.payload(), format="json").status_code, 401)
        self.assertEqual(self.client.get("/api/team/stats").status_code, 401)

    def test_checkin_is_limited_to_one_per_day_and_accepts_zero(self):
        self.auth(self.employee)
        self.assertEqual(self.client.post("/api/checkin", self.payload(stress=0, energy=0, sleep=0), format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/checkin", self.payload(), format="json").status_code, 400)
        self.assertEqual(CheckIn.objects.get(user=self.employee).stress, 0)

    def test_checkin_rejects_out_of_range_slider(self):
        self.auth(self.employee)
        self.assertEqual(self.client.post("/api/checkin", self.payload(stress=101), format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/checkin", self.payload(mood=0), format="json").status_code, 400)

    def test_share_requires_a_json_boolean(self):
        self.auth(self.employee)
        self.assertEqual(self.client.patch("/api/me/share", {"shared_with_manager": "false"}, format="json").status_code, 400)
        response = self.client.patch("/api/me/share", {"shared_with_manager": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.employee.__class__.objects.get(id=self.employee.id).share_with_manager)
        self.client.patch("/api/me/share", {"shared_with_manager": False}, format="json")
        self.assertFalse(self.employee.__class__.objects.get(id=self.employee.id).share_with_manager)

    def test_email_login_and_logout_revoke_token(self):
        client = APIClient()
        login_response = client.post("/api/login", {"email": "e@example.com", "password": "test-password"}, format="json")
        self.assertEqual(login_response.status_code, 200)
        token = login_response.data["token"]
        client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(client.get("/api/me/dashboard").status_code, 200)
        self.assertEqual(client.post("/api/logout").status_code, 204)
        self.assertEqual(client.get("/api/me/dashboard").status_code, 401)

    def test_dashboard_streak_and_latest_risk_order(self):
        today = timezone.localdate()
        for offset, score in ((0, 20), (1, 40), (2, 60)):
            checkin = CheckIn.objects.create(user=self.employee, date=today - timedelta(days=offset), mood=3, stress=20, energy=50, sleep=50)
            RiskScore.objects.create(user=self.employee, checkin=checkin, score=score, level="low", explanation=["stress"])
        self.auth(self.employee)
        result = self.client.get("/api/me/dashboard").data
        self.assertEqual(result["streak"], 3)
        self.assertEqual(result["risk_probability"], .2)
        self.assertEqual(len(result["risk_trend"]), 7)
        self.assertEqual(result["risk_trend"][-1]["risk"], 20)
        self.assertTrue(result["factors"])

    def test_team_stats_only_include_latest_scores_from_consenting_members(self):
        self.employee.share_with_manager = True
        self.employee.save()
        other = User.objects.create_user(username="other", password="x")
        self.team.members.add(other)
        self.employee.share_with_manager = True
        self.employee.save()
        third = User.objects.create_user(username="third", password="x", share_with_manager=True)
        self.team.members.add(third)
        fourth = User.objects.create_user(username="fourth", password="x", share_with_manager=True)
        self.team.members.add(fourth)
        for user, score in ((self.employee, 90), (third, 50), (fourth, 70), (other, 99)):
            day = timezone.localdate()
            checkin = CheckIn.objects.create(user=user, date=day, mood=3, stress=40, energy=50, sleep=50)
            RiskScore.objects.create(user=user, checkin=checkin, score=score, level="high" if score >= 65 else "low", explanation=[])
        self.auth(self.manager)
        result = self.client.get("/api/team/stats").data
        self.assertEqual(result["count"], 3)
        self.assertEqual(result["median"], 70)
        self.assertNotIn("employee", str(result))
        self.assertNotIn("other", str(result))

    def test_team_stats_suppress_small_cohort(self):
        self.employee.share_with_manager = True
        self.employee.save()
        self.auth(self.manager)
        response = self.client.get("/api/team/stats")
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["stress_trend"], [])

    def test_team_members_management_does_not_expose_wellness(self):
        self.auth(self.manager)
        roster = self.client.get("/api/team/members")
        self.assertEqual(roster.status_code, 200)
        self.assertEqual(roster.data[0]["username"], "employee")
        self.assertNotIn("checkins", str(roster.data))
        created = self.client.post("/api/team/members", {"username": "new", "email": "new@example.com", "password": "test-password"}, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["role"], "employee")
        self.assertFalse(created.data["share_with_manager"])
        self.assertEqual(self.client.delete("/api/team/members", {"id": created.data["id"]}, format="json").status_code, 204)

    def test_employee_cannot_manage_team_or_read_stats(self):
        self.auth(self.employee)
        self.assertEqual(self.client.get("/api/team/stats").status_code, 403)
        self.assertEqual(self.client.get("/api/team/members").status_code, 403)

    @override_settings(HR_EMAIL="hr@example.com", DEFAULT_FROM_EMAIL="app@example.com")
    def test_hr_notification_sends_without_member_pii(self):
        self.auth(self.manager)
        response = self.client.post("/api/team/notify-hr", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertNotIn(self.employee.email, mail.outbox[0].body)

    @override_settings(HR_EMAIL="", DEFAULT_FROM_EMAIL="")
    def test_hr_notification_reports_missing_configuration(self):
        self.auth(self.manager)
        response = self.client.post("/api/team/notify-hr", {}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertFalse(response.data["notified"])

    def test_daily_trends_require_three_contributors_and_use_median(self):
        today = timezone.localdate()
        for index, stress in enumerate((10, 20, 90)):
            member = User.objects.create_user(username=f"trend{index}", share_with_manager=True)
            self.team.members.add(member)
            checkin = CheckIn.objects.create(user=member, date=today, mood=3, stress=stress, energy=50, sleep=50)
            RiskScore.objects.create(user=member, checkin=checkin, score=50, level="medium")
            if index == 0:
                CheckIn.objects.create(user=member, date=today-timedelta(days=1), mood=3, stress=90, energy=50, sleep=50)
        self.auth(self.manager)
        trend = self.client.get("/api/team/stats").data["stress_trend"]
        self.assertEqual(len(trend), 1)
        self.assertEqual(trend[0]["stress"], 20)
