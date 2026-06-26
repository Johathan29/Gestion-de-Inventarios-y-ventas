FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/email-service/package*.json ./services/email-service/
RUN cd services/email-service && npm ci --only=production
COPY services/email-service/ ./services/email-service/
EXPOSE 3014
CMD ["node", "services/email-service/src/server.js"]
