# WellWatch AI

React/Vite frontend and Django REST API for employee check-ins and consent-based team summaries. The original violet/slate design is retained.

## Local Windows review

Use Node 24+ and Python 3.11. This project uses npm and uv; no global installs are needed.

```powershell
npm ci
uv venv .venv --python 3.11
uv pip install --python .venv/Scripts/python.exe -r backend/requirements.txt
$env:DATABASE_URL = 'sqlite:///dev.sqlite3'
$env:TZ = 'Asia/Kolkata'
.venv/Scripts/python.exe backend/manage.py migrate
.venv/Scripts/python.exe backend/manage.py train_risk_model --seed 42
.venv/Scripts/python.exe backend/manage.py createsuperuser
./run-local.ps1
```

Open http://127.0.0.1:5173. API: http://127.0.0.1:8000/api. A superuser defaults to the employee role; set `User.role` to `manager` in the Django shell to access team management. Accounts are created through manager team management, not public registration. Review accounts already exist in this machine's ignored local database; credentials are in the delivery chat.

## Model

`train_risk_model` saves an ignored, trusted local `backend/wellness/risk_model.pkl`. It trains a real RandomForestClassifier on reproducible **synthetic, rule-labeled data**. This is a demonstration, not a clinically validated prediction model. It includes current signals, 7/14-calendar-day averages, prior-week comparisons, streaks, and feature-importance-ranked signal explanations. Without the artifact, scoring falls back to deterministic rules. Restart the API after training. Never load downloaded or user-supplied pickle files. Real deployment needs consented labeled data and independent model evaluation.

## PostgreSQL

`compose.yaml` provisions PostgreSQL 17 with a persistent volume bound to loopback. Docker must be installed first. This checkout has generated credentials in ignored `.env`; `.env.example` contains placeholders only. Docker Compose reads `.env`; Django intentionally reads environment variables, not dotenv files.

```powershell
docker compose up -d db
# Set POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD from your private .env.
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
.venv/Scripts/python.exe backend/manage.py migrate
```

SQLite review data is not automatically copied to PostgreSQL. Back up the database before migration or deployment. PostgreSQL was not available on the review machine.

## Email and deployment

Development email is delivered to ignored `backend/local-emails/`; HR notifications can be inspected there. Configure `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, SMTP credentials and `HR_EMAIL` for real delivery. Never commit credentials. See `.env.example` for the supported settings; export those values through your hosting secret manager.

Build frontend with `npm run build`; serve `dist/` through an HTTPS static host with SPA fallback to index.html. Set `VITE_API_URL` to the public API URL **before building**. Run API behind an HTTPS reverse proxy:

```powershell
$env:DJANGO_SETTINGS_MODULE='config.settings'
$env:DJANGO_DEBUG='0'
# Set a random DJANGO_SECRET_KEY, allowed hosts, CORS origins, DB and SMTP secrets.
.venv/Scripts/waitress-serve.exe --listen=127.0.0.1:8000 config.wsgi:application
```

The reverse proxy must pass HTTPS requests correctly; avoid TLS redirect loops. Do not expose development servers publicly. Production rejects the development secret and enables secure cookies, TLS redirects, and HSTS. Deployment itself is not performed by this repository's CI. Configure database backups and restore checks on your host.

## Checks

```powershell
npm run lint
npm run build
npm audit --audit-level=high
$env:DATABASE_URL='sqlite:///dev.sqlite3'
.venv/Scripts/python.exe backend/manage.py test wellness
.venv/Scripts/python.exe backend/manage.py makemigrations --check --dry-run
```

GitHub Actions runs frontend checks and backend tests on future pushes. Local commits are GPG-signed; nothing is pushed automatically.
