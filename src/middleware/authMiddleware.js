/**
 * Authentication Middleware
 * Handles user authentication and authorization
 */

const { User } = require('../models');
const { unauthorizedResponse, forbiddenResponse } = require('../controllers/baseController');

/**
 * Authenticate user using JWT token
 * This middleware verifies the JWT token and adds the user info to the request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get the token from the request header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Access denied. No token provided.');
    }
    
    // Extract token (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return unauthorizedResponse(res, 'Access denied. No token provided.');
    }
    
    // Verify the token
    const decoded = await User.verifyToken(token);
    
    // Attach the user information to the request
    req.user = decoded;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    return unauthorizedResponse(res, 'Invalid or expired token.');
  }
};

/**
 * Check if user has admin role
 * This middleware should be used after the authenticate middleware
 */
const requireAdmin = async (req, res, next) => {
  try {
    const isAdmin = await User.hasRole(req.user.id, 'admin');
    
    if (!isAdmin) {
      return forbiddenResponse(res, 'Access denied. Admin privileges required.');
    }
    
    next();
  } catch (error) {
    return forbiddenResponse(res, 'Access denied.');
  }
};

/**
 * Check if user has staff or admin role
 * This middleware should be used after the authenticate middleware
 */
const requireStaff = async (req, res, next) => {
  try {
    const hasRole = await User.hasRole(req.user.id, ['staff', 'admin']);
    
    if (!hasRole) {
      return forbiddenResponse(res, 'Access denied. Staff privileges required.');
    }
    
    next();
  } catch (error) {
    return forbiddenResponse(res, 'Access denied.');
  }
};

/**
 * Check if user has a specific role
 * @param {string|Array} roles - Role(s) to check for
 * @returns {Function} Middleware function
 */
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const hasRole = await User.hasRole(req.user.id, roles);
      
      if (!hasRole) {
        return forbiddenResponse(res, 'Access denied. Required role privileges missing.');
      }
      
      next();
    } catch (error) {
      return forbiddenResponse(res, 'Access denied.');
    }
  };
};

module.exports = {
  authenticate,
  requireAdmin,
  requireStaff,
  requireRole
}; 