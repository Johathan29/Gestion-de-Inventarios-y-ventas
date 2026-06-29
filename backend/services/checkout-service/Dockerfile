FROM node:18-alpine
WORKDIR /app

# Copiar shared primero (dependencia local)
COPY shared/ ./shared/

# Copiar package.json del servicio
COPY services/checkout-service/package*.json ./services/checkout-service/

# Instalar dependencias (incluyendo @inventory/shared local)
RUN cd services/checkout-service && npm install --omit=dev

# Copiar el resto del código del servicio
COPY services/checkout-service/ ./services/checkout-service/

EXPOSE 3011
CMD ["node", "services/checkout-service/src/server.js"]
