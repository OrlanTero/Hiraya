/**
 * Book Copy Controller
 * Handles API requests related to physical book copies
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse, 
  asyncHandler 
} = require('./baseController');
const { BookCopy, Book } = require('../models');

/**
 * Get all book copies
 * @route GET /api/book-copies
 */
const getAllBookCopies = asyncHandler(async (req, res) => {
  const copies = await BookCopy.getAllBookCopies();
  return successResponse(res, { copies });
});

/**
 * Get book copy by ID
 * @route GET /api/book-copies/:id
 */
const getBookCopyById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const copy = await BookCopy.getBookCopyById(id);
    return successResponse(res, { copy });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book copy');
    }
    throw error;
  }
});

/**
 * Get copies of a specific book
 * @route GET /api/book-copies/book/:bookId
 */
const getBookCopiesByBookId = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  
  try {
    // First check if the book exists
    await Book.getBookById(bookId);
    
    const copies = await BookCopy.getBookCopiesByBookId(bookId);
    return successResponse(res, { copies });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book');
    }
    throw error;
  }
});

/**
 * Add a new book copy
 * @route POST /api/book-copies
 */
const addBookCopy = asyncHandler(async (req, res) => {
  const copyData = req.body;
  
  // Basic validation
  if (!copyData.book_id) {
    return errorResponse(res, 'Book ID is required', 400);
  }
  
  try {
    // Verify the book exists
    await Book.getBookById(copyData.book_id);
    
    // Set default status if not provided
    if (!copyData.status) {
      copyData.status = 'Available';
    }
    
    // Add the copy
    const copy = await BookCopy.addBookCopy(copyData);
    return successResponse(res, { 
      message: 'Book copy added successfully', 
      copy 
    }, 201);
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book');
    }
    throw error;
  }
});

/**
 * Update a book copy
 * @route PUT /api/book-copies/:id
 */
const updateBookCopy = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if copy exists
    await BookCopy.getBookCopyById(id);
    
    // Perform update
    const updatedCopy = await BookCopy.updateBookCopy(id, updates);
    return successResponse(res, { 
      message: 'Book copy updated successfully', 
      copy: updatedCopy 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book copy');
    }
    throw error;
  }
});

/**
 * Delete a book copy
 * @route DELETE /api/book-copies/:id
 */
const deleteBookCopy = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if copy exists
    await BookCopy.getBookCopyById(id);
    
    // Attempt to delete
    await BookCopy.deleteBookCopy(id);
    return successResponse(res, { 
      message: 'Book copy deleted successfully' 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book copy');
    }
    if (error.message.includes('checked out')) {
      return errorResponse(res, 'Cannot delete: this copy is currently checked out', 400);
    }
    throw error;
  }
});

/**
 * Move a book copy to a different shelf
 * @route PUT /api/book-copies/:id/move
 */
const moveBookCopy = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { shelfId } = req.body;
    
    if (shelfId === undefined) {
      return errorResponse(res, 'Shelf ID is required', 400);
    }
    
    // Move the copy to the specified shelf
    const updatedCopy = await BookCopy.moveBookCopy(id, shelfId);
    return successResponse(res, { 
      message: 'Book copy moved successfully', 
      copy: updatedCopy 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, error.message.includes('Shelf') ? 'Shelf' : 'Book copy');
    }
    throw error;
  }
});

/**
 * Update the status of a book copy
 * @route PATCH /api/book-copies/:id/status
 */
const updateBookCopyStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return errorResponse(res, 'Status is required', 400);
    }
    
    // Check if copy exists
    await BookCopy.getBookCopyById(id);
    
    // Update only the status field
    const updatedCopy = await BookCopy.updateBookCopy(id, { status });
    
    return successResponse(res, { 
      message: `Book copy status updated to ${status}`, 
      copy: updatedCopy 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book copy');
    }
    throw error;
  }
});

/**
 * Get availability information for a specific book
 * @route GET /api/book-copies/availability/:bookId
 */
const getBookAvailability = asyncHandler(async (req, res) => {
  try {
    const { bookId } = req.params;
    
    // Verify the book exists
    await Book.getBookById(bookId);
    
    // Get availability info
    const availability = await BookCopy.getBookAvailability(bookId);
    return successResponse(res, { availability });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book');
    }
    throw error;
  }
});

module.exports = {
  getAllBookCopies,
  getBookCopyById,
  getBookCopiesByBookId,
  addBookCopy,
  updateBookCopy,
  deleteBookCopy,
  moveBookCopy,
  getBookAvailability,
  updateBookCopyStatus
}; 