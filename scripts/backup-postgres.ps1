$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot)
foreach ($line in Get-Content .env) {
    if ($line -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') }
}
New-Item -ItemType Directory -Force .local/backups | Out-Null
$backup = Join-Path $PWD ('.local/backups/wellwatch-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')
$env:PGPASSWORD = $env:POSTGRES_PASSWORD
try {
    & .local/pgsql/bin/pg_dump.exe -h $env:POSTGRES_HOST -p $env:POSTGRES_PORT -U $env:POSTGRES_USER -d $env:POSTGRES_DB -Fc -f $backup
    if ($LASTEXITCODE) { throw 'Database backup failed.' }
    Write-Output "Backup saved to $backup"
} finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
