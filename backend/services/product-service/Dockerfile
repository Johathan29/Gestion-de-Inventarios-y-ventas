FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/product-service/package*.json ./services/product-service/
RUN cd services/product-service && npm ci --only=production
COPY services/product-service/ ./services/product-service/
EXPOSE 3003
CMD ["node", "services/product-service/src/server.js"]
