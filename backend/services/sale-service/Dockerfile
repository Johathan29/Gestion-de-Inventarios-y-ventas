FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/sale-service/package*.json ./services/sale-service/
RUN cd services/sale-service && npm ci --only=production
COPY services/sale-service/ ./services/sale-service/
EXPOSE 3007
CMD ["node", "services/sale-service/src/server.js"]
