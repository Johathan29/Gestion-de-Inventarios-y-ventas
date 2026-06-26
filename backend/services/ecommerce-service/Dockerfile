FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/ecommerce-service/package*.json ./services/ecommerce-service/
RUN cd services/ecommerce-service && npm ci --only=production
COPY services/ecommerce-service/ ./services/ecommerce-service/
EXPOSE 3012
CMD ["node", "services/ecommerce-service/src/server.js"]
