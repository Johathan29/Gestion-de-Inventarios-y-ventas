# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache font-noto font-noto-arabic font-noto-bengali font-noto-cjk font-noto-hebrew font-noto-tamil font-noto-thai font-noto-all

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

USER appuser
EXPOSE 3009

CMD ["node", "src/server.js"]
