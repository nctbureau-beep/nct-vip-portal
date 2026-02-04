/**
 * Google Drive Service
 * ====================
 * Handles all Google Drive operations for NCT Translation Portal
 * - File uploads
 * - Folder management
 * - Document retrieval
 */

const { google } = require('googleapis');
const stream = require('stream');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.initialized = false;
  }

  /**
   * Initialize Google Drive client
   */
  async initialize() {
    if (this.initialized) return;

    try {
      let credentials;
      
      if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
        credentials = require(process.env.GOOGLE_SERVICE_ACCOUNT_FILE);
      } else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      } else {
        throw new Error('Google service account credentials not configured');
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;
      
      console.log('✅ Google Drive service initialized');
    } catch (error) {
      console.error('❌ Google Drive initialization error:', error);
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
  // FOLDER OPERATIONS
  // ===================

  /**
   * Create a folder in Google Drive
   */
  async createFolder(name, parentFolderId = null) {
    await this.ensureInitialized();

    try {
      const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink'
      });

      return {
        success: true,
        folder: {
          id: response.data.id,
          name: response.data.name,
          url: response.data.webViewLink
        }
      };
    } catch (error) {
      console.error('Drive createFolder error:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Create customer folder structure
   * Structure: Root > Customer Name > Order ID
   */
  async createCustomerFolders(customerName, orderId) {
    await this.ensureInitialized();

    try {
      const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
      
      // Create or find customer folder
      let customerFolder = await this.findFolder(customerName, rootFolderId);
      if (!customerFolder) {
        const result = await this.createFolder(customerName, rootFolderId);
        customerFolder = result.folder;
      }

      // Create order subfolder
      const orderFolderName = `Order_${orderId}_${new Date().toISOString().split('T')[0]}`;
      const orderFolder = await this.createFolder(orderFolderName, customerFolder.id);

      // Create subfolders for uploads and translated
      const uploadFolder = await this.createFolder('Uploads', orderFolder.folder.id);
      const translatedFolder = await this.createFolder('Translated', orderFolder.folder.id);

      return {
        success: true,
        folders: {
          customer: customerFolder,
          order: orderFolder.folder,
          uploads: uploadFolder.folder,
          translated: translatedFolder.folder
        }
      };
    } catch (error) {
      console.error('Drive createCustomerFolders error:', error);
      throw new Error(`Failed to create customer folders: ${error.message}`);
    }
  }

  /**
   * Find folder by name
   */
  async findFolder(name, parentFolderId = null) {
    await this.ensureInitialized();

    try {
      let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      if (parentFolderId) {
        query += ` and '${parentFolderId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, webViewLink)',
        pageSize: 1
      });

      if (response.data.files.length > 0) {
        const folder = response.data.files[0];
        return {
          id: folder.id,
          name: folder.name,
          url: folder.webViewLink
        };
      }

      return null;
    } catch (error) {
      console.error('Drive findFolder error:', error);
      return null;
    }
  }

  // ===================
  // FILE OPERATIONS
  // ===================

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(file, folderId, fileName = null) {
    await this.ensureInitialized();

    try {
      const fileMetadata = {
        name: fileName || file.originalname || file.name || 'document',
        parents: folderId ? [folderId] : []
      };

      let media;

      // Handle different file input types
      if (file.buffer) {
        // Multer buffer
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        media = {
          mimeType: file.mimetype || 'application/octet-stream',
          body: bufferStream
        };
      } else if (file.path) {
        // File path
        const fs = require('fs');
        media = {
          mimeType: file.mimetype || 'application/octet-stream',
          body: fs.createReadStream(file.path)
        };
      } else if (typeof file === 'string' && file.startsWith('data:')) {
        // Base64 data URL
        const matches = file.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const bufferStream = new stream.PassThrough();
          bufferStream.end(buffer);
          media = {
            mimeType,
            body: bufferStream
          };
        }
      } else if (Buffer.isBuffer(file)) {
        // Raw buffer
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file);
        media = {
          mimeType: 'application/octet-stream',
          body: bufferStream
        };
      }

      if (!media) {
        throw new Error('Invalid file format');
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink, mimeType, size'
      });

      // Make file accessible
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return {
        success: true,
        file: {
          id: response.data.id,
          name: response.data.name,
          mimeType: response.data.mimeType,
          size: response.data.size,
          viewUrl: response.data.webViewLink,
          downloadUrl: response.data.webContentLink,
          directUrl: `https://drive.google.com/uc?id=${response.data.id}`
        }
      };
    } catch (error) {
      console.error('Drive uploadFile error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files, folderId) {
    await this.ensureInitialized();

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, folderId);
        results.push(result.file);
      } catch (error) {
        errors.push({
          file: file.name || file.originalname,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      uploaded: results,
      errors
    };
  }

  /**
   * Get file by ID
   */
  async getFile(fileId) {
    await this.ensureInitialized();

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, webViewLink, webContentLink, mimeType, size, createdTime'
      });

      return {
        success: true,
        file: {
          id: response.data.id,
          name: response.data.name,
          mimeType: response.data.mimeType,
          size: response.data.size,
          viewUrl: response.data.webViewLink,
          downloadUrl: response.data.webContentLink,
          directUrl: `https://drive.google.com/uc?id=${response.data.id}`,
          createdAt: response.data.createdTime
        }
      };
    } catch (error) {
      console.error('Drive getFile error:', error);
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  /**
   * Download file content
   */
  async downloadFile(fileId) {
    await this.ensureInitialized();

    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        data: Buffer.from(response.data),
        mimeType: response.headers['content-type']
      };
    } catch (error) {
      console.error('Drive downloadFile error:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folderId, pageSize = 100) {
    await this.ensureInitialized();

    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, webViewLink, webContentLink, mimeType, size, createdTime)',
        pageSize,
        orderBy: 'createdTime desc'
      });

      return {
        success: true,
        files: response.data.files.map(file => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          viewUrl: file.webViewLink,
          downloadUrl: file.webContentLink,
          directUrl: `https://drive.google.com/uc?id=${file.id}`,
          createdAt: file.createdTime
        }))
      };
    } catch (error) {
      console.error('Drive listFiles error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId) {
    await this.ensureInitialized();

    try {
      await this.drive.files.delete({ fileId });
      return { success: true };
    } catch (error) {
      console.error('Drive deleteFile error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Move file to folder
   */
  async moveFile(fileId, newFolderId) {
    await this.ensureInitialized();

    try {
      // Get current parents
      const file = await this.drive.files.get({
        fileId,
        fields: 'parents'
      });

      const previousParents = file.data.parents.join(',');

      // Move to new folder
      const response = await this.drive.files.update({
        fileId,
        addParents: newFolderId,
        removeParents: previousParents,
        fields: 'id, name, webViewLink, parents'
      });

      return {
        success: true,
        file: response.data
      };
    } catch (error) {
      console.error('Drive moveFile error:', error);
      throw new Error(`Failed to move file: ${error.message}`);
    }
  }

  /**
   * Copy file
   */
  async copyFile(fileId, newName, destinationFolderId) {
    await this.ensureInitialized();

    try {
      const response = await this.drive.files.copy({
        fileId,
        requestBody: {
          name: newName,
          parents: destinationFolderId ? [destinationFolderId] : []
        },
        fields: 'id, name, webViewLink, webContentLink'
      });

      return {
        success: true,
        file: {
          id: response.data.id,
          name: response.data.name,
          viewUrl: response.data.webViewLink,
          downloadUrl: response.data.webContentLink
        }
      };
    } catch (error) {
      console.error('Drive copyFile error:', error);
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }
}

module.exports = new GoogleDriveService();
