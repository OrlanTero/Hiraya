/**
 * Database schema management
 * Handles creation and migration of database tables
 */

const db = require('./database');
const { tableExists, columnExists } = require('./db-utils');

/**
 * Initialize all database tables
 * Creates tables if they don't exist
 */
const initDatabase = async () => {
  try {
    console.log('Initializing database schema...');

    // Create books table
    const hasBooksTable = await tableExists('books');
    if (!hasBooksTable) {
      await db.schema.createTable('books', (table) => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.string('author');
        table.string('isbn').unique();
        table.string('publisher');
        table.string('publication_year');
        table.string('category');
        table.text('description');
        table.string('cover_color').defaultTo('#6B4226');
        table.text('front_cover');
        table.text('back_cover');
        table.string('language').defaultTo('English');
        table.integer('pages');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created books table');
    }

    // Create shelves table
    const hasShelvesTable = await tableExists('shelves');
    if (!hasShelvesTable) {
      await db.schema.createTable('shelves', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('section');
        table.string('location');
        table.text('description');
        table.integer('capacity');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created shelves table');
    }

    // Create book_copies table
    const hasBookCopiesTable = await tableExists('book_copies');
    if (!hasBookCopiesTable) {
      await db.schema.createTable('book_copies', (table) => {
        table.increments('id').primary();
        table.integer('book_id').unsigned().references('id').inTable('books');
        table.integer('shelf_id').unsigned().references('id').inTable('shelves').nullable();
        table.string('barcode').unique();
        table.string('location_code');
        table.string('status').defaultTo('Available');
        table.string('condition').defaultTo('Good');
        table.date('acquisition_date');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created book_copies table');
    }

    // Create members table
    const hasMembersTable = await tableExists('members');
    if (!hasMembersTable) {
      await db.schema.createTable('members', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').unique();
        table.string('phone');
        table.string('membership_type').defaultTo('Standard');
        table.string('status').defaultTo('Active');
        table.string('pin');
        table.string('qr_code');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created members table');
    }

    // Create loans table
    const hasLoansTable = await tableExists('loans');
    if (!hasLoansTable) {
      await db.schema.createTable('loans', (table) => {
        table.increments('id').primary();
        table.integer('book_copy_id').unsigned().references('id').inTable('book_copies');
        table.integer('member_id').unsigned().references('id').inTable('members');
        table.date('checkout_date').notNullable();
        table.date('due_date').notNullable();
        table.date('return_date');
        table.string('status').defaultTo('Borrowed');
        table.integer('rating').nullable();
        table.text('review').nullable();
        table.string('transaction_id').nullable(); // For grouping multiple books borrowed together
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created loans table');
    }

    // Create users table for staff/admin access
    const hasUsersTable = await tableExists('users');
    if (!hasUsersTable) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').unique().notNullable();
        table.string('email').unique().notNullable();
        table.string('password').notNullable();
        table.string('name');
        table.string('role').defaultTo('staff');
        table.boolean('active').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created users table');
    }

    console.log('Database schema initialization complete.');
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Update the database schema if needed
 * Adds missing columns to existing tables
 */
const updateSchema = async () => {
  try {
    console.log('Checking for schema updates...');
    
    // Check loans table for transaction_id column
    if (await tableExists('loans')) {
      const hasTransactionIdColumn = await columnExists('loans', 'transaction_id');
      
      if (!hasTransactionIdColumn) {
        console.log('Adding transaction_id column to loans table');
        await db.schema.table('loans', (table) => {
          table.string('transaction_id').nullable();
        });
        console.log('Added transaction_id column to loans table');
        
        // Generate transaction IDs for existing loans that were borrowed at the same time
        await generateLoanTransactionIds();
      }
    }
    
    // Check for rating and review columns in loans table
    if (await tableExists('loans')) {
      const hasRatingColumn = await columnExists('loans', 'rating');
      const hasReviewColumn = await columnExists('loans', 'review');
      
      if (!hasRatingColumn) {
        console.log('Adding rating column to loans table');
        await db.schema.table('loans', (table) => {
          table.integer('rating').nullable();
        });
      }
      
      if (!hasReviewColumn) {
        console.log('Adding review column to loans table');
        await db.schema.table('loans', (table) => {
          table.text('review').nullable();
        });
      }
    }
    
    return { success: true, message: 'Schema updated successfully' };
  } catch (error) {
    console.error('Error updating schema:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Generate transaction IDs for existing loans that were borrowed at the same time
 * Groups loans by member_id and checkout_date
 */
const generateLoanTransactionIds = async () => {
  try {
    // Get all loans
    const loans = await db('loans').select('*').orderBy('checkout_date');
    
    // Group loans by member_id and checkout_date (approximately same time)
    const loanGroups = {};
    
    for (const loan of loans) {
      const key = `${loan.member_id}-${loan.checkout_date}`;
      if (!loanGroups[key]) {
        loanGroups[key] = [];
      }
      loanGroups[key].push(loan);
    }
    
    // Assign transaction IDs to each group
    for (const key in loanGroups) {
      const group = loanGroups[key];
      if (group.length > 1) {
        // These loans were likely borrowed together
        const transactionId = `LOAN-${Date.now()}-${group[0].member_id}`;
        
        for (const loan of group) {
          await db('loans').where({ id: loan.id }).update({
            transaction_id: transactionId,
            updated_at: new Date()
          });
        }
        
        console.log(`Assigned transaction ID ${transactionId} to ${group.length} loans`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error generating loan transaction IDs:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  initDatabase,
  updateSchema
}; 