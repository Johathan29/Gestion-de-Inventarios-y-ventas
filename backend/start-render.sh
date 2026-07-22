#!/bin/bash
set -e

echo "🚀 Starting all microservices..."

# ─── Port mapping (gateway → service) ──────────────────────────
# gateway 3000  → api-gateway
# gateway 3001  → auth-service (also users via path rewrite)
# gateway 3002  → user-service
# gateway 3003  → product-service
# gateway 3004  → category-service
# gateway 3005  → inventory-service
# gateway 3006  → purchase-service
# gateway 3007  → sale-service (also cart/checkout)
# gateway 3008  → report-service
# gateway 3009  → invoice-service
# gateway 3012  → ecommerce-service
# gateway 3013  → catalog-service (env: CATALOG_SERVICE_PORT=3013)
# gateway 3014  → email-service
# gateway 3015  → whatsapp-service
# gateway 3016  → notification-service
# gateway 3017  → audit-service
# gateway 3018  → config-service
# gateway 3019  → payment-service (cash registers)
#
# Excluded: identity-service (port conflict with auth), procurement-service (not routed),
#           cart-service & checkout-service (handled by sale-service)

# Start all services with concurrently
exec npx concurrently \
  --names "gw,auth,users,products,categories,inventory,purchases,sales,reports,invoices,ecommerce,catalog,email,whatsapp,notif,audit,config,payment" \
  --prefix-colors "cyan,green,green,green,green,green,green,green,green,green,green,green,green,green,green,green,green,green" \
  --kill-others \
  --handle-input \
  "node api-gateway/src/server.js" \
  "node services/auth-service/src/server.js" \
  "node services/user-service/src/server.js" \
  "node services/product-service/src/server.js" \
  "node services/category-service/src/server.js" \
  "node services/inventory-service/src/server.js" \
  "node services/purchase-service/src/server.js" \
  "node services/sale-service/src/server.js" \
  "node services/report-service/src/server.js" \
  "node services/invoice-service/src/server.js" \
  "node services/ecommerce-service/src/server.js" \
  "node services/catalog-service/src/server.js" \
  "node services/email-service/src/server.js" \
  "node services/whatsapp-service/src/server.js" \
  "node services/notification-service/src/server.js" \
  "node services/audit-service/src/server.js" \
  "node services/config-service/src/server.js" \
  "node services/payment-service/src/server.js"
