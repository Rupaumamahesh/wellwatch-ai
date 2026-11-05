from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers
from .models import CheckIn, RiskScore, User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "role", "share_with_manager"]

class CheckInSerializer(serializers.ModelSerializer):
    risk = serializers.SerializerMethodField()
    class Meta:
        model = CheckIn
        fields = ["id", "date", "mood", "stress", "energy", "sleep", "comment", "sentiment", "sentiment_label", "risk"]
        read_only_fields = ["date", "sentiment", "sentiment_label", "risk"]

    def validate(self, attrs):
        for field in ("mood", "stress", "energy", "sleep"):
            minimum, maximum = (1, 5) if field == "mood" else (0, 100)
            if field in attrs and not minimum <= attrs[field] <= maximum:
                raise serializers.ValidationError({field: f"must be between {minimum} and {maximum}"})
        if CheckIn.objects.filter(user=self.context["request"].user, date=timezone.localdate()).exists():
            raise serializers.ValidationError("You have already checked in today.")
        return attrs

    def create(self, validated_data):
        text = validated_data.get("comment", "")
        sentiment, label = 0, "neutral"
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            sentiment = SentimentIntensityAnalyzer().polarity_scores(text)["compound"]
            label = "positive" if sentiment >= .05 else "negative" if sentiment <= -.05 else "neutral"
        except ImportError:
            words = text.lower().split()
            sentiment = (sum(w in {"good", "great", "happy", "well"} for w in words) -
                         sum(w in {"bad", "sad", "stress", "awful"} for w in words)) / max(1, len(words))
            label = "positive" if sentiment > 0 else "negative" if sentiment < 0 else "neutral"
        try:
            with transaction.atomic():
                checkin = CheckIn.objects.create(user=self.context["request"].user, date=timezone.localdate(),
                                                 sentiment=sentiment, sentiment_label=label, **validated_data)
                try:
                    from .ml import score_for_user
                    score, level, explanation = score_for_user(checkin)
                except ImportError:
                    from .ml import score_checkin
                    score, level, explanation = score_checkin(mood=checkin.mood, stress=checkin.stress,
                        energy=checkin.energy, sleep=checkin.sleep, sentiment=sentiment)
                RiskScore.objects.create(user=checkin.user, checkin=checkin, score=score, level=level,
                                         explanation=explanation)
                return checkin
        except IntegrityError:
            raise serializers.ValidationError("You have already checked in today.")

    def get_risk(self, obj):
        return {"score": obj.risk.score, "level": obj.risk.level, "explanation": obj.risk.explanation} if hasattr(obj, "risk") else None
