/**
 * Book Model
 * Handles operations related to books
 */

const db = require('../config/database');
const { withTransaction } = require('../config/db-utils');

/**
 * Get all books from the database
 * @returns {Promise<Array>} - Array of book objects
 */
const getAllBooks = () => {
  return db('books').select('*');
};

/**
 * Get a book by its ID
 * @param {number} id - The ID of the book to retrieve
 * @returns {Promise<Object>} - The book object
 */
const getBookById = (id) => {
  return db('books')
    .where({ id })
    .first()
    .then(book => {
      if (!book) {
        throw new Error(`Book with ID ${id} not found`);
      }
      return book;
    });
};

/**
 * Get books by category
 * @param {string} category - The category to filter by
 * @returns {Promise<Array>} - Array of book objects
 */
const getBooksByCategory = (category) => {
  return db('books')
    .where({ category })
    .select('*');
};

/**
 * Search for books by title, author, or ISBN
 * @param {string} query - The search query
 * @returns {Promise<Array>} - Array of matching book objects
 */
const searchBooks = (query) => {
  return db('books')
    .where('title', 'like', `%${query}%`)
    .orWhere('author', 'like', `%${query}%`)
    .orWhere('isbn', 'like', `%${query}%`)
    .select('*');
};

/**
 * Add a new book to the database
 * @param {Object} book - The book object to add
 * @returns {Promise<Object>} - The added book object with its ID
 */
const addBook = (book) => {
  // Set timestamps
  const now = new Date();
  book.created_at = now;
  book.updated_at = now;

  return db('books')
    .insert(book)
    .returning('*')
    .then(books => books[0]);
};

/**
 * Update an existing book
 * @param {number} id - The ID of the book to update
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} - The updated book object
 */
const updateBook = (id, updates) => {
  // Update timestamp
  updates.updated_at = new Date();

  return db('books')
    .where({ id })
    .update(updates)
    .returning('*')
    .then(books => {
      if (books.length === 0) {
        throw new Error(`Book with ID ${id} not found`);
      }
      return books[0];
    });
};

/**
 * Delete a book from the database
 * @param {number} id - The ID of the book to delete
 * @returns {Promise<number>} - The number of deleted rows
 */
const deleteBook = (id) => {
  return withTransaction(async (trx) => {
    // Check if book has copies
    const copies = await trx('book_copies').where({ book_id: id }).select('*');
    
    if (copies.length > 0) {
      // Check if any copies are currently loaned out
      const activeCopies = copies.filter(copy => copy.status === 'Checked Out');
      
      if (activeCopies.length > 0) {
        throw new Error('Cannot delete book: some copies are currently checked out');
      }
      
      // Delete all copies
      await trx('book_copies').where({ book_id: id }).del();
    }
    
    // Delete the book
    return trx('books').where({ id }).del();
  });
};

/**
 * Get the most popular books based on loan frequency
 * @param {number} limit - Maximum number of books to return
 * @returns {Promise<Array>} - Array of book objects with borrow count
 */
const getMostPopularBooks = async (limit = 5) => {
  return db('loans')
    .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
    .join('books', 'book_copies.book_id', 'books.id')
    .select(
      'books.id',
      'books.title',
      'books.author',
      db.raw('COUNT(loans.id) as borrow_count')
    )
    .groupBy('books.id', 'books.title', 'books.author')
    .orderBy('borrow_count', 'desc')
    .limit(limit);
};

/**
 * Get the most popular categories
 * @param {number} limit - Maximum number of categories to return
 * @returns {Promise<Array>} - Array of categories with book count
 */
const getPopularCategories = async (limit = 5) => {
  return db('books')
    .select('category')
    .count('id as book_count')
    .whereNotNull('category')
    .groupBy('category')
    .orderBy('book_count', 'desc')
    .limit(limit);
};

module.exports = {
  getAllBooks,
  getBookById,
  getBooksByCategory,
  searchBooks,
  addBook,
  updateBook,
  deleteBook,
  getMostPopularBooks,
  getPopularCategories
}; 