# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

USER appuser
EXPOSE 3019

CMD ["node", "src/server.js"]
