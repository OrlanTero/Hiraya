/**
 * Middleware Index
 * Exports all middleware from a central location for easier imports
 */

const authMiddleware = require('./authMiddleware');
const validationMiddleware = require('./validationMiddleware');
const errorMiddleware = require('./errorMiddleware');
const utilsMiddleware = require('./utilsMiddleware');

module.exports = {
  authMiddleware,
  validationMiddleware,
  errorMiddleware,
  utilsMiddleware
}; 