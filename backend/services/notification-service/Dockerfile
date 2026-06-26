FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/notification-service/package*.json ./services/notification-service/
RUN cd services/notification-service && npm ci --only=production
COPY services/notification-service/ ./services/notification-service/
EXPOSE 3016
CMD ["node", "services/notification-service/src/server.js"]
