/**
 * In-memory storage for shortened URLs
 * In production, you'd use a database like MongoDB or Redis
 */
class URLStorage {
  constructor() {
    this.urls = new Map();
    this.shortToLong = new Map();
  }

  /**
   * Save a shortened URL mapping
   * @param {string} shortId - The short ID
   * @param {string} longUrl - The original long URL
   * @param {string} customAlias - Optional custom alias
   * @returns {object} - Created URL object
   */
  save(shortId, longUrl, customAlias = null) {
    const alias = customAlias || shortId;
    const urlObj = {
      shortId: alias,
      longUrl,
      createdAt: new Date().toISOString(),
      clicks: 0
    };

    this.urls.set(alias, urlObj);
    this.shortToLong.set(alias, longUrl);
    return urlObj;
  }

  /**
   * Retrieve a URL by short ID
   * @param {string} shortId - The short ID
   * @returns {object|null} - URL object or null if not found
   */
  get(shortId) {
    return this.urls.get(shortId) || null;
  }

  /**
   * Get the long URL for a short ID
   * @param {string} shortId - The short ID
   * @returns {string|null} - Long URL or null if not found
   */
  getLongUrl(shortId) {
    return this.shortToLong.get(shortId) || null;
  }

  /**
   * Increment click count for a URL
   * @param {string} shortId - The short ID
   */
  incrementClicks(shortId) {
    const urlObj = this.urls.get(shortId);
    if (urlObj) {
      urlObj.clicks++;
    }
  }

  /**
   * Check if a short ID already exists
   * @param {string} shortId - The short ID
   * @returns {boolean} - True if exists
   */
  exists(shortId) {
    return this.urls.has(shortId);
  }

  /**
   * Delete a shortened URL
   * @param {string} shortId - The short ID
   * @returns {boolean} - True if deleted successfully
   */
  delete(shortId) {
    this.shortToLong.delete(shortId);
    return this.urls.delete(shortId);
  }

  /**
   * Get all URLs
   * @returns {array} - Array of all URL objects
   */
  getAll() {
    return Array.from(this.urls.values());
  }
}

module.exports = URLStorage;
