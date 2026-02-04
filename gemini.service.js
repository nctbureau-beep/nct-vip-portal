/**
 * Gemini AI Service
 * ==================
 * Handles all AI operations for NCT Translation Portal
 * - OCR (Optical Character Recognition)
 * - Document Translation
 * - Text Extraction
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.visionModel = null;
    this.initialized = false;
  }

  /**
   * Initialize Gemini AI client
   */
  async initialize() {
    if (this.initialized) return;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      // Text model for translation
      this.model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
      });

      // Vision model for OCR
      this.visionModel = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash'
      });

      this.initialized = true;
      console.log('✅ Gemini AI service initialized');
    } catch (error) {
      console.error('❌ Gemini initialization error:', error);
      throw error;
    }
  }

  /**
   * Ensure service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ===================
  // DOCUMENT TYPE TEMPLATES
  // ===================

  /**
   * Get extraction template for document type
   */
  getDocumentTemplate(documentType) {
    const templates = {
      'id-documents': {
        nameAr: 'الهوية والوثائق الشخصية',
        fields: [
          { key: 'fullName', ar: 'الاسم الكامل', en: 'Full Name' },
          { key: 'idNumber', ar: 'رقم الهوية', en: 'ID Number' },
          { key: 'dateOfBirth', ar: 'تاريخ الولادة', en: 'Date of Birth' },
          { key: 'gender', ar: 'الجنس', en: 'Gender' },
          { key: 'nationality', ar: 'الجنسية', en: 'Nationality' },
          { key: 'address', ar: 'العنوان', en: 'Address' },
          { key: 'issueDate', ar: 'تاريخ الإصدار', en: 'Issue Date' },
          { key: 'expiryDate', ar: 'تاريخ الانتهاء', en: 'Expiry Date' },
          { key: 'placeOfIssue', ar: 'مكان الإصدار', en: 'Place of Issue' }
        ]
      },
      'certificates': {
        nameAr: 'الشهادات',
        fields: [
          { key: 'certificateType', ar: 'نوع الشهادة', en: 'Certificate Type' },
          { key: 'holderName', ar: 'اسم الحامل', en: 'Holder Name' },
          { key: 'institution', ar: 'المؤسسة', en: 'Institution' },
          { key: 'dateIssued', ar: 'تاريخ الإصدار', en: 'Date Issued' },
          { key: 'grade', ar: 'التقدير/الدرجة', en: 'Grade/Score' },
          { key: 'certificateNumber', ar: 'رقم الشهادة', en: 'Certificate Number' },
          { key: 'specialization', ar: 'التخصص', en: 'Specialization' },
          { key: 'duration', ar: 'المدة', en: 'Duration' }
        ]
      },
      'official-letters': {
        nameAr: 'الرسائل والعقود الرسمية',
        fields: [
          { key: 'title', ar: 'العنوان', en: 'Title' },
          { key: 'date', ar: 'التاريخ', en: 'Date' },
          { key: 'referenceNumber', ar: 'رقم المرجع', en: 'Reference Number' },
          { key: 'sender', ar: 'المرسل', en: 'Sender' },
          { key: 'recipient', ar: 'المستلم', en: 'Recipient' },
          { key: 'subject', ar: 'الموضوع', en: 'Subject' },
          { key: 'content', ar: 'المحتوى', en: 'Content' },
          { key: 'signature', ar: 'التوقيع', en: 'Signature' }
        ]
      },
      'power-of-attorney': {
        nameAr: 'الوكالات العامة',
        fields: [
          { key: 'principal', ar: 'الموكل', en: 'Principal' },
          { key: 'agent', ar: 'الوكيل', en: 'Agent' },
          { key: 'poaType', ar: 'نوع الوكالة', en: 'Type of POA' },
          { key: 'powers', ar: 'الصلاحيات', en: 'Powers Granted' },
          { key: 'date', ar: 'التاريخ', en: 'Date' },
          { key: 'validUntil', ar: 'صالحة حتى', en: 'Valid Until' },
          { key: 'notary', ar: 'الكاتب العدل', en: 'Notary' },
          { key: 'notaryNumber', ar: 'رقم التوثيق', en: 'Notary Number' }
        ]
      },
      'court-documents': {
        nameAr: 'أحكام المحاكم',
        fields: [
          { key: 'caseNumber', ar: 'رقم القضية', en: 'Case Number' },
          { key: 'courtName', ar: 'اسم المحكمة', en: 'Court Name' },
          { key: 'plaintiff', ar: 'المدعي', en: 'Plaintiff' },
          { key: 'defendant', ar: 'المدعى عليه', en: 'Defendant' },
          { key: 'ruling', ar: 'الحكم', en: 'Ruling' },
          { key: 'date', ar: 'التاريخ', en: 'Date' },
          { key: 'judge', ar: 'القاضي', en: 'Judge' },
          { key: 'summary', ar: 'ملخص القضية', en: 'Case Summary' }
        ]
      },
      'medical-reports': {
        nameAr: 'التقارير الطبية',
        fields: [
          { key: 'patientName', ar: 'اسم المريض', en: 'Patient Name' },
          { key: 'dateOfBirth', ar: 'تاريخ الولادة', en: 'Date of Birth' },
          { key: 'date', ar: 'تاريخ التقرير', en: 'Report Date' },
          { key: 'diagnosis', ar: 'التشخيص', en: 'Diagnosis' },
          { key: 'treatment', ar: 'العلاج', en: 'Treatment' },
          { key: 'medications', ar: 'الأدوية', en: 'Medications' },
          { key: 'doctor', ar: 'الطبيب', en: 'Doctor' },
          { key: 'hospital', ar: 'المستشفى', en: 'Hospital' },
          { key: 'recommendations', ar: 'التوصيات', en: 'Recommendations' }
        ]
      },
      'company-documents': {
        nameAr: 'وثائق الشركات',
        fields: [
          { key: 'companyName', ar: 'اسم الشركة', en: 'Company Name' },
          { key: 'registrationNumber', ar: 'رقم التسجيل', en: 'Registration Number' },
          { key: 'documentType', ar: 'نوع الوثيقة', en: 'Document Type' },
          { key: 'date', ar: 'التاريخ', en: 'Date' },
          { key: 'address', ar: 'العنوان', en: 'Address' },
          { key: 'authorizedSignatory', ar: 'المفوض بالتوقيع', en: 'Authorized Signatory' },
          { key: 'capital', ar: 'رأس المال', en: 'Capital' },
          { key: 'activity', ar: 'النشاط', en: 'Business Activity' }
        ]
      }
    };

    return templates[documentType] || templates['official-letters'];
  }

  // ===================
  // OCR & EXTRACTION
  // ===================

  /**
   * Extract text from image using OCR
   */
  async extractTextFromImage(imageData, documentType = null) {
    await this.ensureInitialized();

    try {
      // Convert base64 if needed
      let imageBase64 = imageData;
      let mimeType = 'image/jpeg';

      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageBase64 = matches[2];
        }
      }

      const template = documentType ? this.getDocumentTemplate(documentType) : null;
      
      let prompt;
      if (template) {
        const fieldsList = template.fields.map(f => `- ${f.ar} (${f.en}): ${f.key}`).join('\n');
        prompt = `
أنت خبير في استخراج البيانات من الوثائق. هذه وثيقة من نوع: ${template.nameAr}

المطلوب:
1. استخرج جميع النصوص الموجودة في الصورة
2. حدد البيانات التالية إن وجدت:
${fieldsList}

قم بإرجاع النتيجة بصيغة JSON كالتالي:
{
  "rawText": "النص الكامل المستخرج من الصورة",
  "extractedFields": {
    "fieldKey": {
      "original": "القيمة الأصلية بلغة الوثيقة",
      "arabic": "الترجمة العربية إن كانت بلغة أخرى",
      "english": "English translation if in another language"
    }
  },
  "documentLanguage": "ar|en|other",
  "confidence": 0.95,
  "notes": "أي ملاحظات إضافية"
}

استخرج البيانات بدقة. إذا لم تجد حقلاً معيناً، لا تضعه في النتيجة.
`;
      } else {
        prompt = `
أنت خبير في استخراج النصوص من الصور (OCR).

المطلوب:
1. استخرج جميع النصوص الموجودة في الصورة بدقة
2. حافظ على تنسيق النص الأصلي قدر الإمكان
3. حدد لغة الوثيقة

أرجع النتيجة بصيغة JSON:
{
  "rawText": "النص الكامل المستخرج",
  "documentLanguage": "ar|en|other",
  "confidence": 0.95
}
`;
      }

      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: imageBase64
          }
        }
      ]);

      const response = result.response.text();
      
      // Parse JSON from response
      let parsed;
      try {
        // Extract JSON from response (might be wrapped in markdown code blocks)
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                         response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          parsed = { rawText: response, confidence: 0.7 };
        }
      } catch (e) {
        parsed = { rawText: response, confidence: 0.7 };
      }

      return {
        success: true,
        extraction: parsed
      };

    } catch (error) {
      console.error('Gemini extractTextFromImage error:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Extract from multiple images (front + back)
   */
  async extractFromMultipleImages(images, documentType) {
    await this.ensureInitialized();

    try {
      const extractions = [];
      
      for (let i = 0; i < images.length; i++) {
        const result = await this.extractTextFromImage(images[i], documentType);
        extractions.push({
          side: i === 0 ? 'front' : i === 1 ? 'back' : `page_${i + 1}`,
          ...result.extraction
        });
      }

      // Merge extractions
      const merged = this.mergeExtractions(extractions, documentType);

      return {
        success: true,
        extractions,
        merged
      };

    } catch (error) {
      console.error('Gemini extractFromMultipleImages error:', error);
      throw new Error(`Failed to extract from images: ${error.message}`);
    }
  }

  /**
   * Merge multiple extractions into one
   */
  mergeExtractions(extractions, documentType) {
    const merged = {
      rawText: extractions.map(e => e.rawText).join('\n---\n'),
      extractedFields: {},
      confidence: 0
    };

    let totalConfidence = 0;
    let confidenceCount = 0;

    extractions.forEach(extraction => {
      if (extraction.extractedFields) {
        Object.assign(merged.extractedFields, extraction.extractedFields);
      }
      if (extraction.confidence) {
        totalConfidence += extraction.confidence;
        confidenceCount++;
      }
    });

    merged.confidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.5;

    return merged;
  }

  // ===================
  // TRANSLATION
  // ===================

  /**
   * Translate text
   */
  async translateText(text, fromLang = 'ar', toLang = 'en') {
    await this.ensureInitialized();

    try {
      const langNames = {
        ar: 'Arabic (العربية)',
        en: 'English',
        kr: 'Kurdish (کوردی)',
        fr: 'French (Français)',
        de: 'German (Deutsch)',
        es: 'Spanish (Español)',
        tr: 'Turkish (Türkçe)',
        ru: 'Russian (Русский)',
        fa: 'Persian (فارسی)',
        zh: 'Chinese (中文)'
      };

      const prompt = `
أنت مترجم محترف متخصص في الترجمة القانونية والرسمية.

ترجم النص التالي من ${langNames[fromLang] || fromLang} إلى ${langNames[toLang] || toLang}.

قواعد الترجمة:
1. حافظ على المعنى الدقيق والسياق القانوني
2. استخدم المصطلحات الرسمية المعتمدة
3. حافظ على تنسيق الأرقام والتواريخ
4. لا تترجم أسماء الأعلام والأماكن إلا إذا كان لها مقابل رسمي
5. حافظ على الأسلوب الرسمي

النص المطلوب ترجمته:
"""
${text}
"""

أرجع الترجمة فقط بدون أي شرح أو تعليق.
`;

      const result = await this.model.generateContent(prompt);
      const translation = result.response.text().trim();

      return {
        success: true,
        original: text,
        translation,
        fromLang,
        toLang
      };

    } catch (error) {
      console.error('Gemini translateText error:', error);
      throw new Error(`Failed to translate: ${error.message}`);
    }
  }

  /**
   * Translate extracted fields
   */
  async translateExtractedFields(extractedFields, fromLang = 'ar', toLang = 'en') {
    await this.ensureInitialized();

    try {
      const translated = {};

      for (const [key, value] of Object.entries(extractedFields)) {
        if (typeof value === 'object' && value.original) {
          // Already has translations
          if (!value[toLang === 'ar' ? 'arabic' : 'english']) {
            const translation = await this.translateText(value.original, fromLang, toLang);
            translated[key] = {
              ...value,
              [toLang === 'ar' ? 'arabic' : 'english']: translation.translation
            };
          } else {
            translated[key] = value;
          }
        } else if (typeof value === 'string') {
          const translation = await this.translateText(value, fromLang, toLang);
          translated[key] = {
            original: value,
            [toLang === 'ar' ? 'arabic' : 'english']: translation.translation
          };
        } else {
          translated[key] = value;
        }
      }

      return {
        success: true,
        translated
      };

    } catch (error) {
      console.error('Gemini translateExtractedFields error:', error);
      throw new Error(`Failed to translate fields: ${error.message}`);
    }
  }

  /**
   * Full document processing: OCR + Translation
   */
  async processDocument(images, documentType, targetLang = 'en') {
    await this.ensureInitialized();

    try {
      // Step 1: Extract text from images
      const extraction = await this.extractFromMultipleImages(
        Array.isArray(images) ? images : [images],
        documentType
      );

      // Step 2: Detect source language
      const sourceLang = extraction.merged.documentLanguage || 'ar';
      
      // Step 3: Translate if needed
      let translatedFields = extraction.merged.extractedFields;
      
      if (sourceLang !== targetLang && Object.keys(translatedFields).length > 0) {
        const translation = await this.translateExtractedFields(
          translatedFields,
          sourceLang,
          targetLang
        );
        translatedFields = translation.translated;
      }

      // Step 4: Translate raw text
      let translatedText = extraction.merged.rawText;
      if (sourceLang !== targetLang) {
        const textTranslation = await this.translateText(
          extraction.merged.rawText,
          sourceLang,
          targetLang
        );
        translatedText = textTranslation.translation;
      }

      return {
        success: true,
        documentType,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        original: {
          rawText: extraction.merged.rawText,
          fields: extraction.merged.extractedFields
        },
        translated: {
          rawText: translatedText,
          fields: translatedFields
        },
        confidence: extraction.merged.confidence,
        extractions: extraction.extractions
      };

    } catch (error) {
      console.error('Gemini processDocument error:', error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  // ===================
  // UTILITIES
  // ===================

  /**
   * Validate translation quality
   */
  async validateTranslation(original, translation, language) {
    await this.ensureInitialized();

    try {
      const prompt = `
أنت مدقق جودة ترجمة محترف.

راجع الترجمة التالية وقيّمها:

النص الأصلي:
"""
${original}
"""

الترجمة:
"""
${translation}
"""

قيّم الترجمة من حيث:
1. الدقة (accuracy): هل المعنى صحيح؟
2. الطلاقة (fluency): هل الترجمة طبيعية؟
3. المصطلحات (terminology): هل المصطلحات صحيحة؟
4. التنسيق (formatting): هل التنسيق محفوظ؟

أرجع النتيجة بصيغة JSON:
{
  "overallScore": 0.95,
  "accuracy": 0.95,
  "fluency": 0.90,
  "terminology": 0.95,
  "formatting": 1.0,
  "issues": ["أي مشاكل وجدتها"],
  "suggestions": ["أي اقتراحات للتحسين"]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Parse JSON
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return {
          success: true,
          validation: JSON.parse(jsonMatch[1] || jsonMatch[0])
        };
      }

      return {
        success: true,
        validation: { overallScore: 0.8, rawResponse: response }
      };

    } catch (error) {
      console.error('Gemini validateTranslation error:', error);
      throw new Error(`Failed to validate: ${error.message}`);
    }
  }
}

module.exports = new GeminiService();
