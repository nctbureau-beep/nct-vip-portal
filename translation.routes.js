/**
 * Translation Routes
 * ==================
 * Handles AI-powered translation operations
 */

const express = require('express');
const router = express.Router();
const { asyncHandler, validationError } = require('./error.middleware');
const geminiService = require('./gemini.service');
const driveService = require('./drive.service');
const notionService = require('./notion.service');

/**
 * @route   POST /api/translation/extract
 * @desc    Extract text from image using OCR
 * @access  Private
 */
router.post('/extract', asyncHandler(async (req, res) => {
  const { image, documentType } = req.body;

  if (!image) {
    throw validationError('Image required', 'الصورة مطلوبة');
  }

  const result = await geminiService.extractTextFromImage(image, documentType);

  res.json({
    success: true,
    message: 'Text extracted successfully',
    message_ar: 'تم استخراج النص بنجاح',
    data: result.extraction
  });
}));

/**
 * @route   POST /api/translation/extract-document
 * @desc    Extract and translate full document (multiple images)
 * @access  Private
 */
router.post('/extract-document', asyncHandler(async (req, res) => {
  const { images, documentType, targetLanguage = 'en' } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw validationError('Images required', 'الصور مطلوبة');
  }

  if (!documentType) {
    throw validationError('Document type required', 'نوع الوثيقة مطلوب');
  }

  const result = await geminiService.processDocument(images, documentType, targetLanguage);

  res.json({
    success: true,
    message: 'Document processed successfully',
    message_ar: 'تم معالجة الوثيقة بنجاح',
    data: result
  });
}));

/**
 * @route   POST /api/translation/translate
 * @desc    Translate text
 * @access  Private
 */
router.post('/translate', asyncHandler(async (req, res) => {
  const { text, fromLang = 'ar', toLang = 'en' } = req.body;

  if (!text) {
    throw validationError('Text required', 'النص مطلوب');
  }

  const result = await geminiService.translateText(text, fromLang, toLang);

  res.json({
    success: true,
    message: 'Translation completed',
    message_ar: 'تمت الترجمة بنجاح',
    data: {
      original: result.original,
      translation: result.translation,
      fromLang: result.fromLang,
      toLang: result.toLang
    }
  });
}));

/**
 * @route   POST /api/translation/translate-fields
 * @desc    Translate extracted fields
 * @access  Private
 */
router.post('/translate-fields', asyncHandler(async (req, res) => {
  const { fields, fromLang = 'ar', toLang = 'en' } = req.body;

  if (!fields || typeof fields !== 'object') {
    throw validationError('Fields required', 'الحقول مطلوبة');
  }

  const result = await geminiService.translateExtractedFields(fields, fromLang, toLang);

  res.json({
    success: true,
    message: 'Fields translated',
    message_ar: 'تمت ترجمة الحقول',
    data: { translated: result.translated }
  });
}));

/**
 * @route   POST /api/translation/validate
 * @desc    Validate translation quality
 * @access  Private
 */
router.post('/validate', asyncHandler(async (req, res) => {
  const { original, translation, language } = req.body;

  if (!original || !translation) {
    throw validationError('Original and translation required', 'النص الأصلي والترجمة مطلوبان');
  }

  const result = await geminiService.validateTranslation(original, translation, language);

  res.json({
    success: true,
    message: 'Validation completed',
    message_ar: 'تم التحقق',
    data: result.validation
  });
}));

/**
 * @route   POST /api/translation/process-order
 * @desc    Full AI processing for an order
 * @access  Private
 */
