/**
 * Order Routes
 * ============
 * Handles all order-related API endpoints
 */

const express = require('express');
const router = express.Router();
const { asyncHandler, validationError } = require('./error.middleware');
const notionService = require('./notion.service');
const driveService = require('./drive.service');
const pricingService = require('./pricing.service');

/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  // Get orders by phone
  const result = await notionService.getOrdersByPhone(req.phone);

  // Apply filters
  let orders = result.orders || [];
  if (status) {
    orders = orders.filter(o => o.status === status);
  }

  // Paginate
  const startIndex = (page - 1) * limit;
  const paginatedOrders = orders.slice(startIndex, startIndex + parseInt(limit));

  res.json({
    success: true,
    data: {
      orders: paginatedOrders,
      pagination: {
        total: orders.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(orders.length / limit)
      }
    }
  });
}));

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await notionService.getOrder(id);

  // Verify ownership (unless admin)
  if (!req.isAdmin && result.order.phone !== req.phone) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      error_ar: 'غير مسموح بالوصول'
    });
  }

  res.json({
    success: true,
    data: { order: result.order }
  });
}));

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    customerName,
    requestName,
    serviceType,
    documentTypes,
    languages,
    pages,
    words,
    certification,
    numDocs,
    insurance,
    insuranceCount,
    additionalCopies,
    deliveryMethod,
    address,
    notes,
    paymentMethod,
    rushTranslation
  } = req.body;

  // Validation
  if (!serviceType) {
    throw validationError('Service type required', 'نوع الخدمة مطلوب');
  }

  // Calculate pricing
  const pricing = pricingService.calculatePrice({
    serviceType,
    pages: pages || 1,
    words,
    certification,
    numDocs: numDocs || 1,
    insurance,
    insuranceCount: insuranceCount || 1,
    additionalCopies: additionalCopies || 0,
    deliveryMethod,
    rushTranslation
  });

  // Map service type to Notion format
  const docTypeMap = {
    'id-documents': 'ID-sized documents',
    'certificates': 'Certificates',
    'official-letters': 'Official letters statements contracts',
    'power-of-attorney': 'General PoAs',
    'court-documents': 'Court rulings and similar documents',
    'medical-reports': 'Medical reports and long-format technical reports',
    'company-documents': 'Company Documents'
  };

  const deliveryMap = {
    'digital': 'Digital file',
    'pickup': 'Pickup',
    'delivery': 'Delivery'
  };

  const insuranceMap = {
    '31days': '31 days assurance',
    '45days': '45 days assurance',
    '90days': '90 days assurance',
    '1year': '1 year assurance'
  };

  // Create order in Notion
  const orderData = {
    customerName: customerName || requestName || req.phone,
    phone: req.phone,
    services: ['Translation'],
    documentTypes: (documentTypes || []).map(t => docTypeMap[t] || t),
    languages: languages || ['En ⇆ Ar'],
    pages: pages || 1,
    words: words || 0,
    certification: certification || false,
    numDocs: numDocs || 1,
    insurance: insurance ? [insuranceMap[insurance] || insurance] : [],
    insuranceCount: insuranceCount || 0,
    deliveryMethods: [deliveryMap[deliveryMethod] || 'Pickup'],
    notes: notes || '',
    paymentMethod: paymentMethod,
    totalPrice: pricing.total,
    customerStatus: 'First Time - Reg',
    channel: 'App'
  };

  const result = await notionService.createOrder(orderData);

  // Create Google Drive folders
  try {
    const folders = await driveService.createCustomerFolders(
      orderData.customerName,
      result.order.id
    );
    
    await notionService.updateOrder(result.order.id, {
      notes: `${orderData.notes}\n\nFolder: ${folders.folders.order.url}`
    });
  } catch (error) {
    console.error('Failed to create Drive folders:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    message_ar: 'تم إنشاء الطلب بنجاح',
    data: { order: result.order, pricing }
  });
}));

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order
 * @access  Private
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const orderResult = await notionService.getOrder(id);
  
  if (!req.isAdmin && orderResult.order.phone !== req.phone) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      error_ar: 'غير مسموح بالوصول'
    });
  }

  // Customers can only update certain fields
  if (!req.isAdmin) {
    const allowedUpdates = ['notes', 'paymentMethod'];
    Object.keys(updates).forEach(key => {
      if (!allowedUpdates.includes(key)) delete updates[key];
    });
  }

  const result = await notionService.updateOrder(id, updates);

  res.json({
    success: true,
    message: 'Order updated',
    message_ar: 'تم تحديث الطلب',
    data: { order: result.order }
  });
}));

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const orderResult = await notionService.getOrder(id);
  
  if (!req.isAdmin && orderResult.order.phone !== req.phone) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      error_ar: 'غير مسموح بالوصول'
    });
  }

  const nonCancellable = ['Translation', 'Delivery and Payment', 'After Sale Service', 'Archive'];
  if (nonCancellable.includes(orderResult.order.status)) {
    return res.status(400).json({
      success: false,
      error: 'Order cannot be cancelled at this stage',
      error_ar: 'لا يمكن إلغاء الطلب في هذه المرحلة'
    });
  }

  const result = await notionService.updateOrder(id, {
    status: 'Lost',
    notes: `${orderResult.order.notes || ''}\n\nCancelled: ${reason || 'No reason provided'}`
  });

  res.json({
    success: true,
    message: 'Order cancelled',
    message_ar: 'تم إلغاء الطلب',
    data: { order: result.order }
  });
}));

/**
 * @route   GET /api/orders/:id/status
 * @desc    Get order status with timeline
 * @access  Private
 */
router.get('/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await notionService.getOrder(id);

  if (!req.isAdmin && result.order.phone !== req.phone) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      error_ar: 'غير مسموح بالوصول'
    });
  }

  const statusOrder = ['New Ticket', 'Translation', 'Delivery and Payment', 'After Sale Service', 'Archive'];
  const currentIndex = statusOrder.indexOf(result.order.status);

  const timeline = statusOrder.map((status, index) => ({
    status,
    statusAr: {
      'New Ticket': 'طلب جديد',
      'Translation': 'قيد الترجمة',
      'Delivery and Payment': 'التسليم والدفع',
      'After Sale Service': 'خدمة ما بعد البيع',
      'Archive': 'مؤرشف'
    }[status],
    completed: index < currentIndex,
    current: index === currentIndex,
    pending: index > currentIndex
  }));

  res.json({
    success: true,
    data: {
      currentStatus: result.order.status,
      paymentStatus: result.order.paymentStatus,
      timeline
    }
  });
}));

/**
 * @route   POST /api/orders/calculate-price
 * @desc    Calculate order price without creating
 * @access  Private
 */
router.post('/calculate-price', asyncHandler(async (req, res) => {
  const pricing = pricingService.calculatePrice(req.body);
  res.json({ success: true, data: { pricing } });
}));

module.exports = router;
