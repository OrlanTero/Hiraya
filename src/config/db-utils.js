/**
 * Database utility functions
 * Common functions for database operations
 */

const db = require('./database');

/**
 * Checks if a table exists in the database
 * @param {string} tableName - The name of the table to check
 * @returns {Promise<boolean>} - True if the table exists, false otherwise
 */
const tableExists = async (tableName) => {
  try {
    const result = await db.schema.hasTable(tableName);
    return result;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
};

/**
 * Checks if a column exists in a table
 * @param {string} tableName - The name of the table
 * @param {string} columnName - The name of the column
 * @returns {Promise<boolean>} - True if the column exists, false otherwise
 */
const columnExists = async (tableName, columnName) => {
  try {
    const result = await db.schema.hasColumn(tableName, columnName);
    return result;
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
    return false;
  }
};

/**
 * Run a SQL query within a transaction
 * @param {Function} callback - The function to run within the transaction
 * @returns {Promise<any>} - The result of the callback function
 */
const withTransaction = async (callback) => {
  try {
    return await db.transaction(callback);
  } catch (error) {
    console.error('Error in transaction:', error);
    throw error;
  }
};

module.exports = {
  tableExists,
  columnExists,
  withTransaction
}; 