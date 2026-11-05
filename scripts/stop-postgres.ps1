$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot)
& .local/pgsql/bin/pg_ctl.exe stop -D .local/pgdata -m fast -w
if ($LASTEXITCODE) { throw 'PostgreSQL did not stop cleanly.' }