router.post('/process-order', asyncHandler(async (req, res) => {
  const { orderId, images, documentType, targetLanguage = 'en' } = req.body;

  if (!orderId) {
    throw validationError('Order ID required', 'رقم الطلب مطلوب');
  }

  // Verify order ownership
  const orderResult = await notionService.getOrder(orderId);
  
  if (!req.isAdmin && orderResult.order.phone !== req.phone) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      error_ar: 'غير مسموح بالوصول'
    });
  }

  // Get images from request or from order documents
  let imagesToProcess = images;
  
  if (!imagesToProcess && orderResult.order.documents.length > 0) {
    // Download images from Drive
    imagesToProcess = [];
    for (const doc of orderResult.order.documents) {
      try {
        // Extract file ID from URL
        const fileIdMatch = doc.url.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          const fileResult = await driveService.downloadFile(fileId);
          const base64 = `data:${fileResult.mimeType};base64,${fileResult.data.toString('base64')}`;
          imagesToProcess.push(base64);
        }
      } catch (error) {
        console.error('Failed to download document:', error);
      }
    }
  }

  if (!imagesToProcess || imagesToProcess.length === 0) {
    throw validationError('No images to process', 'لا توجد صور للمعالجة');
  }

  // Process with AI
  const result = await geminiService.processDocument(
    imagesToProcess,
    documentType || orderResult.order.documentType?.[0] || 'official-letters',
    targetLanguage
  );

  // Update order with AI results (store in notes for now)
  await notionService.updateOrder(orderId, {
    notes: `${orderResult.order.notes || ''}\n\n--- AI Translation Results ---\n${JSON.stringify(result.translated, null, 2)}`
  });

  res.json({
    success: true,
    message: 'Order processed with AI',
    message_ar: 'تمت معالجة الطلب بالذكاء الاصطناعي',
    data: result
  });
}));

/**
 * @route   GET /api/translation/document-types
 * @desc    Get available document types with their fields
 * @access  Private
 */
router.get('/document-types', asyncHandler(async (req, res) => {
  const documentTypes = {
    'id-documents': {
      name: 'ID Documents',
      nameAr: 'الهوية والوثائق الشخصية',
      icon: '🪪',
      fields: [
        { key: 'fullName', ar: 'الاسم الكامل', en: 'Full Name' },
        { key: 'idNumber', ar: 'رقم الهوية', en: 'ID Number' },
        { key: 'dateOfBirth', ar: 'تاريخ الولادة', en: 'Date of Birth' },
        { key: 'gender', ar: 'الجنس', en: 'Gender' },
        { key: 'address', ar: 'العنوان', en: 'Address' },
        { key: 'issueDate', ar: 'تاريخ الإصدار', en: 'Issue Date' },
        { key: 'expiryDate', ar: 'تاريخ الانتهاء', en: 'Expiry Date' }
      ]
    },
    'certificates': {
      name: 'Certificates',
      nameAr: 'الشهادات',
      icon: '📜',
      fields: [
        { key: 'certificateType', ar: 'نوع الشهادة', en: 'Certificate Type' },
        { key: 'holderName', ar: 'اسم الحامل', en: 'Holder Name' },
        { key: 'institution', ar: 'المؤسسة', en: 'Institution' },
        { key: 'dateIssued', ar: 'تاريخ الإصدار', en: 'Date Issued' },
        { key: 'grade', ar: 'التقدير', en: 'Grade' },
        { key: 'certificateNumber', ar: 'رقم الشهادة', en: 'Certificate Number' }
      ]
    },
    'official-letters': {
      name: 'Official Letters & Contracts',
      nameAr: 'الرسائل والعقود الرسمية',
      icon: '📄',
      fields: [
        { key: 'title', ar: 'العنوان', en: 'Title' },
        { key: 'date', ar: 'التاريخ', en: 'Date' },
        { key: 'sender', ar: 'المرسل', en: 'Sender' },
        { key: 'recipient', ar: 'المستلم', en: 'Recipient' },
        { key: 'content', ar: 'المحتوى', en: 'Content' },
        { key: 'signature', ar: 'التوقيع', en: 'Signature' }
      ]
    },
    'power-of-attorney': {
      name: 'Power of Attorney',
      nameAr: 'الوكالات العامة',
      icon: '⚖️',
      fields: [
        { key: 'principal', ar: 'الموكل', en: 'Principal' },
        { key: 'agent', ar: 'الوكيل', en: 'Agent' },
        { key: 'poaType', ar: 'نوع الوكالة', en: 'Type' },
        { key: 'powers', ar: 'الصلاحيات', en: 'Powers' },
        { key: 'date', ar: 'التاريخ', en: 'Date' },
        { key: 'notary', ar: 'الكاتب العدل', en: 'Notary' }
      ]
    },
    'court-documents': {
      name: 'Court Documents',
      nameAr: 'أحكام المحاكم',
      icon: '🏛️',
      fields: [
        { key: 'caseNumber', ar: 'رقم القضية', en: 'Case Number' },
        { key: 'courtName', ar: 'اسم المحكمة', en: 'Court Name' },
        { key: 'parties', ar: 'الأطراف', en: 'Parties' },
        { key: 'ruling', ar: 'الحكم', en: 'Ruling' },
        { key: 'date', ar: 'التاريخ', en: 'Date' },
        { key: 'judge', ar: 'القاضي', en: 'Judge' }
      ]
    },
    'medical-reports': {
      name: 'Medical Reports',
      nameAr: 'التقارير الطبية',
      icon: '🏥',
      fields: [
        { key: 'patientName', ar: 'اسم المريض', en: 'Patient Name' },
        { key: 'date', ar: 'التاريخ', en: 'Date' },
        { key: 'diagnosis', ar: 'التشخيص', en: 'Diagnosis' },
        { key: 'treatment', ar: 'العلاج', en: 'Treatment' },
        { key: 'doctor', ar: 'الطبيب', en: 'Doctor' },
        { key: 'hospital', ar: 'المستشفى', en: 'Hospital' }
      ]
    },
    'company-documents': {
      name: 'Company Documents',
      nameAr: 'وثائق الشركات',
      icon: '🏢',
      fields: [
        { key: 'companyName', ar: 'اسم الشركة', en: 'Company Name' },
        { key: 'registrationNumber', ar: 'رقم التسجيل', en: 'Registration Number' },
        { key: 'documentType', ar: 'نوع الوثيقة', en: 'Document Type' },
        { key: 'date', ar: 'التاريخ', en: 'Date' },
        { key: 'content', ar: 'المحتوى', en: 'Content' }
      ]
    }
  };

  res.json({
    success: true,
    data: { documentTypes }
  });
}));

