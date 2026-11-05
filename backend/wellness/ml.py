"""Demo wellness risk model. Synthetic labels are not clinically validated."""

from functools import lru_cache
from pathlib import Path
import pickle

import numpy as np

FEATURES = (
    "mood", "stress", "energy", "sleep", "sentiment",
    "mood_7d", "stress_7d", "energy_7d", "sleep_7d",
    "mood_14d", "stress_14d", "energy_14d", "sleep_14d",
    "stress_change_7d", "mood_change_7d", "streak",
)
MODEL_PATH = Path(__file__).with_name("risk_model.pkl")


def score_checkin(*, mood, stress, energy, sleep, sentiment=0):
    score = (6 - mood) * 12 + stress * .35 + (100 - energy) * .2 + (100 - sleep) * .15
    score += max(0, -sentiment) * 15
    score = max(0, min(100, round(score, 2)))
    level = "high" if score >= 65 else "medium" if score >= 35 else "low"
    reasons = []
    if stress >= 70: reasons.append("high stress")
    if mood <= 2: reasons.append("low mood")
    if energy <= 30: reasons.append("low energy")
    if sleep <= 30: reasons.append("poor sleep")
    if sentiment < -.3: reasons.append("negative sentiment")
    return score, level, reasons or ["stable signals"]


def features_for_checkin(checkin):
    """Use only this user's check-ins dated at or before the scored check-in."""
    records = list(checkin.user.checkins.filter(date__lte=checkin.date).order_by("date"))
    current = records[-1]
    def average(rows, field):
        return float(np.mean([getattr(row, field) for row in rows])) if rows else float(getattr(current, field))

    last7 = [row for row in records if (checkin.date - row.date).days < 7]
    last14 = [row for row in records if (checkin.date - row.date).days < 14]
    prior7 = [row for row in records if 7 <= (checkin.date - row.date).days < 14]
    streak = 0
    for row in reversed(records):
        if (checkin.date - row.date).days != streak:
            break
        streak += 1
    vals = {
        "mood": current.mood, "stress": current.stress, "energy": current.energy,
        "sleep": current.sleep, "sentiment": current.sentiment,
        **{f"{f}_7d": average(last7, f) for f in ("mood", "stress", "energy", "sleep")},
        **{f"{f}_14d": average(last14, f) for f in ("mood", "stress", "energy", "sleep")},
        "stress_change_7d": average(last7, "stress") - average(prior7, "stress"),
        "mood_change_7d": average(last7, "mood") - average(prior7, "mood"),
        "streak": streak,
    }
    return [vals[name] for name in FEATURES]


@lru_cache(maxsize=1)
def _load_model():
    if not MODEL_PATH.exists():
        return None
    # This fixed local artifact is trusted; never load a user-supplied pickle.
    with MODEL_PATH.open("rb") as artifact:
        saved = pickle.load(artifact)
    if saved.get("features") != FEATURES or saved.get("version") != 1:
        raise ValueError("Risk model feature schema does not match this application.")
    model = saved["model"]
    if model.n_features_in_ != len(FEATURES):
        raise ValueError("Risk model feature count does not match this application.")
    return model


def score_for_user(checkin):
    features = features_for_checkin(checkin)
    model = _load_model()
    score, level, reasons = score_checkin(
        mood=checkin.mood, stress=checkin.stress, energy=checkin.energy,
        sleep=checkin.sleep, sentiment=checkin.sentiment,
    )
    if model is None:
        return score, level, reasons

    probability = model.predict_proba([features])[0][1]
    score = round(float(probability) * 100, 2)
    level = "high" if score >= 65 else "medium" if score >= 35 else "low"
    names = {
        "mood": "low mood", "stress": "high stress", "energy": "low energy",
        "sleep": "poor sleep", "sentiment": "negative sentiment",
        "mood_7d": "low recent mood", "stress_7d": "high recent stress",
        "energy_7d": "low recent energy", "sleep_7d": "poor recent sleep",
        "mood_14d": "low 14-day mood", "stress_14d": "high 14-day stress",
        "energy_14d": "low 14-day energy", "sleep_14d": "poor 14-day sleep",
        "stress_change_7d": "rising stress", "mood_change_7d": "falling mood",
        "streak": "consistent check-in history",
    }
    importance = model.feature_importances_
    risk_signals = {
        "mood": features[0] <= 2, "stress": features[1] >= 70,
        "energy": features[2] <= 30, "sleep": features[3] <= 30,
        "sentiment": features[4] < -.3, "mood_7d": features[5] <= 2.5,
        "stress_7d": features[6] >= 70, "energy_7d": features[7] <= 30,
        "sleep_7d": features[8] <= 30, "mood_14d": features[9] <= 2.5,
        "stress_14d": features[10] >= 70, "energy_14d": features[11] <= 30,
        "sleep_14d": features[12] <= 30, "stress_change_7d": features[13] >= 10,
        "mood_change_7d": features[14] <= -1, "streak": False,
    }
    ranked = sorted(range(len(FEATURES)), key=lambda i: importance[i], reverse=True)
    reasons = [names[FEATURES[i]] for i in ranked if risk_signals[FEATURES[i]]][:3]
    return score, level, reasons or (["stable signals"] if level == "low" else ["model signals indicate elevated risk"])
