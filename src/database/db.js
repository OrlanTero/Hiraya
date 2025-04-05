const knex = require("knex");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

// Ensure the database directory exists
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "database");

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const dbFilePath = path.join(dbPath, "hiraya_balanghay.sqlite");

// Initialize knex connection
const db = knex({
  client: "better-sqlite3",
  connection: {
    filename: dbFilePath,
  },
  useNullAsDefault: true,
});

// Initialize the database tables if they don't exist
const initDatabase = async () => {
  // Check if tables exist and create them if not

  // Books table
  const hasBooks = await db.schema.hasTable("books");
  if (!hasBooks) {
    await db.schema.createTable("books", (table) => {
      table.increments("id").primary();
      table.string("title").notNullable();
      table.string("author").notNullable();
      table.string("isbn").unique();
      table.string("category");
      table.string("status").defaultTo("Available");
      table.text("front_cover").nullable(); // Base64 encoded image or URL
      table.text("back_cover").nullable(); // Base64 encoded image or URL
      table.text("spine_cover").nullable(); // Base64 encoded image or URL
      table.string("cover_color").defaultTo("#6B4226"); // Default book color
      table.string("publisher").nullable();
      table.integer("publish_year").nullable();
      table.text("description").nullable();
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
    });

    // Add some sample books
    await db("books").insert([
      {
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        isbn: "9780061120084",
        category: "Fiction",
        status: "Available",
        publisher: "HarperCollins",
        publish_year: 1960,
        cover_color: "#7A9E9F",
        description:
          "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.",
      },
      {
        title: "1984",
        author: "George Orwell",
        isbn: "9780451524935",
        category: "Science Fiction",
        status: "Checked Out",
        publisher: "Signet Classic",
        publish_year: 1949,
        cover_color: "#4C4C4C",
        description:
          "A dystopian novel set in a totalitarian regime, following Winston Smith as he rebels against the omnipresent government surveillance.",
      },
      {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        isbn: "9780743273565",
        category: "Classic",
        status: "Available",
        publisher: "Scribner",
        publish_year: 1925,
        cover_color: "#E0CC8D",
        description:
          "A portrait of the Jazz Age in all of its decadence and excess, Gatsby captured the spirit of the author's generation.",
      },
      {
        title: "Pride and Prejudice",
        author: "Jane Austen",
        isbn: "9780141439518",
        category: "Romance",
        status: "Available",
        publisher: "Penguin Classics",
        publish_year: 1813,
        cover_color: "#B0C4DE",
        description:
          "A romantic novel of manners that follows the character development of Elizabeth Bennet.",
      },
      {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        isbn: "9780547928227",
        category: "Fantasy",
        status: "Checked Out",
        publisher: "Houghton Mifflin",
        publish_year: 1937,
        cover_color: "#3C694E",
        description:
          "A fantasy novel about the adventures of hobbit Bilbo Baggins, who is hired by the wizard Gandalf to help a group of dwarves reclaim their mountain home from the dragon Smaug.",
      },
    ]);
  } else {
    // Check if the cover fields exist, and add them if they don't
    const hasFrontCover = await db.schema.hasColumn("books", "front_cover");
    if (!hasFrontCover) {
      await db.schema.table("books", (table) => {
        table.text("front_cover").nullable();
        table.text("back_cover").nullable();
        table.text("spine_cover").nullable();
        table.string("cover_color").defaultTo("#6B4226");
        table.string("publisher").nullable();
        table.integer("publish_year").nullable();
        table.text("description").nullable();
      });
      console.log("Books table updated with cover fields");
    }
  }

  // Members table
  const hasMembers = await db.schema.hasTable("members");
  if (!hasMembers) {
    await db.schema.createTable("members", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("email").unique();
      table.string("phone");
      table.string("membership_type").defaultTo("Standard");
      table.string("status").defaultTo("Active");
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
    });

    // Add some sample members
    await db("members").insert([
      {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "(555) 123-4567",
        membership_type: "Standard",
        status: "Active",
      },
      {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        phone: "(555) 987-6543",
        membership_type: "Premium",
        status: "Active",
      },
      {
        name: "Bob Johnson",
        email: "bob.johnson@example.com",
        phone: "(555) 456-7890",
        membership_type: "Standard",
        status: "Inactive",
      },
      {
        name: "Alice Williams",
        email: "alice.williams@example.com",
        phone: "(555) 567-8901",
        membership_type: "Student",
        status: "Active",
      },
      {
        name: "Charlie Brown",
        email: "charlie.brown@example.com",
        phone: "(555) 678-9012",
        membership_type: "Senior",
        status: "Active",
      },
    ]);
  }

  // Loans table
  const hasLoans = await db.schema.hasTable("loans");
  if (!hasLoans) {
    await db.schema.createTable("loans", (table) => {
      table.increments("id").primary();
      table.integer("book_id").unsigned().references("id").inTable("books");
      table.integer("member_id").unsigned().references("id").inTable("members");
      table.date("checkout_date").notNullable();
      table.date("due_date").notNullable();
      table.date("return_date");
      table.string("status").defaultTo("Borrowed");
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
    });

    // Add some sample loans
    const currentDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(currentDate.getDate() + 14);

    await db("loans").insert([
      {
        book_id: 2,
        member_id: 1,
        checkout_date: currentDate,
        due_date: dueDate,
        status: "Borrowed",
      },
      {
        book_id: 5,
        member_id: 2,
        checkout_date: currentDate,
        due_date: dueDate,
        status: "Borrowed",
      },
    ]);
  }

  // Users table for authentication
  const hasUsers = await db.schema.hasTable("users");
  if (!hasUsers) {
    await db.schema.createTable("users", (table) => {
      table.increments("id").primary();
      table.string("username").notNullable().unique();
      table.string("password").notNullable(); // Would be hashed in production
      table.string("role").defaultTo("librarian");
      table.string("status").defaultTo("active");
      table.string("pin_code").nullable(); // 4-6 digit PIN for quick access
      table.string("qr_auth_key").nullable(); // Key for QR authentication
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
    });

    // Add default users
    await db("users").insert([
      {
        username: "admin",
        password: "admin", // In a real app, this would be hashed
        role: "admin",
        status: "active",
        pin_code: "123456",
        qr_auth_key: "ADMIN-" + Date.now(),
      },
      {
        username: "librarian",
        password: "library", // In a real app, this would be hashed
        role: "librarian",
        status: "active",
        pin_code: "654321",
        qr_auth_key: "LIB-" + Date.now(),
      },
    ]);
  }

  console.log("Database initialized successfully!");
};

