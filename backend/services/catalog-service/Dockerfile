FROM node:18-alpine
WORKDIR /app
COPY packages/shared-kernel/package.json /app/packages/shared-kernel/
COPY packages/event-bus/package.json /app/packages/event-bus/
COPY packages/common/package.json /app/packages/common/
COPY backend/services/catalog-service/package.json /app/backend/services/catalog-service/
WORKDIR /app/backend/services/catalog-service
RUN npm install
COPY packages/shared-kernel /app/packages/shared-kernel
COPY packages/event-bus /app/packages/event-bus
COPY packages/common /app/packages/common
COPY backend/services/catalog-service /app/backend/services/catalog-service
EXPOSE 3003
CMD ["node", "src/server.js"]
