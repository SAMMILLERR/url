/**
 * Custom Rate Limiter
 * Implements a sliding window rate limiting algorithm
 */
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  /**
   * Check if a request from the given IP is allowed
   * @param {string} ip - Client IP address
   * @returns {object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  isAllowed(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Initialize or get request history for this IP
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }

    let timestamps = this.requests.get(ip);

    // Remove expired timestamps outside the sliding window
    timestamps = timestamps.filter(time => time > windowStart);
    this.requests.set(ip, timestamps);

    const requestCount = timestamps.length;
    const allowed = requestCount < this.maxRequests;

    if (allowed) {
      timestamps.push(now);
      this.requests.set(ip, timestamps);
    }

    // Calculate remaining requests after this request is counted
    const finalCount = allowed ? requestCount + 1 : requestCount;
    const remaining = Math.max(0, this.maxRequests - finalCount);

    const resetTime = timestamps.length > 0
      ? timestamps[0] + this.windowMs
      : now + this.windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? 0 : Math.ceil((resetTime - now) / 1000)
    };
  }

  /**
   * Reset rate limit for a specific IP
   * @param {string} ip - Client IP address
   */
  reset(ip) {
    this.requests.delete(ip);
  }

  /**
   * Get current stats for an IP
   * @param {string} ip - Client IP address
   * @returns {object} - Current request stats
   */
  getStats(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(ip)) {
      return {
        requestCount: 0,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs
      };
    }

    const timestamps = this.requests.get(ip)
      .filter(time => time > windowStart);

    return {
      requestCount: timestamps.length,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      resetTime: timestamps.length > 0
        ? timestamps[0] + this.windowMs
        : now + this.windowMs
    };
  }
}

module.exports = RateLimiter;
