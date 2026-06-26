FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/category-service/package*.json ./services/category-service/
RUN cd services/category-service && npm ci --only=production
COPY services/category-service/ ./services/category-service/
EXPOSE 3004
CMD ["node", "services/category-service/src/server.js"]
