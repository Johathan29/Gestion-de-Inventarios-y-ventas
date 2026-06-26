FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/catalog-service/package*.json ./services/catalog-service/
RUN cd services/catalog-service && npm ci --only=production
COPY services/catalog-service/ ./services/catalog-service/
EXPOSE 3013
CMD ["node", "services/catalog-service/src/server.js"]
