"""Deterministic, explainable risk scoring with an optional model-compatible interface."""

class RuleRiskModel:
    """A drop-in replacement for a fitted classifier when no model artifact exists."""
    def predict_proba(self, rows):
        result = []
        for row in rows:
            score, _, _ = score_checkin(**dict(zip(("mood", "stress", "energy", "sleep", "sentiment"), row)))
            result.append([1 - score / 100, score / 100])
        return result
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
