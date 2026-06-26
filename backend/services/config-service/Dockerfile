FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/config-service/package*.json ./services/config-service/
RUN cd services/config-service && npm ci --only=production
COPY services/config-service/ ./services/config-service/
EXPOSE 3018
CMD ["node", "services/config-service/src/server.js"]
