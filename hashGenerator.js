const crypto = require('crypto');

/**
 * Hash-based URL ID Generator
 * Generates 7-character short IDs using collision detection
 */
class HashGenerator {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Generate a 7-character hash from URL
   * @param {string} longUrl - The original URL
   * @param {number} attempt - Collision attempt counter
   * @returns {string} - 7-character hash
   */
  generate(longUrl, attempt = 0) {
    // Create hash input with attempt counter for collision resolution
    const input = `${longUrl}:${attempt}`;
    
    // Generate SHA256 hash
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    
    // Convert hex to base62 characters (0-9, a-z, A-Z)
    const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    
    // Take first 8 bytes of hash and convert to base62
    let num = BigInt('0x' + hash.substring(0, 16));
    
    for (let i = 0; i < 7; i++) {
      result = base62Chars[Number(num % BigInt(62))] + result;
      num = num / BigInt(62);
    }
    
    return result;
  }

  /**
   * Generate unique hash with collision detection (async)
   * @param {string} longUrl - The original URL
   * @returns {Promise<string>} - Unique 7-character hash
   */
  async generateUnique(longUrl) {
    let attempt = 0;
    let shortId = this.generate(longUrl, attempt);
    
    // Handle collisions by incrementing attempt counter
    while (await this.storage.exists(shortId) && attempt < 1000) {
      attempt++;
      shortId = this.generate(longUrl, attempt);
    }
    
    if (attempt >= 1000) {
      throw new Error('Failed to generate unique ID after 1000 attempts');
    }
    
    return shortId;
  }
}

module.exports = HashGenerator;
