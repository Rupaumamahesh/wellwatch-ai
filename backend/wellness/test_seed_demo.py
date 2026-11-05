import json
from datetime import timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.management import call_command, CommandError
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import CheckIn, RiskScore, Team, User


class SeedDemoTests(TestCase):
    def test_seeds_fictional_histories_and_rerun_preserves_existing_data(self):
        with TemporaryDirectory() as directory, \
                override_settings(BASE_DIR=Path(directory) / "backend"), \
                patch("wellness.ml._load_model", return_value=None):
            call_command("seed_demo", verbosity=0)
            manifest_path = Path(directory) / ".local" / "demo-accounts.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))["accounts"]
            self.assertEqual(len(manifest), 12)
            self.assertEqual(User.objects.filter(username__startswith="demo.").count(), 12)
            self.assertEqual(Team.objects.filter(name__startswith="Demo ·").count(), 2)
            self.assertEqual(sorted(team.members.count() for team in Team.objects.filter(name__startswith="Demo ·")), [5, 5])

            today = timezone.localdate()
            employee = User.objects.get(username="demo.aarav")
            rows = list(employee.checkins.order_by("date"))
            self.assertEqual(len(rows), 28)
            self.assertEqual([row.date for row in rows], [today - timedelta(days=27 - i) for i in range(28)])
            for checkin in rows:
                self.assertTrue(1 <= checkin.mood <= 5)
                self.assertTrue(0 <= checkin.stress <= 100)
                self.assertTrue(0 <= checkin.energy <= 100)
                self.assertTrue(0 <= checkin.sleep <= 100)
                self.assertTrue(-1 <= checkin.sentiment <= 1)
                self.assertTrue(checkin.comment)
                self.assertTrue(hasattr(checkin, "risk"))

            self.assertTrue(employee.check_password(manifest["demo.aarav"]["password"]))
            employee.first_name = "Aarav Edited"
            employee.save(update_fields=["first_name"])
            preserved_checkin = rows[-1]
            preserved_checkin.comment = "User-edited local demo note"
            preserved_checkin.save(update_fields=["comment"])
            risk = preserved_checkin.risk
            risk.score = 13.37
            risk.save(update_fields=["score"])

            call_command("seed_demo", verbosity=0)

            employee.refresh_from_db()
            preserved_checkin.refresh_from_db()
            risk.refresh_from_db()
            self.assertEqual(User.objects.filter(username__startswith="demo.").count(), 12)
            self.assertEqual(CheckIn.objects.filter(user=employee).count(), 28)
            self.assertEqual(RiskScore.objects.filter(user=employee).count(), 28)
            self.assertEqual(employee.first_name, "Aarav Edited")
            self.assertTrue(employee.check_password(manifest["demo.aarav"]["password"]))
            self.assertEqual(preserved_checkin.comment, "User-edited local demo note")
            self.assertEqual(risk.score, 13.37)

    def test_refuses_username_collision_with_non_demo_user(self):
        User.objects.create_user(username="demo.ishaan", email="real@example.com", password="keep")
        with self.assertRaises(CommandError):
            call_command("seed_demo", verbosity=0)
        self.assertTrue(User.objects.get(username="demo.ishaan").check_password("keep"))
        self.assertFalse(User.objects.filter(username="demo.neha").exists())
