$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot)
$projectRoot = (Get-Location).Path
foreach ($line in Get-Content .env) {
    if ($line -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') }
}
$pgBin = Join-Path $projectRoot '.local/pgsql/bin'
$dataPath = Join-Path $projectRoot '.local/pgdata'
if (!(Test-Path "$pgBin/pg_ctl.exe")) { throw 'Run scripts/setup-postgres.ps1 first.' }
if (!(Test-Path "$dataPath/PG_VERSION")) {
    $passwordFile = Join-Path $projectRoot '.local/init-password'
    [IO.File]::WriteAllText($passwordFile, $env:POSTGRES_PASSWORD)
    try {
        & "$pgBin/initdb.exe" -D $dataPath -U wellwatch_admin --pwfile=$passwordFile --auth=scram-sha-256 --encoding=UTF8 --locale=C
        if ($LASTEXITCODE) { throw 'PostgreSQL initialization failed.' }
        Add-Content "$dataPath/postgresql.conf" "`nlisten_addresses = '127.0.0.1'`nport = $env:POSTGRES_PORT"
    } finally { Remove-Item -LiteralPath $passwordFile -ErrorAction SilentlyContinue }
}
& "$pgBin/pg_ctl.exe" status -D $dataPath *> $null
if ($LASTEXITCODE -ne 0) {
    & "$pgBin/pg_ctl.exe" start -D $dataPath -l (Join-Path $projectRoot '.local/postgres.log') -w
    if ($LASTEXITCODE) { throw 'PostgreSQL failed to start.' }
}
& .venv/Scripts/python.exe scripts/provision-db.py
if ($LASTEXITCODE) { throw 'Database provisioning failed.' }
