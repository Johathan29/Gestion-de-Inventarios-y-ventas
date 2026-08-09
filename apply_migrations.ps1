$ErrorActionPreference = "Stop"

# Configuration
$SUPABASE_URL = "https://api.supabase.com/v1"
$PROJECT_REF = "prspnfxfspokbqxsboby"
$MIGRATIONS_DIR = "C:\Users\rosar\Documents\Project\Gestion de Inventarios y ventas\database\migrations"

# Read the access token from the temp file
$TOKEN_FILE = "C:\Users\rosar\Documents\Project\Gestion de Inventarios y ventas\temp_supabase_token.txt"
if (!(Test-Path $TOKEN_FILE)) {
    Write-Error "Token file not found: $TOKEN_FILE"
    exit 1
}
$ACCESS_TOKEN = Get-Content $TOKEN_FILE -Raw
$ACCESS_TOKEN = $ACCESS_TOKEN.Trim()

# Migrations to apply (in order)
$migrations = @(
    "041_rbac_granular_permissions.sql",
    "042_saas_plans_subscriptions.sql",
    "043_dashboard_widgets.sql",
    "044_crm_leads_pipeline.sql",
    "045_multi_currency_i18n_integrations.sql",
    "046_webhooks_automations.sql",
    "047_notifications_brand_testimonials.sql",
    "048_rls_seeds_indexes.sql",
    "049_sale_rpc_outbox.sql",
    "055_outbox_payment_core_tables.sql",
    "056_fix_automation_trigger_uuid.sql"
)

$headers = @{
    "Authorization" = "Bearer $ACCESS_TOKEN"
    "Content-Type"  = "application/json"
}

foreach ($migration in $migrations) {
    $filePath = Join-Path $MIGRATIONS_DIR $migration
    if (!(Test-Path $filePath)) {
        Write-Host "[SKIP] Migration file not found: $migration" -ForegroundColor Yellow
        continue
    }
    
    # Leer como UTF-8 explícito (PS 5.1 lee ANSI por defecto y corrompe acentos)
    $sql = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
    $body = @{ query = $sql } | ConvertTo-Json -Depth 5
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Applying: $migration" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "SQL length: $($sql.Length) chars" -ForegroundColor Gray
    
    try {
        $url = "$SUPABASE_URL/projects/$PROJECT_REF/database/query"
        $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -TimeoutSec 120
        Write-Host "[OK] $migration applied successfully!" -ForegroundColor Green
        if ($response) {
            Write-Host "Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message
        if (-not $errorBody) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errorBody = $reader.ReadToEnd()
            } catch {}
        }
        
        Write-Host "[ERROR] $migration failed! Status: $statusCode" -ForegroundColor Red
        Write-Host "Error: $errorBody" -ForegroundColor Red
        Write-Host "Continuing to next migration..." -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 2
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "All migrations processed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
