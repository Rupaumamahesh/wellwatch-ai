$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
foreach ($tool in @('node', 'npm.cmd', 'uv')) {
    if (!(Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Install $tool first; see README." }
}
$major = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($major -lt 24) { throw 'Node.js 24 or newer is required.' }
if (!(Test-Path .venv/Scripts/python.exe)) {
    & uv venv .venv --python 3.11
    if ($LASTEXITCODE) { throw 'Python environment creation failed.' }
}
& uv pip install --python .venv/Scripts/python.exe -r backend/requirements.txt
if ($LASTEXITCODE) { throw 'Backend dependency installation failed.' }
& npm.cmd ci
if ($LASTEXITCODE) { throw 'Frontend dependency installation failed. Stop any running Vite process and retry.' }
& ./scripts/setup-postgres.ps1
if ($LASTEXITCODE) { throw 'PostgreSQL setup failed.' }
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
& .venv/Scripts/python.exe backend/manage.py migrate
if ($LASTEXITCODE) { throw 'Database migration failed.' }
& .venv/Scripts/python.exe backend/manage.py train_risk_model --seed 42
if ($LASTEXITCODE) { throw 'Model training failed.' }
& .venv/Scripts/python.exe backend/manage.py seed_demo
if ($LASTEXITCODE) { throw 'Demo data creation failed.' }
Write-Output 'Setup complete. Demo logins are in .local/demo-accounts.json. Start with ./run-local.ps1.'
