/**
 * Authentication Middleware & Service
 * ====================================
 * Handles JWT authentication and Firebase phone auth
 */

const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// ===================
// FIREBASE INITIALIZATION
// ===================

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
}

// Initialize on module load
initializeFirebase();

// ===================
// JWT UTILITIES
// ===================

/**
 * Generate JWT token
 */
function generateToken(payload, expiresIn = null) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// ===================
// AUTHENTICATION MIDDLEWARE
// ===================

/**
 * Main authentication middleware
 */
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        error_ar: 'يجب تسجيل الدخول'
      });
    }

    const token = authHeader.split(' ')[1];

    // Try JWT verification first
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.user = decoded;
      req.userId = decoded.userId || decoded.uid;
      req.phone = decoded.phone;
      req.isAdmin = decoded.isAdmin || false;
      return next();
    }

    // Try Firebase token verification
    try {
      const firebaseUser = await admin.auth().verifyIdToken(token);
      req.user = firebaseUser;
      req.userId = firebaseUser.uid;
      req.phone = firebaseUser.phone_number;
      req.isAdmin = false;
      return next();
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        error_ar: 'الرمز غير صالح أو منتهي الصلاحية'
      });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      error_ar: 'فشل التحقق من الهوية'
    });
  }
}

/**
 * Admin authentication middleware
 */
async function authenticateAdmin(req, res, next) {
  // First run normal authentication
  await authenticate(req, res, () => {
    // Check if user is admin
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        error_ar: 'يتطلب صلاحيات المدير'
      });
    }
    next();
  });
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (decoded) {
    req.user = decoded;
    req.userId = decoded.userId || decoded.uid;
    req.phone = decoded.phone;
  } else {
    req.user = null;
  }
  
  next();
}

// ===================
// AUTH SERVICE
// ===================

const AuthService = {
  /**
   * Verify Firebase phone auth and issue JWT
   */
  async verifyFirebaseToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      const user = {
        uid: decodedToken.uid,
        phone: decodedToken.phone_number,
        isAdmin: false // You can check against admin list
      };

      // Check if phone is in admin list
      const adminPhones = (process.env.ADMIN_PHONES || '').split(',');
      if (adminPhones.includes(user.phone)) {
        user.isAdmin = true;
      }

      // Generate our own JWT
      const accessToken = generateToken({
        userId: user.uid,
        phone: user.phone,
        isAdmin: user.isAdmin
      });

      const refreshToken = generateRefreshToken({
        userId: user.uid,
        phone: user.phone
      });

      return {
        success: true,
        user,
        accessToken,
        refreshToken
      };

    } catch (error) {
      console.error('Firebase token verification error:', error);
      throw new Error('Invalid Firebase token');
    }
  },

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    const decoded = verifyToken(refreshToken);
    
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    const accessToken = generateToken({
      userId: decoded.userId,
      phone: decoded.phone,
      isAdmin: decoded.isAdmin || false
    });

    return {
      success: true,
      accessToken
    };
  },

  /**
   * Create custom token for development/testing
   */
  async createDevToken(phone, isAdmin = false) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Dev tokens not allowed in production');
    }

    const userId = `dev_${phone.replace(/\D/g, '')}`;
    
    const accessToken = generateToken({
      userId,
      phone,
      isAdmin
    });

    const refreshToken = generateRefreshToken({
      userId,
      phone
    });

    return {
      success: true,
      user: { uid: userId, phone, isAdmin },
      accessToken,
      refreshToken
    };
  },

  /**
   * Get user by phone (from Firebase)
   */
  async getUserByPhone(phone) {
    try {
      const user = await admin.auth().getUserByPhoneNumber(phone);
      return {
        success: true,
        user: {
          uid: user.uid,
          phone: user.phoneNumber,
          createdAt: user.metadata.creationTime
        }
      };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return { success: false, error: 'User not found' };
      }
      throw error;
    }
  }
};

module.exports = {
  authenticate,
  authenticateAdmin,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyToken,
  AuthService
};
