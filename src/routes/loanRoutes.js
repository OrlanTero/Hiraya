/**
 * Loan Routes
 * Handles all routes related to book loan operations
 */

const express = require('express');
const { loanController } = require('../controllers');
const { authMiddleware, validationMiddleware } = require('../middleware');
const { 
  authenticate, 
  requireStaff 
} = authMiddleware;
const { 
  validateRequiredFields, 
  validateIdParam 
} = validationMiddleware;

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Staff can view all loans
router.get('/', requireStaff, loanController.getAllLoans);

// Get overdue loans - staff only
router.get('/overdue', requireStaff, loanController.getOverdueLoans);

// Get loans due soon - staff only
router.get('/due-soon', requireStaff, loanController.getLoansDueSoon);

// Get active loans by member ID - staff or the member themselves
router.get('/member/:memberId/active', 
  validateIdParam('memberId'),
  loanController.getMemberActiveLoans
);

// Get returnable books by member ID - staff or the member themselves
router.get('/member/:memberId/returnable', 
  validateIdParam('memberId'),
  loanController.getReturnableBooks
);

// Get loan history by member ID - staff or the member themselves
router.get('/member/:memberId/history', 
  validateIdParam('memberId'),
  loanController.getMemberLoanHistory
);

// Get loan by ID - staff only
router.get('/:id', 
  requireStaff,
  validateIdParam('id'), 
  loanController.getLoanById
);

// Checkout a book - staff only
router.post('/checkout', 
  requireStaff,
  validateRequiredFields(['bookCopyId', 'memberId']),
  loanController.checkoutBook
);

// Return multiple books - staff only
router.post('/return', 
  requireStaff,
  validateRequiredFields(['returns']),
  loanController.returnBooks
);

// Return a specific book - staff only
router.post('/:id/return', 
  requireStaff,
  validateIdParam('id'),
  loanController.returnBook
);

// Renew a loan - staff or the member themselves
router.post('/:id/renew', 
  validateIdParam('id'),
  loanController.renewLoan
);

// Mark a loan as lost - staff only
router.patch('/:id/lost',
  requireStaff,
  validateIdParam('id'),
  loanController.markLoanAsLost
);

// Add note to a loan - staff only
router.patch('/:id/note',
  requireStaff,
  validateIdParam('id'),
  validateRequiredFields(['note']),
  loanController.addLoanNote
);

module.exports = router; 