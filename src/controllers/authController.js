/**
 * Authentication Controller
 * Handles API requests related to authentication and users
 */

const { 
  successResponse, 
  unauthorizedResponse, 
  errorResponse, 
  notFoundResponse,
  forbiddenResponse,
  asyncHandler 
} = require('./baseController');
const { User, Member } = require('../models');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
const registerUser = asyncHandler(async (req, res) => {
  const userData = req.body;
  
  // Basic validation
  if (!userData.username || !userData.email || !userData.password) {
    return errorResponse(res, 'Username, email, and password are required', 400);
  }
  
  // Register user
  try {
    const user = await User.registerUser(userData);
    return successResponse(res, { 
      message: 'User registered successfully', 
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
 * User login
 * @route POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  
  // Allow login with username or email
  const loginUsername = username || email;
  
  if (!loginUsername || !password) {
    return errorResponse(res, 'Username/email and password are required', 400);
  }
  
  try {
    const authResult = await User.authenticateUser(loginUsername, password);
    return successResponse(res, { 
      message: 'Login successful', 
      ...authResult 
    });
  } catch (error) {
    return unauthorizedResponse(res, 'Invalid credentials');
  }
});

/**
 * Member login (by PIN)
 * @route POST /api/auth/member-login
 */
const memberLogin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  
  if (!pin) {
    return errorResponse(res, 'PIN is required', 400);
  }
  
  try {
    const member = await Member.getMemberByCredential(pin);
    return successResponse(res, { 
      message: 'Member login successful', 
      member 
    });
  } catch (error) {
    return unauthorizedResponse(res, 'Invalid PIN');
  }
});

/**
 * Member login (by QR code)
 * @route POST /api/auth/member-login-qr
 */
const memberLoginQR = asyncHandler(async (req, res) => {
  const { qrCode } = req.body;
  
  if (!qrCode) {
    return errorResponse(res, 'QR code is required', 400);
  }
  
  try {
    const member = await Member.getMemberByCredential(qrCode);
    return successResponse(res, { 
      message: 'Member login successful', 
      member 
    });
  } catch (error) {
    return unauthorizedResponse(res, 'Invalid QR code');
  }
});

/**
 * Refresh authentication token
 * @route POST /api/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return errorResponse(res, 'Refresh token is required', 400);
  }
  
  try {
    const tokens = await User.refreshAccessToken(refreshToken);
    return successResponse(res, { 
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    return unauthorizedResponse(res, 'Invalid or expired refresh token');
  }
});

/**
 * Logout user
 * @route POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  // If using refresh tokens, invalidate the refresh token
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    // Invalidate the refresh token
    await User.invalidateRefreshToken(refreshToken);
  }
  
  return successResponse(res, { 
    message: 'Logout successful' 
  });
});

/**
 * Change password
 * @route POST /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From auth middleware
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return errorResponse(res, 'Current password and new password are required', 400);
  }
  
  try {
    await User.changePassword(userId, currentPassword, newPassword);
    return successResponse(res, { 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    if (error.message === 'Current password is incorrect') {
      return unauthorizedResponse(res, error.message);
    }
    throw error;
  }
});

/**
 * Get current user
 * @route GET /api/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From auth middleware
  
  try {
    const user = await User.getUserById(userId);
    return successResponse(res, { user });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'User');
    }
    throw error;
  }
});

/**
 * Reset user password (admin only)
 * @route POST /api/auth/reset-password/:id
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  
  // Check if the current user is an admin
  const isAdmin = await User.hasRole(req.user.id, 'admin');
  if (!isAdmin) {
    return forbiddenResponse(res, 'Only administrators can reset passwords');
  }
  
  if (!newPassword) {
    return errorResponse(res, 'New password is required', 400);
  }
  
  try {
    await User.updateUser(id, { password: newPassword });
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
  register: registerUser,  // Renamed to match route
  login,
  refreshToken,
  changePassword,
  getCurrentUser,
  logout,
  resetPassword,
  memberLogin,
  memberLoginQR
}; 