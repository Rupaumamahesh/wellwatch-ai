$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Test-Path .venv/Scripts/python.exe)) { throw 'Install dependencies first; see README.' }
if (!(Test-Path .env)) { throw 'Create .env with private PostgreSQL credentials; see .env.example.' }
& ./scripts/start-postgres.ps1
if ($LASTEXITCODE) { throw 'PostgreSQL setup failed.' }
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:TZ = 'Asia/Kolkata'
$python = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
& $python backend/manage.py migrate
if ($LASTEXITCODE) { throw 'Database migration failed.' }
if (!(Test-Path backend/wellness/risk_model.pkl)) {
    & $python backend/manage.py train_risk_model --seed 42
    if ($LASTEXITCODE) { throw 'Model training failed.' }
}
Start-Process -FilePath $python -ArgumentList 'backend/manage.py','runserver','127.0.0.1:8000','--noreload' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
& npm.cmd run dev -- --host 127.0.0.1 --strictPort