// DB operations
const getAllBooks = () => db("books").select("*");
const getBookById = (id) => db("books").where({ id }).first();
const addBook = (book) => db("books").insert(book).returning("*");
const updateBook = (id, book) =>
  db("books").where({ id }).update(book).returning("*");
const deleteBook = (id) => db("books").where({ id }).del();

const getAllMembers = () => db("members").select("*");
const getMemberById = (id) => db("members").where({ id }).first();
const addMember = (member) => db("members").insert(member).returning("*");
const updateMember = (id, member) =>
  db("members").where({ id }).update(member).returning("*");
const deleteMember = (id) => db("members").where({ id }).del();

const getAllLoans = () =>
  db("loans")
    .join("books", "loans.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .select(
      "loans.*",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.front_cover as book_cover",
      "books.cover_color as book_color",
      "members.name as member_name",
      "members.email as member_email"
    );

const getLoansByMember = (memberId) =>
  db("loans")
    .join("books", "loans.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .where("loans.member_id", memberId)
    .select(
      "loans.*",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.front_cover as book_cover",
      "books.cover_color as book_color",
      "members.name as member_name",
      "members.email as member_email"
    );

const getActiveLoans = () =>
  db("loans")
    .join("books", "loans.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .whereNull("loans.return_date")
    .andWhere("loans.status", "!=", "Returned")
    .select(
      "loans.*",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.front_cover as book_cover",
      "books.cover_color as book_color",
      "members.name as member_name",
      "members.email as member_email"
    );

const getOverdueLoans = () => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  return db("loans")
    .join("books", "loans.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .whereNull("loans.return_date")
    .andWhere("loans.due_date", "<", today)
    .select(
      "loans.*",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.front_cover as book_cover",
      "books.cover_color as book_color",
      "members.name as member_name",
      "members.email as member_email"
    );
};

const addLoan = (loan) => db("loans").insert(loan).returning("*");
const updateLoan = (id, loan) =>
  db("loans").where({ id }).update(loan).returning("*");
const returnBook = (id) => {
  return db.transaction(async (trx) => {
    // Get the loan
    const loan = await trx("loans").where({ id }).first();

    if (!loan) {
      throw new Error("Loan not found");
    }

    // Update loan status and return date
    await trx("loans").where({ id }).update({
      status: "Returned",
      return_date: new Date(),
      updated_at: new Date(),
    });

    // Update book status
    await trx("books").where({ id: loan.book_id }).update({
      status: "Available",
      updated_at: new Date(),
    });

    return { success: true };
  });
};

const borrowBooks = (memberData) => {
  return db.transaction(async (trx) => {
    const { member_id, book_ids, checkout_date, due_date } = memberData;

    // Validate member
    const member = await trx("members").where({ id: member_id }).first();
    if (!member) {
      throw new Error("Member not found");
    }

    if (member.status !== "Active") {
      throw new Error("Member is not active");
    }

    // Check if any of the books are already checked out
    const unavailableBooks = await trx("books")
      .whereIn("id", book_ids)
      .andWhere("status", "!=", "Available")
      .select("id", "title");

    if (unavailableBooks.length > 0) {
      throw new Error(
        `Some books are not available: ${unavailableBooks
          .map((b) => b.title)
          .join(", ")}`
      );
    }

    // Create loans for each book
    const loans = book_ids.map((book_id) => ({
      book_id,
      member_id,
      checkout_date: checkout_date || new Date(),
      due_date: due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default to 14 days
      status: "Borrowed",
    }));

    // Insert all loans
    const insertedLoans = await trx("loans").insert(loans).returning("*");

    // Update book status to "Checked Out"
    await trx("books").whereIn("id", book_ids).update({
      status: "Checked Out",
      updated_at: new Date(),
    });

    return insertedLoans;
  });
};

const returnBooks = (loanIds) => {
  return db.transaction(async (trx) => {
    const today = new Date();

    // Get all the loans
    const loans = await trx("loans").whereIn("id", loanIds).select("*");

    if (loans.length !== loanIds.length) {
      throw new Error("Some loan IDs are invalid");
    }

    // Update all loans to returned
    await trx("loans").whereIn("id", loanIds).update({
      status: "Returned",
      return_date: today,
      updated_at: today,
    });

    // Update all books to available
    const bookIds = loans.map((loan) => loan.book_id);
    await trx("books").whereIn("id", bookIds).update({
      status: "Available",
      updated_at: today,
    });

    return { success: true, count: loans.length };
  });
};

// Process return via QR code
const returnBooksViaQRCode = (qrData) => {
  return db.transaction(async (trx) => {
    const today = new Date();

    try {
      // Parse the QR data if it's a string
      const data = typeof qrData === "string" ? JSON.parse(qrData) : qrData;

      // Extract loan IDs from the QR code data
      const { loansIds, transactionId, memberId } = data;

      if (!loansIds || !Array.isArray(loansIds) || loansIds.length === 0) {
        throw new Error("No valid loan IDs found in QR code");
      }

      // Verify that the loans belong to the specified member
      const loans = await trx("loans")
        .whereIn("id", loansIds)
        .andWhere("member_id", memberId)
        .select("*");

      if (loans.length === 0) {
        throw new Error("No valid loans found for this member");
      }

      // Check if any loans are already returned
      const alreadyReturned = loans.filter(
        (loan) => loan.status === "Returned"
      );
      if (alreadyReturned.length > 0) {
        console.log(`${alreadyReturned.length} books already returned`);
      }

      // Get only unreturned loans
      const activeLoans = loans.filter((loan) => loan.status !== "Returned");

      if (activeLoans.length === 0) {
        return {
          success: true,
          message: "All books already returned",
          count: 0,
          transactionId,
        };
      }

      // Update all active loans to returned
      const activeLoansIds = activeLoans.map((loan) => loan.id);
      await trx("loans").whereIn("id", activeLoansIds).update({
        status: "Returned",
        return_date: today,
        updated_at: today,
      });

      // Update all books to available
      const bookIds = activeLoans.map((loan) => loan.book_id);
      await trx("books").whereIn("id", bookIds).update({
        status: "Available",
        updated_at: today,
      });

      return {
        success: true,
        message: `${activeLoans.length} books returned successfully`,
        count: activeLoans.length,
        transactionId,
      };
    } catch (error) {
      console.error("Error in returnBooksViaQRCode:", error);
      throw new Error(`Failed to process QR code return: ${error.message}`);
    }
  });
};

const authenticate = async (username, password) => {
  const user = await db("users").where({ username }).first();

  if (!user) {
    return { success: false, message: "User not found" };
  }

  // In a real app, you would compare hashed passwords
  if (user.password !== password) {
    return { success: false, message: "Invalid password" };
  }

  if (user.status !== "active") {
    return { success: false, message: "User account is inactive" };
  }

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      pin_code: user.pin_code,
      qr_auth_key: user.qr_auth_key,
    },
  };
};

