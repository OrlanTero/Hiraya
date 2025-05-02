/**
 * Book Routes
 * Handles all routes related to book operations
 */

const express = require('express');
const { bookController } = require('../controllers');
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

// Public routes
router.get('/', bookController.getAllBooks);
router.get('/search', bookController.searchBooks);
router.get('/popular', bookController.getPopularBooks);
router.get('/categories/popular', bookController.getPopularCategories);
router.get('/category/:category', bookController.getBooksByCategory);
router.get('/:id', validateIdParam('id'), bookController.getBookById);

// Protected routes - require authentication
router.use(authenticate);

// Staff-only routes - require staff role
router.use(requireStaff);

router.post('/', 
  validateRequiredFields(['title', 'author', 'isbn']),
  bookController.addBook
);

router.put('/:id', 
  validateIdParam('id'),
  bookController.updateBook
);

router.delete('/:id', 
  validateIdParam('id'),
  bookController.deleteBook
);

module.exports = router; 