# WellWatch AI — macOS Setup Guide

Complete step-by-step guide to get WellWatch AI running on macOS from scratch.

---

## Prerequisites

| Tool | Required Version | Check Command |
|---|---|---|
| Homebrew | Any | `brew --version` |
| Node.js | 24+ | `node --version` |
| Python | 3.11 | `python3.11 --version` |
| uv | Any | `uv --version` |
| PostgreSQL | 17+ | `psql --version` |

---

## Step 1 — Install Prerequisites

```bash
# Install Homebrew (skip if already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 24
brew install node@24
echo 'export PATH="/opt/homebrew/opt/node@24/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Install Python 3.11
brew install python@3.11

# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.zshrc

# Install PostgreSQL 18
brew install postgresql@18
echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Verify everything installed:**
```bash
brew --version
node --version       # should be v24.x.x
python3.11 --version # should be 3.11.x
uv --version
psql --version       # should be 17.x or 18.x
```

---

## Step 2 — Clone the Repo

```bash
cd ~
git clone https://github.com/Rupaumamahesh/wellwatch-ai.git
cd wellwatch-ai
code .
```

> `code .` opens the project in VS Code. If the command is not found, open VS Code manually and use File → Open Folder.

---

## Step 3 — Set Up the Database

```bash
# Start PostgreSQL
brew services start postgresql@18

# Create the database user and database
psql postgres -c "CREATE USER wellwatch WITH PASSWORD 'wellwatch123';"
psql postgres -c "CREATE DATABASE wellwatch OWNER wellwatch;"
```

---

## Step 4 — Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` in VS Code and confirm these values match exactly:

```
POSTGRES_DB=wellwatch
POSTGRES_USER=wellwatch
POSTGRES_PASSWORD=wellwatch123
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=my-super-secret-key-change-this-123456
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080
TZ=Asia/Kolkata
```

> **Important:** `POSTGRES_PORT` must be `5432` on macOS (not `55432` which is Windows-only).

---

## Step 5 — Set Up the Python Backend

```bash
# Create virtual environment with Python 3.11
uv venv --python 3.11
source .venv/bin/activate

# Install all Python dependencies
uv pip install -r backend/requirements.txt

# Apply database migrations
python backend/manage.py migrate

# Seed demo users and check-in data
python backend/manage.py seed_demo

# Train the ML risk model
python backend/manage.py train_risk_model --seed 42
```

**Reset demo account passwords to something memorable:**
```bash
python backend/manage.py shell -c "
from wellness.models import User
for email in ['demo.ishaan@example.test', 'demo.neha@example.test']:
    u = User.objects.get(email=email); u.set_password('Manager@123'); u.save()
for u in User.objects.filter(role='employee'):
    u.set_password('Employee@123'); u.save()
print('Done')
"
```

**Create the admin account:**
```bash
python backend/manage.py shell -c "
from wellness.models import User
User.objects.create_user(username='admin', email='admin@wellwatch.local', password='Admin@123', role='admin', first_name='Platform', last_name='Admin')
print('Admin created')
"
```

---

## Step 6 — Set Up the Frontend

```bash
npm install
```

---

## Step 7 — Run the App

Open **two separate terminal tabs** and run one command in each.

**Terminal 1 — Backend (Django):**
```bash
cd ~/wellwatch-ai
source .venv/bin/activate
python backend/manage.py runserver
# Running at http://127.0.0.1:8000
```

**Terminal 2 — Frontend (Vite):**
```bash
cd ~/wellwatch-ai
npm run dev
# Running at http://localhost:5173
```

> PostgreSQL must be running before starting the backend. If not: `brew services start postgresql@18`

---

## Step 8 — Open the App

Go to **http://localhost:5173** in your browser.

---

## Login Credentials

### Managers
| Name | Email | Password |
|---|---|---|
| Ishaan Kulkarni | demo.ishaan@example.test | `Manager@123` |
| Neha Banerjee | demo.neha@example.test | `Manager@123` |

### Employees
| Name | Email | Password |
|---|---|---|
| Aarav Sharma | demo.aarav@example.test | `Employee@123` |
| Priya Iyer | demo.priya@example.test | `Employee@123` |
| Rohan Patel | demo.rohan@example.test | `Employee@123` |
| Ananya Nair | demo.ananya@example.test | `Employee@123` |
| Vikram Reddy | demo.vikram@example.test | `Employee@123` |
| Meera Joshi | demo.meera@example.test | `Employee@123` |
| Arjun Menon | demo.arjun@example.test | `Employee@123` |
| Kavya Shah | demo.kavya@example.test | `Employee@123` |
| Aditya Rao | demo.aditya@example.test | `Employee@123` |
| Sana Khan | demo.sana@example.test | `Employee@123` |

