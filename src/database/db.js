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

console.log(`Database will be stored at: ${dbFilePath}`);

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
  try {
    console.log("Starting database initialization...");

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
          pin: "123456",
          qr_code: "MEM-JOHN-DOE-001",
        },
        {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          phone: "(555) 987-6543",
          membership_type: "Premium",
          status: "Active",
          pin: "654321",
          qr_code: "MEM-JANE-SMITH-002",
        },
        {
          name: "Bob Johnson",
          email: "bob.johnson@example.com",
          phone: "(555) 456-7890",
          membership_type: "Standard",
          status: "Inactive",
          pin: "111222",
          qr_code: "MEM-BOB-JOHNSON-003",
        },
        {
          name: "Alice Williams",
          email: "alice.williams@example.com",
          phone: "(555) 567-8901",
          membership_type: "Student",
          status: "Active",
          pin: "333444",
          qr_code: "MEM-ALICE-WILLIAMS-004",
        },
        {
          name: "Charlie Brown",
          email: "charlie.brown@example.com",
          phone: "(555) 678-9012",
          membership_type: "Senior",
          status: "Active",
          pin: "555666",
          qr_code: "MEM-CHARLIE-BROWN-005",
        },
      ]);
    }

    // Loans table
    const hasLoans = await db.schema.hasTable("loans");
    if (!hasLoans) {
      await db.schema.createTable("loans", (table) => {
        table.increments("id").primary();
        table.integer("book_id").unsigned().references("id").inTable("books");
        table
          .integer("member_id")
          .unsigned()
          .references("id")
          .inTable("members");
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
        table.string("email").unique(); // Add email field
        table.string("password").notNullable(); // Would be hashed in production
        table.string("role").defaultTo("librarian");
        table.string("status").defaultTo("active");
        table.string("pin_code").nullable(); // 4-6 digit PIN for quick access
        table.string("qr_auth_key").nullable(); // Key for QR authentication
        table
          .integer("member_id")
          .nullable()
          .references("id")
          .inTable("members"); // Link to member record
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });

      // Add default users
      await db("users").insert([
        {
          username: "admin",
          email: "admin@example.com",
          password: "admin", // In a real app, this would be hashed
          role: "admin",
          status: "active",
          pin_code: "123456",
          qr_auth_key: "ADMIN-" + Date.now(),
        },
        {
          username: "librarian",
          email: "librarian@example.com",
          password: "library", // In a real app, this would be hashed
          role: "librarian",
          status: "active",
          pin_code: "654321",
          qr_auth_key: "LIB-" + Date.now(),
        },
        {
          username: "john.doe",
          email: "john@example.com",
          password: "password",
          role: "member",
          status: "active",
          pin_code: "1234",
          qr_auth_key: "MEMBER-001-JOHN",
          member_id: 1,
        },
        {
          username: "jane.smith",
          email: "jane@example.com",
          password: "password",
          role: "member",
          status: "active",
          pin_code: "5678",
          qr_auth_key: "MEMBER-002-JANE",
          member_id: 2,
        },
      ]);
    } else {
      // Check if users table has the necessary columns and add them if missing
      const hasEmailColumn = await db.schema.hasColumn("users", "email");
      const hasMemberIdColumn = await db.schema.hasColumn("users", "member_id");

      if (!hasEmailColumn || !hasMemberIdColumn) {
        console.log("Updating users table with new columns...");

        // Add columns individually instead of using a transaction
        try {
          if (!hasEmailColumn) {
            await db.schema.table("users", (table) => {
              table.string("email").nullable().unique();
            });
            console.log("Added email column to users table");
          }

          if (!hasMemberIdColumn) {
            await db.schema.table("users", (table) => {
              table
                .integer("member_id")
                .nullable()
                .references("id")
                .inTable("members");
            });
            console.log("Added member_id column to users table");
          }

          // Update existing users with email addresses based on username
          const existingUsers = await db("users").select("*");
          for (const user of existingUsers) {
            if (!hasEmailColumn || !user.email) {
              await db("users")
                .where({ id: user.id })
                .update({
                  email: `${user.username}@example.com`,
                  updated_at: new Date(),
                });
            }

            // If user is admin or has admin in the name, assign proper role
            if (user.username === "admin" || user.username.includes("admin")) {
              await db("users").where({ id: user.id }).update({
                role: "admin",
                updated_at: new Date(),
              });
            }
          }
        } catch (err) {
          console.error("Error updating users table:", err);
          throw err;
        }
      }
    }

    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// DB operations
