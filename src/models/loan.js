/**
 * Loan Model
 * Handles operations related to book loans, checkouts, and returns
 */

const db = require('../config/database');
const { withTransaction } = require('../config/db-utils');
const { getTransactionId } = require('../config/schema');
const BookCopy = require('./bookCopy');
const Member = require('./member');

/**
 * Get all loans
 * @param {Object} filters - Optional filters for status, etc.
 * @returns {Promise<Array>} - Array of loan objects with book and member details
 */
const getAllLoans = (filters = {}) => {
  const query = db('loans')
    .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
    .join('books', 'book_copies.book_id', 'books.id')
    .join('members', 'loans.member_id', 'members.id')
    .select(
      'loans.*',
      'books.title as book_title',
      'books.author as book_author',
      'books.isbn as book_isbn',
      'book_copies.copy_number',
      'book_copies.status as copy_status',
      'members.name as member_name',
      'members.email as member_email'
    )
    .orderBy('loans.checkout_date', 'desc');

  // Apply filters if provided
  if (filters.status) {
    query.where('loans.status', filters.status);
  }
  
  if (filters.overdueOnly) {
    query.whereNull('loans.return_date')
      .where('loans.due_date', '<', new Date())
      .where('loans.status', 'Borrowed');
  }

  if (filters.memberId) {
    query.where('loans.member_id', filters.memberId);
  }

  if (filters.bookId) {
    query.where('books.id', filters.bookId);
  }

  return query;
};

/**
 * Get a loan by ID
 * @param {number} id - The ID of the loan to retrieve
 * @returns {Promise<Object>} - The loan object with book and member details
 */
const getLoanById = (id) => {
  return db('loans')
    .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
    .join('books', 'book_copies.book_id', 'books.id')
    .join('members', 'loans.member_id', 'members.id')
    .where('loans.id', id)
    .select(
      'loans.*',
      'books.title as book_title',
      'books.author as book_author',
      'books.isbn as book_isbn',
      'book_copies.copy_number',
      'book_copies.status as copy_status',
      'members.name as member_name',
      'members.email as member_email'
    )
    .first()
    .then(loan => {
      if (!loan) {
        throw new Error(`Loan with ID ${id} not found`);
      }
      return loan;
    });
};

/**
 * Get the active loan for a book copy
 * @param {number} bookCopyId - The ID of the book copy
 * @returns {Promise<Object|null>} - The active loan or null if no active loan
 */
const getActiveLoanForBookCopy = (bookCopyId) => {
  return db('loans')
    .where({ 
      book_copy_id: bookCopyId,
      status: 'Borrowed'
    })
    .whereNull('return_date')
    .first();
};

/**
 * Check out a book to a member
 * @param {number} bookCopyId - The ID of the book copy to check out
 * @param {number} memberId - The ID of the member checking out the book
 * @param {number} durationDays - Number of days for the loan (default: 14)
 * @returns {Promise<Object>} - The created loan record
 */
const checkoutBook = async (bookCopyId, memberId, durationDays = 14) => {
  return withTransaction(async (trx) => {
    // Verify book copy exists and is available
    const bookCopy = await trx('book_copies')
      .where({ id: bookCopyId })
      .first();
    
    if (!bookCopy) {
      throw new Error(`Book copy with ID ${bookCopyId} not found`);
    }
    
    if (bookCopy.status !== 'Available') {
      throw new Error(`Book copy is not available for checkout (current status: ${bookCopy.status})`);
    }
    
    // Verify member exists
    const member = await trx('members')
      .where({ id: memberId })
      .first();
    
    if (!member) {
      throw new Error(`Member with ID ${memberId} not found`);
    }
    
    // Check if member has reached their loan limit
    const activeLoansCount = await trx('loans')
      .where({ 
        member_id: memberId,
        status: 'Borrowed'
      })
      .whereNull('return_date')
      .count('id as count')
      .first()
      .then(result => result.count);
    
    if (activeLoansCount >= 5) {
      throw new Error('Member has reached the maximum number of allowed loans (5)');
    }
    
    // Calculate due date
    const checkoutDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + durationDays);
    
    // Create transaction ID
    const transactionId = await getTransactionId(trx);
    
    // Create loan record
    const [loan] = await trx('loans')
      .insert({
        book_copy_id: bookCopyId,
        member_id: memberId,
        transaction_id: transactionId,
        checkout_date: checkoutDate,
        due_date: dueDate,
        status: 'Borrowed',
        created_at: checkoutDate,
        updated_at: checkoutDate
      })
      .returning('*');
    
    // Update book copy status
    await trx('book_copies')
      .where({ id: bookCopyId })
      .update({ 
        status: 'Checked Out',
        updated_at: checkoutDate
      });
    
    return loan;
  });
};

