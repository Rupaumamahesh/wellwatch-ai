import statistics
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count
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

def _latest_risk(user):
    return RiskScore.objects.filter(user=user).select_related("checkin").order_by("-checkin__date", "-checkin__created_at", "-created_at").first()

@api_view(["GET"])
def dashboard(request):
    today = timezone.localdate()
    checkins = CheckIn.objects.filter(user=request.user).order_by("-date", "-created_at")
    latest = checkins.first()
    risk = _latest_risk(request.user)
    dates = set(checkins.values_list("date", flat=True))
    streak, day = 0, today
    if day not in dates:
        day -= timedelta(days=1)
    while day in dates:
        streak += 1
        day -= timedelta(days=1)
    daily_risks = {r.checkin.date: r.score for r in RiskScore.objects.filter(user=request.user, checkin__date__gte=today - timedelta(days=6)).select_related("checkin")}
    risk_trend = [{"day": (today - timedelta(days=i)).strftime("%a"),
                   "risk": round(daily_risks[today - timedelta(days=i)]) if today - timedelta(days=i) in daily_risks else None}
                  for i in reversed(range(7))]
    reasons = risk.explanation if risk else []
    factors = ([
        {"label": "Stress", "value": latest.stress, "tone": "red" if latest.stress >= 65 else "amber" if latest.stress >= 35 else "green"},
        {"label": "Mood", "value": round(latest.mood * 20), "tone": "green" if latest.mood >= 4 else "amber" if latest.mood >= 3 else "red"},
        {"label": "Energy", "value": latest.energy, "tone": "green" if latest.energy >= 65 else "amber" if latest.energy >= 35 else "red"},
        {"label": "Sleep", "value": latest.sleep, "tone": "green" if latest.sleep >= 65 else "amber" if latest.sleep >= 35 else "red"},
    ] if latest else [])
    return Response({
        "user": UserSerializer(request.user).data,
        "checked_in_today": CheckIn.objects.filter(user=request.user, date=today).exists(),
        "risk_probability": risk.score / 100 if risk else None,
        "risk_level": risk.level if risk else "low",
        "streak": streak,
        "wellness_score": round(max(0, 100 - risk.score)) if risk else None,
        "latest_checkin": CheckInSerializer(latest).data if latest else None,
        "factors": factors,
        "risk_trend": risk_trend,
        "insight": (reasons[0] if reasons else "Complete a check-in to receive a personal insight."),
    })

@api_view(["GET"])
def trends(request):
    ranges = {"1w": 7, "7d": 7, "4w": 28, "3m": 90}
    span = ranges.get(request.query_params.get("range", "4w"), 28)
    since = timezone.localdate() - timedelta(days=span - 1)
    return Response(list(CheckIn.objects.filter(user=request.user, date__gte=since).values("date").annotate(
        mood=Avg("mood"), stress=Avg("stress"), energy=Avg("energy"), sleep=Avg("sleep")).order_by("date")))

@api_view(["GET"])
def recommendations(request):
    risk = _latest_risk(request.user)
    recs = ["Keep your daily check-in habit."]
    if risk and risk.level != "low":
        recs = ["Consider taking a short break.", "Talk to someone you trust or your wellness team."]
    return Response({"recommendations": recs})

@api_view(["PATCH"])
def share(request):
    value = request.data.get("shared_with_manager")
    if type(value) is not bool:
        return Response({"shared_with_manager": ["Must be a boolean."]}, status=400)
    request.user.share_with_manager = value
    request.user.save(update_fields=["share_with_manager"])
    return Response({"share_with_manager": value})

@api_view(["GET"])
@permission_classes([IsManager])
def team_stats(request):
    teams = Team.objects.filter(manager=request.user)
    members = User.objects.filter(teams__in=teams, share_with_manager=True).distinct()
    latest_by_member = []
    for member in members:
        latest = _latest_risk(member)
        if latest:
            latest_by_member.append(latest)
    scores = [r.score for r in latest_by_member]
    week_ago = timezone.localdate() - timedelta(days=6)
    trend = list(CheckIn.objects.filter(user__in=members, date__gte=week_ago).values("date").annotate(
        stress=Avg("stress"), contributors=Count("user", distinct=True)).filter(contributors__gte=3).values("date", "stress").order_by("date"))
    # Small cohorts can reveal one person's wellness values through aggregate changes.
    if len(scores) < 3:
        return Response({"count": 0, "median": None, "std": 0, "at_risk": 0,
                         "risk_counts": {"low": 0, "medium": 0, "high": 0}, "stress_trend": []})
    return Response({
        "count": len(scores), "median": statistics.median(scores),
        "std": statistics.pstdev(scores) if len(scores) > 1 else 0,
        "at_risk": sum(s >= 65 for s in scores),
        "risk_counts": {"low": sum(s < 35 for s in scores), "medium": sum(35 <= s < 65 for s in scores), "high": sum(s >= 65 for s in scores)},
        "stress_trend": trend,
    })

@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsManager])
def team_members(request):
    teams = Team.objects.filter(manager=request.user)
    if request.method == "GET":
        members = User.objects.filter(teams__in=teams).distinct().order_by("username")
        return Response(UserSerializer(members, many=True).data)
    if request.method == "POST":
        required = ("username", "email", "password")
        if any(not isinstance(request.data.get(k), str) or not request.data[k] for k in required):
            return Response({"detail": "username, email, and password are required."}, status=400)
        try:
            from django.core.validators import validate_email
            validate_email(request.data["email"])
            validate_password(request.data["password"])
        except ValidationError as exc:
            return Response({"detail": exc.messages}, status=400)
        if len(request.data["password"]) < 8:
            return Response({"password": ["Ensure this field has at least 8 characters."]}, status=400)
        if User.objects.filter(username=request.data["username"]).exists():
            return Response({"username": ["A user with this username already exists."]}, status=400)
        if User.objects.filter(email__iexact=request.data["email"]).exists():
            return Response({"email": ["A user with this email already exists."]}, status=400)
        try:
            with transaction.atomic():
                member = User.objects.create_user(username=request.data["username"], email=request.data["email"], password=request.data["password"], role=User.Role.EMPLOYEE)
                team = teams.first()
                if not team:
                    team = Team.objects.create(name=f"{request.user.username} Team", manager=request.user)
                team.members.add(member)
        except IntegrityError:
            return Response({"detail": "Unable to create team member."}, status=400)
        return Response(UserSerializer(member).data, status=201)
    member_id = request.data.get("id")
    if not isinstance(member_id, int) or isinstance(member_id, bool):
        return Response({"id": ["A valid member id is required."]}, status=400)
    member = User.objects.filter(id=member_id, teams__in=teams).first()
    if not member:
        return Response({"detail": "Team member not found."}, status=404)
    for team in teams.filter(members=member):
        team.members.remove(member)
    return Response(status=204)

@api_view(["POST"])
@permission_classes([IsManager])
def notify_hr(request):
    recipient = getattr(settings, "HR_EMAIL", "")
    sender = getattr(settings, "DEFAULT_FROM_EMAIL", "")
    if not recipient or not sender:
        return Response({"notified": False, "detail": "HR email is not configured."}, status=503)
    try:
        send_mail("Wellness support requested", "A manager requested follow-up from the HR wellness team.", sender, [recipient], fail_silently=False)
    except Exception:
        return Response({"notified": False, "detail": "Unable to send the HR notification."}, status=502)
    return Response({"notified": True, "detail": "HR wellness team notified."})
