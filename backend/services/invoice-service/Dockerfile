FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/invoice-service/package*.json ./services/invoice-service/
RUN cd services/invoice-service && npm ci --only=production
COPY services/invoice-service/ ./services/invoice-service/
EXPOSE 3009
CMD ["node", "services/invoice-service/src/server.js"]
