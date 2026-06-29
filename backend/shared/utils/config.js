require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT, 10) || 5432,
    name: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'inventory-system'
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY
  },

  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME
  },

  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0'
  },

  services: {
    auth: { port: parseInt(process.env.AUTH_SERVICE_PORT, 10) || 3001 },
    user: { port: parseInt(process.env.USER_SERVICE_PORT, 10) || 3002 },
    product: { port: parseInt(process.env.PRODUCT_SERVICE_PORT, 10) || 3003 },
    category: { port: parseInt(process.env.CATEGORY_SERVICE_PORT, 10) || 3004 },
    inventory: { port: parseInt(process.env.INVENTORY_SERVICE_PORT, 10) || 3005 },
    purchase: { port: parseInt(process.env.PURCHASE_SERVICE_PORT, 10) || 3006 },
    sale: { port: parseInt(process.env.SALE_SERVICE_PORT, 10) || 3007 },
    report: { port: parseInt(process.env.REPORT_SERVICE_PORT, 10) || 3008 },
    invoice: { port: parseInt(process.env.INVOICE_SERVICE_PORT, 10) || 3009 },
    cart: { port: parseInt(process.env.CART_SERVICE_PORT, 10) || 3010 },
    checkout: { port: parseInt(process.env.CHECKOUT_SERVICE_PORT, 10) || 3011 },
    ecommerce: { port: parseInt(process.env.ECOMMERCE_SERVICE_PORT, 10) || 3012 },
    catalog: { port: parseInt(process.env.CATALOG_SERVICE_PORT, 10) || 3013 },
    email: { port: parseInt(process.env.EMAIL_SERVICE_PORT, 10) || 3014 },
    whatsapp: { port: parseInt(process.env.WHATSAPP_SERVICE_PORT, 10) || 3015 },
    notification: { port: parseInt(process.env.NOTIFICATION_SERVICE_PORT, 10) || 3016 },
    audit: { port: parseInt(process.env.AUDIT_SERVICE_PORT, 10) || 3017 },
    config: { port: parseInt(process.env.CONFIG_SERVICE_PORT, 10) || 3018 }
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    redis: {
      enabled: process.env.REDIS_ENABLED === 'true' || false,
      url: process.env.REDIS_URL || 'redis://redis:6379',
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || ''
    }
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: process.env.CORS_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    headers: process.env.CORS_HEADERS || 'Content-Type,Authorization'
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || 'logs/app.log'
  },

  reports: {
    uploadPath: process.env.REPORT_UPLOAD_PATH || './reports',
    maxFileSize: parseInt(process.env.REPORT_MAX_FILE_SIZE, 10) || 10485760
  },

  invoice: {
    uploadPath: process.env.INVOICE_UPLOAD_PATH || './invoices',
    companyName: process.env.INVOICE_COMPANY_NAME || 'Tu Empresa S.A.',
    companyNit: process.env.INVOICE_COMPANY_NIT || '123456789',
    companyAddress: process.env.INVOICE_COMPANY_ADDRESS || 'Calle Principal #123',
    companyPhone: process.env.INVOICE_COMPANY_PHONE || '+57 300 123 4567',
    companyEmail: process.env.INVOICE_COMPANY_EMAIL || 'contacto@tuempresa.com',
    currency: process.env.INVOICE_CURRENCY || 'COP',
    taxRate: parseFloat(process.env.INVOICE_TAX_RATE) || 0.19,
    defaultDueDays: parseInt(process.env.INVOICE_DEFAULT_DUE_DAYS, 10) || 30
  }
};

const getConfig = () => config;

const getServiceConfig = (serviceName) => {
  return config.services[serviceName] || null;
};

module.exports = { config, getConfig, getServiceConfig };
