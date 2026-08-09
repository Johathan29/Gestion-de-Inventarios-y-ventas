# 🚨 ERROR CODES — Catálogo estándar

> Formato obligatorio de error en TODOS los servicios:
> ```json
> { "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "Producto no encontrado.", "details": {}, "request_id": "..." } }
> ```
> Los códigos técnicos (23505, 42703, PGRST*) NUNCA se muestran al usuario — quedan en logs.

## Auth
| Code | Message |
|---|---|
| AUTH_UNAUTHORIZED | No autenticado. |
| AUTH_FORBIDDEN | No tienes permisos para realizar esta acción. |
| AUTH_INVALID_CREDENTIALS | Credenciales inválidas. |
| AUTH_TOKEN_EXPIRED | Sesión expirada. |
| AUTH_RATE_LIMITED | Demasiados intentos. Intenta más tarde. |
| AUTH_ACCOUNT_LOCKED | Cuenta bloqueada temporalmente. |

## Tenant
| Code | Message |
|---|---|
| TENANT_NOT_FOUND | Empresa no encontrada. |
| TENANT_ACCESS_DENIED | No tienes acceso a esta empresa. |

## Catalog
| Code | Message |
|---|---|
| PRODUCT_NOT_FOUND | Producto no encontrado. |
| CATEGORY_NOT_FOUND | Categoría no encontrada. |
| SKU_DUPLICATE | El SKU ya existe. |

## Inventory
| Code | Message |
|---|---|
| INVENTORY_INSUFFICIENT | No hay inventario suficiente. |
| INVENTORY_RESERVATION_FAILED | No se pudo reservar el inventario. |
| INVENTORY_NEGATIVE_STOCK | El stock no puede ser negativo. |
| INVENTORY_MOVEMENT_INVALID | Tipo de movimiento inválido. |

## Sales / Checkout
| Code | Message |
|---|---|
| SALE_NOT_FOUND | Venta no encontrada. |
| SALE_ALREADY_CANCELLED | La venta ya fue anulada. |
| CART_EMPTY | El carrito está vacío. |
| CHECKOUT_FAILED | No se pudo completar la compra. |

## Payments
| Code | Message |
|---|---|
| PAYMENT_FAILED | El pago no pudo ser procesado. |
| PAYMENT_PENDING | Pedido creado, pago pendiente. |
| PAYMENT_DECLINED | El pago fue rechazado. |
| PAYMENT_ALREADY_CAPTURED | El pago ya fue capturado. |

## Invoices
| Code | Message |
|---|---|
| INVOICE_NOT_FOUND | Factura no encontrada. |
| INVOICE_ALREADY_VOIDED | La factura ya fue anulada. |
| INVOICE_SNAPSHOT_MISSING | Falta snapshot fiscal del item. |

## Idempotency
| Code | Message |
|---|---|
| IDEMPOTENCY_CONFLICT | La operación ya fue procesada con otra clave. |
| IDEMPOTENCY_KEY_MISSING | Falta Idempotency-Key. |

## Webhooks / Integrations
| Code | Message |
|---|---|
| WEBHOOK_INVALID_URL | URL de destino inválida. |
| WEBHOOK_SSRF_BLOCKED | URL interna no permitida. |
| WEBHOOK_SIGNATURE_INVALID | Firma inválida. |
| WEBHOOK_REPLAY_BLOCKED | Evento duplicado. |
| WEBHOOK_DEAD_LETTER | Evento movido a dead letter. |

## Validation / General
| Code | Message |
|---|---|
| VALIDATION_ERROR | Datos inválidos. |
| PLAN_LIMIT_REACHED | Límite del plan alcanzado. |
| NOT_FOUND | Recurso no encontrado. |
| INTERNAL_ERROR | Error interno. Intenta de nuevo. |

## Implementación
- `backend/shared/middleware/apiResponse.js` ya define ErrorCodes — ampliar con esta tabla.
- El gateway debe normalizar respuestas de servicios al formato estándar.
- Frontend: `toast.error(err.message)` — nunca mostrar códigos técnicos.
