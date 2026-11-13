import binascii
import statistics
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import CheckIn, RiskScore, Team, User
from .permissions import IsAdmin, IsManager
from .serializers import CheckInSerializer, UserSerializer

@api_view(["GET", "PATCH"])
def profile(request):
    if request.method == "PATCH":
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(UserSerializer(request.user).data)

@api_view(["PATCH"])
def change_password(request):
    data = request.data if hasattr(request.data, "get") else {}
    current_password, new_password = data.get("current_password"), data.get("new_password")
    if not isinstance(current_password, str) or not isinstance(new_password, str) or not new_password:
        return Response({"detail": "current_password and new_password are required."}, status=400)
    if not request.user.check_password(current_password):
        return Response({"current_password": ["Current password is incorrect."]}, status=400)
    try:
        validate_password(new_password, request.user)
    except ValidationError as exc:
        return Response({"new_password": exc.messages}, status=400)
    request.user.set_password(new_password)
    request.user.save(update_fields=["password"])
    Token.objects.filter(user=request.user).delete()
    return Response({"detail": "Password updated. Please sign in again."})

@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    if not settings.EMAIL_FEATURES_ENABLED:
        return Response({"detail": "Email delivery is planned for a future release."}, status=503)
    email = request.data.get("email") if hasattr(request.data, "get") else None
    if isinstance(email, str):
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
            reset_url = f"{frontend_url.rstrip('/')}/password-reset?uid={uid}&token={token}"
            sender = getattr(settings, "DEFAULT_FROM_EMAIL", "")
            if sender:
                send_mail("Reset your Wellwatch password", f"Use this link to reset your password: {reset_url}",
                          sender, [user.email], fail_silently=True)
    return Response({"detail": "If an account matches that email, password reset instructions have been sent."})

@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    if not settings.EMAIL_FEATURES_ENABLED:
        return Response({"detail": "Email delivery is planned for a future release."}, status=503)
    data = request.data if hasattr(request.data, "get") else {}
    uid, token, password = data.get("uid"), data.get("token"), data.get("new_password")
    if not all(isinstance(value, str) and value for value in (uid, token, password)):
        return Response({"detail": "uid, token, and new_password are required."}, status=400)
    try:
        user = User.objects.get(pk=urlsafe_base64_decode(uid).decode(), is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError, binascii.Error):
        user = None
    if not user or not default_token_generator.check_token(user, token):
        return Response({"detail": "This password reset link is invalid or has expired."}, status=400)
    try:
        validate_password(password, user)
    except ValidationError as exc:
        return Response({"new_password": exc.messages}, status=400)
    user.set_password(password)
    user.save(update_fields=["password"])
    Token.objects.filter(user=user).delete()
    return Response({"detail": "Password reset. Please sign in."})

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
def history(request):
    rows = CheckIn.objects.filter(user=request.user).select_related("risk").order_by("date", "created_at")
    return Response(CheckInSerializer(rows, many=True).data)

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
    return Response(_aggregate_team_stats(members))

@api_view(["GET"])
def personal_team_stats(request):
    teams = request.user.teams.all()
    members = User.objects.filter(teams__in=teams, share_with_manager=True).distinct()
    return Response(_aggregate_team_stats(members))

def _aggregate_team_stats(members):
    latest_by_member = []
    for member in members:
        latest = _latest_risk(member)
        if latest:
            latest_by_member.append(latest)
    scores = [r.score for r in latest_by_member]
    since = timezone.localdate() - timedelta(days=27)
    daily_stress = {}
    for row in CheckIn.objects.filter(user__in=members, date__gte=since).values("date", "stress").order_by("date"):
        daily_stress.setdefault(row["date"], []).append(row["stress"])
    trend = [{"date": date, "stress": statistics.median(values)}
             for date, values in daily_stress.items() if len(values) >= 3]
    # Small cohorts can reveal one person's wellness values through aggregate changes.
    if len(scores) < 3:
        return {"count": 0, "median": None, "std": 0, "at_risk": 0,
                "risk_counts": {"low": 0, "medium": 0, "high": 0}, "stress_trend": []}
    return {
        "count": len(scores), "median": statistics.median(scores),
        "std": statistics.pstdev(scores) if len(scores) > 1 else 0,
        "at_risk": sum(s >= 65 for s in scores),
        "risk_counts": {"low": sum(s < 35 for s in scores), "medium": sum(35 <= s < 65 for s in scores), "high": sum(s >= 65 for s in scores)},
        "stress_trend": trend,
    }

