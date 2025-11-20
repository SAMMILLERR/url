const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI;

// Define URL schema
const urlSchema = new mongoose.Schema({
  shortId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  longUrl: {
    type: String,
    required: true
  },
  customAlias: {
    type: Boolean,
    default: false
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create model
const URLModel = mongoose.model('URL', urlSchema);

/**
 * MongoDB-based URL Storage
 */
class MongoDBStorage {
  constructor() {
    this.connected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      if (this.connected) return;
      
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      
      this.connected = true;
      console.log('[OK] Connected to MongoDB');
    } catch (error) {
      console.error('[ERROR] MongoDB connection error:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (!this.connected) return;
      await mongoose.disconnect();
      this.connected = false;
      console.log('[OK] Disconnected from MongoDB');
    } catch (error) {
      console.error('[ERROR] MongoDB disconnection error:', error.message);
    }
  }

  /**
   * Save a shortened URL mapping
   */
  async save(shortId, longUrl, customAlias = null) {
    try {
      const urlObj = new URLModel({
        shortId,
        longUrl,
        customAlias: customAlias ? true : false,
        clicks: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const saved = await urlObj.save();
      
      return {
        shortId: saved.shortId,
        longUrl: saved.longUrl,
        createdAt: saved.createdAt.toISOString(),
        clicks: saved.clicks
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('Short ID already exists');
      }
      throw error;
    }
  }

  /**
   * Retrieve a URL by short ID
   */
  async get(shortId) {
    try {
      const doc = await URLModel.findOne({ shortId });
      if (!doc) return null;

      return {
        shortId: doc.shortId,
        longUrl: doc.longUrl,
        createdAt: doc.createdAt.toISOString(),
        clicks: doc.clicks
      };
    } catch (error) {
      console.error('Error retrieving URL:', error);
      return null;
    }
  }

  /**
   * Get the long URL for a short ID
   */
  async getLongUrl(shortId) {
    try {
      const doc = await URLModel.findOne({ shortId });
      return doc ? doc.longUrl : null;
    } catch (error) {
      console.error('Error getting long URL:', error);
      return null;
    }
  }

  /**
   * Increment click count for a URL
   */
  async incrementClicks(shortId) {
    try {
      await URLModel.findOneAndUpdate(
        { shortId },
        { 
          $inc: { clicks: 1 },
          updatedAt: new Date()
        }
      );
    } catch (error) {
      console.error('Error incrementing clicks:', error);
    }
  }

  /**
   * Check if a short ID already exists
   */
  async exists(shortId) {
    try {
      const doc = await URLModel.findOne({ shortId });
      return doc !== null;
    } catch (error) {
      console.error('Error checking existence:', error);
      return false;
    }
  }

  /**
   * Delete a shortened URL
   */
  async delete(shortId) {
    try {
      const result = await URLModel.deleteOne({ shortId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting URL:', error);
      return false;
    }
  }

  /**
   * Get all URLs
   */
  async getAll() {
    try {
      const docs = await URLModel.find({})
        .sort({ createdAt: -1 })
        .limit(100);
      
      return docs.map(doc => ({
        shortId: doc.shortId,
        longUrl: doc.longUrl,
        createdAt: doc.createdAt.toISOString(),
        clicks: doc.clicks
      }));
    } catch (error) {
      console.error('Error getting all URLs:', error);
      return [];
    }
  }
}

module.exports = MongoDBStorage;
