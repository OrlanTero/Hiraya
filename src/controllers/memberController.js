/**
 * Member Controller
 * Handles API requests related to library members
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse, 
  asyncHandler 
} = require('./baseController');
const { Member, Loan } = require('../models');

/**
 * Get all members
 * @route GET /api/members
 */
const getAllMembers = asyncHandler(async (req, res) => {
  const members = await Member.getAllMembers();
  return successResponse(res, { members });
});

/**
 * Get member by ID
 * @route GET /api/members/:id
 */
const getMemberById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.getMemberById(id);
    
    // Include member statistics if requested
    if (req.query.includeStats === 'true') {
      const stats = await Member.getMemberStats(id);
      return successResponse(res, stats);
    }
    
    return successResponse(res, { member });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

/**
 * Get member by email
 * @route GET /api/members/email/:email
 */
const getMemberByEmail = asyncHandler(async (req, res) => {
  try {
    const { email } = req.params;
    const member = await Member.getMemberByEmail(email);
    return successResponse(res, { member });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

/**
 * Get member by PIN or QR code
 * @route POST /api/members/lookup
 */
const getMemberByCredential = asyncHandler(async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return errorResponse(res, 'PIN or QR code is required', 400);
    }
    
    const member = await Member.getMemberByCredential(credential);
    return successResponse(res, { member });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

/**
 * Search for members
 * @route GET /api/members/search
 */
const searchMembers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim() === '') {
    return errorResponse(res, 'Search query is required', 400);
  }
  
  const members = await Member.searchMembers(query);
  return successResponse(res, { 
    query, 
    members 
  });
});

/**
 * Add a new member
 * @route POST /api/members
 */
const addMember = asyncHandler(async (req, res) => {
  const memberData = req.body;
  
  // Basic validation
  if (!memberData.name) {
    return errorResponse(res, 'Member name is required', 400);
  }
  
  // Check if email already exists
  if (memberData.email) {
    try {
      await Member.getMemberByEmail(memberData.email);
      return errorResponse(res, 'Email already in use', 400);
    } catch (error) {
      // Email not found, which is what we want
    }
  }
  
  const member = await Member.addMember(memberData);
  return successResponse(res, { 
    message: 'Member added successfully', 
    member 
  }, 201);
});

/**
 * Update a member
 * @route PUT /api/members/:id
 */
const updateMember = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if member exists
    await Member.getMemberById(id);
    
    // If updating email, check if it's already in use
    if (updates.email) {
      try {
        const existingMember = await Member.getMemberByEmail(updates.email);
        if (existingMember.id !== parseInt(id, 10)) {
          return errorResponse(res, 'Email already in use by another member', 400);
        }
      } catch (error) {
        // Email not found, which is what we want
      }
    }
    
    const updatedMember = await Member.updateMember(id, updates);
    return successResponse(res, { 
      message: 'Member updated successfully', 
      member: updatedMember 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

/**
 * Delete a member
 * @route DELETE /api/members/:id
 */
const deleteMember = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if member exists
    await Member.getMemberById(id);
    
    // Attempt to delete
    await Member.deleteMember(id);
    return successResponse(res, { 
      message: 'Member deleted successfully' 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    if (error.message.includes('active loans')) {
      return errorResponse(res, 'Cannot delete member: they have active loans', 400);
    }
    throw error;
  }
});

/**
 * Get member's loans
 * @route GET /api/members/:id/loans
 */
const getMemberLoans = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if member exists
    await Member.getMemberById(id);
    
    // Get loans with optional filters
    const filters = {
      memberId: id
    };
    
    // Add status filter if provided
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    // Add overdue filter if requested
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
 * Get member statistics
 * @route GET /api/members/:id/stats
 */
const getMemberStats = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await Member.getMemberStats(id);
    return successResponse(res, stats);
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Member');
    }
    throw error;
  }
});

module.exports = {
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByCredential,
  searchMembers,
  addMember,
  updateMember,
  deleteMember,
  getMemberLoans,
  getMemberStats
}; 