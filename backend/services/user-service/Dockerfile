FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/user-service/package*.json ./services/user-service/
RUN cd services/user-service && npm ci --only=production
COPY services/user-service/ ./services/user-service/
EXPOSE 3002
CMD ["node", "services/user-service/src/server.js"]
