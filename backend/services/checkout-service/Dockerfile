FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/checkout-service/package*.json ./services/checkout-service/
RUN cd services/checkout-service && npm ci --only=production
COPY services/checkout-service/ ./services/checkout-service/
EXPOSE 3011
CMD ["node", "services/checkout-service/src/server.js"]
