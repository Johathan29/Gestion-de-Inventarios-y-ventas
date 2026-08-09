# State Machines: ERP Business Processes

## 1. Sale State Machine

```mermaid
stateDiagram-v2
    [*] --> pending : Crear venta
    
    pending --> confirmed : Confirmar pago
    pending --> cancelled : Cancelar
    
    confirmed --> processing : Preparar envío
    confirmed --> cancelled : Cancelar (con stock reservado)
    
    processing --> shipped : Enviar
    processing --> completed : Entrega directa (POS)
    processing --> cancelled : Cancelar (revertir stock)
    
    shipped --> delivered : Cliente recibe
    shipped --> cancelled : Devolver (con nota crédito)
    
    completed --> [*]
    cancelled --> [*]
    delivered --> [*]
```

### Transition Rules
```typescript
const SALE_TRANSITIONS = {
  pending: {
    confirmed: { 
      requires: ['payment'],
      effects: ['reserve_stock', 'emit_SaleCreated']
    },
    cancelled: {
      requires: ['reason'],
      effects: ['emit_SaleCancelled']
    }
  },
  confirmed: {
    processing: {
      requires: [],
      effects: ['deduct_stock', 'emit_SaleConfirmed']
    },
    cancelled: {
      requires: ['reason', 'admin_approval'],
      effects: ['release_stock', 'emit_SaleCancelled']
    }
  },
  processing: {
    shipped: {
      requires: ['tracking_number'],
      effects: ['emit_SaleShipped']
    },
    completed: {
      requires: [],
      effects: ['emit_SaleCompleted', 'post_accounting_entry']
    },
    cancelled: {
      requires: ['reason', 'admin_approval'],
      effects: ['restock', 'reverse_accounting', 'emit_SaleCancelled']
    }
  },
  shipped: {
    delivered: {
      requires: [],
      effects: ['emit_SaleDelivered', 'post_accounting_entry']
    },
    cancelled: {
      requires: ['reason', 'admin_approval', 'credit_note'],
      effects: ['restock', 'emit_SaleCancelled']
    }
  }
};
```

## 2. Purchase State Machine

```mermaid
stateDiagram-v2
    [*] --> draft : Crear OC
    
    draft --> submitted : Enviar a proveedor
    draft --> cancelled : Cancelar
    
    submitted --> confirmed : Proveedor confirma
    submitted --> rejected : Proveedor rechaza
    
    confirmed --> received : Recibir mercancía
    confirmed --> partial : Recepción parcial
    confirmed --> cancelled : Cancelar
    
    received --> inspected : Inspección QC
    partial --> inspected : Inspección QC
    partial --> received : Recepción completa
    
    inspected --> completed : Todo aprobado
    inspected --> quarantine : Observaciones
    
    quarantine --> completed : Liberado tras revisión
    quarantine --> rejected : Rechazado definitivamente
    
    completed --> [*]
    cancelled --> [*]
    rejected --> [*]
```

## 3. Invoice State Machine

```mermaid
stateDiagram-v2
    [*] --> draft : Crear factura
    
    draft --> active : Emitir (generar NCF)
    draft --> cancelled : Anular antes de emitir
    
    active --> voided : Anular (requiere NC)
    active --> [*]
    
    cancelled --> [*]
    voided --> [*]
```

## 4. Cash Register Session State Machine

```mermaid
stateDiagram-v2
    [*] --> open : Abrir caja
    
    open --> active : Primer movimiento
    active --> active : Movimiento registrado
    open --> active : Movimiento registrado
    
    active --> closing : Iniciar cierre
    open --> closing : Cierre sin movimientos
    
    closing --> closed : Confirmar cierre
    
    closed --> [*]
```

### Transition Rules
```typescript
const CASH_SESSION_TRANSITIONS = {
  open: {
    active: {
      requires: [],
      effects: ['log_first_movement']
    },
    closing: {
      requires: ['final_count'],
      effects: ['calculate_difference']
    }
  },
  active: {
    active: {
      requires: [],
      effects: ['record_movement']
    },
    closing: {
      requires: ['final_count'],
      effects: ['calculate_difference']
    }
  },
  closing: {
    closed: {
      requires: ['admin_approval_if_difference'],
      effects: ['emit_CashRegisterClosed', 'post_accounting']
    }
  }
};
```

## 5. Checkout State Machine (Ecommerce)

```mermaid
stateDiagram-v2
    [*] --> cart : Agregar primer producto
    
    cart --> checkout : Iniciar checkout
    checkout --> cart : Modificar carrito
    
    checkout --> payment_pending : Seleccionar pago
    payment_pending --> completed : Pago exitoso
    payment_pending --> failed : Pago fallido
    payment_pending --> expired : Timer 15min
    
    failed --> checkout : Reintentar
    expired --> cart : Stock liberado
    
    completed --> [*]
```

## 6. Inventory Reservation State Machine

```mermaid
stateDiagram-v2
    [*] --> active : Reservar stock
    
    active --> confirmed : Venta confirmada
    active --> released : Cancelar/reserva expirada
    active --> expired : Timer expirado (15min)
    
    confirmed --> [*]
    released --> [*]
    expired --> [*]
```

## 7. Quality Inspection State Machine

```mermaid
stateDiagram-v2
    [*] --> pending : Crear inspección
    
    pending --> approved : Todo OK
    pending --> rejected : No cumple estándares
    pending --> quarantine : Requiere revisión
    
    quarantine --> approved : Liberado
    quarantine --> rejected : Rechazado
    
    approved --> [*]
    rejected --> [*]
```

## 8. Notification State Machine

```mermaid
stateDiagram-v2
    [*] --> pending : Evento disparado
    
    pending --> processing : Worker toma notificación
    processing --> sent : Envío exitoso
    processing --> pending : Error (retry con backoff)
    
    pending --> failed : Max intentos alcanzados
    
    sent --> [*]
    failed --> [*]
```

## 9. Accounting Entry State Machine

```mermaid
stateDiagram-v2
    [*] --> draft : Crear asiento
    
    draft --> posted : Contabilizar (post)
    draft --> voided : Anular
    
    posted --> voided : Solo con período abierto
    
    posted --> [*]
    voided --> [*]
```
