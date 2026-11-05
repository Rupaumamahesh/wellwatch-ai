# WellWatch AI

React/Vite frontend and Django REST API for employee check-ins and consent-based team summaries. The violet/slate dashboard design is retained.

## Run locally on Windows

Use Node 24+, Python 3.11, and uv. Copy `.env.example` to `.env` and set a private Django secret and PostgreSQL password. Do not commit `.env`.

```powershell
npm ci
uv venv .venv --python 3.11
uv pip install --python .venv/Scripts/python.exe -r backend/requirements.txt
./scripts/setup-postgres.ps1
./run-local.ps1
```

Open http://127.0.0.1:5173. The local PostgreSQL cluster lives under ignored `.local/`; the startup script uses the project PostgreSQL port. `run-local.ps1` applies migrations and starts the API and Vite frontend. Review emails use Django's local file backend and are written under ignored `backend/local-emails/`.

Create the first account, then promote it to manager with the Django shell if needed:

```powershell
.venv/Scripts/python.exe backend/manage.py shell
```

```python
from wellness.models import User
User.objects.filter(username="your-user").update(role="manager")
```

## Docker Compose stack

Docker Compose runs PostgreSQL, Django with Waitress, the Nginx frontend/reverse proxy, and Mailpit as a local SMTP review inbox. Set private values in `.env` before starting; the Compose service requires `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `DJANGO_SECRET_KEY`.

```powershell
docker compose up --build -d
```

Open the app at http://127.0.0.1:8080 and Mailpit at http://127.0.0.1:8025. The database is persistent in the `postgres_data` volume. Compose migrations run when the backend starts. Mailpit accepts messages for review and does not deliver them externally. To route HR notifications in a real deployment, configure a real SMTP host, port, TLS mode, username, password, sender, and `HR_EMAIL` through the deployment's secret manager; no provider credentials are included here.

For production, set `DJANGO_DEBUG=0`, replace the Mailpit SMTP settings with a real provider, and provide a random `DJANGO_SECRET_KEY`, allowed host names, SMTP credentials, sender and HR addresses, and the public browser origin in `CORS_ALLOWED_ORIGINS`. Keep the web service behind a TLS terminating reverse proxy and preserve the incoming `X-Forwarded-Proto` header. The published Compose ports bind to loopback so a host proxy can reach them; do not expose PostgreSQL or Mailpit publicly. Back up `postgres_data` and verify restores before upgrading.

## Wellness risk model

`train_risk_model` saves an ignored, trusted local `backend/wellness/risk_model.pkl`. It trains a real RandomForestClassifier on reproducible synthetic, rule-labeled data. This is a demonstration, not a clinically validated prediction model. It includes current signals, 7/14-calendar-day averages, prior-week comparisons, streaks, and feature-importance-ranked signal explanations. Without the artifact, scoring falls back to deterministic rules. Restart the API after training. Never load downloaded or user-supplied pickle files. Real deployment needs consented labeled data and independent model evaluation.

## Checks

```powershell
npm run lint
npm run build
npm audit --audit-level=high
.venv/Scripts/python.exe backend/manage.py test wellness
.venv/Scripts/python.exe backend/manage.py makemigrations --check --dry-run
```

GitHub Actions runs frontend checks and backend tests against PostgreSQL 17. Local commits are GPG-signed; nothing is pushed automatically.
