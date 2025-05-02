/**
 * Models Index
 * Exports all models from a central location for easier imports
 */

const Book = require('./book');
const BookCopy = require('./bookCopy');
const Member = require('./member');
const Loan = require('./loan');
const Shelf = require('./shelf');
const User = require('./user');

module.exports = {
  Book,
  BookCopy,
  Member,
  Loan,
  Shelf,
  User
}; 