/**
 * @route   GET /api/translation/languages
 * @desc    Get supported language pairs
 * @access  Private
 */
router.get('/languages', asyncHandler(async (req, res) => {
  const languages = [
    { code: 'ar', name: 'Arabic', nameAr: 'العربية', flag: '🇮🇶' },
    { code: 'en', name: 'English', nameAr: 'الإنجليزية', flag: '🇬🇧' },
    { code: 'kr', name: 'Kurdish', nameAr: 'الكردية', flag: '🏳️' },
    { code: 'fr', name: 'French', nameAr: 'الفرنسية', flag: '🇫🇷' },
    { code: 'de', name: 'German', nameAr: 'الألمانية', flag: '🇩🇪' },
    { code: 'es', name: 'Spanish', nameAr: 'الإسبانية', flag: '🇪🇸' },
    { code: 'tr', name: 'Turkish', nameAr: 'التركية', flag: '🇹🇷' },
    { code: 'ru', name: 'Russian', nameAr: 'الروسية', flag: '🇷🇺' },
    { code: 'fa', name: 'Persian', nameAr: 'الفارسية', flag: '🇮🇷' },
    { code: 'zh', name: 'Chinese', nameAr: 'الصينية', flag: '🇨🇳' },
    { code: 'it', name: 'Italian', nameAr: 'الإيطالية', flag: '🇮🇹' },
    { code: 'nl', name: 'Dutch', nameAr: 'الهولندية', flag: '🇳🇱' },
    { code: 'pt', name: 'Portuguese', nameAr: 'البرتغالية', flag: '🇵🇹' },
    { code: 'uk', name: 'Ukrainian', nameAr: 'الأوكرانية', flag: '🇺🇦' }
  ];

  const pairs = [
    'En ⇆ Ar', 'Kr ⇆ Ar', 'Kr ⇆ En', 'Fr ⇆ Ar', 'De ⇆ Ar',
    'Es ⇆ Ar', 'Tr ⇆ Ar', 'Ru ⇆ Ar', 'Ru ⇆ En', 'Fa ⇆ Ar',
    'Zh ⇆ Ar', 'It ⇆ Ar', 'NL ⇆ Ar', 'Pt ⇆ Ar', 'Uk ⇆ Ar'
  ];

  res.json({
    success: true,
    data: { languages, pairs }
  });
}));

module.exports = router;
