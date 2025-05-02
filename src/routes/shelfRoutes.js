/**
 * Shelf Routes
 * Handles all routes related to library shelves
 */

const express = require('express');
const { shelfController } = require('../controllers');
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
router.get('/', shelfController.getAllShelves);
router.get('/location/:location', shelfController.getShelvesByLocation);
router.get('/:id/books', validateIdParam('id'), shelfController.getShelfBooks);
router.get('/:id', validateIdParam('id'), shelfController.getShelfById);

// Protected routes - require authentication
router.use(authenticate);

// Staff-only routes - require staff role
router.use(requireStaff);

router.post('/', 
  validateRequiredFields(['name', 'location']),
  shelfController.addShelf
);

router.put('/:id', 
  validateIdParam('id'),
  shelfController.updateShelf
);

router.delete('/:id', 
  validateIdParam('id'),
  shelfController.deleteShelf
);

// Special operations
router.post('/:id/relocate',
  validateIdParam('id'),
  validateRequiredFields(['newLocation']),
  shelfController.relocateShelf
);

module.exports = router; 