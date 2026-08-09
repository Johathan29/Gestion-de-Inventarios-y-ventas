# Aplica una migración SQL a Supabase vía Management API v1.
# Uso: .\apply-migration-v1.ps1 -Migration "049_sale_rpc_outbox.sql"
param(
    [Parameter(Mandatory = $true)]
    [string]$Migration
)

$ErrorActionPreference = "Stop"

$SUPABASE_API = "https://api.supabase.com/v1"
$PROJECT_REF = "prspnfxfspokbqxsboby"
$MIGRATIONS_DIR = "C:\Users\rosar\Documents\Project\Gestion de Inventarios y ventas\database\migrations"
$TOKEN_FILE = "C:\Users\rosar\Documents\Project\Gestion de Inventarios y ventas\temp_supabase_token.txt"

$ACCESS_TOKEN = (Get-Content $TOKEN_FILE -Raw).Trim()
$headers = @{
    "Authorization" = "Bearer $ACCESS_TOKEN"
    "Content-Type"  = "application/json"
}
$url = "$SUPABASE_API/projects/$PROJECT_REF/database/query"

$filePath = Join-Path $MIGRATIONS_DIR $Migration
if (!(Test-Path $filePath)) { Write-Error "No existe: $filePath"; exit 1 }

# Leer como UTF-8 explícito (PS 5.1 lee ANSI por defecto y corrompe acentos)
$sql = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
Write-Host "Aplicando $Migration ($($sql.Length) chars)..." -ForegroundColor Cyan

$body = @{ query = $sql } | ConvertTo-Json -Depth 5
try {
    $resp = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -TimeoutSec 180
    Write-Host "[OK] $Migration aplicada." -ForegroundColor Green
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "[ERROR] Status: $code" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    exit 1
}

Write-Host "=== Fin ===" -ForegroundColor Green