const getAllBooks = () => db("books").select("*");

const getBookById = (id) => {
  console.log(`Looking up book with ID: ${id}, type: ${typeof id}`);
  return db("books")
    .where({ id: parseInt(id, 10) })
    .first()
    .then((book) => {
      if (!book) {
        console.log(`No book found with ID ${id}`);
      } else {
        console.log(`Found book: ${book.title}`);
      }
      return book;
    });
};

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
    const { member_id, book_id, book_ids, checkout_date, due_date } =
      memberData;

    // Validate member
    const member = await trx("members").where({ id: member_id }).first();
    if (!member) {
      throw new Error("Member not found");
    }

    if (member.status !== "Active") {
      throw new Error("Member is not active");
    }

    // Handle single book_id or multiple book_ids
    const bookIdsArray = book_ids
      ? Array.isArray(book_ids)
        ? book_ids
        : [book_ids]
      : book_id
      ? [book_id]
      : [];

    if (bookIdsArray.length === 0) {
      throw new Error("No book IDs provided");
    }

    console.log(`Borrowing books: ${bookIdsArray.join(", ")}`);

    // Check if any of the books are already checked out
    const unavailableBooks = await trx("books")
      .whereIn("id", bookIdsArray)
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
    const loans = bookIdsArray.map((bookId) => ({
      book_id: bookId,
      member_id,
      checkout_date: checkout_date || new Date(),
      due_date: due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default to 14 days
      status: "Borrowed",
    }));

    // Insert all loans
    const insertedLoans = await trx("loans").insert(loans).returning("*");

    // Update book status to "Checked Out"
    await trx("books").whereIn("id", bookIdsArray).update({
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

const authenticate = async (identifier, password) => {
  try {
    console.log(
      `Authentication attempt for identifier: ${identifier}, password type: ${typeof password}, password length: ${
        password ? password.length : 0
      }`
    );

    // Print all users in database for debugging
    const allUsers = await db("users").select("*");
    console.log("All users in database during authentication:");
    const userList = allUsers.map(function (u) {
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
      };
    });
    console.log(JSON.stringify(userList, null, 2));

    // Check if the email column exists
    const hasEmailColumn = await db.schema.hasColumn("users", "email");

    let user;

    if (hasEmailColumn) {
      // Try to find user by username or email
      user = await db("users")
        .where({ username: identifier })
        .orWhere({ email: identifier })
        .first();
    } else {
      // If email column doesn't exist, just search by username
      user = await db("users").where({ username: identifier }).first();
    }

    console.log(`User found in users table: ${user ? "Yes" : "No"}`);

    // If user not found in users table, try to find in members table
    if (!user) {
      console.log(
        `User not found in users table, checking members table for: ${identifier}`
      );

      // Look for a member with matching email
      const member = await db("members").where({ email: identifier }).first();

      if (member) {
        console.log(
          `Found member with email: ${member.email}, creating user object`
        );

        // Check pin/password against members table (pin field)
        if (member.pin !== password) {
          console.log("Member PIN does not match provided password");
          return { success: false, message: "Invalid PIN" };
        }

        // Create a user object from member data for authentication
        user = {
          id: `member-${member.id}`,
          username: member.name,
          email: member.email,
          password: member.pin, // We'll check this manually
          role: "member",
          status: member.status === "Active" ? "active" : "inactive",
          member_id: member.id,
        };
      } else {
        console.log(`No member found with identifier: ${identifier}`);
        return { success: false, message: "User not found" };
      }
    }

    console.log(`Checking credentials for user: ${user.username}`);
    console.log(
      `Checking against password: ${password ? "Provided" : "Not provided"}`
    );

    // Strict password check
    if (user.password !== password) {
      console.log("Password does not match");
      return { success: false, message: "Invalid password" };
    }

    if (user.status !== "active" && user.status !== "Active") {
      return { success: false, message: "User account is inactive" };
    }

    // Get associated member data if user is a member
    let memberData = null;
    const hasMemberIdColumn = await db.schema.hasColumn("users", "member_id");

    if (hasMemberIdColumn && user.member_id) {
      memberData = await db("members").where({ id: user.member_id }).first();
    } else if (
      user.role === "member" &&
      user.id.toString().startsWith("member-")
    ) {
      // This is a direct member login, we already have the member data
      const memberId =
        user.member_id || parseInt(user.id.toString().replace("member-", ""));
      memberData = await db("members").where({ id: memberId }).first();
    }

    // Create safe user object without sensitive data
    const safeUser = {
      id: user.id,
      username: user.username,
      email: hasEmailColumn ? user.email : `${user.username}@example.com`,
      role: user.role,
      member_id: user.member_id || (memberData ? memberData.id : null),
      member: memberData,
    };

    console.log("Authentication successful for user:", safeUser.username);
    return {
      success: true,
      user: safeUser,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      success: false,
      message: "Authentication failed due to a system error",
      error: error.message,
    };
  }
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
const authenticateWithPin = async (pin_input) => {
  try {
    // Extract the PIN code from input (can be string or object)
    const pin_code =
      typeof pin_input === "object" && pin_input.pin_code
        ? pin_input.pin_code
        : pin_input;

    console.log(
      `PIN authentication attempt with ${typeof pin_input} input, extracted PIN length: ${
        pin_code ? pin_code.length : 0
      }`
    );

    if (!pin_code) {
      console.log("PIN authentication failed: No PIN provided");
      return { success: false, message: "PIN code is required" };
    }

    // First check users table
    const user = await db("users").where({ pin_code }).first();
    let memberData = null;
    let userObject = null;

    if (user) {
      console.log("Found matching PIN in users table:", user.username);
      userObject = user;

      if (user.status !== "active") {
        console.log("PIN authentication failed: Inactive account");
        return { success: false, message: "User account is inactive" };
      }

      // Get associated member data if user is a member
      const hasMemberIdColumn = await db.schema.hasColumn("users", "member_id");
      if (hasMemberIdColumn && user.member_id) {
        memberData = await db("members").where({ id: user.member_id }).first();
      }
    } else {
      // Check in members table for matching PIN
      console.log("No matching PIN in users table, checking members table");
      const member = await db("members").where({ pin: pin_code }).first();

      if (member) {
        console.log("Found matching PIN in members table:", member.name);
        memberData = member;

        if (member.status !== "Active") {
          console.log("PIN authentication failed: Inactive member account");
          return { success: false, message: "Member account is inactive" };
        }

        // Create user object from member data
        userObject = {
          id: `member-${member.id}`,
          username: member.name,
          email: member.email,
          role: "member",
          member_id: member.id,
        };
      } else {
        console.log("PIN authentication failed: Invalid PIN");
        return { success: false, message: "Invalid PIN code" };
      }
    }

    const hasEmailColumn = await db.schema.hasColumn("users", "email");

    // Create safe user object without sensitive data
    const safeUser = {
      id: userObject.id,
      username: userObject.username,
      email:
        hasEmailColumn && userObject.email
          ? userObject.email
          : `${userObject.username}@example.com`,
      role: userObject.role,
      member_id: userObject.member_id || (memberData ? memberData.id : null),
      member: memberData,
    };

    console.log("PIN authentication successful for user:", safeUser.username);
    return {
      success: true,
      user: safeUser,
    };
  } catch (error) {
    console.error("PIN authentication error:", error);
    return {
      success: false,
      message: "PIN authentication failed due to a system error",
      error: error.message,
    };
  }
};

const authenticateWithQR = async (qr_auth_key, pin_code) => {
  try {
    // First check in users table
    const user = await db("users").where({ qr_auth_key }).first();
    let memberData = null;
    let userObject = null;

    if (user) {
      console.log("Found matching QR code in users table:", user.username);
      userObject = user;

      // If PIN code is provided, verify it
      if (pin_code && user.pin_code !== pin_code) {
        return { success: false, message: "Invalid PIN code" };
      }

      if (user.status !== "active") {
        return { success: false, message: "User account is inactive" };
      }

      // Get associated member data if user is a member
      const hasMemberIdColumn = await db.schema.hasColumn("users", "member_id");
      if (hasMemberIdColumn && user.member_id) {
        memberData = await db("members").where({ id: user.member_id }).first();
      }
    } else {
      // Check in members table for matching QR code
      console.log("No matching QR code in users table, checking members table");
      const member = await db("members")
        .where({ qr_code: qr_auth_key })
        .first();

      if (member) {
        console.log("Found matching QR code in members table:", member.name);
        memberData = member;

        // If PIN code is provided, verify it against member PIN
        if (pin_code && member.pin !== pin_code) {
          return { success: false, message: "Invalid PIN code" };
        }

        if (member.status !== "Active") {
          return { success: false, message: "Member account is inactive" };
        }

        // Create user object from member data
        userObject = {
          id: `member-${member.id}`,
          username: member.name,
          email: member.email,
          role: "member",
          member_id: member.id,
        };
      } else {
        return { success: false, message: "Invalid QR code" };
      }
    }

    const hasEmailColumn = await db.schema.hasColumn("users", "email");

    // Create safe user object without sensitive data
    const safeUser = {
      id: userObject.id,
      username: userObject.username,
      email:
        hasEmailColumn && userObject.email
          ? userObject.email
          : `${userObject.username}@example.com`,
      role: userObject.role,
      member_id: userObject.member_id || (memberData ? memberData.id : null),
      member: memberData,
    };

    return {
      success: true,
      user: safeUser,
    };
  } catch (error) {
    console.error("QR authentication error:", error);
    return {
      success: false,
      message: "QR authentication failed due to a system error",
      error: error.message,
    };
  }
};

// Update members table structure to include additional fields if needed
const updateMembersTable = async () => {
  try {
    console.log("Checking members table for required authentication fields...");

    // First check if the table exists
    const hasTable = await db.schema.hasTable("members");
    if (!hasTable) {
      console.log(
        "Members table doesn't exist, it will be created during initialization"
      );
      return;
    }

    // Check for all needed fields
    const hasQRField = await db.schema.hasColumn("members", "qr_code");
    const hasPinField = await db.schema.hasColumn("members", "pin");
    const hasAddressField = await db.schema.hasColumn("members", "address");
    const hasDateOfBirthField = await db.schema.hasColumn(
      "members",
      "date_of_birth"
    );
    const hasGenderField = await db.schema.hasColumn("members", "gender");

    // Only alter table if needed
    if (
      !hasQRField ||
      !hasPinField ||
      !hasAddressField ||
      !hasDateOfBirthField ||
      !hasGenderField
    ) {
      await db.schema.table("members", (table) => {
        if (!hasQRField) table.string("qr_code").nullable();
        if (!hasPinField) table.string("pin").nullable();
        if (!hasAddressField) table.string("address").nullable();
        if (!hasDateOfBirthField) table.date("date_of_birth").nullable();
        if (!hasGenderField) table.string("gender").nullable();
      });
      console.log("Members table updated with additional fields");
    } else {
      console.log("Members table already has all required fields");
    }

    // Ensure each member has a QR code and PIN if not already set
    const members = await db("members").select("*");
    console.log(
      `Checking ${members.length} members for PIN/QR authentication data`
    );

    for (const member of members) {
      const updates = {};

      // Generate PIN if not exists
      if (!member.pin) {
        updates.pin = Math.floor(100000 + Math.random() * 900000).toString();
      }

      // Generate QR code if not exists
      if (!member.qr_code) {
        updates.qr_code =
          "MEM-" +
          Date.now() +
          "-" +
          Math.floor(Math.random() * 1000) +
          "-" +
          member.id;
      }

      // Only update if changes needed
      if (Object.keys(updates).length > 0) {
        await db("members").where({ id: member.id }).update(updates);
        console.log(
          `Updated member ${member.id} (${member.name}) with authentication data`
        );
      }
    }

    console.log("Members table update completed");
  } catch (error) {
    console.error("Error updating members table:", error);
    throw error;
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

// Function to reset the database (clear all data)
const resetDatabase = async () => {
  try {
    console.log("Resetting database...");

    // Drop tables in reverse order of dependencies
    if (await db.schema.hasTable("loans")) {
      await db.schema.dropTable("loans");
      console.log("Dropped loans table");
    }

    if (await db.schema.hasTable("users")) {
      await db.schema.dropTable("users");
      console.log("Dropped users table");
    }

    if (await db.schema.hasTable("members")) {
      await db.schema.dropTable("members");
      console.log("Dropped members table");
    }

    if (await db.schema.hasTable("books")) {
      await db.schema.dropTable("books");
      console.log("Dropped books table");
    }

    // Re-initialize the database
    await initDatabase();
    console.log("Database has been reset with fresh tables and sample data");

    return { success: true, message: "Database reset successfully" };
  } catch (error) {
    console.error("Error resetting database:", error);
    return {
      success: false,
      message: `Database reset failed: ${error.message}`,
    };
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
  resetDatabase,
};
