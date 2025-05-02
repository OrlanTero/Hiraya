/**
 * Book Copy Routes
 * Handles all routes related to physical book copy operations
 */

const express = require('express');
const { bookCopyController } = require('../controllers');
const { authMiddleware, validationMiddleware } = require('../middleware');
const { 
  authenticate, 
  requireStaff 
} = authMiddleware;
const { 
  validateRequiredFields, 
  validateIdParam,
  validateAllowedValues
} = validationMiddleware;

const router = express.Router();

// Public routes
router.get('/', bookCopyController.getAllBookCopies);
router.get('/book/:bookId/availability', validateIdParam('bookId'), bookCopyController.getBookAvailability);
router.get('/book/:bookId', validateIdParam('bookId'), bookCopyController.getBookCopiesByBookId);
router.get('/:id', validateIdParam('id'), bookCopyController.getBookCopyById);

// Protected routes - require authentication
router.use(authenticate);

// Staff-only routes - require staff role
router.use(requireStaff);

router.post('/', 
  validateRequiredFields(['bookId', 'shelfId']),
  bookCopyController.addBookCopy
);

router.put('/:id', 
  validateIdParam('id'),
  bookCopyController.updateBookCopy
);

router.delete('/:id', 
  validateIdParam('id'),
  bookCopyController.deleteBookCopy
);

router.patch('/:id/move',
  validateIdParam('id'),
  validateRequiredFields(['shelfId']),
  bookCopyController.moveBookCopy
);

router.patch('/:id/status',
  validateIdParam('id'),
  validateRequiredFields(['status']),
  validateAllowedValues('status', ['available', 'checked_out', 'damaged', 'lost', 'maintenance']),
  bookCopyController.updateBookCopyStatus
);

module.exports = router; 