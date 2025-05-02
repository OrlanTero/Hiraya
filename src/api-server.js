/**
 * Library Management System API Server
 * Main entry point for the application
 */

// Import required modules
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import custom modules
const apiRoutes = require('./routes');
const {
  errorMiddleware, 
  utilsMiddleware 
} = require('./middleware');
const db = require('./config/database');
const { initDatabase, updateSchema } = require('./config/schema');

// Load environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

/**
 * Create an API server
 * @param {Object} ipcMain - Electron IPC main object
 * @param {Object} io - Socket.io instance
 * @returns {Object} Express app
 */
const createApiServer = (ipcMain, io) => {
  // Initialize express application
  const app = express();

  // Setup global error handlers
  errorMiddleware.setupGlobalErrorHandlers();

  // Apply standard middleware
  app.use(helmet()); // Security headers
  app.use(compression()); // Compress responses
  app.use(cors()); // Enable CORS for all requests
  app.use(express.json()); // Parse JSON request bodies
  app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

  // Logging
  if (!isProduction) {
    app.use(morgan('dev')); // Development logging
      } else {
    app.use(morgan('combined')); // Production logging
  }

  // Apply custom middleware
  app.use(utilsMiddleware.addSecurityHeaders);
  app.use(utilsMiddleware.requestLogger);

  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, '../public')));

  // Mount API routes
  app.use('/api', apiRoutes);

  // Handle 404 errors for routes that don't exist
  app.use(errorMiddleware.notFound);

  // Global error handler
  app.use(errorMiddleware.errorHandler);

  // Initialize the database when the server starts
  initDatabase()
    .then(() => {
      console.log('Database initialized successfully');
    })
    .catch((error) => {
      console.error('Error initializing database:', error);
    });

  return app;
};

// Initialize express application for standalone mode
const app = express();

// Setup global error handlers
errorMiddleware.setupGlobalErrorHandlers();

// Apply standard middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS for all requests
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Logging
if (!isProduction) {
  app.use(morgan('dev')); // Development logging
      } else {
  app.use(morgan('combined')); // Production logging
}

// Apply custom middleware
app.use(utilsMiddleware.addSecurityHeaders);
app.use(utilsMiddleware.requestLogger);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api', apiRoutes);

// Handle 404 errors for routes that don't exist
app.use(errorMiddleware.notFound);

// Global error handler
app.use(errorMiddleware.errorHandler);

// Database initialization
async function startServer() {
  try {
    // Initialize database schema
    await initDatabase();
    console.log('Database initialized successfully');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
      });
    } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start the server in standalone mode
if (require.main === module) {
  startServer();
}

// Export the app for testing and the createApiServer function for use in index.js
module.exports = { app, createApiServer };
