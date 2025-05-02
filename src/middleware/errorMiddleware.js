/**
 * Error Middleware
 * Provides error handling middleware for Express
 */

const { errorResponse } = require('../controllers/baseController');

/**
 * Not found middleware - catches routes that don't exist
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Error:', err.message);
  
  // Get status from response or default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Format the error response
  return errorResponse(res, err.message, statusCode);
};

/**
 * Async error handler middleware
 * Catches errors in async/await code without try/catch
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Middleware function
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };
};

/**
 * Catch-all for unhandled errors and exceptions
 */
const setupGlobalErrorHandlers = (app) => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    // Exit process with failure
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    // Exit process with failure
    process.exit(1);
  });
  
  // Handle SIGTERM signal (e.g., Heroku shutdown)
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    // Close the server
    if (app.server) {
      app.server.close(() => {
        console.log('🔻 Process terminated!');
      });
    } else {
      process.exit(0);
    }
  });
};

module.exports = {
  notFound,
  errorHandler,
  asyncErrorHandler,
  setupGlobalErrorHandlers
}; 