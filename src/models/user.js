/**
 * User Model
 * Handles operations related to system users, authentication, and permissions
 */

const db = require('../config/database');
const { withTransaction } = require('../config/db-utils');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT Secret - Should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

/**
 * Get all users
 * @returns {Promise<Array>} - Array of user objects with passwords removed
 */
const getAllUsers = async () => {
  const users = await db('users').select('*');
  // Remove passwords from the response
  return users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
};

/**
 * Get a user by ID
 * @param {number} id - The ID of the user to retrieve
 * @returns {Promise<Object>} - The user object with password removed
 */
const getUserById = async (id) => {
  const user = await db('users')
    .where({ id })
    .first();
  
  if (!user) {
    throw new Error(`User with ID ${id} not found`);
  }
  
  // Remove password from the response
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Get a user by username
 * @param {string} username - The username to look up
 * @returns {Promise<Object>} - The user object with password
 */
const getUserByUsername = (username) => {
  return db('users')
    .where({ username })
    .first()
    .then(user => {
      if (!user) {
        throw new Error(`User with username ${username} not found`);
      }
      return user;
    });
};

/**
 * Register a new user
 * @param {Object} user - The user data to register
 * @returns {Promise<Object>} - The registered user with ID and without password
 */
const registerUser = async (user) => {
  return withTransaction(async (trx) => {
    // Check if username already exists
    const existingUser = await trx('users')
      .where({ username: user.username })
      .first();
    
    if (existingUser) {
      throw new Error(`Username "${user.username}" is already taken`);
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    
    // Set timestamps and default role if not provided
    const now = new Date();
    const newUser = {
      ...user,
      password: hashedPassword,
      role: user.role || 'staff',
      created_at: now,
      updated_at: now
    };
    
    // Insert the user
    const [createdUser] = await trx('users')
      .insert(newUser)
      .returning('*');
    
    // Remove password from the response
    const { password, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  });
};

/**
 * Authenticate a user
 * @param {string} username - The username to authenticate
 * @param {string} password - The password to verify
 * @returns {Promise<Object>} - Authentication result with token and user info
 */
const authenticateUser = async (username, password) => {
  // Get the user with password
  const user = await getUserByUsername(username);
  
  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new Error('Invalid password');
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      role: user.role 
    }, 
    JWT_SECRET, 
    { expiresIn: '8h' }
  );
  
  // Remove password from user object
  const { password: userPassword, ...userWithoutPassword } = user;
  
  // Update last login time
  await db('users')
    .where({ id: user.id })
    .update({ 
      last_login: new Date(),
      updated_at: new Date()
    });
  
  return {
    token,
    user: userWithoutPassword
  };
};

/**
 * Update a user
 * @param {number} id - The ID of the user to update
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object>} - The updated user without password
 */
const updateUser = async (id, updates) => {
  return withTransaction(async (trx) => {
    // Check if user exists
    const user = await trx('users')
      .where({ id })
      .first();
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    // If updating password, hash it
    let updatedFields = { ...updates };
    if (updates.password) {
      updatedFields.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }
    
    // Update timestamp
    updatedFields.updated_at = new Date();
    
    // Update the user
    const [updatedUser] = await trx('users')
      .where({ id })
      .update(updatedFields)
      .returning('*');
    
    // Remove password from the response
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  });
};

/**
 * Delete a user
 * @param {number} id - The ID of the user to delete
 * @returns {Promise<number>} - The number of deleted rows
 */
const deleteUser = (id) => {
  return withTransaction(async (trx) => {
    // Check if user exists
    const user = await trx('users')
      .where({ id })
      .first();
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    // Check if this is the last admin user
    if (user.role === 'admin') {
      const adminCount = await trx('users')
        .where({ role: 'admin' })
        .count('id as count')
        .first()
        .then(result => result.count);
      
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }
    
    // Delete the user
    return trx('users').where({ id }).del();
  });
};

/**
 * Change a user's password
 * @param {number} id - The ID of the user
 * @param {string} currentPassword - The current password
 * @param {string} newPassword - The new password
 * @returns {Promise<Object>} - Success message
 */
const changePassword = async (id, currentPassword, newPassword) => {
  return withTransaction(async (trx) => {
    // Get the user with password
    const user = await trx('users')
      .where({ id })
      .first();
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update the password
    await trx('users')
      .where({ id })
      .update({ 
        password: hashedPassword,
        updated_at: new Date()
      });
    
    return { message: 'Password changed successfully' };
  });
};

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Promise<Object>} - The decoded token payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Check if a user has the required role
 * @param {number} userId - The ID of the user
 * @param {string|Array} requiredRoles - The required role(s)
 * @returns {Promise<boolean>} - Whether the user has the required role
 */
const hasRole = async (userId, requiredRoles) => {
  const user = await db('users')
    .where({ id: userId })
    .first();
  
  if (!user) {
    return false;
  }
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }
  
  return user.role === requiredRoles;
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserByUsername,
  registerUser,
  authenticateUser,
  updateUser,
  deleteUser,
  changePassword,
  verifyToken,
  hasRole
}; 