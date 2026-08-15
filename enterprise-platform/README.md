# Enterprise Commerce OS

Starter React + TypeScript para ERP + POS + Ecommerce + CMS de una sola empresa.

## Stack
React, TypeScript, Vite, Tailwind CSS, Motion, Lucide React, Recharts y Supabase.

## Ejecutar

```bash
npm install
cp .env.example .env
npm run dev
```

La interfaz incluye dashboard empresarial, navegación modular, POS visual, métricas, inventario crítico y conexión preparada para Supabase.

## Arquitectura objetivo
React/TSX → Node.js API `/api/v1` → Use Cases → Domain Rules → Repositories → Supabase PostgreSQL.

Las operaciones críticas deben usar transacciones, idempotencia, ledger, auditoría y transactional outbox.