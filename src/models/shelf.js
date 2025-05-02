/**
 * Shelf Model
 * Handles operations related to library shelves and their organization
 */

const db = require('../config/database');
const { withTransaction } = require('../config/db-utils');

/**
 * Get all shelves
 * @returns {Promise<Array>} - Array of shelf objects
 */
const getAllShelves = () => {
  return db('shelves').select('*');
};

/**
 * Get all shelves with book count information
 * @returns {Promise<Array>} - Array of shelf objects with book counts
 */
const getAllShelvesWithCounts = async () => {
  const shelves = await db('shelves').select('*');
  
  // Get book counts for each shelf
  const shelvesWithCounts = await Promise.all(shelves.map(async (shelf) => {
    // Total books on shelf
    const totalBooks = await db('book_copies')
      .where('shelf_id', shelf.id)
      .count('id as count')
      .first()
      .then(result => result.count);
    
    // Available books on shelf
    const availableBooks = await db('book_copies')
      .where({
        'shelf_id': shelf.id,
        'status': 'Available'
      })
      .count('id as count')
      .first()
      .then(result => result.count);
    
    // Checked out books from this shelf
    const checkedOutBooks = await db('book_copies')
      .where({
        'shelf_id': shelf.id,
        'status': 'Checked Out'
      })
      .count('id as count')
      .first()
      .then(result => result.count);
    
    return {
      ...shelf,
      book_counts: {
        total: totalBooks,
        available: availableBooks,
        checked_out: checkedOutBooks
      }
    };
  }));
  
  return shelvesWithCounts;
};

/**
 * Get a shelf by ID
 * @param {number} id - The ID of the shelf to retrieve
 * @returns {Promise<Object>} - The shelf object
 */
const getShelfById = (id) => {
  return db('shelves')
    .where({ id })
    .first()
    .then(shelf => {
      if (!shelf) {
        throw new Error(`Shelf with ID ${id} not found`);
      }
      return shelf;
    });
};

/**
 * Get a shelf with all books on it
 * @param {number} id - The ID of the shelf to retrieve
 * @returns {Promise<Object>} - The shelf object with books
 */
const getShelfWithBooks = async (id) => {
  // Get the shelf
  const shelf = await getShelfById(id);
  
  // Get all books on this shelf
  const books = await db('book_copies')
    .join('books', 'book_copies.book_id', 'books.id')
    .where('book_copies.shelf_id', id)
    .select(
      'book_copies.*',
      'books.title',
      'books.author',
      'books.isbn',
      'books.category'
    );
  
  // Count books by status
  const available = books.filter(book => book.status === 'Available').length;
  const checkedOut = books.filter(book => book.status === 'Checked Out').length;
  const damaged = books.filter(book => book.status === 'Damaged').length;
  
  return {
    ...shelf,
    books,
    book_counts: {
      total: books.length,
      available,
      checked_out: checkedOut,
      damaged
    }
  };
};

/**
 * Get shelves by location or category
 * @param {string} filter - The filter type ('location' or 'category')
 * @param {string} value - The value to filter by
 * @returns {Promise<Array>} - Array of matching shelf objects
 */
const getShelvesByFilter = (filter, value) => {
  if (filter === 'location') {
    return db('shelves')
      .where('location', value)
      .select('*');
  } else if (filter === 'category') {
    return db('shelves')
      .where('category', value)
      .select('*');
  } else {
    throw new Error('Invalid filter type. Use "location" or "category"');
  }
};

/**
 * Add a new shelf
 * @param {Object} shelf - The shelf data to add
 * @returns {Promise<Object>} - The added shelf with its ID
 */
const addShelf = (shelf) => {
  // Set timestamps
  const now = new Date();
  shelf.created_at = now;
  shelf.updated_at = now;
  
  return db('shelves')
    .insert(shelf)
    .returning('*')
    .then(shelves => shelves[0]);
};

/**
 * Update a shelf
 * @param {number} id - The ID of the shelf to update
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} - The updated shelf
 */
const updateShelf = (id, updates) => {
  // Update timestamp
  updates.updated_at = new Date();
  
  return db('shelves')
    .where({ id })
    .update(updates)
    .returning('*')
    .then(shelves => {
      if (shelves.length === 0) {
        throw new Error(`Shelf with ID ${id} not found`);
      }
      return shelves[0];
    });
};

/**
 * Delete a shelf
 * @param {number} id - The ID of the shelf to delete
 * @returns {Promise<number>} - The number of deleted rows
 */
const deleteShelf = (id) => {
  return withTransaction(async (trx) => {
    // Check if the shelf has books
    const bookCount = await trx('book_copies')
      .where('shelf_id', id)
      .count('id as count')
      .first()
      .then(result => result.count);
    
    if (bookCount > 0) {
      throw new Error(`Cannot delete shelf: it contains ${bookCount} books. Please relocate books first.`);
    }
    
    // Delete the shelf
    return trx('shelves').where({ id }).del();
  });
};

/**
 * Reassign all books from one shelf to another
 * @param {number} sourceShelfId - The ID of the source shelf
 * @param {number} targetShelfId - The ID of the target shelf
 * @returns {Promise<number>} - The number of books reassigned
 */
const reassignBooks = async (sourceShelfId, targetShelfId) => {
  return withTransaction(async (trx) => {
    // Check if source shelf exists
    const sourceShelf = await trx('shelves')
      .where({ id: sourceShelfId })
      .first();
    
    if (!sourceShelf) {
      throw new Error(`Source shelf with ID ${sourceShelfId} not found`);
    }
    
    // Check if target shelf exists
    const targetShelf = await trx('shelves')
      .where({ id: targetShelfId })
      .first();
    
    if (!targetShelf) {
      throw new Error(`Target shelf with ID ${targetShelfId} not found`);
    }
    
    // Count books on source shelf
    const bookCount = await trx('book_copies')
      .where('shelf_id', sourceShelfId)
      .count('id as count')
      .first()
      .then(result => result.count);
    
    if (bookCount === 0) {
      throw new Error('Source shelf has no books to reassign');
    }
    
    // Update all books on source shelf to target shelf
    await trx('book_copies')
      .where('shelf_id', sourceShelfId)
      .update({
        shelf_id: targetShelfId,
        updated_at: new Date()
      });
    
    return bookCount;
  });
};

/**
 * Get shelf capacity information
 * @returns {Promise<Array>} - Array of shelves with capacity information
 */
const getShelfCapacities = async () => {
  const shelves = await db('shelves').select('*');
  
  const shelvesWithCapacity = await Promise.all(shelves.map(async (shelf) => {
    // Get current book count on this shelf
    const currentCount = await db('book_copies')
      .where('shelf_id', shelf.id)
      .count('id as count')
      .first()
      .then(result => result.count);
    
    // Calculate capacity percentage
    const capacity = shelf.capacity || 100; // Default to 100 if not specified
    const usedPercentage = Math.round((currentCount / capacity) * 100);
    
    return {
      ...shelf,
      current_books: currentCount,
      capacity: capacity,
      used_percentage: usedPercentage,
      is_full: usedPercentage >= 100
    };
  }));
  
  return shelvesWithCapacity;
};

module.exports = {
  getAllShelves,
  getAllShelvesWithCounts,
  getShelfById,
  getShelfWithBooks,
  getShelvesByFilter,
  addShelf,
  updateShelf,
  deleteShelf,
  reassignBooks,
  getShelfCapacities
}; 