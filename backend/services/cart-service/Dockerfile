FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/cart-service/package*.json ./services/cart-service/
RUN cd services/cart-service && npm ci --only=production
COPY services/cart-service/ ./services/cart-service/
EXPOSE 3010
CMD ["node", "services/cart-service/src/server.js"]
