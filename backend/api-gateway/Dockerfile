# ============================================================
# Stage 1: Instalación de dependencias (con devDeps)
# ============================================================
FROM node:18-alpine AS deps
WORKDIR /app

COPY shared/package*.json ./shared/
RUN cd shared && npm ci --only=production

COPY api-gateway/package*.json ./api-gateway/
RUN cd api-gateway && npm ci

# ============================================================
# Stage 2: Build / producción
# ============================================================
FROM node:18-alpine AS runner
WORKDIR /app

# Seguridad: no correr como root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY shared/ ./shared/
COPY --from=deps /app/shared/node_modules ./shared/node_modules

COPY api-gateway/ ./api-gateway/
COPY --from=deps /app/api-gateway/node_modules ./api-gateway/node_modules

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "api-gateway/src/server.js"]
