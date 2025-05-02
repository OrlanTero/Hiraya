/**
 * Main Router
 * Assembles all API routes
 */

const express = require('express');
const bookRoutes = require('./bookRoutes');
const bookCopyRoutes = require('./bookCopyRoutes');
const memberRoutes = require('./memberRoutes');
const loanRoutes = require('./loanRoutes');
const shelfRoutes = require('./shelfRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

// Health check route
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    version: '1.0.0'
  });
});

// Mount the routes
router.use('/books', bookRoutes);
router.use('/book-copies', bookCopyRoutes);
router.use('/members', memberRoutes);
router.use('/loans', loanRoutes);
router.use('/shelves', shelfRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

module.exports = router; 