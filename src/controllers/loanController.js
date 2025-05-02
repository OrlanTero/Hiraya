/**
 * Loan Controller
 * Handles API requests related to loans, checkouts, and returns
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse, 
  asyncHandler,
  forbiddenResponse
} = require('./baseController');
const { Loan, BookCopy, Member } = require('../models');
const db = require('../config/database');

/**
 * Get all loans
 * @route GET /api/loans
 */
const getAllLoans = asyncHandler(async (req, res) => {
  // Apply filters from query parameters
  const filters = {};
  
  if (req.query.status) {
    filters.status = req.query.status;
  }
  
  if (req.query.overdueOnly === 'true') {
    filters.overdueOnly = true;
  }
  
  if (req.query.memberId) {
    filters.memberId = req.query.memberId;
  }
  
  if (req.query.bookId) {
    filters.bookId = req.query.bookId;
  }
  
  const loans = await Loan.getAllLoans(filters);
  return successResponse(res, { loans });
});

/**
 * Get loan by ID
 * @route GET /api/loans/:id
 */
const getLoanById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.getLoanById(id);
    return successResponse(res, { loan });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Loan');
    }
    throw error;
  }
});

/**
 * Get loans for a specific member
 * @route GET /api/loans/member/:memberId
 */
const getLoansByMember = asyncHandler(async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Verify member exists
    await Member.getMemberById(memberId);
    
    // Apply filters from query parameters
    const filters = {
      memberId
    };
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.overdueOnly === 'true') {
      filters.overdueOnly = true;
    }
    
    const loans = await Loan.getAllLoans(filters);
    return successResponse(res, { loans });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

/**
 * Check out books to a member
 * @route POST /api/loans/checkout
 */
const checkoutBooks = asyncHandler(async (req, res) => {
  const { memberId, bookCopyIds, durationDays = 14 } = req.body;
  
  if (!memberId) {
    return errorResponse(res, 'Member ID is required', 400);
  }
  
  if (!bookCopyIds || !Array.isArray(bookCopyIds) || bookCopyIds.length === 0) {
    return errorResponse(res, 'At least one book copy ID is required', 400);
  }
  
  try {
    // Verify member exists
    await Member.getMemberById(memberId);
    
    const results = [];
    const errors = [];
    
    // Check out each book copy
    for (const bookCopyId of bookCopyIds) {
      try {
        const loan = await Loan.checkoutBook(bookCopyId, memberId, durationDays);
        results.push(loan);
      } catch (error) {
        errors.push({
          bookCopyId,
          error: error.message
        });
      }
    }
    
    return successResponse(res, {
      message: `${results.length} books checked out successfully`,
      loans: results,
      errors: errors.length > 0 ? errors : undefined
    }, errors.length === 0 ? 200 : 207); // 207 Multi-Status if there are partial errors
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, error.message);
    }
    throw error;
  }
});

/**
 * Return books
 * @route POST /api/loans/return
 */
const returnBooks = asyncHandler(async (req, res) => {
  const { returns } = req.body;
  
  if (!returns || !Array.isArray(returns) || returns.length === 0) {
    return errorResponse(res, 'At least one book return is required', 400);
  }
  
  // Validate each return object has required fields
  for (const returnItem of returns) {
    if (!returnItem.loanId) {
      return errorResponse(res, 'Loan ID is required for each return', 400);
    }
    // Return condition is optional, will default to 'Good' in the model
  }
  
  const results = [];
  const errors = [];
  
  // Process each return
  for (const returnItem of returns) {
    try {
      const { loanId, returnCondition = 'Good', note } = returnItem;
      const loan = await Loan.returnBook(loanId, returnCondition, note);
      results.push(loan);
    } catch (error) {
      errors.push({
        loanId: returnItem.loanId,
        error: error.message
      });
    }
  }
  
  return successResponse(res, {
    message: `${results.length} books returned successfully`,
    returns: results,
    errors: errors.length > 0 ? errors : undefined
  }, errors.length === 0 ? 200 : 207); // 207 Multi-Status if there are partial errors
});

/**
 * Return a single book
 * @route POST /api/loans/:id/return
 */
const returnBook = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { returnCondition = 'Good', note } = req.body;
    
    const loan = await Loan.returnBook(id, returnCondition, note);
    return successResponse(res, {
      message: 'Book returned successfully',
      loan
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Loan');
    }
    if (error.message.includes('already been returned')) {
      return errorResponse(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * Record payment of a fine
 * @route POST /api/loans/:id/pay-fine
 */
const recordFinePayment = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    if (!amount || isNaN(parseFloat(amount))) {
      return errorResponse(res, 'Valid payment amount is required', 400);
    }
    
    const loan = await Loan.recordFinePayment(id, parseFloat(amount));
    return successResponse(res, {
      message: 'Fine payment recorded successfully',
      loan
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Loan');
    }
    throw error;
  }
});

/**
 * Renew a loan
 * @route POST /api/loans/:id/renew
 */
const renewLoan = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { extensionDays = 7 } = req.body;
    
    const loan = await Loan.renewLoan(id, extensionDays);
    return successResponse(res, {
      message: 'Loan renewed successfully',
      loan
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Loan');
    }
    if (error.message.includes('already overdue')) {
      return errorResponse(res, 'Cannot renew: loan is already overdue', 400);
    }
    if (error.message.includes('maximum number of renewals')) {
      return errorResponse(res, 'Cannot renew: maximum number of renewals reached', 400);
    }
    throw error;
  }
});

