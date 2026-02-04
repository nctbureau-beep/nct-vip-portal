/**
 * Document Routes
 * ===============
 * Handles document upload and management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { asyncHandler, validationError } = require('./error.middleware');
const driveService = require('./drive.service');
const notionService = require('./notion.service');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

/**
 * @route   POST /api/documents/upload
 * @desc    Upload documents for an order
 * @access  Private
 */
router.post('/upload', upload.array('files', 10), asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  
  if (!req.files || req.files.length === 0) {
    throw validationError('No files provided', 'لم يتم تحميل ملفات');
  }

  // Get order to verify ownership and get folder info
  let folderId = process.env.GOOGLE_DRIVE_UPLOADS_FOLDER_ID;
  
  if (orderId) {
    const orderResult = await notionService.getOrder(orderId);
    
    if (!req.isAdmin && orderResult.order.phone !== req.phone) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        error_ar: 'غير مسموح بالوصول'
      });
    }

    // Try to create/get customer folders
    try {
      const folders = await driveService.createCustomerFolders(
        orderResult.order.customerName,
        orderId
      );
      folderId = folders.folders.uploads.id;
    } catch (error) {
      console.error('Failed to get customer folder:', error);
    }
  }

  // Upload files
  const result = await driveService.uploadFiles(req.files, folderId);

  // If orderId provided, update order with file URLs
  if (orderId && result.uploaded.length > 0) {
    try {
      await notionService.addFilesToOrder(orderId, result.uploaded.map(f => ({
        name: f.name,
        url: f.directUrl
      })));
    } catch (error) {
      console.error('Failed to update order with files:', error);
    }
  }

  res.json({
    success: result.success,
    message: `${result.uploaded.length} files uploaded`,
    message_ar: `تم تحميل ${result.uploaded.length} ملفات`,
    data: {
      files: result.uploaded,
      errors: result.errors
    }
  });
}));

/**
 * @route   POST /api/documents/upload-base64
 * @desc    Upload base64 encoded image (for camera captures)
 * @access  Private
 */
router.post('/upload-base64', asyncHandler(async (req, res) => {
  const { image, orderId, fileName, side } = req.body;
  
  if (!image) {
    throw validationError('No image provided', 'لم يتم توفير صورة');
  }

  // Validate base64 format
  if (!image.startsWith('data:image/')) {
    throw validationError('Invalid image format', 'صيغة الصورة غير صالحة');
  }

  // Get upload folder
  let folderId = process.env.GOOGLE_DRIVE_UPLOADS_FOLDER_ID;
  
  if (orderId) {
    try {
      const orderResult = await notionService.getOrder(orderId);
      const folders = await driveService.createCustomerFolders(
        orderResult.order.customerName,
        orderId
      );
      folderId = folders.folders.uploads.id;
    } catch (error) {
      console.error('Failed to get customer folder:', error);
    }
  }

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const generatedName = fileName || `capture_${side || 'document'}_${timestamp}.jpg`;

  // Upload to Drive
  const result = await driveService.uploadFile(image, folderId, generatedName);

  // Update order if orderId provided
  if (orderId) {
    try {
      await notionService.addFilesToOrder(orderId, [{
        name: result.file.name,
        url: result.file.directUrl
      }]);
    } catch (error) {
      console.error('Failed to update order with file:', error);
    }
  }

  res.json({
    success: true,
    message: 'Image uploaded',
    message_ar: 'تم تحميل الصورة',
    data: { file: result.file }
  });
}));

/**
 * @route   GET /api/documents/:fileId
 * @desc    Get document info
 * @access  Private
 */
router.get('/:fileId', asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  
  const result = await driveService.getFile(fileId);

  res.json({
    success: true,
    data: { file: result.file }
  });
}));

/**
 * @route   GET /api/documents/order/:orderId
 * @desc    Get all documents for an order
 * @access  Private
 */
router.get('/order/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Get order and verify ownership
  const orderResult = await notionService.getOrder(orderId);
  
  if (!req.isAdmin && orderResult.order.phone !== req.phone) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      error_ar: 'غير مسموح بالوصول'
    });
  }

  res.json({
    success: true,
    data: {
      documents: orderResult.order.documents || []
    }
  });
}));

/**
 * @route   DELETE /api/documents/:fileId
 * @desc    Delete a document
 * @access  Private (Admin only)
 */
router.delete('/:fileId', asyncHandler(async (req, res) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      error_ar: 'يتطلب صلاحيات المدير'
    });
  }

  const { fileId } = req.params;
  
  await driveService.deleteFile(fileId);

  res.json({
    success: true,
    message: 'File deleted',
    message_ar: 'تم حذف الملف'
  });
}));

module.exports = router;
