Param(
  [string]$DB_HOST = $env:DB_HOST = 'localhost',
  [string]$DB_USER = $env:DB_USER = 'root',
  [string]$DB_PASSWORD = $env:DB_PASSWORD = '',
  [string]$DB_NAME = $env:DB_NAME = 'ERP2'
)

$mysql = 'mysql'

function Invoke-MySql {
    param([string]$File, [string]$Description)
    Write-Host "[deploy] $Description" -ForegroundColor Cyan
    & $mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < $File 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed: $Description" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] $Description" -ForegroundColor Green
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[deploy] ============================================" -ForegroundColor Yellow
Write-Host "[deploy] ERP2 Deployment with Gemini System" -ForegroundColor Yellow
Write-Host "[deploy] ============================================" -ForegroundColor Yellow

Invoke-MySql "$scriptDir\01-schemaGPT.sql" "Schema (01-schemaGPT.sql)"
Invoke-MySql "$scriptDir\02-seedGPT.sql" "Seeds (02-seedGPT.sql)"
Invoke-MySql "$scriptDir\03-triggers-auditoria.sql" "Auditoria Triggers (03-triggers-auditoria.sql)"
Invoke-MySql "$scriptDir\04-utilidadesGPT.sql" "Utilities - Gemini (04-utilidadesGPT.sql)"
Invoke-MySql "$scriptDir\05-migration-status-column.sql" "Migration status column (05-migration-status-column.sql)"

Write-Host "Deployment completed." -ForegroundColor Green
