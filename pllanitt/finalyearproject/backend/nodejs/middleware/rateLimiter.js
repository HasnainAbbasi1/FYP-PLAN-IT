/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting the number of requests per IP address
 */

// Store for rate limit tracking (in production, use Redis)
const rateLimitStore = new Map();

// Clean up old entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 15 * 60 * 1000);

/**
 * Create rate limiter middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Maximum number of requests per window (default: 100)
 * @param {string} options.message - Error message (default: 'Too many requests')
 * @param {boolean} options.skipSuccessfulRequests - Don't count successful requests (default: false)
 * @param {Function} options.keyGenerator - Custom key generator function
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    keyGenerator = (req) => {
      // Use IP address as key, or user ID if authenticated
      return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip || req.connection.remoteAddress}`;
    }
  } = options;

  return async (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      
      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      
      if (!entry || entry.resetTime < now) {
        // Create new entry or reset expired entry
        entry = {
          count: 0,
          resetTime: now + windowMs
        };
        rateLimitStore.set(key, entry);
      }

      // Increment count
      entry.count++;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      // Check if limit exceeded
      if (entry.count > max) {
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000) // seconds
        });
      }

      // If skipSuccessfulRequests is true, decrement on successful response
      if (skipSuccessfulRequests) {
        const originalSend = res.send;
        res.send = function(data) {
          if (res.statusCode < 400) {
            entry.count = Math.max(0, entry.count - 1);
          }
          return originalSend.call(this, data);
        };
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Don't block request on rate limiter error
      next();
    }
  };
};

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req) => {
    // Use IP address for auth endpoints
    return `auth:${req.ip || req.connection.remoteAddress}`;
  }
});

/**
 * Standard API rate limiter
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later'
});

/**
 * Strict rate limiter for file uploads
 */
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Too many file uploads, please try again later'
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter
};