@api_view(["GET", "PATCH"])
@permission_classes([IsManager])
def team_profile(request):
    team = Team.objects.filter(manager=request.user).first()
    if not team:
        team = Team.objects.create(name=f"{request.user.username} Team", manager=request.user)
    if request.method == "PATCH":
        name = request.data.get("name")
        if not isinstance(name, str) or not name.strip():
            return Response({"name": ["A team name is required."]}, status=400)
        name = name.strip()[:120]
        if Team.objects.exclude(pk=team.pk).filter(name__iexact=name).exists():
            return Response({"name": ["A team with this name already exists."]}, status=400)
        team.name = name
        team.save(update_fields=["name"])
    return Response({"id": team.id, "name": team.name})

@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsManager])
def team_members(request):
    teams = Team.objects.filter(manager=request.user)
    if request.method == "GET":
        members = User.objects.filter(teams__in=teams).distinct().order_by("username")
        return Response(UserSerializer(members, many=True).data)
    if request.method == "POST":
        # Add existing user by user_id
        user_id = request.data.get("user_id") if hasattr(request.data, "get") else None
        if isinstance(user_id, int) and not isinstance(user_id, bool):
            user = User.objects.filter(id=user_id, is_active=True).first()
            if not user:
                return Response({"detail": "User not found."}, status=404)
            team = teams.first()
            if not team:
                team = Team.objects.create(name=f"{request.user.username} Team", manager=request.user)
            if team.members.filter(id=user_id).exists():
                return Response({"detail": "User is already a member of this team."}, status=400)
            team.members.add(user)
            return Response(UserSerializer(user).data, status=201)
        # Create new user and add to team
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

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_stats(request):
    total_users = User.objects.count()
    by_role = {role: User.objects.filter(role=role).count() for role, _ in User.Role.choices}
    since_30 = timezone.localdate() - timedelta(days=30)
    since_7 = timezone.localdate() - timedelta(days=7)
    total_checkins = CheckIn.objects.filter(date__gte=since_30).count()
    active_users = User.objects.filter(checkins__date__gte=since_7).distinct().count()
    risk_qs = RiskScore.objects.filter(checkin__date__gte=since_30)
    risk_counts = {level: risk_qs.filter(level=level).count() for level, _ in RiskScore.Level.choices}
    total_teams = Team.objects.count()
    return Response({
        "total_users": total_users,
        "by_role": by_role,
        "total_checkins_30d": total_checkins,
        "active_users_7d": active_users,
        "risk_counts_30d": risk_counts,
        "total_teams": total_teams,
    })

def _user_detail(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_active": user.is_active,
        "date_joined": user.date_joined.date().isoformat(),
    }