/**
 * Return a book
 * @param {number} loanId - The ID of the loan to process
 * @param {string} returnCondition - The condition of the book upon return (Good, Damaged, Lost)
 * @param {string} note - Optional note about the return
 * @returns {Promise<Object>} - The updated loan record
 */
const returnBook = async (loanId, returnCondition = 'Good', note = '') => {
  return withTransaction(async (trx) => {
    // Get the loan
    const loan = await trx('loans')
      .where({ id: loanId })
      .first();
    
    if (!loan) {
      throw new Error(`Loan with ID ${loanId} not found`);
    }
    
    if (loan.status !== 'Borrowed' || loan.return_date) {
      throw new Error('Book has already been returned');
    }
    
    // Set the return date and update loan
    const returnDate = new Date();
    const dueDate = new Date(loan.due_date);
    const isOverdue = returnDate > dueDate;
    
    // Calculate any fines (₱5 per day overdue)
    let fine = 0;
    if (isOverdue) {
      const daysOverdue = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
      fine = daysOverdue * 5; // ₱5 per day
    }
    
    // Additional fine for damaged or lost books
    if (returnCondition === 'Damaged') {
      fine += 100; // ₱100 for damaged books
    } else if (returnCondition === 'Lost') {
      fine += 500; // ₱500 for lost books (or actual book value)
    }
    
    // Update the loan
    const updateData = {
      return_date: returnDate,
      status: 'Returned',
      return_condition: returnCondition,
      fine_amount: fine,
      fine_paid: false,
      updated_at: returnDate
    };
    
    // Add note if provided
    if (note) {
      updateData.notes = loan.notes ? `${loan.notes}\n${note}` : note;
    }
    
    const [updatedLoan] = await trx('loans')
      .where({ id: loanId })
      .update(updateData)
      .returning('*');
    
    // Update book copy status based on condition
    let newStatus = 'Available';
    if (returnCondition === 'Damaged') {
      newStatus = 'Damaged';
    } else if (returnCondition === 'Lost') {
      newStatus = 'Lost';
    }
    
    await trx('book_copies')
      .where({ id: loan.book_copy_id })
      .update({ 
        status: newStatus,
        updated_at: returnDate
      });
    
    return updatedLoan;
  });
};

/**
 * Record payment of a fine
 * @param {number} loanId - The ID of the loan
 * @param {number} amount - The amount paid
 * @returns {Promise<Object>} - The updated loan record
 */
