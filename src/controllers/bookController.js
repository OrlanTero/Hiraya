/**
 * Book Controller
 * Handles API requests related to books
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse, 
  asyncHandler 
} = require('./baseController');
const { Book, BookCopy } = require('../models');

/**
 * Get all books
 * @route GET /api/books
 */
const getAllBooks = asyncHandler(async (req, res) => {
  const books = await Book.getAllBooks();
  return successResponse(res, { books });
});

/**
 * Get book by ID
 * @route GET /api/books/:id
 */
const getBookById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.getBookById(id);
    
    // Get book copies if requested
    if (req.query.includeCopies === 'true') {
      const copies = await BookCopy.getBookCopiesByBookId(id);
      return successResponse(res, { 
        book, 
        copies 
      });
    }
    
    return successResponse(res, { book });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book');
    }
    throw error;
  }
});

/**
 * Get books by category
 * @route GET /api/books/category/:category
 */
const getBooksByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const books = await Book.getBooksByCategory(category);
  return successResponse(res, { 
    category, 
    books 
  });
});

/**
 * Search for books
 * @route GET /api/books/search
 */
const searchBooks = asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim() === '') {
    return errorResponse(res, 'Search query is required', 400);
  }
  
  const books = await Book.searchBooks(query);
  return successResponse(res, { 
    query, 
    books 
  });
});

/**
 * Add a new book
 * @route POST /api/books
 */
const addBook = asyncHandler(async (req, res) => {
  const bookData = req.body;
  
  // Basic validation
  if (!bookData.title) {
    return errorResponse(res, 'Book title is required', 400);
  }
  
  const book = await Book.addBook(bookData);
  return successResponse(res, { 
    message: 'Book added successfully', 
    book 
  }, 201);
});

/**
 * Update a book
 * @route PUT /api/books/:id
 */
const updateBook = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if book exists
    await Book.getBookById(id);
    
    const updatedBook = await Book.updateBook(id, updates);
    return successResponse(res, { 
      message: 'Book updated successfully', 
      book: updatedBook 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book');
    }
    throw error;
  }
});

/**
 * Delete a book
 * @route DELETE /api/books/:id
 */
const deleteBook = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if book exists
    await Book.getBookById(id);
    
    await Book.deleteBook(id);
    return successResponse(res, { 
      message: 'Book deleted successfully' 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book');
    }
    if (error.message.includes('checked out')) {
      return errorResponse(res, 'Cannot delete book: some copies are currently checked out', 400);
    }
    throw error;
  }
});

/**
 * Get most popular books
 * @route GET /api/books/popular
 */
const getPopularBooks = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
  const books = await Book.getMostPopularBooks(limit);
  return successResponse(res, { books });
});

/**
 * Get popular categories
 * @route GET /api/books/popular-categories
 */
const getPopularCategories = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
  const categories = await Book.getPopularCategories(limit);
  return successResponse(res, { categories });
});

module.exports = {
  getAllBooks,
  getBookById,
  getBooksByCategory,
  searchBooks,
  addBook,
  updateBook,
  deleteBook,
  getPopularBooks,
  getPopularCategories
}; 