@api_view(["GET", "POST"])
@permission_classes([IsAdmin])
def admin_users(request):
    if request.method == "GET":
        users = User.objects.order_by("date_joined")
        return Response([_user_detail(u) for u in users])
    data = request.data if hasattr(request.data, "get") else {}
    required = ("username", "email", "password", "role")
    if any(not isinstance(data.get(k), str) or not data[k] for k in required):
        return Response({"detail": "username, email, password, and role are required."}, status=400)
    if data["role"] not in [r for r, _ in User.Role.choices]:
        return Response({"role": ["Invalid role."]}, status=400)
    from django.core.validators import validate_email as _validate_email
    try:
        _validate_email(data["email"])
        validate_password(data["password"])
    except ValidationError as exc:
        return Response({"detail": exc.messages}, status=400)
    if User.objects.filter(username__iexact=data["username"]).exists():
        return Response({"username": ["A user with this username already exists."]}, status=400)
    if User.objects.filter(email__iexact=data["email"]).exists():
        return Response({"email": ["A user with this email already exists."]}, status=400)
    user = User.objects.create_user(
        username=data["username"], email=data["email"], password=data["password"],
        role=data["role"], first_name=data.get("first_name", ""), last_name=data.get("last_name", ""),
    )
    return Response(_user_detail(user), status=201)

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAdmin])
def admin_user_detail(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found."}, status=404)
    if request.method == "DELETE":
        if user == request.user:
            return Response({"detail": "You cannot delete your own account."}, status=400)
        user.delete()
        return Response(status=204)
    data = request.data if hasattr(request.data, "get") else {}
    if "role" in data:
        if data["role"] not in [r for r, _ in User.Role.choices]:
            return Response({"role": ["Invalid role."]}, status=400)
        user.role = data["role"]
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            return Response({"is_active": ["Must be a boolean."]}, status=400)
        if user == request.user and not data["is_active"]:
            return Response({"detail": "You cannot deactivate your own account."}, status=400)
        user.is_active = data["is_active"]
    if "first_name" in data:
        user.first_name = data["first_name"]
    if "last_name" in data:
        user.last_name = data["last_name"]
    user.save()
    return Response(_user_detail(user))

@api_view(["POST"])
@permission_classes([IsAdmin])
def admin_reset_password(request, user_id):
    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found."}, status=404)
    new_password = request.data.get("new_password") if hasattr(request.data, "get") else None
    if not isinstance(new_password, str) or not new_password:
        return Response({"detail": "new_password is required."}, status=400)
    try:
        validate_password(new_password, user)
    except ValidationError as exc:
        return Response({"new_password": exc.messages}, status=400)
    user.set_password(new_password)
    user.save(update_fields=["password"])
    Token.objects.filter(user=user).delete()
    return Response({"detail": "Password reset successfully."})

@api_view(["GET", "POST"])
@permission_classes([IsAdmin])
def admin_teams(request):
    if request.method == "GET":
        teams = Team.objects.select_related("manager").prefetch_related("members")
        return Response([{
            "id": t.id, "name": t.name,
            "manager": {"id": t.manager.id, "username": t.manager.username},
            "member_count": t.members.count(),
            "members": [{"id": m.id, "username": m.username} for m in t.members.all()],
        } for t in teams])
    data = request.data if hasattr(request.data, "get") else {}
    name = data.get("name")
    manager_id = data.get("manager_id")
    if not isinstance(name, str) or not name.strip():
        return Response({"name": ["A team name is required."]}, status=400)
    if not isinstance(manager_id, int):
        return Response({"manager_id": ["A valid manager id is required."]}, status=400)
    manager = User.objects.filter(id=manager_id, role=User.Role.MANAGER).first()
    if not manager:
        return Response({"manager_id": ["No manager found with this id."]}, status=400)
    if Team.objects.filter(name__iexact=name.strip()).exists():
        return Response({"name": ["A team with this name already exists."]}, status=400)
    team = Team.objects.create(name=name.strip()[:120], manager=manager)
    return Response({"id": team.id, "name": team.name,
                     "manager": {"id": manager.id, "username": manager.username},
                     "member_count": 0}, status=201)

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def admin_team_detail(request, team_id):
    team = Team.objects.filter(id=team_id).first()
    if not team:
        return Response({"detail": "Team not found."}, status=404)
    team.delete()
    return Response(status=204)

@api_view(["POST"])
@permission_classes([IsAdmin])
def admin_team_members(request, team_id):
    team = Team.objects.filter(id=team_id).first()
    if not team:
        return Response({"detail": "Team not found."}, status=404)
    data = request.data if hasattr(request.data, "get") else {}
    user_id = data.get("user_id")
    if not isinstance(user_id, int) or isinstance(user_id, bool):
        return Response({"user_id": ["A valid user id is required."]}, status=400)
    user = User.objects.filter(id=user_id, is_active=True).first()
    if not user:
        return Response({"detail": "User not found."}, status=404)
    if team.members.filter(id=user_id).exists():
        return Response({"detail": "User is already a member of this team."}, status=400)
    team.members.add(user)
    return Response({"id": user.id, "username": user.username, "email": user.email}, status=201)

@api_view(["DELETE"])
@permission_classes([IsAdmin])
def admin_team_member_detail(request, team_id, user_id):
    team = Team.objects.filter(id=team_id).first()
    if not team:
        return Response({"detail": "Team not found."}, status=404)
    user = team.members.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User is not a member of this team."}, status=404)
    team.members.remove(user)
    return Response(status=204)

@api_view(["GET"])
@permission_classes([IsManager])
def team_eligible_members(request):
    teams = Team.objects.filter(manager=request.user)
    already_in_team = User.objects.filter(teams__in=teams).distinct().values_list("id", flat=True)
    eligible = User.objects.filter(is_active=True).exclude(id__in=already_in_team).exclude(id=request.user.id).order_by("username")
    return Response([{"id": u.id, "username": u.username, "email": u.email, "role": u.role} for u in eligible])

@api_view(["POST"])
@permission_classes([IsManager])
def notify_hr(request):
    if not settings.EMAIL_FEATURES_ENABLED:
        return Response({"detail": "Email delivery is planned for a future release."}, status=503)
    recipient = getattr(settings, "HR_EMAIL", "")
    sender = getattr(settings, "DEFAULT_FROM_EMAIL", "")
    if not recipient or not sender:
        return Response({"notified": False, "detail": "HR email is not configured."}, status=503)
    try:
        send_mail("Wellness support requested", "A manager requested follow-up from the HR wellness team.", sender, [recipient], fail_silently=False)
    except Exception:
        return Response({"notified": False, "detail": "Unable to send the HR notification."}, status=502)
    return Response({"notified": True, "detail": "HR wellness team notified."})
