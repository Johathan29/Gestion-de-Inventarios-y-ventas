# Script para construir imágenes Docker de los microservicios
$services = @(
  "auth-service", "user-service", "product-service", "category-service",
  "inventory-service", "purchase-service", "sale-service", "report-service",
  "invoice-service", "cart-service", "checkout-service", "ecommerce-service",
  "catalog-service", "email-service", "whatsapp-service", "notification-service",
  "audit-service", "config-service"
)

$backendPath = Join-Path $PSScriptRoot "..\backend"

foreach ($service in $services) {
  Write-Host "🔨 Construyendo $service..." -ForegroundColor Yellow
  
  $servicePath = Join-Path $backendPath "services\$service"
  
  # Crear Dockerfile temporal con contexto adecuado
  $dockerfile = @"
FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/$service/package*.json ./services/$service/
RUN cd services/$service && npm ci --only=production
COPY services/$service/ ./services/$service/
EXPOSE 3000
CMD ["node", "services/$service/src/server.js"]
"@
  
  $dockerfile | Set-Content (Join-Path $servicePath "Dockerfile") -Force
  
  # Construir imagen desde el contexto raíz del backend
  docker build -t "inventory/$service":latest -f (Join-Path $servicePath "Dockerfile") $backendPath
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ $service construido exitosamente" -ForegroundColor Green
  } else {
    Write-Host "❌ Error construyendo $service" -ForegroundColor Red
  }
}

# Construir API Gateway
Write-Host "🔨 Construyendo api-gateway..." -ForegroundColor Yellow
docker build -t inventory/api-gateway:latest -f "$backendPath\api-gateway\Dockerfile" $backendPath

Write-Host "`n🚀 Todas las imágenes construidas!" -ForegroundColor Cyan