// Add new functions for user management
const getAllUsers = () =>
  db("users").select(
    "id",
    "username",
    "role",
    "status",
    "pin_code",
    "qr_auth_key",
    "created_at",
    "updated_at"
  );
const getUserById = (id) => db("users").where({ id }).first();
const addUser = (user) => db("users").insert(user).returning("*");
const updateUser = (id, user) =>
  db("users").where({ id }).update(user).returning("*");
const deleteUser = (id) => db("users").where({ id }).del();

// Add PIN and QR authentication methods
const authenticateWithPin = async (pin_code) => {
  const user = await db("users").where({ pin_code }).first();

  if (!user) {
    return { success: false, message: "Invalid PIN code" };
  }

  if (user.status !== "active") {
    return { success: false, message: "User account is inactive" };
  }

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      pin_code: user.pin_code,
      qr_auth_key: user.qr_auth_key,
    },
  };
};

const authenticateWithQR = async (qr_auth_key) => {
  const user = await db("users").where({ qr_auth_key }).first();

  if (!user) {
    return { success: false, message: "Invalid QR code" };
  }

  if (user.status !== "active") {
    return { success: false, message: "User account is inactive" };
  }

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      pin_code: user.pin_code,
      qr_auth_key: user.qr_auth_key,
    },
  };
};

