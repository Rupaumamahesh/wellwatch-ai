$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:DATABASE_URL = 'sqlite:///dev.sqlite3'
$env:TZ = 'Asia/Kolkata'
$python = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (!(Test-Path $python)) { throw 'Create .venv and install backend/requirements.txt first; see README.' }
& $python backend/manage.py migrate
if ($LASTEXITCODE) { throw 'Database migration failed' }
Start-Process -FilePath $python -ArgumentList 'backend/manage.py','runserver','127.0.0.1:8000','--noreload' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
& npm.cmd run dev -- --host 127.0.0.1
