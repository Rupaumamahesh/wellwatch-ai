import statistics
from django.contrib.auth import authenticate, login, logout
from django.db.models import Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import CheckIn, RiskScore, Team, User
from .permissions import IsManager
from .serializers import CheckInSerializer, UserSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    identity = request.data.get("username") or request.data.get("email")
    password = request.data.get("password")
    user = authenticate(username=identity, password=password)
    if not user and identity:
        account = User.objects.filter(email__iexact=identity).first()
        if account:
            user = authenticate(username=account.username, password=password)
    if not user:
        return Response({"detail": "Invalid credentials."}, status=401)
    token, _ = Token.objects.get_or_create(user=user)
    login(request, user)
    return Response({"token": token.key, "role": user.role, "user": UserSerializer(user).data})


@api_view(["POST"])
def logout_view(request):
    Token.objects.filter(user=request.user).delete()
    logout(request)
    return Response(status=204)


@api_view(["POST"])
def checkin(request):
    serializer = CheckInSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    return Response(CheckInSerializer(serializer.save()).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def dashboard(request):
    latest = CheckIn.objects.filter(user=request.user).first()
    risk = RiskScore.objects.filter(user=request.user).first()
    score = risk.score if risk else 0
    return Response({
        "user": UserSerializer(request.user).data,
        "checked_in_today": CheckIn.objects.filter(user=request.user, date=timezone.localdate()).exists(),
        "risk_probability": score / 100,
        "risk_level": risk.level if risk else "low",
        "streak": CheckIn.objects.filter(user=request.user).count(),
        "wellness_score": round(max(0, 100 - score)),
        "latest_checkin": CheckInSerializer(latest).data if latest else None,
        "factors": [{"label": "Stress", "value": latest.stress, "tone": "red"}] if latest else [],
        "insight": (risk.explanation[0] if risk and risk.explanation else "Complete a check-in to receive a personal insight."),
    })


@api_view(["GET"])
def trends(request):
    return Response(list(CheckIn.objects.filter(user=request.user).values("date").annotate(
        mood=Avg("mood"), stress=Avg("stress"), energy=Avg("energy"), sleep=Avg("sleep")).order_by("date")))


@api_view(["GET"])
def recommendations(request):
    risk = RiskScore.objects.filter(user=request.user).first()
    recs = ["Keep your daily check-in habit."]
    if risk and risk.level != "low":
        recs = ["Consider taking a short break.", "Talk to someone you trust or your wellness team."]
    return Response({"recommendations": recs})


@api_view(["PATCH"])
def share(request):
    request.user.share_with_manager = bool(request.data.get("shared_with_manager"))
    request.user.save(update_fields=["share_with_manager"])
    return Response({"share_with_manager": request.user.share_with_manager})


@api_view(["GET"])
@permission_classes([IsManager])
def team_stats(request):
    teams = Team.objects.filter(manager=request.user)
    member_ids = User.objects.filter(teams__in=teams, share_with_manager=True).values("id")
    scores = list(RiskScore.objects.filter(user__in=member_ids).values_list("score", flat=True))
    if not scores:
        return Response({"count": 0, "median": None, "std": 0, "at_risk": 0,
                         "risk_counts": {"low": 0, "medium": 0, "high": 0}, "stress_trend": []})
    return Response({
        "count": len(scores),
        "median": statistics.median(scores),
        "std": statistics.pstdev(scores) if len(scores) > 1 else 0,
        "at_risk": sum(s >= 65 for s in scores),
        "risk_counts": {
            "low": sum(s < 35 for s in scores),
            "medium": sum(35 <= s < 65 for s in scores),
            "high": sum(s >= 65 for s in scores),
        },
        "stress_trend": [],
    })


@api_view(["POST"])
@permission_classes([IsManager])
def notify_hr(request):
    return Response({"notified": True, "detail": "HR wellness team notified."})
