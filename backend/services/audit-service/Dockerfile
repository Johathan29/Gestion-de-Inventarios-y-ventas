FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/audit-service/package*.json ./services/audit-service/
RUN cd services/audit-service && npm ci --only=production
COPY services/audit-service/ ./services/audit-service/
EXPOSE 3017
CMD ["node", "services/audit-service/src/server.js"]
