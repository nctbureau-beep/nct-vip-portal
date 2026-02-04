/**
 * Admin Routes
 * ============
 * Admin-only operations for managing the system
 */

const express = require('express');
const router = express.Router();
const { asyncHandler, forbiddenError } = require('./error.middleware');
const notionService = require('./notion.service');
const pricingService = require('./pricing.service');

// Admin check middleware
const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      error_ar: 'يتطلب صلاحيات المدير'
    });
  }
  next();
};

router.use(requireAdmin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

  // Get today's orders
  const todayStats = await notionService.getStatistics(startOfDay, endOfDay);
  
  // Get this month's orders
  const monthStats = await notionService.getStatistics(startOfMonth, endOfMonth);

  // Get all orders for status breakdown
  const allOrders = await notionService.getOrders({}, { pageSize: 100 });

  // Calculate additional metrics
  const pendingPayments = allOrders.orders.filter(o => o.paymentStatus === 'Not Paid').length;
  const inProgress = allOrders.orders.filter(o => o.status === 'Translation').length;
  const awaitingDelivery = allOrders.orders.filter(o => o.status === 'Delivery and Payment').length;

  res.json({
    success: true,
    data: {
      today: {
        orders: todayStats.statistics.totalOrders,
        revenue: todayStats.statistics.totalRevenue
      },
      thisMonth: {
        orders: monthStats.statistics.totalOrders,
        revenue: monthStats.statistics.totalRevenue
      },
      overview: {
        pendingPayments,
        inProgress,
        awaitingDelivery,
        totalActive: pendingPayments + inProgress + awaitingDelivery
      },
      breakdown: {
        byStatus: monthStats.statistics.byStatus,
        byService: monthStats.statistics.byService,
        byChannel: monthStats.statistics.byChannel
      }
    }
  });
}));

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with filters
 * @access  Admin
 */
router.get('/orders', asyncHandler(async (req, res) => {
  const { status, paymentStatus, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (paymentStatus) filters.paymentStatus = paymentStatus;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const result = await notionService.getOrders(filters, {
    pageSize: parseInt(limit),
    cursor: req.query.cursor
  });

  res.json({
    success: true,
    data: {
      orders: result.orders,
      pagination: {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      }
    }
  });
}));

/**
 * @route   PUT /api/admin/orders/:id
 * @desc    Update order (admin full access)
 * @access  Admin
 */
router.put('/orders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const result = await notionService.updateOrder(id, updates);

  res.json({
    success: true,
    message: 'Order updated',
    message_ar: 'تم تحديث الطلب',
    data: { order: result.order }
  });
}));

/**
 * @route   POST /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.post('/orders/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['New Ticket', 'Translation', 'Delivery and Payment', 'After Sale Service', 'Archive', 'Lost'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status',
      error_ar: 'الحالة غير صالحة'
    });
  }

  const result = await notionService.updateOrder(id, { status });

  res.json({
    success: true,
    message: 'Status updated',
    message_ar: 'تم تحديث الحالة',
    data: { order: result.order }
  });
}));

/**
 * @route   POST /api/admin/orders/:id/payment
 * @desc    Update payment status
 * @access  Admin
 */
router.post('/orders/:id/payment', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, paymentMethod } = req.body;

  const updates = {};
  if (paymentStatus) updates.paymentStatus = paymentStatus;
  if (paymentMethod) updates.paymentMethod = paymentMethod;

  const result = await notionService.updateOrder(id, updates);

  res.json({
    success: true,
    message: 'Payment updated',
    message_ar: 'تم تحديث الدفع',
    data: { order: result.order }
  });
}));

/**
 * @route   GET /api/admin/statistics
 * @desc    Get detailed statistics
 * @access  Admin
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;

  const from = dateFrom || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
  const to = dateTo || new Date().toISOString();

  const result = await notionService.getStatistics(from, to);

  res.json({
    success: true,
    data: {
      period: { from, to },
      statistics: result.statistics
    }
  });
}));

/**
 * @route   GET /api/admin/pricing
 * @desc    Get current pricing configuration
 * @access  Admin
 */
router.get('/pricing', asyncHandler(async (req, res) => {
  const priceList = pricingService.getPriceList();

  res.json({
    success: true,
    data: priceList
  });
}));

/**
 * @route   GET /api/admin/customers
 * @desc    Get customer list
 * @access  Admin
 */
router.get('/customers', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  // Get orders and extract unique customers
  const result = await notionService.getOrders({}, { pageSize: 100 });
  
  // Group by phone
  const customerMap = new Map();
  
  result.orders.forEach(order => {
    const phone = order.phone;
    if (!phone) return;
    
    if (!customerMap.has(phone)) {
      customerMap.set(phone, {
        phone,
        name: order.customerName,
        status: order.customerStatus,
        totalOrders: 0,
        totalSpent: 0,
        lastOrder: order.createdAt
      });
    }
    
    const customer = customerMap.get(phone);
    customer.totalOrders++;
    customer.totalSpent += order.finalQuotation || 0;
    
    if (new Date(order.createdAt) > new Date(customer.lastOrder)) {
      customer.lastOrder = order.createdAt;
    }
  });

  const customers = Array.from(customerMap.values())
    .sort((a, b) => b.totalOrders - a.totalOrders);

  // Paginate
  const startIndex = (page - 1) * limit;
  const paginatedCustomers = customers.slice(startIndex, startIndex + parseInt(limit));

  res.json({
    success: true,
    data: {
      customers: paginatedCustomers,
      pagination: {
        total: customers.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(customers.length / limit)
      }
    }
  });
}));

/**
 * @route   GET /api/admin/customers/:phone
 * @desc    Get customer details with orders
 * @access  Admin
 */
router.get('/customers/:phone', asyncHandler(async (req, res) => {
  const { phone } = req.params;

  const result = await notionService.getOrdersByPhone(phone);

  const totalSpent = result.orders.reduce((sum, o) => sum + (o.finalQuotation || 0), 0);

  res.json({
    success: true,
    data: {
      customer: {
        phone,
        name: result.orders[0]?.customerName || phone,
        status: result.orders[0]?.customerStatus,
        totalOrders: result.orders.length,
        totalSpent
      },
      orders: result.orders
    }
  });
}));

module.exports = router;
