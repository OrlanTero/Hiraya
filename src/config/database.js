/**
 * Database configuration
 * This file initializes and exports the database connection
 */

const knex = require('knex');
const path = require('path');
const fs = require('fs');

// Determine database file path - store in user data directory if in production
const getDbPath = () => {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    const { app } = require('electron');
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'balanghay.sqlite3');
  } else {
    return path.join(__dirname, '../../balanghay.sqlite3');
  }
};

// Initialize knex with SQLite connection
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: getDbPath(),
  },
  useNullAsDefault: true,
  // Enable foreign key constraints
  pool: {
    afterCreate: (conn, cb) => {
      conn.run('PRAGMA foreign_keys = ON', cb);
    },
  },
});

// Ensure database file exists
if (!fs.existsSync(getDbPath())) {
  console.log("Database file doesn't exist, creating it at: ", getDbPath());
  fs.writeFileSync(getDbPath(), '');
}

module.exports = db; 