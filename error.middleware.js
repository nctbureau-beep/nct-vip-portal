/**
 * Error Handling Middleware
 * =========================
 * Centralized error handling for NCT API
 */

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, messageAr = null) {
    super(message);
    this.statusCode = statusCode;
    this.messageAr = messageAr || message;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found handler
 */
function notFound(req, res, next) {
  const error = new APIError(
    `Endpoint not found: ${req.originalUrl}`,
    404,
    `المسار غير موجود: ${req.originalUrl}`
  );
  next(error);
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let messageAr = err.messageAr || 'خطأ في الخادم';

  // Log error
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.phone
  });

  // Handle specific error types
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
    messageAr = 'خطأ في البيانات المدخلة';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate entry';
    messageAr = 'البيانات موجودة مسبقاً';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    messageAr = 'الرمز غير صالح';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    messageAr = 'الرمز منتهي الصلاحية';
  }

  // Notion API errors
  if (err.code === 'notionhq_client_response_error') {
    statusCode = 502;
    message = 'Database service error';
    messageAr = 'خطأ في خدمة قاعدة البيانات';
  }

  // Google API errors
  if (err.code?.toString().startsWith('4') || err.code?.toString().startsWith('5')) {
    if (err.message?.includes('drive')) {
      message = 'File storage service error';
      messageAr = 'خطأ في خدمة تخزين الملفات';
    }
  }

  // Gemini API errors
  if (err.message?.includes('SAFETY') || err.message?.includes('blocked')) {
    statusCode = 400;
    message = 'Content could not be processed';
    messageAr = 'لا يمكن معالجة المحتوى';
  }

  // Rate limit errors
  if (statusCode === 429) {
    message = 'Too many requests, please slow down';
    messageAr = 'طلبات كثيرة، يرجى الانتظار';
  }

  // Send error response
  const errorResponse = {
    success: false,
    error: message,
    error_ar: messageAr,
    statusCode
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper
 * Catches errors in async functions and passes to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error helper
 */
function validationError(message, messageAr = null) {
  return new APIError(message, 400, messageAr);
}

/**
 * Not found error helper
 */
function notFoundError(resource = 'Resource', resourceAr = 'المورد') {
  return new APIError(
    `${resource} not found`,
    404,
    `${resourceAr} غير موجود`
  );
}

/**
 * Unauthorized error helper
 */
function unauthorizedError(message = 'Unauthorized', messageAr = 'غير مصرح') {
  return new APIError(message, 401, messageAr);
}

/**
 * Forbidden error helper
 */
function forbiddenError(message = 'Forbidden', messageAr = 'محظور') {
  return new APIError(message, 403, messageAr);
}

module.exports = {
  APIError,
  notFound,
  errorHandler,
  asyncHandler,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError
};
