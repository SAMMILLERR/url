const express = require('express');
require('dotenv').config();
const RateLimiter = require('./rateLimiter');
const HashGenerator = require('./hashGenerator');
const MongoDBStorage = require('./mongoDBStorage');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize rate limiter: 30 requests per minute per IP
const rateLimiter = new RateLimiter(30, 60000);

// Initialize MongoDB storage
const urlStorage = new MongoDBStorage();

// Initialize hash generator with storage for collision detection
const hashGenerator = new HashGenerator(urlStorage);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

/**
 * Custom rate limiting middleware
 */
const rateLimitMiddleware = (req, res, next) => {
  // Extract client IP with proper handling for localhost and proxies
  let clientIp = req.ip || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 req.connection.socket?.remoteAddress ||
                 '::1';
  
  // Normalize IPv6 localhost to IPv4
  if (clientIp === '::1' || clientIp === '127.0.0.1') {
    clientIp = '127.0.0.1';
  }
  
  const limitCheck = rateLimiter.isAllowed(clientIp);

  // Set rate limit headers
  res.set('X-RateLimit-Limit', '30');
  res.set('X-RateLimit-Remaining', limitCheck.remaining.toString());
  res.set('X-RateLimit-Reset', new Date(limitCheck.resetTime).toISOString());

  if (!limitCheck.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please retry after ${limitCheck.retryAfter} seconds.`,
      retryAfter: limitCheck.retryAfter,
      resetTime: new Date(limitCheck.resetTime).toISOString()
    });
  }

  next();
};

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * POST /api/shorten
 * Create a shortened URL
 */
app.post('/api/shorten', rateLimitMiddleware, async (req, res) => {
  const { longUrl, customAlias } = req.body;

  if (!longUrl) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'longUrl is required'
    });
  }

  if (!isValidUrl(longUrl)) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'The provided URL is not valid'
    });
  }

  // Validate custom alias if provided
  if (customAlias) {
    if (customAlias.length < 3 || customAlias.length > 20) {
      return res.status(400).json({
        error: 'Invalid alias',
        message: 'Alias must be between 3 and 20 characters'
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {
      return res.status(400).json({
        error: 'Invalid alias',
        message: 'Alias can only contain letters, numbers, hyphens, and underscores'
      });
    }

    if (await urlStorage.exists(customAlias)) {
      return res.status(409).json({
        error: 'Alias already taken',
        message: `The alias "${customAlias}" is already in use`
      });
    }
  }

  try {
    const shortId = customAlias || await hashGenerator.generateUnique(longUrl);
    const urlObj = await urlStorage.save(shortId, longUrl, customAlias);

    res.status(201).json({
      success: true,
      shortUrl: `${req.protocol}://${req.get('host')}/${shortId}`,
      ...urlObj
    });
  } catch (error) {
    console.error('Error creating shortened URL:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Failed to create shortened URL'
    });
  }
});

/**
 * GET /api/stats/:shortId
 * Get statistics for a shortened URL
 */
app.get('/api/stats/:shortId', rateLimitMiddleware, async (req, res) => {
  const { shortId } = req.params;
  const urlObj = await urlStorage.get(shortId);

  if (!urlObj) {
    return res.status(404).json({
      error: 'Not found',
      message: `Short URL "${shortId}" not found`
    });
  }

  res.json({
    success: true,
    ...urlObj
  });
});

/**
 * GET /api/all
 * Get all shortened URLs (for admin/testing)
 */
app.get('/api/all', rateLimitMiddleware, async (req, res) => {
  const urls = await urlStorage.getAll();
  res.json({
    success: true,
    count: urls.length,
    urls
  });
});

/**
 * DELETE /api/delete/:shortId
 * Delete a shortened URL
 */
app.delete('/api/delete/:shortId', rateLimitMiddleware, async (req, res) => {
  const { shortId } = req.params;

  if (!(await urlStorage.exists(shortId))) {
    return res.status(404).json({
      error: 'Not found',
      message: `Short URL "${shortId}" not found`
    });
  }

  await urlStorage.delete(shortId);
  res.json({
    success: true,
    message: `Short URL "${shortId}" deleted successfully`
  });
});

/**
 * GET /:shortId
 * Redirect to the original URL
 */
app.get('/:shortId', rateLimitMiddleware, async (req, res) => {
  const { shortId } = req.params;

  // Exclude API routes and static files
  if (shortId.startsWith('api') || shortId.includes('.')) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Resource not found'
    });
  }

  const longUrl = await urlStorage.getLongUrl(shortId);

  if (!longUrl) {
    return res.status(404).json({
      error: 'Not found',
      message: `Short URL "${shortId}" not found`
    });
  }

  // Increment click counter
  await urlStorage.incrementClicks(shortId);

  // Redirect to the original URL
  res.redirect(301, longUrl);
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', rateLimitMiddleware, (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, async () => {
  // Connect to MongoDB
  try {
    await urlStorage.connect();
  } catch (error) {
    console.error('Failed to connect to MongoDB. Exiting...');
    process.exit(1);
  }

  console.log(`
[URL Shortener API Running]
http://localhost:${PORT}

Rate Limit: 30 requests per minute per IP
Storage: MongoDB

Available Endpoints:
  POST   /api/shorten        - Create shortened URL
  GET    /api/stats/:id      - Get URL statistics
  GET    /api/all            - List all URLs
  DELETE /api/delete/:id     - Delete shortened URL
  GET    /:id                - Redirect to original URL
  GET    /api/health         - Health check
  `);
});

module.exports = app;