const recordFinePayment = async (loanId, amount) => {
  return withTransaction(async (trx) => {
    // Get the loan
    const loan = await trx('loans')
      .where({ id: loanId })
      .first();
    
    if (!loan) {
      throw new Error(`Loan with ID ${loanId} not found`);
    }
    
    if (!loan.fine_amount || loan.fine_amount <= 0) {
      throw new Error('No fine is associated with this loan');
    }
    
    if (loan.fine_paid) {
      throw new Error('Fine has already been paid');
    }
    
    if (amount < loan.fine_amount) {
      throw new Error(`Payment amount (₱${amount}) is less than the fine amount (₱${loan.fine_amount})`);
    }
    
    // Update the loan to mark fine as paid
    const [updatedLoan] = await trx('loans')
      .where({ id: loanId })
      .update({
        fine_paid: true,
        fine_paid_date: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    return updatedLoan;
  });
};

/**
 * Renew a loan (extend the due date)
 * @param {number} loanId - The ID of the loan to renew
 * @param {number} extensionDays - Number of days to extend the loan (default: 7)
 * @returns {Promise<Object>} - The updated loan record
 */
const renewLoan = async (loanId, extensionDays = 7) => {
  return withTransaction(async (trx) => {
    // Get the loan
    const loan = await trx('loans')
      .where({ id: loanId })
      .first();
    
    if (!loan) {
      throw new Error(`Loan with ID ${loanId} not found`);
    }
    
    if (loan.status !== 'Borrowed' || loan.return_date) {
      throw new Error('Cannot renew: book has already been returned');
    }
    
    // Check if loan is already overdue
    const currentDate = new Date();
    const dueDate = new Date(loan.due_date);
    
    if (currentDate > dueDate) {
      throw new Error('Cannot renew: loan is already overdue');
    }
    
    // Check if this is a repeated renewal
    if (loan.renewal_count >= 2) {
      throw new Error('Cannot renew: maximum number of renewals (2) reached');
    }
    
    // Calculate new due date
    const newDueDate = new Date(dueDate);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);
    
    // Update the loan
    const [updatedLoan] = await trx('loans')
      .where({ id: loanId })
      .update({
        due_date: newDueDate,
        renewal_count: loan.renewal_count + 1 || 1,
        updated_at: currentDate
      })
      .returning('*');
    
    return updatedLoan;
  });
};

/**
 * Get overdue loans
 * @param {number} daysOverdue - Filter for minimum days overdue (optional)
 * @returns {Promise<Array>} - Array of overdue loan objects
 */
const getOverdueLoans = (daysOverdue = 0) => {
  const today = new Date();
  
  let query = db('loans')
    .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
    .join('books', 'book_copies.book_id', 'books.id')
    .join('members', 'loans.member_id', 'members.id')
    .where('loans.status', 'Borrowed')
    .whereNull('loans.return_date')
    .where('loans.due_date', '<', today)
    .select(
      'loans.*',
      'books.title as book_title',
      'books.author as book_author',
      'books.isbn as book_isbn',
      'book_copies.copy_number',
      'members.name as member_name',
      'members.email as member_email'
    );
  
  if (daysOverdue > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);
    query = query.where('loans.due_date', '<=', cutoffDate);
  }
  
  return query.orderBy('loans.due_date');
};

/**
 * Get loan statistics
 * @returns {Promise<Object>} - Loan statistics
 */
const getLoanStatistics = async () => {
  // Get total number of active loans
  const activeLoansCount = await db('loans')
    .where('status', 'Borrowed')
    .whereNull('return_date')
    .count('id as count')
    .first()
    .then(result => result.count);
  
  // Get number of overdue loans
  const overdueLoansCount = await db('loans')
    .where('status', 'Borrowed')
    .whereNull('return_date')
    .where('due_date', '<', new Date())
    .count('id as count')
    .first()
    .then(result => result.count);
  
  // Get total loans for current month
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const currentMonthLoansCount = await db('loans')
    .whereBetween('checkout_date', [firstDayOfMonth, lastDayOfMonth])
    .count('id as count')
    .first()
    .then(result => result.count);
  
  // Get total return count for current month
  const currentMonthReturnsCount = await db('loans')
    .whereBetween('return_date', [firstDayOfMonth, lastDayOfMonth])
    .count('id as count')
    .first()
    .then(result => result.count);
  
  // Get total uncollected fines
  const uncollectedFines = await db('loans')
    .where('fine_amount', '>', 0)
    .where('fine_paid', false)
    .sum('fine_amount as total')
    .first()
    .then(result => result.total || 0);
  
  return {
    active_loans: activeLoansCount,
    overdue_loans: overdueLoansCount,
    current_month_checkouts: currentMonthLoansCount,
    current_month_returns: currentMonthReturnsCount,
    uncollected_fines: uncollectedFines
  };
};

module.exports = {
  getAllLoans,
  getLoanById,
  getActiveLoanForBookCopy,
  checkoutBook,
  returnBook,
  recordFinePayment,
  renewLoan,
  getOverdueLoans,
  getLoanStatistics
}; 