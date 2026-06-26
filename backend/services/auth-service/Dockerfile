FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/auth-service/package*.json ./services/auth-service/
RUN cd services/auth-service && npm ci --only=production
COPY services/auth-service/ ./services/auth-service/
EXPOSE 3001
CMD ["node", "services/auth-service/src/server.js"]