/**
 * Get overdue loans
 * @route GET /api/loans/overdue
 */
const getOverdueLoans = asyncHandler(async (req, res) => {
  const daysOverdue = req.query.daysOverdue ? parseInt(req.query.daysOverdue, 10) : 0;
  const loans = await Loan.getOverdueLoans(daysOverdue);
  return successResponse(res, { loans });
});

/**
 * Get loan statistics
 * @route GET /api/loans/statistics
 */
const getLoanStatistics = asyncHandler(async (req, res) => {
  const stats = await Loan.getLoanStatistics();
  return successResponse(res, { statistics: stats });
});

/**
 * Get loans due soon
 * @route GET /api/loans/due-soon
 */
const getLoansDueSoon = asyncHandler(async (req, res) => {
  const daysUntilDue = req.query.days ? parseInt(req.query.days, 10) : 3;
  const loans = await Loan.getLoansDueSoon(daysUntilDue);
  return successResponse(res, { loans });
});

/**
 * Get active loans for a member
 * @route GET /api/loans/member/:memberId/active
 */
const getMemberActiveLoans = asyncHandler(async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Check if current user is authorized to view this member's loans
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.id !== memberId) {
      return forbiddenResponse(res, 'Not authorized to view this member\'s loans');
    }
    
    const loans = await Loan.getActiveLoansByMember(memberId);
    return successResponse(res, { loans });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

/**
 * Get loan history for a member
 * @route GET /api/loans/member/:memberId/history
 */
const getMemberLoanHistory = asyncHandler(async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Check if current user is authorized to view this member's loans
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.id !== memberId) {
      return forbiddenResponse(res, 'Not authorized to view this member\'s loan history');
    }
    
    const loans = await Loan.getLoanHistoryByMember(memberId);
    return successResponse(res, { loans });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

/**
 * Mark a loan as lost
 * @route PATCH /api/loans/:id/lost
 */
const markLoanAsLost = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const loan = await Loan.markAsLost(id);
    return successResponse(res, {
      message: 'Loan marked as lost successfully',
      loan
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Loan');
    }
    throw error;
  }
});

/**
 * Add a note to a loan
 * @route PATCH /api/loans/:id/note
 */
const addLoanNote = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    if (!note) {
      return errorResponse(res, 'Note text is required', 400);
    }
    
    const loan = await Loan.addNote(id, note);
    return successResponse(res, {
      message: 'Note added to loan successfully',
      loan
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Loan');
    }
    throw error;
  }
});

/**
 * Get returnable books for a member
 * @route GET /api/loans/member/:memberId/returnable
 */
const getReturnableBooks = asyncHandler(async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Check if current user is authorized to view this member's loans
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.id !== memberId) {
      return forbiddenResponse(res, 'Not authorized to view this member\'s loans');
    }
    
    // Get all active loans for the member with detailed book information
    const loans = await db('loans')
      .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
      .join('books', 'book_copies.book_id', 'books.id')
      .join('members', 'loans.member_id', 'members.id')
      .leftJoin('shelves', 'book_copies.shelf_id', 'shelves.id')
      .where({
        'loans.member_id': memberId,
        'loans.status': 'Borrowed'
      })
      .whereNull('loans.return_date')
      .select(
        'loans.id as loan_id',
        'loans.checkout_date',
        'loans.due_date',
        'books.id as book_id',
        'books.title',
        'books.author',
        'books.isbn',
        'books.category',
        'book_copies.id as book_copy_id',
        'book_copies.copy_number',
        'book_copies.acquisition_date',
        'shelves.location as shelf_location',
        'shelves.name as shelf_name'
      )
      .orderBy('loans.checkout_date', 'desc');
    
    return successResponse(res, { 
      memberId, 
      returnableBooks: loans 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

module.exports = {
  getAllLoans,
  getLoanById,
  checkoutBook: checkoutBooks,
  returnBooks,
  returnBook,
  recordFinePayment,
  renewLoan,
  getOverdueLoans,
  getLoanStatistics,
  getLoansDueSoon,
  getMemberActiveLoans,
  getMemberLoanHistory,
  getReturnableBooks,
  markLoanAsLost,
  addLoanNote
}; 