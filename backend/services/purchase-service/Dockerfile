FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/purchase-service/package*.json ./services/purchase-service/
RUN cd services/purchase-service && npm ci --only=production
COPY services/purchase-service/ ./services/purchase-service/
EXPOSE 3006
CMD ["node", "services/purchase-service/src/server.js"]
