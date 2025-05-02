/**
 * Authentication Routes
 * Handles all routes related to user authentication
 */

const express = require('express');
const { authController } = require('../controllers');
const { authMiddleware, validationMiddleware } = require('../middleware');
const { 
  authenticate, 
  requireAdmin 
} = authMiddleware;
const { 
  validateRequiredFields, 
  validateEmail 
} = validationMiddleware;

const router = express.Router();

// Login route
router.post('/login',
  validateRequiredFields(['username', 'password']),
  authController.login
);

// Refresh token route
router.post('/refresh-token',
  validateRequiredFields(['refreshToken']),
  authController.refreshToken
);

// Protected routes - require authentication
router.use(authenticate);

// Get current user profile
router.get('/profile', authController.getCurrentUser);

// Change password
router.post('/change-password',
  validateRequiredFields(['currentPassword', 'newPassword']),
  authController.changePassword
);

// Logout route
router.post('/logout', authController.logout);

// Admin-only routes - require admin role
router.use(requireAdmin);

// Register a new user (admin only)
router.post('/register',
  validateRequiredFields(['username', 'password', 'email', 'firstName', 'lastName', 'role']),
  validateEmail('email'),
  authController.register
);

module.exports = router; 