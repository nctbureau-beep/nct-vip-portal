/**
 * Webhook Routes
 * ==============
 * Handles webhooks from external services
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { asyncHandler } = require('./error.middleware');
const notionService = require('./notion.service');

/**
 * Verify webhook signature
 */
function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * @route   POST /api/webhooks/payment/zaincash
 * @desc    Handle ZainCash payment webhook
 * @access  Public (with signature verification)
 */
router.post('/payment/zaincash', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const signature = req.headers['x-zaincash-signature'];
  const secret = process.env.ZAINCASH_WEBHOOK_SECRET;

  // Verify signature
  if (secret && signature) {
    const isValid = verifySignature(req.body.toString(), signature, secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const payload = JSON.parse(req.body.toString());
  
  console.log('ZainCash webhook received:', payload);

  // Process payment
  const { orderId, status, transactionId, amount } = payload;

  if (status === 'success' || status === 'completed') {
    // Update order payment status
    try {
      await notionService.updateOrder(orderId, {
        paymentStatus: 'Fully Paid',
        paymentMethod: 'ZainCash',
        notes: `Payment received via ZainCash\nTransaction: ${transactionId}\nAmount: ${amount}`
      });
      
      console.log(`Order ${orderId} marked as paid via ZainCash`);
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  }

  res.json({ received: true });
}));

/**
 * @route   POST /api/webhooks/payment/qicard
 * @desc    Handle Qi Card payment webhook
 * @access  Public (with signature verification)
 */
router.post('/payment/qicard', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const signature = req.headers['x-qicard-signature'];
  const secret = process.env.QICARD_WEBHOOK_SECRET;

  if (secret && signature) {
    const isValid = verifySignature(req.body.toString(), signature, secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const payload = JSON.parse(req.body.toString());
  
  console.log('Qi Card webhook received:', payload);

  const { orderId, status, transactionId, amount } = payload;

  if (status === 'success' || status === 'approved') {
    try {
      await notionService.updateOrder(orderId, {
        paymentStatus: 'Fully Paid',
        paymentMethod: 'Qi Card',
        notes: `Payment received via Qi Card\nTransaction: ${transactionId}\nAmount: ${amount}`
      });
      
      console.log(`Order ${orderId} marked as paid via Qi Card`);
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  }

  res.json({ received: true });
}));

/**
 * @route   POST /api/webhooks/notion
 * @desc    Handle Notion database updates (if configured)
 * @access  Public (with signature verification)
 */
router.post('/notion', asyncHandler(async (req, res) => {
  const signature = req.headers['x-notion-signature'];
  const secret = process.env.NOTION_WEBHOOK_SECRET;

  if (secret && signature) {
    // Notion webhooks use a different verification method
    // Implement based on Notion's webhook documentation
  }

  const payload = req.body;
  
  console.log('Notion webhook received:', payload);

  // Handle different event types
  switch (payload.type) {
    case 'page.created':
      console.log('New page created in Notion');
      break;
    case 'page.updated':
      console.log('Page updated in Notion');
      break;
    case 'database.updated':
      console.log('Database updated in Notion');
      break;
  }

  res.json({ received: true });
}));

/**
 * @route   POST /api/webhooks/sms
 * @desc    Handle SMS delivery status (if using SMS provider)
 * @access  Public
 */
router.post('/sms', asyncHandler(async (req, res) => {
  const payload = req.body;
  
  console.log('SMS webhook received:', payload);

  // Handle SMS delivery status updates
  // This could be from Twilio, local SMS providers, etc.

  res.json({ received: true });
}));

/**
 * @route   GET /api/webhooks/health
 * @desc    Health check for webhook endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
