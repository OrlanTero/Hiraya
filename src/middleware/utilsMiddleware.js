/**
 * Utility Middleware
 * Provides various utility middleware functions
 */

/**
 * Add CORS headers to allow cross-origin requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const cors = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
};

/**
 * Add security headers to protect against common web vulnerabilities
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const securityHeaders = (req, res, next) => {
  // Protect against XSS attacks
  res.header('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.header('X-Content-Type-Options', 'nosniff');
  
  // Control iframe embedding to prevent clickjacking
  res.header('X-Frame-Options', 'SAMEORIGIN');
  
  // Enable strict transport security (HTTPS only)
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
};

/**
 * Log incoming requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestLogger = (req, res, next) => {
  const start = new Date();
  
  // Log basic request info
  console.log(`${req.method} ${req.originalUrl} [${new Date().toISOString()}]`);
  
  // Log request body for POST, PUT requests (but not passwords)
  if (['POST', 'PUT'].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };
    
    // Don't log sensitive fields
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.passwordConfirm) sanitizedBody.passwordConfirm = '[REDACTED]';
    if (sanitizedBody.pin) sanitizedBody.pin = '[REDACTED]';
    if (sanitizedBody.qr_code) sanitizedBody.qr_code = '[REDACTED]';
    
    console.log('Body:', sanitizedBody);
  }
  
  // Add response finish listener to log completion
  res.on('finish', () => {
    const duration = new Date() - start;
    console.log(`${req.method} ${req.originalUrl} completed with status ${res.statusCode} in ${duration}ms`);
  });
  
  next();
};

/**
 * Rate limiting middleware to prevent abuse
 * Very simple implementation - for production use a more robust solution like 'express-rate-limit'
 * @param {Object} options - Rate limiting options
 * @returns {Function} Middleware function
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 100, // Limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later.',
  } = options;
  
  // Store request counts per IP
  const requestCounts = {};
  
  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const ip in requestCounts) {
      if (now - requestCounts[ip].timestamp > windowMs) {
        delete requestCounts[ip];
      }
    }
  }, windowMs);
  
  // Return the actual middleware
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Initialize or update request count for this IP
    if (!requestCounts[ip]) {
      requestCounts[ip] = {
        count: 1,
        timestamp: now
      };
    } else {
      // Reset if window has passed
      if (now - requestCounts[ip].timestamp > windowMs) {
        requestCounts[ip] = {
          count: 1,
          timestamp: now
        };
      } else {
        // Increment count
        requestCounts[ip].count++;
      }
    }
    
    // Check if limit is exceeded
    if (requestCounts[ip].count > max) {
      return res.status(429).json({
        success: false,
        message: message
      });
    }
    
    next();
  };
};

module.exports = {
  cors,
  addSecurityHeaders: securityHeaders,
  requestLogger,
  rateLimit
}; 