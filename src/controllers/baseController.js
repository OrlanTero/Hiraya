/**
 * Base Controller
 * Provides common functionality for all controllers
 */

/**
 * Standard success response
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Data to return
 * @param {number} status - HTTP status code (default: 200)
 */
const successResponse = (res, data, status = 200) => {
  return res.status(status).json(data);
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} status - HTTP status code (default: 500)
 */
const errorResponse = (res, message, status = 500) => {
  return res.status(status).json({
    success: false,
    message
  });
};

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {string} entity - The entity that was not found
 */
const notFoundResponse = (res, entity = 'Resource') => {
  return res.status(404).json({
    success: false,
    message: `${entity} not found`
  });
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Object} errors - Validation errors
 */
const validationErrorResponse = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: 'Validation error',
    errors
  });
};

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return res.status(401).json({
    success: false,
    message
  });
};

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const forbiddenResponse = (res, message = 'Access forbidden') => {
  return res.status(403).json({
    success: false,
    message
  });
};

/**
 * Handler wrapper for async functions
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Middleware function that catches errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    .catch((error) => {
      console.error(`API Error: ${error.message}`);
      
      // Determine the appropriate error response
      if (error.message && error.message.includes('not found')) {
        return notFoundResponse(res, error.message);
      }
      
      if (error.name === 'ValidationError') {
        return validationErrorResponse(res, error.errors || {});
      }
      
      return errorResponse(res, error.message);
    });
};

module.exports = {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  asyncHandler
}; 