from django.test import TestCase
from rest_framework.test import APIClient
from .models import Team, User


class ApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employee = User.objects.create_user(username="employee", password="test-password")
        self.manager = User.objects.create_user(username="manager", password="test-password", role="manager")
        Team.objects.create(name="Engineering", manager=self.manager).members.add(self.employee)

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_checkin_is_limited_to_one_per_day(self):
        self.auth(self.employee)
        payload = {"mood": 4, "stress": 20, "energy": 80, "sleep": 80, "comment": "Doing well"}
        self.assertEqual(self.client.post("/api/checkin", payload, format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/checkin", payload, format="json").status_code, 400)

    def test_team_stats_contains_no_individual_data(self):
        self.auth(self.manager)
        response = self.client.get("/api/team/stats")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("employee", response.data)
        self.assertEqual(set(response.data), {"count", "median", "std", "at_risk", "risk_counts", "stress_trend"})

    def test_employee_cannot_read_team_stats(self):
        self.auth(self.employee)
        self.assertEqual(self.client.get("/api/team/stats").status_code, 403)
