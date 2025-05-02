/**
 * Member Model
 * Handles operations related to library members
 */

const db = require('../config/database');
const { withTransaction } = require('../config/db-utils');

/**
 * Get all members
 * @returns {Promise<Array>} - Array of member objects
 */
const getAllMembers = () => {
  return db('members').select('*');
};

/**
 * Get a member by ID
 * @param {number} id - The ID of the member to retrieve
 * @returns {Promise<Object>} - The member object
 */
const getMemberById = (id) => {
  // Ensure id is a number
  let memberId = id;
  if (typeof memberId === 'string') {
    const parsed = parseInt(memberId.toString().replace('member-', ''), 10);
    if (!isNaN(parsed)) {
      memberId = parsed;
    }
  }

  return db('members')
    .where({ id: memberId })
    .first()
    .then(member => {
      if (!member) {
        throw new Error(`Member with ID ${id} not found`);
      }
      return member;
    });
};

/**
 * Get a member by email
 * @param {string} email - The email of the member to retrieve
 * @returns {Promise<Object>} - The member object
 */
const getMemberByEmail = (email) => {
  return db('members')
    .where({ email })
    .first()
    .then(member => {
      if (!member) {
        throw new Error(`Member with email ${email} not found`);
      }
      return member;
    });
};

/**
 * Get a member by PIN or QR code
 * @param {string} credential - The PIN or QR code to look up
 * @returns {Promise<Object>} - The member object
 */
const getMemberByCredential = (credential) => {
  return db('members')
    .where({ pin: credential })
    .orWhere({ qr_code: credential })
    .first()
    .then(member => {
      if (!member) {
        throw new Error('Member not found with the provided credentials');
      }
      return member;
    });
};

/**
 * Search for members by name or email
 * @param {string} query - The search term
 * @returns {Promise<Array>} - Array of matching member objects
 */
const searchMembers = (query) => {
  return db('members')
    .where('name', 'like', `%${query}%`)
    .orWhere('email', 'like', `%${query}%`)
    .select('*');
};

/**
 * Add a new member
 * @param {Object} member - The member data to add
 * @returns {Promise<Object>} - The added member with its ID
 */
const addMember = (member) => {
  // Set timestamps
  const now = new Date();
  member.created_at = now;
  member.updated_at = now;

  return db('members')
    .insert(member)
    .returning('*')
    .then(members => members[0]);
};

/**
 * Update a member
 * @param {number} id - The ID of the member to update
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} - The updated member
 */
const updateMember = (id, updates) => {
  // Update timestamp
  updates.updated_at = new Date();

  return db('members')
    .where({ id })
    .update(updates)
    .returning('*')
    .then(members => {
      if (members.length === 0) {
        throw new Error(`Member with ID ${id} not found`);
      }
      return members[0];
    });
};

/**
 * Delete a member
 * @param {number} id - The ID of the member to delete
 * @returns {Promise<number>} - The number of deleted rows
 */
const deleteMember = (id) => {
  return withTransaction(async (trx) => {
    // Check if member has active loans
    const activeLoans = await trx('loans')
      .where({ member_id: id, status: 'Borrowed' })
      .whereNull('return_date')
      .select('*');
    
    if (activeLoans.length > 0) {
      throw new Error('Cannot delete member: they have active loans');
    }
    
    // Delete the member
    return trx('members').where({ id }).del();
  });
};

/**
 * Get member statistics
 * @param {number} id - The ID of the member
 * @returns {Promise<Object>} - Statistics about the member's activity
 */
const getMemberStats = async (id) => {
  const member = await getMemberById(id);
  
  // Get loan history
  const loans = await db('loans')
    .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
    .join('books', 'book_copies.book_id', 'books.id')
    .where('loans.member_id', id)
    .select(
      'loans.*',
      'books.title',
      'books.author',
      'books.category'
    );
  
  // Calculate statistics
  const totalLoans = loans.length;
  const activeLoans = loans.filter(loan => loan.status === 'Borrowed' && !loan.return_date).length;
  const returnedLoans = loans.filter(loan => loan.status === 'Returned' || loan.return_date).length;
  const overdueLoans = loans.filter(loan => {
    if (loan.status !== 'Borrowed' || loan.return_date) return false;
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    return dueDate < today;
  }).length;
  
  // Get favorite categories
  const categoryMap = {};
  loans.forEach(loan => {
    if (loan.category) {
      categoryMap[loan.category] = (categoryMap[loan.category] || 0) + 1;
    }
  });
  
  const favoriteCategories = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  return {
    member,
    stats: {
      total_loans: totalLoans,
      active_loans: activeLoans,
      returned_loans: returnedLoans,
      overdue_loans: overdueLoans,
      favorite_categories: favoriteCategories,
    }
  };
};

module.exports = {
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByCredential,
  searchMembers,
  addMember,
  updateMember,
  deleteMember,
  getMemberStats
}; 