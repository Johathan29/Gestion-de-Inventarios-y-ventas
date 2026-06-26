FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/whatsapp-service/package*.json ./services/whatsapp-service/
RUN cd services/whatsapp-service && npm ci --only=production
COPY services/whatsapp-service/ ./services/whatsapp-service/
EXPOSE 3015
CMD ["node", "services/whatsapp-service/src/server.js"]