### Admin
| Email | Password |
|---|---|
| admin@wellwatch.local | `Admin@123` |

---

## How to Restart the Servers (Next Time)

You only need to repeat Step 7 when coming back to the project. PostgreSQL usually starts automatically on login but check if it is not running.

```bash
# If PostgreSQL is not running:
brew services start postgresql@18

# Terminal 1 — Backend
cd ~/wellwatch-ai && source .venv/bin/activate && python backend/manage.py runserver

# Terminal 2 — Frontend
cd ~/wellwatch-ai && npm run dev
```

---

## Troubleshooting

### `psql: command not found`
**Why:** PostgreSQL binaries are not on your PATH.
**Fix:**
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

### `brew: command not found`
**Why:** Homebrew is not installed or not on PATH.
**Fix:** Install Homebrew from https://brew.sh or restart your terminal after installation. On Apple Silicon Macs, Homebrew installs to `/opt/homebrew/` — make sure `/opt/homebrew/bin` is in your PATH.

---

### `uv: command not found`
**Why:** uv was installed but the shell was not reloaded.
**Fix:**
```bash
source ~/.zshrc
# or restart the terminal
```

---

### `python3.11: No such file or directory`
**Why:** Python 3.11 is not installed or not linked.
**Fix:**
```bash
brew install python@3.11
# Then use python3.11 explicitly or create the venv with:
uv venv --python 3.11
```

---

### `connection refused` on port 5432 (Django DB error)
**Why:** PostgreSQL is not running.
**Fix:**
```bash
brew services start postgresql@18
# Verify it is running:
brew services list | grep postgresql
```

---

### `role "wellwatch" does not exist` or `database "wellwatch" does not exist`
**Why:** Step 3 was skipped or the database was dropped.
**Fix:**
```bash
psql postgres -c "CREATE USER wellwatch WITH PASSWORD 'wellwatch123';"
psql postgres -c "CREATE DATABASE wellwatch OWNER wellwatch;"
```

---

### `django.db.utils.OperationalError: connection to server failed`
**Why:** The `.env` file has the wrong `POSTGRES_PORT`. Windows uses `55432`, macOS uses `5432`.
**Fix:** Open `.env` and set:
```
POSTGRES_PORT=5432
```

---

### `ModuleNotFoundError` when running Django
**Why:** The virtual environment is not activated.
**Fix:**
```bash
source .venv/bin/activate
# Your prompt should show (.venv) before the path
```

---

### `Invalid credentials` on login
**Why:** Passwords were not reset after seeding. The seed command generates random passwords by default.
**Fix:** Run the password reset block from Step 5, or check `.local/demo-accounts.json` for the original generated passwords.

---

### Login redirects back to login page (wrong role)
**Why:** The role dropdown on the login page must match the account's actual role in the database. Selecting "Employee" with a manager email will fail.
**Fix:** Select the correct role from the dropdown:
- Managers → select **Manager**
- Employees → select **Employee**
- Admin → select **Admin**

---

### `npm run dev` fails with `vite: command not found`
**Why:** Node modules were not installed.
**Fix:**
```bash
cd ~/wellwatch-ai
npm install
npm run dev
```

---

### Port 5173 or 8000 already in use
**Why:** A previous server process is still running.
**Fix:**
```bash
# Kill backend
pkill -f "manage.py runserver"

# Kill frontend
pkill -f "vite"

# Then start them again normally
```

---

### `seed_demo` fails with duplicate key error
**Why:** Demo data was already seeded. This command is safe to re-run — it is idempotent and skips existing records.
**Fix:** Ignore the error, the existing data is intact.

---

### Admin panel shows "Invalid credentials"
**Why:** The admin account was not created yet.
**Fix:** Run the admin creation command from Step 5.

---

### `git push` denied (403)
**Why:** Your GitHub account does not have collaborator access to the repo.
**Fix:** Ask the repo owner (Rupaumamahesh) to add your GitHub username as a collaborator under Settings → Collaborators.
