# URL Shortener with Custom Rate Limiter

A simple, fast URL shortener API built with Express.js featuring a custom sliding window rate limiter to prevent abuse.

## Features

- ✨ **Shorten URLs** - Convert long URLs into short, shareable links
- 🎯 **Custom Aliases** - Create memorable short URLs with custom aliases
- 📊 **Click Tracking** - Track how many times each shortened URL is clicked
- 🛡️ **Rate Limiting** - Custom rate limiter protecting against abuse (30 requests/minute per IP)
- 🎨 **Web UI** - Beautiful, responsive web interface for URL shortening
- 🔍 **Statistics** - View detailed stats for each shortened URL
- 📱 **RESTful API** - Full-featured JSON API for programmatic access

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **ID Generation**: shortid
- **Storage**: In-memory (easily replaceable with MongoDB, PostgreSQL, Redis, etc.)

## Installation

1. Clone or navigate to the project directory:
```bash
cd d:\url_shortner
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Start the Server

**Development mode** (with auto-restart on file changes):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000`

### Web Interface

Open your browser and navigate to:
```
http://localhost:3000
```

A beautiful UI allows you to:
- Create shortened URLs
- Add custom aliases
- View statistics for shortened URLs
- See all created URLs

### API Endpoints

#### 1. Shorten a URL
**POST** `/api/shorten`

Request:
```json
{
  "longUrl": "https://example.com/very/long/url",
  "customAlias": "mylink"  // optional
}
```

Response:
```json
{
  "success": true,
  "shortUrl": "http://localhost:3000/mylink",
  "shortId": "mylink",
  "longUrl": "https://example.com/very/long/url",
  "createdAt": "2025-11-18T10:30:00.000Z",
  "clicks": 0
}
```

#### 2. Get URL Statistics
**GET** `/api/stats/:shortId`

Response:
```json
{
  "success": true,
  "shortId": "mylink",
  "longUrl": "https://example.com/very/long/url",
  "createdAt": "2025-11-18T10:30:00.000Z",
  "clicks": 5
}
```

#### 3. Get All URLs
**GET** `/api/all`

Response:
```json
{
  "success": true,
  "count": 2,
  "urls": [
    {
      "shortId": "mylink",
      "longUrl": "https://example.com/very/long/url",
      "createdAt": "2025-11-18T10:30:00.000Z",
      "clicks": 5
    }
  ]
}
```

#### 4. Delete a Shortened URL
**DELETE** `/api/delete/:shortId`

Response:
```json
{
  "success": true,
  "message": "Short URL \"mylink\" deleted successfully"
}
```

#### 5. Redirect to Original URL
**GET** `/:shortId`

Redirects to the original long URL and increments the click counter.

#### 6. Health Check
**GET** `/api/health`

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-11-18T10:30:00.000Z"
}
```

## Rate Limiting

The API implements a custom sliding window rate limiter:

- **Limit**: 30 requests per minute per IP address
- **Response Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: When the rate limit resets (ISO 8601 timestamp)

When rate limit is exceeded, you'll receive:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please retry after 45 seconds.",
  "retryAfter": 45,
  "resetTime": "2025-11-18T10:31:00.000Z"
}
```

## How the Rate Limiter Works

The custom `RateLimiter` class uses a **sliding window algorithm**:

1. **Tracks requests** - Maintains timestamps of requests from each IP address
2. **Sliding window** - Only counts requests within the last 60 seconds
3. **Automatic cleanup** - Removes expired timestamps outside the window
4. **Per-IP tracking** - Each client IP has its own rate limit counter

### Key Methods

```javascript
// Check if request is allowed
const result = rateLimiter.isAllowed(clientIp);
// Returns: { allowed, remaining, resetTime, retryAfter }

// Reset limit for an IP
rateLimiter.reset(clientIp);

// Get current stats
const stats = rateLimiter.getStats(clientIp);
// Returns: { requestCount, remaining, resetTime }
```

## Project Structure

```
url_shortener/
├── server.js           # Main Express server & API routes
├── rateLimiter.js      # Custom rate limiter implementation
├── urlStorage.js       # URL storage management
├── package.json        # Project dependencies
├── public/
│   └── index.html      # Web UI
└── README.md           # This file
```

## Testing

### Using cURL

```bash
# Create a shortened URL
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://github.com","customAlias":"gh"}'

# Get statistics
curl http://localhost:3000/api/stats/gh

# Delete a URL
curl -X DELETE http://localhost:3000/api/delete/gh

# Get all URLs
curl http://localhost:3000/api/all

# Test rate limiting
for i in {1..35}; do curl http://localhost:3000/api/health; echo "Request $i"; done
```

### Using Postman

1. Create a new POST request to `http://localhost:3000/api/shorten`
2. Set body to JSON:
```json
{
  "longUrl": "https://example.com",
  "customAlias": "test"
}
```
3. Send the request and check the response

## Configuration

You can customize the rate limiter by editing `server.js`:

```javascript
// Change limit to 60 requests per 2 minutes
const rateLimiter = new RateLimiter(60, 120000);
```

Parameters:
- `maxRequests` (default: 30) - Maximum requests allowed
- `windowMs` (default: 60000) - Time window in milliseconds

## Error Handling

The API handles various error scenarios:

- **400 Bad Request** - Missing or invalid URL
- **404 Not Found** - Short URL doesn't exist
- **409 Conflict** - Custom alias already taken
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error

## Production Considerations

### Storage
Currently uses in-memory storage. For production, replace with:
- MongoDB
- PostgreSQL
- Redis
- DynamoDB

### Rate Limiting
For distributed systems, consider:
- Redis-based rate limiting
- Amazon ElastiCache
- Cloudflare rate limiting

### Deployment
- Use a process manager like PM2
- Set environment variables (PORT)
- Use HTTPS
- Add authentication for admin endpoints
- Implement database backups

### Security
- Add API key authentication
- Use HTTPS
- Add CORS policies
- Validate and sanitize inputs
- Add request logging

## Development

### Installing Dependencies
```bash
npm install
```

### Running in Watch Mode
```bash
npm run dev
```

### Code Structure

**rateLimiter.js** - Sliding window rate limiter
- `isAllowed(ip)` - Check if request is allowed
- `reset(ip)` - Reset counter for IP
- `getStats(ip)` - Get current stats

**urlStorage.js** - URL management
- `save(shortId, longUrl, customAlias)` - Store URL
- `get(shortId)` - Retrieve URL info
- `getLongUrl(shortId)` - Get original URL
- `incrementClicks(shortId)` - Track clicks
- `exists(shortId)` - Check if URL exists
- `delete(shortId)` - Remove URL

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!

## Examples

### Example 1: Create a shortened URL

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "longUrl": "https://www.wikipedia.org/wiki/URL_shortening",
    "customAlias": "wiki-short"
  }'
```

Response:
```json
{
  "success": true,
  "shortUrl": "http://localhost:3000/wiki-short",
  "shortId": "wiki-short",
  "longUrl": "https://www.wikipedia.org/wiki/URL_shortening",
  "createdAt": "2025-11-18T10:30:00.000Z",
  "clicks": 0
}
```

### Example 2: Check rate limit status

Headers from any API response:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 2025-11-18T10:31:00.000Z
```

### Example 3: Get redirected with click tracking

```bash
curl -L http://localhost:3000/wiki-short
# Redirects to: https://www.wikipedia.org/wiki/URL_shortening
# Click counter incremented
```
