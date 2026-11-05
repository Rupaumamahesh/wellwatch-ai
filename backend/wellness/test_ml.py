from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from .ml import FEATURES, features_for_checkin, score_for_user
from .models import CheckIn


class RiskFeaturesTests(TestCase):
    def test_windows_and_streak_use_only_history_through_scored_date(self):
        user = get_user_model().objects.create_user(username="history")
        today = date(2026, 11, 6)
        for offset in (10, 2, 1, 0):
            CheckIn.objects.create(user=user, date=today - timedelta(days=offset),
                                   mood=4, stress=100 if offset == 10 else 20 + offset, energy=80,
                                   sleep=70, sentiment=0)
        target = user.checkins.get(date=today)
        CheckIn.objects.create(user=user, date=today + timedelta(days=1),
                               mood=1, stress=100, energy=1, sleep=1)
        values = dict(zip(FEATURES, features_for_checkin(target)))
        self.assertEqual(values["streak"], 3)
        self.assertEqual(values["stress_7d"], 21)
        self.assertEqual(values["stress_14d"], 40.75)
        self.assertEqual(len(features_for_checkin(target)), len(FEATURES))

    def test_falls_back_to_rule_score_without_local_artifact(self):
        user = get_user_model().objects.create_user(username="fallback")
        checkin = CheckIn.objects.create(user=user, date=date(2026, 11, 6),
                                         mood=2, stress=80, energy=20, sleep=30)
        with patch("wellness.ml._load_model", return_value=None):
            score, level, reasons = score_for_user(checkin)
        self.assertEqual(level, "high")
        self.assertGreater(score, 65)
        self.assertIn("high stress", reasons)

    def test_training_artifact_loads_and_scores(self):
        from .management.commands.train_risk_model import Command
        user = get_user_model().objects.create_user(username="trained")
        checkin = CheckIn.objects.create(user=user, date=date(2026, 11, 6),
                                         mood=2, stress=80, energy=20, sleep=30)
        with TemporaryDirectory() as directory:
            path = Path(directory) / "risk_model.pkl"
            with patch("wellness.ml.MODEL_PATH", path), \
                    patch("wellness.management.commands.train_risk_model.MODEL_PATH", path):
                from . import ml
                ml._load_model.cache_clear()
                Command().handle(seed=42)
                model = ml._load_model()
                self.assertEqual(model.n_features_in_, len(FEATURES))
                score, level, reasons = score_for_user(checkin)
                self.assertGreaterEqual(score, 0)
                self.assertLessEqual(score, 100)
                self.assertIn(level, {"low", "medium", "high"})
                self.assertTrue(reasons)
                ml._load_model.cache_clear()
