/**
 * Pricing Service
 * ===============
 * Handles all pricing calculations for NCT services
 */

class PricingService {
  constructor() {
    // Load prices from environment or use defaults (in IQD)
    this.prices = {
      fullServicePerPage: parseInt(process.env.PRICE_FULL_SERVICE_PER_PAGE) || 15000,
      selfTranslationPerPage: parseInt(process.env.PRICE_SELF_TRANSLATION_PER_PAGE) || 5000,
      aiTranslationPerPage: parseInt(process.env.PRICE_AI_TRANSLATION_PER_PAGE) || 10000,
      perWord: parseInt(process.env.PRICE_PER_WORD) || 66,
      certificationPerDoc: parseInt(process.env.PRICE_CERTIFICATION_PER_DOC) || 5000,
      additionalCopy: parseInt(process.env.PRICE_ADDITIONAL_COPY) || 2500,
      delivery: parseInt(process.env.PRICE_DELIVERY) || 5000,
      insurance: {
        '31days': parseInt(process.env.PRICE_INSURANCE_31_DAYS) || 5000,
        '45days': parseInt(process.env.PRICE_INSURANCE_45_DAYS) || 7500,
        '90days': parseInt(process.env.PRICE_INSURANCE_90_DAYS) || 12500,
        '1year': parseInt(process.env.PRICE_INSURANCE_1_YEAR) || 25000
      },
      rushMultiplier: 1.5 // 50% extra for rush orders
    };
  }

  /**
   * Calculate total price for an order
   */
  calculatePrice(options) {
    const {
      serviceType = 'full-service',
      pages = 1,
      words = 0,
      certification = false,
      numDocs = 1,
      insurance = null,
      insuranceCount = 1,
      additionalCopies = 0,
      deliveryMethod = 'pickup',
      rushTranslation = false
    } = options;

    const breakdown = {
      service: { description: '', amount: 0 },
      certification: { description: '', amount: 0 },
      insurance: { description: '', amount: 0 },
      copies: { description: '', amount: 0 },
      delivery: { description: '', amount: 0 },
      rush: { description: '', amount: 0 }
    };

    // 1. Base service cost
    let baseRate;
    switch (serviceType) {
      case 'full-service':
        baseRate = this.prices.fullServicePerPage;
        breakdown.service.description = `ترجمة كاملة الخدمات (${pages} صفحة × ${baseRate.toLocaleString()} د.ع)`;
        break;
      case 'self-translation':
        baseRate = this.prices.selfTranslationPerPage;
        breakdown.service.description = `مراجعة الترجمة الذاتية (${pages} صفحة × ${baseRate.toLocaleString()} د.ع)`;
        break;
      case 'ai-translation':
        baseRate = this.prices.aiTranslationPerPage;
        breakdown.service.description = `ترجمة بالذكاء الاصطناعي (${pages} صفحة × ${baseRate.toLocaleString()} د.ع)`;
        break;
      default:
        baseRate = this.prices.fullServicePerPage;
        breakdown.service.description = `خدمة الترجمة (${pages} صفحة × ${baseRate.toLocaleString()} د.ع)`;
    }

    // Calculate service cost (by page or by word)
    if (words > 0 && serviceType === 'full-service') {
      // Use word count if provided for full service
      breakdown.service.amount = words * this.prices.perWord;
      breakdown.service.description = `ترجمة كاملة الخدمات (${words.toLocaleString()} كلمة × ${this.prices.perWord} د.ع)`;
    } else {
      breakdown.service.amount = pages * baseRate;
    }

    // 2. Certification cost
    if (certification) {
      breakdown.certification.amount = numDocs * this.prices.certificationPerDoc;
      breakdown.certification.description = `مصادقة رسمية (${numDocs} وثيقة × ${this.prices.certificationPerDoc.toLocaleString()} د.ع)`;
    }

    // 3. Insurance cost
    if (insurance && this.prices.insurance[insurance]) {
      const insurancePrice = this.prices.insurance[insurance];
      breakdown.insurance.amount = insuranceCount * insurancePrice;
      
      const insuranceNames = {
        '31days': 'ضمان 31 يوم',
        '45days': 'ضمان 45 يوم',
        '90days': 'ضمان 90 يوم',
        '1year': 'ضمان سنة'
      };
      
      breakdown.insurance.description = `${insuranceNames[insurance]} (${insuranceCount} × ${insurancePrice.toLocaleString()} د.ع)`;
    }

    // 4. Additional copies cost
    if (additionalCopies > 0) {
      breakdown.copies.amount = additionalCopies * pages * this.prices.additionalCopy;
      breakdown.copies.description = `نسخ إضافية (${additionalCopies} نسخة × ${pages} صفحة × ${this.prices.additionalCopy.toLocaleString()} د.ع)`;
    }

    // 5. Delivery cost
    if (deliveryMethod === 'delivery') {
      breakdown.delivery.amount = this.prices.delivery;
      breakdown.delivery.description = `توصيل (${this.prices.delivery.toLocaleString()} د.ع)`;
    }

    // Calculate subtotal before rush
    const subtotal = Object.values(breakdown).reduce((sum, item) => sum + item.amount, 0);

    // 6. Rush translation fee
    if (rushTranslation) {
      breakdown.rush.amount = Math.round(breakdown.service.amount * (this.prices.rushMultiplier - 1));
      breakdown.rush.description = `رسوم الترجمة العاجلة (+50%)`;
    }

    // Calculate total
    const total = subtotal + breakdown.rush.amount;

    // Filter out zero amounts for cleaner response
    const filteredBreakdown = Object.entries(breakdown)
      .filter(([key, value]) => value.amount > 0)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    return {
      subtotal,
      total,
      currency: 'IQD',
      currencyAr: 'دينار عراقي',
      breakdown: filteredBreakdown,
      summary: {
        serviceType,
        serviceTypeAr: {
          'full-service': 'ترجمة كاملة الخدمات',
          'self-translation': 'مراجعة الترجمة الذاتية',
          'ai-translation': 'ترجمة بالذكاء الاصطناعي'
        }[serviceType] || 'خدمة الترجمة',
        pages,
        words: words || null,
        certification,
        insurance: insurance || null,
        additionalCopies,
        deliveryMethod,
        rushTranslation
      }
    };
  }

