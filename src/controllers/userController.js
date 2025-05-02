/**
 * User Controller
 * Handles API requests related to system users management
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse,
  forbiddenResponse,
  asyncHandler 
} = require('./baseController');
const { User } = require('../models');

/**
 * Get all users (admin only)
 * @route GET /api/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  // Check if the current user is an admin
  const isAdmin = await User.hasRole(req.user.id, 'admin');
  if (!isAdmin) {
    return forbiddenResponse(res, 'Access denied: Admin role required');
  }
  
  const users = await User.getAllUsers();
  return successResponse(res, { users });
});

/**
 * Get user by ID (admin or self)
 * @route GET /api/users/:id
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;
  
  // Allow if user is viewing their own profile or is an admin
  if (parseInt(id, 10) !== parseInt(currentUserId, 10)) {
    const isAdmin = await User.hasRole(currentUserId, 'admin');
    if (!isAdmin) {
      return forbiddenResponse(res, 'Access denied: You can only view your own profile');
    }
  }
  
  try {
    const user = await User.getUserById(id);
    return successResponse(res, { user });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'User');
    }
    throw error;
  }
});

/**
 * Add a new user (admin only)
 * @route POST /api/users
 */
const addUser = asyncHandler(async (req, res) => {
  // Check if the current user is an admin
  const isAdmin = await User.hasRole(req.user.id, 'admin');
  if (!isAdmin) {
    return forbiddenResponse(res, 'Access denied: Admin role required');
  }
  
  const userData = req.body;
  
  // Basic validation
  if (!userData.username || !userData.email || !userData.password) {
    return errorResponse(res, 'Username, email, and password are required', 400);
  }
  
  try {
    const user = await User.registerUser(userData);
    return successResponse(res, { 
      message: 'User created successfully', 
      user 
    }, 201);
  } catch (error) {
    if (error.message.includes('already taken')) {
      return errorResponse(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * Update a user (admin or self)
 * @route PUT /api/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const currentUserId = req.user.id;
  
  // Allow if user is updating their own profile or is an admin
  let isAdmin = false;
  if (parseInt(id, 10) !== parseInt(currentUserId, 10)) {
    isAdmin = await User.hasRole(currentUserId, 'admin');
    if (!isAdmin) {
      return forbiddenResponse(res, 'Access denied: You can only update your own profile');
    }
  }
  
  // Prevent non-admin users from changing their own role
  if (!isAdmin && updates.role) {
    return forbiddenResponse(res, 'Access denied: You cannot change your role');
  }
  
  try {
    // Check if user exists
    await User.getUserById(id);
    
    const updatedUser = await User.updateUser(id, updates);
    return successResponse(res, { 
      message: 'User updated successfully', 
      user: updatedUser 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'User');
    }
    throw error;
  }
});

/**
 * Delete a user (admin only)
 * @route DELETE /api/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if the current user is an admin
  const isAdmin = await User.hasRole(req.user.id, 'admin');
  if (!isAdmin) {
    return forbiddenResponse(res, 'Access denied: Admin role required');
  }
  
  // Prevent deleting self
  if (parseInt(id, 10) === parseInt(req.user.id, 10)) {
    return errorResponse(res, 'Cannot delete your own account', 400);
  }
  
  try {
    // Check if user exists
    await User.getUserById(id);
    
    // Attempt to delete
    await User.deleteUser(id);
    return successResponse(res, { 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'User');
    }
    if (error.message.includes('last admin')) {
      return errorResponse(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * Change user status (active/inactive) - Admin only
 * @route PATCH /api/users/:id/status
 */
const changeUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Check if the current user is an admin
  const isAdmin = await User.hasRole(req.user.id, 'admin');
  if (!isAdmin) {
    return forbiddenResponse(res, 'Access denied: Admin role required');
  }
  
  // Validate status
  if (status !== 'active' && status !== 'inactive') {
    return errorResponse(res, 'Status must be either "active" or "inactive"', 400);
  }
  
  // Prevent deactivating self
  if (parseInt(id, 10) === parseInt(req.user.id, 10) && status === 'inactive') {
    return errorResponse(res, 'You cannot deactivate your own account', 400);
  }
  
  try {
    // Check if user exists
    await User.getUserById(id);
    
    // Update user status
    const updatedUser = await User.updateUser(id, { status });
    return successResponse(res, { 
      message: `User status changed to ${status}`,
      user: updatedUser
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'User');
    }
    if (error.message.includes('last admin')) {
      return errorResponse(res, 'Cannot deactivate the last active admin', 400);
    }
    throw error;
  }
});

/**
 * Reset user password (admin only)
 * @route POST /api/users/:id/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  
  // Check if the current user is an admin
  const isAdmin = await User.hasRole(req.user.id, 'admin');
  if (!isAdmin) {
    return forbiddenResponse(res, 'Access denied: Admin role required');
  }
  
  if (!newPassword) {
    return errorResponse(res, 'New password is required', 400);
  }
  
  try {
    // Check if user exists
    await User.getUserById(id);
    
    // Reset password
    await User.resetPassword(id, newPassword);
    return successResponse(res, { 
      message: 'Password reset successfully'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'User');
    }
    throw error;
  }
});

module.exports = {
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  changeUserStatus,
  resetPassword
}; 