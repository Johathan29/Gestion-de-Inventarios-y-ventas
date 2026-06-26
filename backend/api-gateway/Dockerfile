FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY api-gateway/package*.json ./api-gateway/
RUN cd api-gateway && npm ci --only=production
COPY api-gateway/ ./api-gateway/
EXPOSE 3000
CMD ["node", "api-gateway/src/server.js"]