  /**
   * Get price list
   */
  getPriceList() {
    return {
      services: [
        {
          id: 'full-service',
          name: 'Full Service Translation',
          nameAr: 'ترجمة كاملة الخدمات',
          pricePerPage: this.prices.fullServicePerPage,
          pricePerWord: this.prices.perWord,
          description: 'Professional translation with certification',
          descriptionAr: 'ترجمة احترافية مع المصادقة'
        },
        {
          id: 'self-translation',
          name: 'Self Translation Review',
          nameAr: 'مراجعة الترجمة الذاتية',
          pricePerPage: this.prices.selfTranslationPerPage,
          description: 'Review and certification of your translation',
          descriptionAr: 'مراجعة ومصادقة ترجمتك'
        },
        {
          id: 'ai-translation',
          name: 'AI-Powered Translation',
          nameAr: 'ترجمة بالذكاء الاصطناعي',
          pricePerPage: this.prices.aiTranslationPerPage,
          description: 'AI extraction and translation with review',
          descriptionAr: 'استخراج وترجمة بالذكاء الاصطناعي مع المراجعة'
        }
      ],
      addons: {
        certification: {
          name: 'Official Certification',
          nameAr: 'المصادقة الرسمية',
          price: this.prices.certificationPerDoc,
          unit: 'document',
          unitAr: 'وثيقة'
        },
        additionalCopy: {
          name: 'Additional Copy',
          nameAr: 'نسخة إضافية',
          price: this.prices.additionalCopy,
          unit: 'copy per page',
          unitAr: 'نسخة لكل صفحة'
        },
        delivery: {
          name: 'Delivery',
          nameAr: 'توصيل',
          price: this.prices.delivery,
          unit: 'flat rate',
          unitAr: 'سعر ثابت'
        },
        rush: {
          name: 'Rush Translation',
          nameAr: 'ترجمة عاجلة',
          multiplier: this.prices.rushMultiplier,
          description: '50% surcharge',
          descriptionAr: 'زيادة 50%'
        }
      },
      insurance: [
        {
          id: '31days',
          name: '31 Days Assurance',
          nameAr: 'ضمان 31 يوم',
          price: this.prices.insurance['31days']
        },
        {
          id: '45days',
          name: '45 Days Assurance',
          nameAr: 'ضمان 45 يوم',
          price: this.prices.insurance['45days']
        },
        {
          id: '90days',
          name: '90 Days Assurance',
          nameAr: 'ضمان 90 يوم',
          price: this.prices.insurance['90days']
        },
        {
          id: '1year',
          name: '1 Year Assurance',
          nameAr: 'ضمان سنة',
          price: this.prices.insurance['1year']
        }
      ],
      deliveryMethods: [
        {
          id: 'digital',
          name: 'Digital File',
          nameAr: 'ملف رقمي',
          price: 0
        },
        {
          id: 'pickup',
          name: 'Office Pickup',
          nameAr: 'استلام من المكتب',
          price: 0
        },
        {
          id: 'delivery',
          name: 'Delivery',
          nameAr: 'توصيل',
          price: this.prices.delivery
        }
      ],
      currency: 'IQD',
      currencySymbol: 'د.ع'
    };
  }

  /**
   * Apply discount
   */
  applyDiscount(total, discountType, discountValue) {
    if (discountType === 'percentage') {
      const discount = Math.round(total * (discountValue / 100));
      return {
        originalTotal: total,
        discount,
        discountedTotal: total - discount,
        discountDescription: `خصم ${discountValue}%`
      };
    } else if (discountType === 'fixed') {
      return {
        originalTotal: total,
        discount: discountValue,
        discountedTotal: Math.max(0, total - discountValue),
        discountDescription: `خصم ${discountValue.toLocaleString()} د.ع`
      };
    }
    return { originalTotal: total, discount: 0, discountedTotal: total };
  }
}

module.exports = new PricingService();
