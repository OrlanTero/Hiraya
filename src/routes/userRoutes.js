/**
 * User Routes
 * Handles all routes related to user management
 */

const express = require('express');
const { userController } = require('../controllers');
const { authMiddleware, validationMiddleware } = require('../middleware');
const { 
  authenticate, 
  requireAdmin,
  requireRole
} = authMiddleware;
const { 
  validateRequiredFields, 
  validateIdParam,
  validateEmail,
  validateAllowedValues
} = validationMiddleware;

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Admin-only routes - require admin role
router.use(requireAdmin);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:id', validateIdParam('id'), userController.getUserById);

// Add new user
router.post('/', 
  validateRequiredFields(['username', 'password', 'email', 'firstName', 'lastName', 'role']),
  validateEmail('email'),
  validateAllowedValues('role', ['admin', 'staff', 'viewer']),
  userController.addUser
);

// Update user
router.put('/:id', 
  validateIdParam('id'),
  validateEmail('email'),
  userController.updateUser
);

// Delete user
router.delete('/:id', 
  validateIdParam('id'),
  userController.deleteUser
);

// Change user status (active/inactive)
router.patch('/:id/status',
  validateIdParam('id'),
  validateRequiredFields(['status']),
  validateAllowedValues('status', ['active', 'inactive']),
  userController.changeUserStatus
);

// Reset user password
router.post('/:id/reset-password',
  validateIdParam('id'),
  userController.resetPassword
);

module.exports = router; 