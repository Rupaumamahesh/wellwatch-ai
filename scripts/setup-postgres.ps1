$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot)
New-Item -ItemType Directory -Force .local | Out-Null
$archive = Join-Path $PWD '.local/postgresql.zip'
if (!(Test-Path .local/pgsql/bin/pg_ctl.exe)) {
    if (!(Test-Path $archive)) {
        Invoke-WebRequest 'https://get.enterprisedb.com/postgresql/postgresql-17.11-3-windows-x64-binaries.zip' -OutFile $archive
    }
    if ((Get-FileHash $archive -Algorithm SHA256).Hash -ne '4B8DB0930C38F6EF845DB919551DEDDA3B6B845AEB0927B3D79A6E8E9E4537CF') {
        throw 'PostgreSQL archive checksum mismatch; remove the archive and retry.'
    }
    & .venv/Scripts/python.exe scripts/extract-postgres.py
    if ($LASTEXITCODE) { throw 'PostgreSQL extraction failed.' }
}
if (!(Test-Path .env)) {
    & .venv/Scripts/python.exe -c "from pathlib import Path; import secrets; Path('.env').write_text('POSTGRES_DB=wellwatch\nPOSTGRES_USER=wellwatch\nPOSTGRES_PASSWORD='+secrets.token_urlsafe(32)+'\nPOSTGRES_HOST=127.0.0.1\nPOSTGRES_PORT=55432\nDJANGO_SECRET_KEY='+secrets.token_urlsafe(48)+'\nDJANGO_DEBUG=1\nTZ=Asia/Kolkata\n')"
    if ($LASTEXITCODE) { throw 'Local credentials setup failed.' }
}
& "$PSScriptRoot/start-postgres.ps1"
