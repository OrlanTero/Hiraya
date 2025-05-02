/**
 * Member Routes
 * Handles all routes related to library members
 */

const express = require('express');
const { memberController } = require('../controllers');
const { authMiddleware, validationMiddleware } = require('../middleware');
const { 
  authenticate, 
  requireStaff 
} = authMiddleware;
const { 
  validateRequiredFields, 
  validateIdParam,
  validateEmail 
} = validationMiddleware;

const router = express.Router();

// Staff-only routes - require authentication and staff role
router.use(authenticate);
router.use(requireStaff);

// Get all members
router.get('/', memberController.getAllMembers);

// Search members
router.get('/search/:query', memberController.searchMembers);

// Member-specific operations with ID parameter
router.get('/:id/statistics', validateIdParam('id'), memberController.getMemberStats);
router.get('/:id/loans', validateIdParam('id'), memberController.getMemberLoans);

// Get member by ID
router.get('/:id', validateIdParam('id'), memberController.getMemberById);

// Add new member
router.post('/', 
  validateRequiredFields(['firstName', 'lastName', 'email', 'phone']),
  validateEmail('email'),
  memberController.addMember
);

// Update member
router.put('/:id', 
  validateIdParam('id'),
  validateEmail('email'),
  memberController.updateMember
);

// Delete member
router.delete('/:id', 
  validateIdParam('id'),
  memberController.deleteMember
);

module.exports = router;