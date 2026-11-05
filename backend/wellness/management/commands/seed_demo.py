"""Create fictional demo accounts and synthetic wellness histories."""
import json
import random
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from wellness.ml import score_for_user
from wellness.models import CheckIn, RiskScore, Team, User


MANAGERS = (("ishaan", "Ishaan", "Kulkarni"), ("neha", "Neha", "Banerjee"))
TEAMS = ("Demo · Product", "Demo · Operations")
EMPLOYEES = (
    ("aarav", "Aarav", "Sharma", 0), ("priya", "Priya", "Iyer", 0),
    ("rohan", "Rohan", "Patel", 0), ("ananya", "Ananya", "Nair", 0),
    ("vikram", "Vikram", "Reddy", 0), ("meera", "Meera", "Joshi", 1),
    ("arjun", "Arjun", "Menon", 1), ("kavya", "Kavya", "Shah", 1),
    ("aditya", "Aditya", "Rao", 1), ("sana", "Sana", "Khan", 1),
)
PROFILES = ((4, 32, 72, 76), (3, 48, 63, 68), (4, 42, 70, 64),
            (3, 58, 61, 62), (4, 37, 74, 79), (3, 51, 66, 72),
            (4, 45, 69, 70), (3, 62, 58, 60), (4, 40, 73, 74),
            (3, 55, 64, 66))
COMMENTS = {
    "good": ("A manageable day, and I had time for a proper lunch.",
             "The team was supportive and I wrapped up on time.",
             "A steady day with a useful break in the afternoon."),
    "mixed": ("A full day of meetings; I took a short walk after work.",
              "Some tasks moved forward, though my calendar felt crowded.",
              "I got through the main work and plan to rest this evening."),
    "hard": ("Several deadlines landed together, so I am taking it slowly tonight.",
             "A tiring day with back-to-back calls; I will make space for a break.",
             "Work felt demanding today, and I am checking in with my team."),
}


class Command(BaseCommand):
    help = "Seed fictional demo accounts and synthetic wellness data (not medical claims)."

    def handle(self, *args, **options):
        manifest = settings.BASE_DIR.parent / ".local" / "demo-accounts.json"
        credentials = self._read_manifest(manifest)
        analyzer = SentimentIntensityAnalyzer()
        new_credentials = {}
        rng = random.Random()

        with transaction.atomic():
            managers = [self._get_user(key, first, last, "manager", new_credentials)
                        for key, first, last in MANAGERS]
            teams = []
            for name, manager in zip(TEAMS, managers):
                team = Team.objects.filter(name=name).first()
                if team and team.manager_id != manager.id:
                    raise CommandError(f"Refusing to change existing team {name!r}.")
                teams.append(team or Team.objects.create(name=name, manager=manager))

            for index, (key, first, last, team_index) in enumerate(EMPLOYEES):
                user = self._get_user(key, first, last, "employee", new_credentials)
                teams[team_index].members.add(user)
                baseline = PROFILES[index]
                for offset in range(27, -1, -1):
                    day = timezone.localdate() - timedelta(days=offset)
                    if CheckIn.objects.filter(user=user, date=day).exists():
                        continue
                    mood_base, stress_base, energy_base, sleep_base = baseline
                    demanding = rng.random() < .13
                    mood = max(1, min(5, round(rng.gauss(mood_base - demanding * .5, .7))))
                    stress = max(0, min(100, round(rng.gauss(stress_base + demanding * 18, 12))))
                    energy = max(0, min(100, round(rng.gauss(energy_base - demanding * 14, 10))))
                    sleep = max(0, min(100, round(rng.gauss(sleep_base - demanding * 8, 11))))
                    kind = "hard" if demanding or stress >= 65 else "good" if mood >= 4 and stress < 40 else "mixed"
                    comment = rng.choice(COMMENTS[kind])
                    sentiment = analyzer.polarity_scores(comment)["compound"]
                    checkin = CheckIn.objects.create(
                        user=user, date=day, mood=mood, stress=stress, energy=energy,
                        sleep=sleep, comment=comment, sentiment=sentiment,
                        sentiment_label="positive" if sentiment >= .05 else "negative" if sentiment <= -.05 else "neutral",
                    )
                    score, level, explanation = score_for_user(checkin)
                    RiskScore.objects.get_or_create(
                        user=user, checkin=checkin,
                        defaults={"score": score, "level": level, "explanation": explanation},
                    )

            credentials.update(new_credentials)
            manifest.parent.mkdir(parents=True, exist_ok=True)
            pending = manifest.with_suffix(".tmp")
            try:
                pending.write_text(json.dumps({"accounts": credentials}, indent=2) + "\n", encoding="utf-8")
                pending.chmod(0o600)
                pending.replace(manifest)
            except OSError as error:
                pending.unlink(missing_ok=True)
                raise CommandError("Unable to save private demo logins; no accounts were created.") from error
        self.stdout.write(self.style.SUCCESS(
            f"Seeded fictional demo users and histories. Credentials: {manifest}. Synthetic data only; no medical claims."
        ))

    @staticmethod
    def _read_manifest(path):
        if not path.exists():
            return {}
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            accounts = data["accounts"]
            if not isinstance(accounts, dict):
                raise ValueError("accounts must be an object")
            return accounts
        except (OSError, ValueError, KeyError, TypeError) as error:
            raise CommandError(f"Cannot read demo credentials manifest {path}: {error}") from error

    @staticmethod
    def _get_user(key, first, last, role, new_credentials):
        username = f"demo.{key}"
        email = f"demo.{key}@example.test"
        user = User.objects.filter(username=username).first()
        if user:
            if user.email != email or user.role != role:
                raise CommandError(f"Refusing to overwrite non-demo account {username!r}.")
            return user
        password = secrets.token_urlsafe(24)
        user = User.objects.create_user(
            username=username, email=email, first_name=first, last_name=last,
            password=password, role=role, share_with_manager=(role == "employee"),
        )
        new_credentials[username] = {"name": f"{first} {last}", "email": email, "role": role, "password": password}
        return user