// Update members table structure to include additional fields if needed
const updateMembersTable = async () => {
  const hasQRField = await db.schema.hasColumn("members", "qr_code");

  if (!hasQRField) {
    await db.schema.table("members", (table) => {
      table.string("qr_code").nullable();
      table.string("pin").nullable();
      table.string("address").nullable();
      table.date("date_of_birth").nullable();
      table.string("gender").nullable();
    });
    console.log("Members table updated with additional fields");
  }
};

// Add function to update books table
const updateBooksTable = async () => {
  const hasFrontCover = await db.schema.hasColumn("books", "front_cover");

  if (!hasFrontCover) {
    await db.schema.table("books", (table) => {
      table.text("front_cover").nullable();
      table.text("back_cover").nullable();
      table.text("spine_cover").nullable();
      table.string("cover_color").defaultTo("#6B4226");
      table.string("publisher").nullable();
      table.integer("publish_year").nullable();
      table.text("description").nullable();
    });
    console.log("Books table updated with cover fields");
  }
};

module.exports = {
  db,
  initDatabase,
  getAllBooks,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
  getAllMembers,
  getMemberById,
  addMember,
  updateMember,
  deleteMember,
  getAllLoans,
  getLoansByMember,
  getActiveLoans,
  getOverdueLoans,
  addLoan,
  updateLoan,
  returnBook,
  borrowBooks,
  returnBooks,
  returnBooksViaQRCode,
  authenticate,
  authenticateWithPin,
  authenticateWithQR,
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  updateMembersTable,
  updateBooksTable,
};
