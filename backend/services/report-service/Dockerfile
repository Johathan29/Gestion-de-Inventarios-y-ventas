FROM node:18-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY services/report-service/package*.json ./services/report-service/
RUN cd services/report-service && npm ci --only=production
COPY services/report-service/ ./services/report-service/
EXPOSE 3008
CMD ["node", "services/report-service/src/server.js"]
