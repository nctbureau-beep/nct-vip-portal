/**
 * Notion Service
 * ==============
 * Handles all Notion API operations for NCT Translation Portal
 * - Customer database CRUD operations
 * - Order management
 * - Status updates
 */

const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.client = new Client({
      auth: process.env.NOTION_API_KEY
    });
    
    this.customerDatabaseId = process.env.NOTION_CUSTOMER_DATABASE_ID;
    this.vipDatabaseId = process.env.NOTION_VIP_DATABASE_ID;
  }

  // ===================
  // HELPER METHODS
  // ===================

  /**
   * Convert rich text to plain string
   */
  richTextToString(richText) {
    if (!richText || !Array.isArray(richText)) return '';
    return richText.map(text => text.plain_text).join('');
  }

  /**
   * Create rich text object
   */
  createRichText(content) {
    return [{ type: 'text', text: { content: content || '' } }];
  }

  /**
   * Format date for Notion
   */
  formatDate(date, includeTime = false) {
    if (!date) return null;
    const d = new Date(date);
    if (includeTime) {
      return d.toISOString();
    }
    return d.toISOString().split('T')[0];
  }

  /**
   * Parse Notion page to order object
   */
  parseOrderFromPage(page) {
    const props = page.properties;
    
    return {
      id: page.id,
      url: page.url,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      
      // Customer info
      customerName: this.richTextToString(props['Customer Name']?.title),
      customerId: props['Customer ID']?.unique_id?.number,
      phone: props['Phone']?.phone_number,
      customerStatus: props['Customer Status']?.select?.name,
      
      // Order details
      status: props['Status']?.status?.name,
      paymentStatus: props['Payment Status 💰']?.status?.name,
      service: props['service ']?.multi_select?.map(s => s.name) || [],
      documentType: props['Type of Docs']?.multi_select?.map(t => t.name) || [],
      language: props['Language 🚩']?.multi_select?.map(l => l.name) || [],
      
      // Pages and pricing
      pages: props['Page']?.number || 0,
      words: props['Words']?.number || 0,
      finalQuotation: props['Final Quotation']?.number || 0,
      
      // Options
      certification: props['Certification']?.checkbox || false,
      numDocs: props['N. of Docs']?.number || 1,
      insurance: props['Insurance']?.multi_select?.map(i => i.name) || [],
      deliveryMethod: props['Delivery method']?.multi_select?.map(d => d.name) || [],
      paymentMethod: props['Payment Method ']?.select?.name,
      
      // Dates
      deadline: props['Deadline ']?.date?.start,
      translationTime: props['Translation Time ']?.date?.start,
      
      // Notes
      notes: this.richTextToString(props['Notes ']?.rich_text),
      
      // Files
      documents: props['Documents ']?.files?.map(f => ({
        name: f.name,
        url: f.file?.url || f.external?.url
      })) || [],
      
      // Channel
      channel: props['channel ']?.select?.name
    };
  }

  // ===================
  // ORDER OPERATIONS
  // ===================

  /**
   * Create a new order in Notion
   */
  async createOrder(orderData) {
    try {
      const properties = {
        'Customer Name': {
          title: this.createRichText(orderData.customerName)
        },
        'Phone': {
          phone_number: orderData.phone
        },
        'Status': {
          status: { name: 'New Ticket' }
        },
        'Payment Status 💰': {
          status: { name: 'Not Paid' }
        },
        'service ': {
          multi_select: (orderData.services || ['Translation']).map(s => ({ name: s }))
        },
        'Language 🚩': {
          multi_select: (orderData.languages || ['En ⇆ Ar']).map(l => ({ name: l }))
        },
        'Type of Docs': {
          multi_select: (orderData.documentTypes || []).map(t => ({ name: t }))
        },
        'Page': {
          number: orderData.pages || 1
        },
        'Certification': {
          checkbox: orderData.certification || false
        },
        'N. of Docs': {
          number: orderData.numDocs || 1
        },
        'Final Quotation': {
          number: orderData.totalPrice || 0
        },
        'Delivery method': {
          multi_select: (orderData.deliveryMethods || ['Pickup']).map(d => ({ name: d }))
        },
        'Notes ': {
          rich_text: this.createRichText(orderData.notes)
        },
        'channel ': {
          select: { name: orderData.channel || 'App' }
        }
      };

      // Add optional fields
      if (orderData.insurance && orderData.insurance.length > 0) {
        properties['Insurance'] = {
          multi_select: orderData.insurance.map(i => ({ name: i }))
        };
        properties['Number of Insurance'] = {
          number: orderData.insuranceCount || 1
        };
      }

      if (orderData.words) {
        properties['Words'] = { number: orderData.words };
      }

      if (orderData.deadline) {
        properties['Deadline '] = {
          date: { start: this.formatDate(orderData.deadline, true) }
        };
      }

      if (orderData.paymentMethod) {
        properties['Payment Method '] = {
          select: { name: orderData.paymentMethod }
        };
      }

      if (orderData.customerStatus) {
        properties['Customer Status'] = {
          select: { name: orderData.customerStatus }
        };
      }

      const response = await this.client.pages.create({
        parent: { database_id: this.customerDatabaseId },
        properties
      });

      return {
        success: true,
        order: this.parseOrderFromPage(response)
      };

    } catch (error) {
      console.error('Notion createOrder error:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    try {
      const page = await this.client.pages.retrieve({ page_id: orderId });
      return {
        success: true,
        order: this.parseOrderFromPage(page)
      };
    } catch (error) {
      console.error('Notion getOrder error:', error);
      throw new Error(`Failed to get order: ${error.message}`);
    }
  }

  /**
   * Get orders by phone number
   */
  async getOrdersByPhone(phone) {
    try {
      const response = await this.client.databases.query({
        database_id: this.customerDatabaseId,
        filter: {
          property: 'Phone',
          phone_number: { equals: phone }
        },
        sorts: [
          { property: 'Created time', direction: 'descending' }
        ]
      });

      return {
        success: true,
        orders: response.results.map(page => this.parseOrderFromPage(page)),
        hasMore: response.has_more,
        nextCursor: response.next_cursor
      };
    } catch (error) {
      console.error('Notion getOrdersByPhone error:', error);
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  /**
   * Get all orders with filters
   */
  async getOrders(filters = {}, pagination = {}) {
    try {
      const queryParams = {
        database_id: this.customerDatabaseId,
        sorts: [
          { property: 'Created time', direction: 'descending' }
        ],
        page_size: pagination.pageSize || 20
      };

      // Add pagination cursor
      if (pagination.cursor) {
        queryParams.start_cursor = pagination.cursor;
      }

      // Build filters
      const filterConditions = [];

      if (filters.status) {
        filterConditions.push({
          property: 'Status',
          status: { equals: filters.status }
        });
      }

      if (filters.paymentStatus) {
        filterConditions.push({
          property: 'Payment Status 💰',
          status: { equals: filters.paymentStatus }
        });
      }

      if (filters.dateFrom) {
        filterConditions.push({
          property: 'Created time',
          created_time: { on_or_after: filters.dateFrom }
        });
      }

      if (filters.dateTo) {
        filterConditions.push({
          property: 'Created time',
          created_time: { on_or_before: filters.dateTo }
        });
      }

      if (filterConditions.length > 0) {
        queryParams.filter = filterConditions.length === 1
          ? filterConditions[0]
          : { and: filterConditions };
      }

      const response = await this.client.databases.query(queryParams);

      return {
        success: true,
        orders: response.results.map(page => this.parseOrderFromPage(page)),
        hasMore: response.has_more,
        nextCursor: response.next_cursor
      };
    } catch (error) {
      console.error('Notion getOrders error:', error);
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  /**
   * Update order
   */
  async updateOrder(orderId, updates) {
    try {
      const properties = {};

      // Map updates to Notion properties
      if (updates.status) {
        properties['Status'] = { status: { name: updates.status } };
      }

      if (updates.paymentStatus) {
        properties['Payment Status 💰'] = { status: { name: updates.paymentStatus } };
      }

      if (updates.paymentMethod) {
        properties['Payment Method '] = { select: { name: updates.paymentMethod } };
      }

      if (updates.finalQuotation !== undefined) {
        properties['Final Quotation'] = { number: updates.finalQuotation };
      }

      if (updates.notes !== undefined) {
        properties['Notes '] = { rich_text: this.createRichText(updates.notes) };
      }

      if (updates.translationTime) {
        properties['Translation Time '] = {
          date: { start: this.formatDate(updates.translationTime, true) }
        };
      }

      if (updates.deadline) {
        properties['Deadline '] = {
          date: { start: this.formatDate(updates.deadline, true) }
        };
      }

      const response = await this.client.pages.update({
        page_id: orderId,
        properties
      });

      return {
        success: true,
        order: this.parseOrderFromPage(response)
      };
    } catch (error) {
      console.error('Notion updateOrder error:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }
  }

  /**
   * Add files to order
   */
  async addFilesToOrder(orderId, files) {
    try {
      // Files should be array of { name, url } objects
      const fileObjects = files.map(file => ({
        type: 'external',
        name: file.name,
        external: { url: file.url }
      }));

      const response = await this.client.pages.update({
        page_id: orderId,
        properties: {
          'Documents ': { files: fileObjects }
        }
      });

      return {
        success: true,
        order: this.parseOrderFromPage(response)
      };
    } catch (error) {
      console.error('Notion addFilesToOrder error:', error);
      throw new Error(`Failed to add files: ${error.message}`);
    }
  }

  // ===================
  // STATISTICS
  // ===================

  /**
   * Get order statistics
   */
  async getStatistics(dateFrom, dateTo) {
    try {
      const filter = {
        and: [
          {
            property: 'Created time',
            created_time: { on_or_after: dateFrom }
          },
          {
            property: 'Created time',
            created_time: { on_or_before: dateTo }
          }
        ]
      };

      const response = await this.client.databases.query({
        database_id: this.customerDatabaseId,
        filter,
        page_size: 100
      });

      const orders = response.results.map(page => this.parseOrderFromPage(page));

      // Calculate statistics
      const stats = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.finalQuotation || 0), 0),
        byStatus: {},
        byPaymentStatus: {},
        byService: {},
        byChannel: {}
      };

      orders.forEach(order => {
        // Count by status
        const status = order.status || 'Unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Count by payment status
        const paymentStatus = order.paymentStatus || 'Unknown';
        stats.byPaymentStatus[paymentStatus] = (stats.byPaymentStatus[paymentStatus] || 0) + 1;

        // Count by service
        order.service.forEach(s => {
          stats.byService[s] = (stats.byService[s] || 0) + 1;
        });

        // Count by channel
        const channel = order.channel || 'Unknown';
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
      });

      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      console.error('Notion getStatistics error:', error);
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  // ===================
  // CUSTOMER PROFILE
  // ===================

  /**
   * Get or create customer profile
   */
  async getOrCreateCustomerProfile(phone, name) {
    try {
      // First, try to find existing profile
      const searchResponse = await this.client.databases.query({
        database_id: this.vipDatabaseId,
        filter: {
          property: 'Phone',
          phone_number: { equals: phone }
        }
      });

      if (searchResponse.results.length > 0) {
        return {
          success: true,
          profile: searchResponse.results[0],
          isNew: false
        };
      }

      // Create new profile
      const newProfile = await this.client.pages.create({
        parent: { database_id: this.vipDatabaseId },
        properties: {
          'Name': { title: this.createRichText(name) },
          'Phone': { phone_number: phone }
        }
      });

      return {
        success: true,
        profile: newProfile,
        isNew: true
      };
    } catch (error) {
      console.error('Notion getOrCreateCustomerProfile error:', error);
      throw new Error(`Failed to manage customer profile: ${error.message}`);
    }
  }
}

module.exports = new NotionService();
