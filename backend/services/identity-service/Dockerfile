FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY packages/shared-kernel/package.json /app/packages/shared-kernel/
COPY packages/event-bus/package.json /app/packages/event-bus/
COPY packages/common/package.json /app/packages/common/
COPY backend/services/identity-service/package.json /app/backend/services/identity-service/

# Install dependencies
WORKDIR /app/backend/services/identity-service
RUN npm install

# Copy source code
COPY packages/shared-kernel /app/packages/shared-kernel
COPY packages/event-bus /app/packages/event-bus
COPY packages/common /app/packages/common
COPY backend/services/identity-service /app/backend/services/identity-service

EXPOSE 3001

CMD ["node", "src/server.js"]
