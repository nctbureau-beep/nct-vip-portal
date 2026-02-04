/**
 * NCT Translation Portal - Backend API Server
 * =============================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');

// Import routes (flat structure)
const authRoutes = require('./auth.routes');
const orderRoutes = require('./order.routes');
const documentRoutes = require('./document.routes');
const translationRoutes = require('./translation.routes');
const adminRoutes = require('./admin.routes');
const webhookRoutes = require('./webhook.routes');

// Import middleware (flat structure)
const { errorHandler, notFound } = require('./error.middleware');
const { authenticate } = require('./auth.middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ====================
// SECURITY MIDDLEWARE
// ====================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept', 'Origin']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    error_ar: 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ====================
// GENERAL MIDDLEWARE
// ====================
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());

// ====================
// HEALTH CHECK ROUTES
// ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NCT Translation Portal API is running',
    message_ar: 'خادم NCT للترجمة يعمل بنجاح',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'NCT API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'NCT Translation Portal API',
    version: '1.0.0',
    description: 'Backend API for NCT Translation Services',
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      documents: '/api/documents',
      translation: '/api/translation',
      admin: '/api/admin',
      webhooks: '/api/webhooks'
    }
  });
});

// ====================
// API ROUTES
// ====================
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/orders', authenticate, orderRoutes);
app.use('/api/documents', authenticate, documentRoutes);
app.use('/api/translation', authenticate, translationRoutes);
app.use('/api/admin', authenticate, adminRoutes);

// ====================
// ERROR HANDLING
// ====================
app.use(notFound);
app.use(errorHandler);

// ====================
// SERVER START (local dev only)
// ====================
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 NCT API Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 API docs: http://localhost:${PORT}/api`);
  });
}

// Export for Vercel serverless
module.exports = app;
