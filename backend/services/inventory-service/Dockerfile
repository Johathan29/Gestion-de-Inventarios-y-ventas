FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/inventory-service/package*.json ./services/inventory-service/
RUN cd services/inventory-service && npm ci --only=production
COPY services/inventory-service/ ./services/inventory-service/
EXPOSE 3005
CMD ["node", "services/inventory-service/src/server.js"]
