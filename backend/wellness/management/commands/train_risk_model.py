"""Train a reproducible demonstration model on synthetic rule-labeled data."""
import pickle

import numpy as np
from django.core.management.base import BaseCommand
from sklearn.ensemble import RandomForestClassifier

from wellness.ml import FEATURES, MODEL_PATH, _load_model


class Command(BaseCommand):
    help = "Train/save the synthetic, unvalidated demonstration risk classifier"

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=42)

    def handle(self, *args, seed, **options):
        rng = np.random.default_rng(seed)
        count = 5000
        x = np.column_stack((
            rng.integers(1, 6, count), rng.integers(0, 101, count),
            rng.integers(0, 101, count), rng.integers(0, 101, count),
            rng.uniform(-1, 1, count),
            rng.uniform(1, 5, (count, 1)), rng.uniform(0, 100, (count, 1)),
            rng.uniform(0, 100, (count, 1)), rng.uniform(0, 100, (count, 1)),
            rng.uniform(1, 5, (count, 1)), rng.uniform(0, 100, (count, 1)),
            rng.uniform(0, 100, (count, 1)), rng.uniform(0, 100, (count, 1)),
            rng.uniform(-60, 60, (count, 1)), rng.uniform(-4, 4, (count, 1)),
            rng.integers(0, 15, (count, 1)),
        ))
        # The target is a synthetic heuristic label, not observed wellness outcomes.
        risk = ((6 - x[:, 0]) * 12 + x[:, 1] * .35 + (100 - x[:, 2]) * .2 +
                (100 - x[:, 3]) * .15 + np.maximum(0, -x[:, 4]) * 15)
        risk += np.maximum(0, 3 - x[:, 5]) * 5 + np.maximum(0, x[:, 6] - 55) * .12
        risk += np.maximum(0, -x[:, 14]) * 2
        y = risk >= 65
        model = RandomForestClassifier(n_estimators=60, max_depth=8, random_state=seed,
                                       class_weight="balanced", n_jobs=-1)
        model.fit(x, y)
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with MODEL_PATH.open("wb") as artifact:
            pickle.dump({"version": 1, "features": FEATURES, "model": model}, artifact)
        _load_model.cache_clear()
        self.stdout.write(self.style.SUCCESS(
            f"Saved demo model from {count} synthetic examples to {MODEL_PATH}; not clinically validated."
        ))
