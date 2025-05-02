/**
 * BookCopy Model
 * Handles operations related to book copies
 */

const db = require('../config/database');
const { withTransaction } = require('../config/db-utils');

/**
 * Get all book copies
 * @returns {Promise<Array>} - Array of book copy objects with book details
 */
const getAllBookCopies = () => {
  return db('book_copies')
    .join('books', 'book_copies.book_id', 'books.id')
    .leftJoin('shelves', 'book_copies.shelf_id', 'shelves.id')
    .select(
      'book_copies.*',
      'books.title',
      'books.author',
      'books.isbn',
      'shelves.name as shelf_name',
      'shelves.section as shelf_section'
    );
};

/**
 * Get a book copy by its ID
 * @param {number} id - The ID of the book copy to retrieve
 * @returns {Promise<Object>} - The book copy object with book details
 */
const getBookCopyById = (id) => {
  return db('book_copies')
    .join('books', 'book_copies.book_id', 'books.id')
    .leftJoin('shelves', 'book_copies.shelf_id', 'shelves.id')
    .where('book_copies.id', id)
    .select(
      'book_copies.*',
      'books.title',
      'books.author',
      'books.isbn',
      'shelves.name as shelf_name',
      'shelves.section as shelf_section'
    )
    .first()
    .then(copy => {
      if (!copy) {
        throw new Error(`Book copy with ID ${id} not found`);
      }
      return copy;
    });
};

/**
 * Get all copies of a specific book
 * @param {number} bookId - The ID of the book
 * @returns {Promise<Array>} - Array of book copy objects
 */
const getBookCopiesByBookId = (bookId) => {
  return db('book_copies')
    .join('books', 'book_copies.book_id', 'books.id')
    .leftJoin('shelves', 'book_copies.shelf_id', 'shelves.id')
    .where('book_copies.book_id', bookId)
    .select(
      'book_copies.*',
      'books.title',
      'books.author',
      'books.isbn',
      'shelves.name as shelf_name',
      'shelves.section as shelf_section'
    );
};

/**
 * Add a new book copy
 * @param {Object} bookCopy - The book copy data to add
 * @returns {Promise<Object>} - The added book copy with its ID
 */
const addBookCopy = (bookCopy) => {
  // Set timestamps
  const now = new Date();
  bookCopy.created_at = now;
  bookCopy.updated_at = now;

  return db('book_copies')
    .insert(bookCopy)
    .returning('*')
    .then(copies => copies[0]);
};

/**
 * Update a book copy
 * @param {number} id - The ID of the book copy to update
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} - The updated book copy
 */
const updateBookCopy = (id, updates) => {
  // Update timestamp
  updates.updated_at = new Date();

  return db('book_copies')
    .where({ id })
    .update(updates)
    .returning('*')
    .then(copies => {
      if (copies.length === 0) {
        throw new Error(`Book copy with ID ${id} not found`);
      }
      return copies[0];
    });
};

/**
 * Delete a book copy
 * @param {number} id - The ID of the book copy to delete
 * @returns {Promise<number>} - The number of deleted rows
 */
const deleteBookCopy = (id) => {
  return withTransaction(async (trx) => {
    // Check if the copy is currently loaned out
    const loan = await trx('loans')
      .where({ book_copy_id: id, status: 'Borrowed' })
      .whereNull('return_date')
      .first();
    
    if (loan) {
      throw new Error('Cannot delete: this copy is currently checked out');
    }
    
    // Delete the book copy
    return trx('book_copies').where({ id }).del();
  });
};

/**
 * Move a book copy to a different shelf
 * @param {number} id - The ID of the book copy to move
 * @param {number} shelfId - The ID of the destination shelf
 * @returns {Promise<Object>} - The updated book copy
 */
const moveBookCopy = (id, shelfId) => {
  return withTransaction(async (trx) => {
    // Check if the shelf exists
    if (shelfId) {
      const shelf = await trx('shelves').where({ id: shelfId }).first();
      if (!shelf) {
        throw new Error(`Shelf with ID ${shelfId} not found`);
      }
    }
    
    // Update the book copy
    return trx('book_copies')
      .where({ id })
      .update({ 
        shelf_id: shelfId,
        updated_at: new Date()
      })
      .returning('*')
      .then(copies => {
        if (copies.length === 0) {
          throw new Error(`Book copy with ID ${id} not found`);
        }
        return copies[0];
      });
  });
};

/**
 * Get availability information for a specific book
 * @param {number} bookId - The ID of the book
 * @returns {Promise<Object>} - Availability information
 */
const getBookAvailability = async (bookId) => {
  const book = await db('books').where({ id: bookId }).first();
  
  if (!book) {
    throw new Error(`Book with ID ${bookId} not found`);
  }
  
  const copies = await db('book_copies')
    .where({ book_id: bookId })
    .select('*');
  
  const totalCopies = copies.length;
  const availableCopies = copies.filter(copy => copy.status === 'Available').length;
  const checkedOutCopies = copies.filter(copy => copy.status === 'Checked Out').length;
  const damagedCopies = copies.filter(copy => copy.status === 'Damaged').length;
  
  // Get detailed info for available copies
  const availableCopiesDetails = await db('book_copies')
    .leftJoin('shelves', 'book_copies.shelf_id', 'shelves.id')
    .where({ book_id: bookId, status: 'Available' })
    .select(
      'book_copies.*',
      'shelves.name as shelf_name',
      'shelves.section as shelf_section'
    );
  
  return {
    book_id: bookId,
    title: book.title,
    total_copies: totalCopies,
    available_copies: availableCopies,
    checked_out_copies: checkedOutCopies,
    damaged_copies: damagedCopies,
    available_copies_details: availableCopiesDetails,
  };
};

module.exports = {
  getAllBookCopies,
  getBookCopyById,
  getBookCopiesByBookId,
  addBookCopy,
  updateBookCopy,
  deleteBookCopy,
  moveBookCopy,
  getBookAvailability
}; 