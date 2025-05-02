/**
 * Controllers Index
 * Exports all controllers from a central location for easier imports
 */

const baseController = require('./baseController');
const bookController = require('./bookController');
const bookCopyController = require('./bookCopyController');
const memberController = require('./memberController');
const loanController = require('./loanController');
const shelfController = require('./shelfController');
const authController = require('./authController');
const userController = require('./userController');

module.exports = {
  baseController,
  bookController,
  bookCopyController,
  memberController,
  loanController,
  shelfController,
  authController,
  userController
}; 