/**
 * Authentication Routes
 * =====================
 * Handles user authentication via Firebase Phone Auth
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('./error.middleware');
const { AuthService, authenticate } = require('./auth.middleware');
const notionService = require('./notion.service');

/**
 * @route   POST /api/auth/verify
 * @desc    Verify Firebase ID token and issue JWT
 * @access  Public
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      error: 'Firebase ID token required',
      error_ar: 'رمز Firebase مطلوب'
    });
  }

  const result = await AuthService.verifyFirebaseToken(idToken);

  // Get or create customer profile in Notion
  try {
    await notionService.getOrCreateCustomerProfile(
      result.user.phone,
      result.user.phone // Use phone as name initially
    );
  } catch (error) {
    console.error('Failed to create customer profile:', error);
    // Don't fail auth if profile creation fails
  }

  res.json({
    success: true,
    message: 'Authentication successful',
    message_ar: 'تم التحقق بنجاح',
    data: {
      user: {
        id: result.user.uid,
        phone: result.user.phone,
        isAdmin: result.user.isAdmin
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    }
  });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token required',
      error_ar: 'رمز التحديث مطلوب'
    });
  }

  const result = await AuthService.refreshAccessToken(refreshToken);

  res.json({
    success: true,
    message: 'Token refreshed',
    message_ar: 'تم تحديث الرمز',
    data: {
      accessToken: result.accessToken
    }
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  // Get user's orders count
  let ordersCount = 0;
  try {
    const orders = await notionService.getOrdersByPhone(req.phone);
    ordersCount = orders.orders?.length || 0;
  } catch (error) {
    console.error('Failed to get orders count:', error);
  }

  res.json({
    success: true,
    data: {
      user: {
        id: req.userId,
        phone: req.phone,
        isAdmin: req.isAdmin
      },
      stats: {
        totalOrders: ordersCount
      }
    }
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token deletion)
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In JWT, logout is handled client-side by deleting the token
  // Here we just acknowledge the request
  res.json({
    success: true,
    message: 'Logged out successfully',
    message_ar: 'تم تسجيل الخروج بنجاح'
  });
}));

/**
 * @route   POST /api/auth/dev-token
 * @desc    Create development token (DEV ONLY)
 * @access  Public (only in development)
 */
router.post('/dev-token', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Not available in production'
    });
  }

  const { phone, isAdmin } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number required'
    });
  }

  const result = await AuthService.createDevToken(phone, isAdmin);

  res.json({
    success: true,
    message: 'Development token created',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    }
  });
}));

module.exports = router;
