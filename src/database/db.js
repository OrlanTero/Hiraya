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

    // Shelves table
    const hasShelves = await db.schema.hasTable("shelves");
    if (!hasShelves) {
      await db.schema.createTable("shelves", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("location").notNullable();
        table.string("section").nullable();
        table.text("description").nullable();
        table.string("code").nullable(); // Adding a code field for shelf identification
        table.integer("capacity").defaultTo(100);
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });

      // Add some sample shelves
      await db("shelves").insert([
        {
          name: "Fiction A-M",
          location: "Floor 1",
          section: "Fiction",
          description: "Fiction books, authors A-M",
          code: "FIC-A",
          capacity: 200,
        },
        {
          name: "Fiction N-Z",
          location: "Floor 1",
          section: "Fiction",
          description: "Fiction books, authors N-Z",
          code: "FIC-Z",
          capacity: 200,
        },
        {
          name: "Science Fiction",
          location: "Floor 1",
          section: "Sci-Fi",
          description: "Science Fiction and Fantasy books",
          code: "SCI",
          capacity: 150,
        },
        {
          name: "Classics",
          location: "Floor 2",
          section: "Classics",
          description: "Classic literature",
          code: "CLS",
          capacity: 100,
        },
        {
          name: "Reference",
          location: "Floor 2",
          section: "Reference",
          description: "Reference books and encyclopedias",
          code: "REF",
          capacity: 75,
        },
      ]);
    } else {
      // Check if section field exists, and add it if it doesn't
      const hasSectionField = await db.schema.hasColumn("shelves", "section");
      if (!hasSectionField) {
        await db.schema.table("shelves", (table) => {
          table.string("section").nullable();
        });
        console.log("Added section field to shelves table");
      }

      // Check if code field exists, and add it if it doesn't
      const hasCodeField = await db.schema.hasColumn("shelves", "code");
      if (!hasCodeField) {
        await db.schema.table("shelves", (table) => {
          table.string("code").nullable();
        });
        console.log("Added code field to shelves table");

        // Update existing shelves with codes based on section
        const shelves = await db("shelves").select("*");
        for (const shelf of shelves) {
          const sectionCode = shelf.section
            ? shelf.section.substring(0, 3).toUpperCase()
            : "GEN";
          const shelfCode = `${sectionCode}-${shelf.id}`;

          await db("shelves")
            .where({ id: shelf.id })
            .update({ code: shelfCode });
        }
      }
    }

    // Book Copies table
    const hasBookCopies = await db.schema.hasTable("book_copies");
    if (!hasBookCopies) {
      await db.schema.createTable("book_copies", (table) => {
        table.increments("id").primary();
        table
          .integer("book_id")
          .unsigned()
          .references("id")
          .inTable("books")
          .notNullable();
        table
          .integer("shelf_id")
          .unsigned()
          .references("id")
          .inTable("shelves")
          .nullable();
        table.string("barcode").unique().notNullable();
        table.string("location_code").nullable();
        table.string("status").defaultTo("Available");
        table.text("condition").nullable();
        table.date("acquisition_date").defaultTo(db.fn.now());
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });

      // Generate book copies for sample books
      const books = await db("books").select("id", "title");
      const shelves = await db("shelves").select("id", "section");

      const bookCopies = [];

      for (const book of books) {
        // Determine appropriate shelf based on book category or random assignment
        let shelf = shelves[Math.floor(Math.random() * shelves.length)];

        // Create 1-5 copies of each book
        const numCopies = Math.floor(Math.random() * 5) + 1;

        for (let i = 1; i <= numCopies; i++) {
          const barcode = `B${book.id.toString().padStart(3, "0")}-C${i
            .toString()
            .padStart(2, "0")}`;
          const locationCode = `${shelf.section
            .substring(0, 3)
            .toUpperCase()}-${book.id.toString().padStart(3, "0")}-${i}`;

          bookCopies.push({
            book_id: book.id,
            shelf_id: shelf.id,
            barcode: barcode,
            location_code: locationCode,
            status: i === 1 && book.id % 3 === 0 ? "Checked Out" : "Available",
            condition: ["New", "Good", "Fair", "Poor"][
              Math.floor(Math.random() * 4)
            ],
            acquisition_date: new Date(
              Date.now() -
                Math.floor(Math.random() * 365 * 2) * 24 * 60 * 60 * 1000
            ),
          });
        }
      }

      if (bookCopies.length > 0) {
        await db("book_copies").insert(bookCopies);
        console.log(`Created ${bookCopies.length} book copies`);
      }

      // Update the loans table to reference book_copies instead of books directly
      const hasLoanBookCopyIdColumn = await db.schema.hasColumn(
        "loans",
        "book_copy_id"
      );

      if (!hasLoanBookCopyIdColumn) {
        await db.schema.table("loans", (table) => {
          table
            .integer("book_copy_id")
            .unsigned()
            .references("id")
            .inTable("book_copies")
            .nullable();
        });
        console.log("Added book_copy_id column to loans table");
      }
    } else {
      // Check for missing columns in book_copies table
      const hasConditionColumn = await db.schema.hasColumn(
        "book_copies",
        "condition"
      );
      if (!hasConditionColumn) {
        console.log("Adding condition column to book_copies table");
        await db.schema.table("book_copies", (table) => {
          table.text("condition").nullable();
        });
      }

      const hasAcquisitionDateColumn = await db.schema.hasColumn(
        "book_copies",
        "acquisition_date"
      );
      if (!hasAcquisitionDateColumn) {
        console.log("Adding acquisition_date column to book_copies table");
        await db.schema.table("book_copies", (table) => {
          table.date("acquisition_date").defaultTo(db.fn.now());
        });
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
        table
          .integer("book_copy_id")
          .unsigned()
          .references("id")
          .inTable("book_copies");
        table
          .integer("member_id")
          .unsigned()
          .references("id")
          .inTable("members");
        table.date("checkout_date").notNullable();
        table.date("due_date").notNullable();
        table.date("return_date");
        table.string("status").defaultTo("Borrowed");
        table.integer("rating").nullable();
        table.text("review").nullable();
        table.string("transaction_id").nullable(); // Add transaction_id for grouping loans
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
      });

      // Add some sample loans
      const currentDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(currentDate.getDate() + 14);

      await db("loans").insert([
        {
          book_copy_id: 2,
          member_id: 1,
          checkout_date: currentDate,
          due_date: dueDate,
          status: "Borrowed",
        },
        {
          book_copy_id: 5,
          member_id: 2,
          checkout_date: currentDate,
          due_date: dueDate,
          status: "Borrowed",
        },
      ]);
    } else {
      // Check if loans table has the necessary columns for ratings and reviews
      const hasRatingColumn = await db.schema.hasColumn("loans", "rating");
      const hasReviewColumn = await db.schema.hasColumn("loans", "review");

      if (!hasRatingColumn || !hasReviewColumn) {
        console.log("Updating loans table with rating and review columns...");

        // Add columns individually instead of using a transaction
        try {
          if (!hasRatingColumn) {
            await db.schema.table("loans", (table) => {
              table.integer("rating").nullable();
            });
            console.log("Added rating column to loans table");
          }

          if (!hasReviewColumn) {
            await db.schema.table("loans", (table) => {
              table.text("review").nullable();
            });
            console.log("Added review column to loans table");
          }
        } catch (err) {
          console.error("Error updating loans table:", err);
          throw err;
        }
      }
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

    // Update schema for existing tables
    // This ensures all required columns exist on existing tables
    await updateMembersTable();
    await updateBooksTable();
    await updateLoansTable();
    await updateBookCopiesTable();
    await updateShelvesTable();

    // Clear all loans on startup
    // await clearLoans();

    return db;
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
const getMemberById = (id) => {
  console.log(`DB: Getting member with ID: ${id}, type: ${typeof id}`);

  // Convert to number if it's a string and can be parsed
  let parsedId = id;
  if (typeof id === "string") {
    const numeric = parseInt(id, 10);
    if (!isNaN(numeric)) {
      parsedId = numeric;
      console.log(`DB: Converted string ID '${id}' to numeric ID: ${parsedId}`);
    }
  }

  return db("members")
    .where({ id: parsedId })
    .first()
    .then((member) => {
      console.log(
        member
          ? `DB: Found member: ${member.name}`
          : `DB: No member found with ID ${parsedId}`
      );
      return member;
    })
    .catch((err) => {
      console.error(`DB: Error fetching member with ID ${parsedId}:`, err);
      throw err;
    });
};
const addMember = (member) => db("members").insert(member).returning("*");
const updateMember = (id, member) =>
  db("members").where({ id }).update(member).returning("*");
const deleteMember = (id) => db("members").where({ id }).del();

const getAllLoans = () =>
  db("loans")
    .join("book_copies", "loans.book_copy_id", "book_copies.id")
    .join("books", "book_copies.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .select(
      "loans.*",
      "book_copies.barcode as book_barcode",
      "book_copies.location_code as book_location_code",
      "book_copies.status as book_status",
      "book_copies.condition as book_condition",
      "book_copies.acquisition_date as book_acquisition_date",
      "books.id as book_id",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.author as book_author",
      "books.cover_color as book_color",
      "books.front_cover as book_cover",
      "members.name as member_name",
      "members.email as member_email"
    )
    .orderBy("loans.checkout_date", "desc")
    .then(async (loans) => {
      console.log(`DB: Found ${loans.length} loans`);
      
      // Group loans by transaction_id if available
      const groupedLoans = [];
      const loanGroups = {};
      
      for (const loan of loans) {
        // If no transaction_id or is a single book transaction, handle normally
        if (!loan.transaction_id) {
          groupedLoans.push(loan);
          continue;
        }
        
        // Group loans with the same transaction_id
        if (!loanGroups[loan.transaction_id]) {
          loanGroups[loan.transaction_id] = {
            ...loan,
            is_batch: true,
            book_titles: [loan.book_title],
            book_ids: [loan.book_id],
            book_copy_ids: [loan.book_copy_id],
            book_barcodes: [loan.book_barcode],
            total_books: 1
          };
        } else {
          // Add this book's info to the existing group
          const group = loanGroups[loan.transaction_id];
          group.book_titles.push(loan.book_title);
          group.book_ids.push(loan.book_id);
          group.book_copy_ids.push(loan.book_copy_id);
          group.book_barcodes.push(loan.book_barcode);
          group.total_books += 1;
          
          // For multiple books, use a combined title
          group.book_title = `${group.total_books} books: ${group.book_titles.slice(0, 2).join(", ")}${group.total_books > 2 ? "..." : ""}`;
        }
      }
      
      // Add all transaction groups to the results
      for (const transactionId in loanGroups) {
        groupedLoans.push(loanGroups[transactionId]);
      }
      
      return groupedLoans;
    });

const getLoansByMember = (memberId) => {
  console.log(
    `DB: Getting loans for member ID: ${memberId}, type: ${typeof memberId}`
  );

  // Convert to number if it's a string and can be parsed
  let id = memberId;
  if (typeof memberId === "string") {
    const parsed = parseInt(memberId, 10);
    if (!isNaN(parsed)) {
      id = parsed;
      console.log(`DB: Converted string ID '${memberId}' to numeric ID: ${id}`);
    }
  }

  id = id.toString().replace("member-", "");
  id = parseInt(id, 10);

  return db("loans")
    .join("book_copies", "loans.book_copy_id", "book_copies.id")
    .join("books", "book_copies.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .where("loans.member_id", id)
    .select(
      "loans.*",
      "book_copies.barcode as book_barcode",
      "book_copies.location_code as book_location_code",
      "book_copies.status as book_status",
      "book_copies.condition as book_condition",
      "book_copies.acquisition_date as book_acquisition_date",
      "books.id as book_id",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.author as book_author",
      "books.cover_color as book_color",
      "books.front_cover as book_cover",
      "members.name as member_name",
      "members.email as member_email"
    )
    .then(async (loans) => {
      console.log(`DB: Found ${loans.length} loans for member ID ${id}`);
      
      // Group loans by transaction_id if available
      const groupedLoans = [];
      const loanGroups = {};
      
      for (const loan of loans) {
        // If no transaction_id or is a single book transaction, handle normally
        if (!loan.transaction_id) {
          groupedLoans.push(loan);
          continue;
        }
        
        // Group loans with the same transaction_id
        if (!loanGroups[loan.transaction_id]) {
          loanGroups[loan.transaction_id] = {
            ...loan,
            is_batch: true,
            book_titles: [loan.book_title],
            book_ids: [loan.book_id],
            book_copy_ids: [loan.book_copy_id],
            book_barcodes: [loan.book_barcode],
            total_books: 1
          };
        } else {
          // Add this book's info to the existing group
          const group = loanGroups[loan.transaction_id];
          group.book_titles.push(loan.book_title);
          group.book_ids.push(loan.book_id);
          group.book_copy_ids.push(loan.book_copy_id);
          group.book_barcodes.push(loan.book_barcode);
          group.total_books += 1;
          
          // For multiple books, use a combined title
          group.book_title = `${group.total_books} books: ${group.book_titles.slice(0, 2).join(", ")}${group.total_books > 2 ? "..." : ""}`;
        }
      }
      
      // Add all transaction groups to the results
      for (const transactionId in loanGroups) {
        groupedLoans.push(loanGroups[transactionId]);
      }
      
      return groupedLoans;
    })
    .catch((err) => {
      console.error(`DB: Error fetching loans for member ID ${id}:`, err);
      throw err;
    });
};

const getActiveLoans = () =>
  db("loans")
    .join("book_copies", "loans.book_copy_id", "book_copies.id")
    .join("books", "book_copies.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .whereNull("loans.return_date")
    .andWhere("loans.status", "!=", "Returned")
    .select(
      "loans.*",
      "book_copies.barcode as book_barcode",
      "book_copies.location_code as book_location_code",
      "book_copies.status as book_status",
      "book_copies.condition as book_condition",
      "book_copies.acquisition_date as book_acquisition_date",
      "books.id as book_id",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.author as book_author",
      "books.cover_color as book_color",
      "books.front_cover as book_cover",
      "members.name as member_name",
      "members.email as member_email"
    )
    .then(async (loans) => {
      console.log(`DB: Found ${loans.length} active loans`);
      
      // Group loans by transaction_id if available
      const groupedLoans = [];
      const loanGroups = {};
      
      for (const loan of loans) {
        // If no transaction_id or is a single book transaction, handle normally
        if (!loan.transaction_id) {
          groupedLoans.push(loan);
          continue;
        }
        
        // Group loans with the same transaction_id
        if (!loanGroups[loan.transaction_id]) {
          loanGroups[loan.transaction_id] = {
            ...loan,
            is_batch: true,
            book_titles: [loan.book_title],
            book_ids: [loan.book_id],
            book_copy_ids: [loan.book_copy_id],
            book_barcodes: [loan.book_barcode],
            total_books: 1
          };
        } else {
          // Add this book's info to the existing group
          const group = loanGroups[loan.transaction_id];
          group.book_titles.push(loan.book_title);
          group.book_ids.push(loan.book_id);
          group.book_copy_ids.push(loan.book_copy_id);
          group.book_barcodes.push(loan.book_barcode);
          group.total_books += 1;
          
          // For multiple books, use a combined title
          group.book_title = `${group.total_books} books: ${group.book_titles.slice(0, 2).join(", ")}${group.total_books > 2 ? "..." : ""}`;
        }
      }
      
      // Add all transaction groups to the results
      for (const transactionId in loanGroups) {
        groupedLoans.push(loanGroups[transactionId]);
      }
      
      return groupedLoans;
    });

const getOverdueLoans = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today

  return db("loans")
    .join("book_copies", "loans.book_copy_id", "book_copies.id")
    .join("books", "book_copies.book_id", "books.id")
    .join("members", "loans.member_id", "members.id")
    .whereNull("loans.return_date")
    .andWhere("loans.status", "!=", "Returned")
    .andWhere("loans.due_date", "<", today)
    .select(
      "loans.*",
      "book_copies.barcode as book_barcode",
      "book_copies.location_code as book_location_code",
      "book_copies.status as book_status",
      "book_copies.condition as book_condition",
      "book_copies.acquisition_date as book_acquisition_date",
      "books.id as book_id",
      "books.title as book_title",
      "books.isbn as book_isbn",
      "books.author as book_author",
      "books.cover_color as book_color",
      "books.front_cover as book_cover",
      "members.name as member_name",
      "members.email as member_email"
    )
    .then(async (loans) => {
      console.log(`DB: Found ${loans.length} overdue loans`);
      
      // Group loans by transaction_id if available
      const groupedLoans = [];
      const loanGroups = {};
      
      for (const loan of loans) {
        // If no transaction_id or is a single book transaction, handle normally
        if (!loan.transaction_id) {
          groupedLoans.push(loan);
          continue;
        }
        
        // Group loans with the same transaction_id
        if (!loanGroups[loan.transaction_id]) {
          loanGroups[loan.transaction_id] = {
            ...loan,
            is_batch: true,
            book_titles: [loan.book_title],
            book_ids: [loan.book_id],
            book_copy_ids: [loan.book_copy_id],
            book_barcodes: [loan.book_barcode],
            total_books: 1
          };
        } else {
          // Add this book's info to the existing group
          const group = loanGroups[loan.transaction_id];
          group.book_titles.push(loan.book_title);
          group.book_ids.push(loan.book_id);
          group.book_copy_ids.push(loan.book_copy_id);
          group.book_barcodes.push(loan.book_barcode);
          group.total_books += 1;
          
          // For multiple books, use a combined title
          group.book_title = `${group.total_books} books: ${group.book_titles.slice(0, 2).join(", ")}${group.total_books > 2 ? "..." : ""}`;
        }
      }
      
      // Add all transaction groups to the results
      for (const transactionId in loanGroups) {
        groupedLoans.push(loanGroups[transactionId]);
      }
      
      return groupedLoans;
    });
};

const addLoan = (loan) => db("loans").insert(loan).returning("*");
const updateLoan = (id, loan) =>
  db("loans").where({ id }).update(loan).returning("*");
const returnBook = (id, reviewData = {}) => {
  console.log(
    `Returning book with loan ID: ${id}`,
    reviewData ? "With review data" : "No review data"
  );

  return db.transaction(async (trx) => {
    // Get the loan
    const loan = await trx("loans").where({ id }).first();

    if (!loan) {
      throw new Error("Loan not found");
    }

    // Update loan status and return date
    const updateData = {
      status: "Returned",
      return_date: new Date(),
      updated_at: new Date(),
    };

    // Add rating and review if provided
    if (reviewData && reviewData.rating) {
      updateData.rating = reviewData.rating;
    }

    if (reviewData && reviewData.review) {
      updateData.review = reviewData.review;
    }

    console.log(`Updating loan ${id} with data:`, updateData);

    await trx("loans").where({ id }).update(updateData);

    // Update book status
    await trx("book_copies").where({ id: loan.book_copy_id }).update({
      status: "Available",
      updated_at: new Date(),
    });

    return { success: true };
  });
};

const borrowBooks = (memberData) => {
  return db.transaction(async (trx) => {
    const { member_id, book_copy_id, book_copies, checkout_date, due_date } =
      memberData;

    // Validate member
    const member = await trx("members").where({ id: member_id }).first();
    if (!member) {
      throw new Error("Member not found");
    }

    if (member.status !== "Active") {
      throw new Error("Member is not active");
    }

    // Handle single book_copy_id or multiple book_copies
    const bookCopiesArray = book_copies
      ? Array.isArray(book_copies)
        ? book_copies
        : [book_copies]
      : book_copy_id
      ? [book_copy_id]
      : [];

    if (bookCopiesArray.length === 0) {
      throw new Error("No book copy IDs provided");
    }

    console.log(`Borrowing book copies: ${bookCopiesArray.join(", ")}`);

    // Check if any of the copies are already checked out
    const unavailableBooks = await trx("book_copies")
      .whereIn("id", bookCopiesArray)
      .andWhere("status", "!=", "Available")
      .select("id", "barcode");

    if (unavailableBooks.length > 0) {
      throw new Error(
        `Some book copies are not available: ${unavailableBooks
          .map((b) => b.barcode)
          .join(", ")}`
      );
    }

    // Get book details for each copy for logging purposes
    const bookCopiesDetails = await trx("book_copies")
      .join("books", "book_copies.book_id", "books.id")
      .whereIn("book_copies.id", bookCopiesArray)
      .select(
        "book_copies.id",
        "book_copies.barcode",
        "books.id as book_id",
        "books.title"
      );

    console.log(
      "Book copies to borrow:",
      bookCopiesDetails.map((b) => `${b.title} (${b.barcode})`).join(", ")
    );

    // Generate a transaction ID for this group of books
    const transactionId = `LOAN-${Date.now()}-${member_id}`;

    // Create loans for each book copy
    const loans = bookCopiesArray.map((bookCopyId) => ({
      book_copy_id: bookCopyId,
      member_id,
      checkout_date: checkout_date || new Date(),
      due_date: due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default to 14 days
      status: "Borrowed",
      transaction_id: transactionId  // Add the transaction ID to group these loans
    }));

    // Insert all loans
    const insertedLoans = await trx("loans").insert(loans).returning("*");

    // Update book copy status to "Checked Out"
    await trx("book_copies").whereIn("id", bookCopiesArray).update({
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

    // Check if the first loan has a transaction_id and is part of a batch
    const firstLoan = loans[0];
    if (firstLoan.transaction_id) {
      console.log(`Loan ${firstLoan.id} is part of transaction ${firstLoan.transaction_id}`);
      
      // Get all loans in this transaction to return them all at once
      const batchLoans = await trx("loans")
        .where("transaction_id", firstLoan.transaction_id)
        .whereNull("return_date")
        .select("*");
        
      if (batchLoans.length > 0) {
        console.log(`Found ${batchLoans.length} loans in transaction ${firstLoan.transaction_id}`);
        
        // Update all loans in the batch to returned
        const batchLoanIds = batchLoans.map(loan => loan.id);
        await trx("loans").whereIn("id", batchLoanIds).update({
          status: "Returned",
          return_date: today,
          updated_at: today,
        });
        
        // Update all books to available
        const bookCopiesIds = batchLoans.map((loan) => loan.book_copy_id);
        await trx("book_copies").whereIn("id", bookCopiesIds).update({
          status: "Available",
          updated_at: today,
        });
        
        return { 
          success: true, 
          count: batchLoans.length,
          message: `Returned ${batchLoans.length} books in batch` 
        };
      }
    }

    // Regular case - update the specified loans
    await trx("loans").whereIn("id", loanIds).update({
      status: "Returned",
      return_date: today,
      updated_at: today,
    });

    // Update all books to available
    const bookCopiesIds = loans.map((loan) => loan.book_copy_id);
    await trx("book_copies").whereIn("id", bookCopiesIds).update({
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
      const bookCopiesIds = activeLoans.map((loan) => loan.book_copy_id);
      await trx("book_copies").whereIn("id", bookCopiesIds).update({
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

    if (await db.schema.hasTable("book_copies")) {
      await db.schema.dropTable("book_copies");
      console.log("Dropped book_copies table");
    }

    if (await db.schema.hasTable("shelves")) {
      await db.schema.dropTable("shelves");
      console.log("Dropped shelves table");
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

// Shelves Management Functions
const getAllShelves = () => db("shelves").select("*");

const getShelfById = (id) => {
  console.log(`Looking up shelf with ID: ${id}`);
  return db("shelves")
    .where({ id })
    .first()
    .then((shelf) => {
      if (!shelf) {
        console.log(`No shelf found with ID ${id}`);
      } else {
        console.log(`Found shelf: ${shelf.name}`);
      }
      return shelf;
    });
};

const addShelf = (shelf) => db("shelves").insert(shelf).returning("*");

const updateShelf = (id, shelf) =>
  db("shelves").where({ id }).update(shelf).returning("*");

const deleteShelf = (id) => db("shelves").where({ id }).del();

const getShelfContents = (shelfId) => {
  return db("book_copies")
    .join("books", "book_copies.book_id", "books.id")
    .where("book_copies.shelf_id", shelfId)
    .select(
      "book_copies.*",
      "books.title",
      "books.author",
      "books.isbn",
      "books.category",
      "books.front_cover",
      "books.cover_color"
    );
};

// Book Copies Management Functions
const getAllBookCopies = () => {
  return db("book_copies")
    .join("books", "book_copies.book_id", "books.id")
    .leftJoin("shelves", "book_copies.shelf_id", "shelves.id")
    .select(
      "book_copies.*",
      "books.title",
      "books.author",
      "books.isbn",
      "books.category",
      "shelves.name as shelf_name",
      "shelves.location as shelf_location"
    );
};

const getBookCopyById = (id) => {
  console.log(`Looking up book copy with ID: ${id}`);
  return db("book_copies")
    .join("books", "book_copies.book_id", "books.id")
    .leftJoin("shelves", "book_copies.shelf_id", "shelves.id")
    .where("book_copies.id", id)
    .select(
      "book_copies.*",
      "books.title",
      "books.author",
      "books.isbn",
      "books.category",
      "shelves.name as shelf_name",
      "shelves.location as shelf_location"
    )
    .first()
    .then((bookCopy) => {
      if (!bookCopy) {
        console.log(`No book copy found with ID ${id}`);
      } else {
        console.log(`Found book copy: ${bookCopy.title} (${bookCopy.barcode})`);
      }
      return bookCopy;
    });
};

const getBookCopiesByBookId = (bookId) => {
  console.log(`Looking up copies for book with ID: ${bookId}`);
  return db("book_copies")
    .join("books", "book_copies.book_id", "books.id")
    .leftJoin("shelves", "book_copies.shelf_id", "shelves.id")
    .where("book_copies.book_id", bookId)
    .select(
      "book_copies.*",
      "books.title",
      "books.author",
      "books.isbn",
      "books.category",
      "shelves.name as shelf_name",
      "shelves.location as shelf_location"
    )
    .then((bookCopies) => {
      console.log(`Found ${bookCopies.length} copies for book ID ${bookId}`);
      return bookCopies;
    });
};

const addBookCopy = (bookCopy) =>
  db("book_copies").insert(bookCopy).returning("*");

const updateBookCopy = (id, bookCopy) =>
  db("book_copies").where({ id }).update(bookCopy).returning("*");

const deleteBookCopy = (id) => db("book_copies").where({ id }).del();

const moveBookCopy = (id, shelfId) => {
  return db.transaction(async (trx) => {
    const bookCopy = await trx("book_copies").where({ id }).first();

    if (!bookCopy) {
      throw new Error(`Book copy with ID ${id} not found`);
    }

    const shelf = await trx("shelves").where({ id: shelfId }).first();

    if (!shelf) {
      throw new Error(`Shelf with ID ${shelfId} not found`);
    }

    // Get the book information to update the location code
    const book = await trx("books").where({ id: bookCopy.book_id }).first();

    // Create a new location code based on the shelf section
    const copyNumber = bookCopy.barcode.split("-C")[1];
    const locationCode = `${shelf.section
      .substring(0, 3)
      .toUpperCase()}-${book.id.toString().padStart(3, "0")}-${copyNumber}`;

    // Update the book copy with the new shelf ID and location code
    await trx("book_copies").where({ id }).update({
      shelf_id: shelfId,
      location_code: locationCode,
      updated_at: new Date(),
    });

    return { success: true, message: `Book copy moved to ${shelf.name}` };
  });
};

// Function to get book availability summary
const getBookAvailability = (bookId) => {
  return db.transaction(async (trx) => {
    // Get the book
    const book = await trx("books").where({ id: bookId }).first();

    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }

    // Get all copies of the book
    const copies = await trx("book_copies")
      .where({ book_id: bookId })
      .select(
        "id",
        "barcode",
        "status",
        "location_code",
        "shelf_id",
        "condition"
      );

    // Count copies by status
    const totalCopies = copies.length;
    const availableCopies = copies.filter(
      (copy) => copy.status === "Available"
    ).length;
    const checkedOutCopies = copies.filter(
      (copy) => copy.status === "Checked Out"
    ).length;
    const damagedCopies = copies.filter(
      (copy) => copy.condition === "Poor"
    ).length;

    // Get shelf information for available copies
    const availableCopiesDetails = await Promise.all(
      copies
        .filter((copy) => copy.status === "Available")
        .map(async (copy) => {
          if (copy.shelf_id) {
            const shelf = await trx("shelves")
              .where({ id: copy.shelf_id })
              .first();
            return {
              id: copy.id,
              barcode: copy.barcode,
              location_code: copy.location_code,
              condition: copy.condition,
              shelf: shelf
                ? {
                    id: shelf.id,
                    name: shelf.name,
                    location: shelf.location,
                  }
                : null,
            };
          } else {
            return {
              id: copy.id,
              barcode: copy.barcode,
              location_code: copy.location_code,
              condition: copy.condition,
              shelf: null,
            };
          }
        })
    );

    return {
      book_id: bookId,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      total_copies: totalCopies,
      available_copies: availableCopies,
      checked_out_copies: checkedOutCopies,
      damaged_copies: damagedCopies,
      available_copies_details: availableCopiesDetails,
    };
  });
};

const updateLoansTable = async () => {
  try {
    console.log("Checking loans table for required fields...");

    // Check if loans table exists
    const hasLoans = await db.schema.hasTable("loans");
    if (!hasLoans) {
      console.log(
        "Loans table doesn't exist yet - it will be created during initialization"
      );
      return {
        success: true,
        message: "Loans table will be created during initialization",
      };
    }

    // Check if book_copy_id column exists
    const hasBookCopyIdColumn = await db.schema.hasColumn(
      "loans",
      "book_copy_id"
    );
    if (!hasBookCopyIdColumn) {
      console.log("Adding book_copy_id column to loans table");

      await db.schema.table("loans", (table) => {
        table
          .integer("book_copy_id")
          .unsigned()
          .references("id")
          .inTable("book_copies")
          .nullable();
      });

      console.log("Added book_copy_id column to loans table");

      // Now we need to migrate any existing loans that might be using the old book_id column
      // First check if there's a book_id column
      const hasBookIdColumn = await db.schema.hasColumn("loans", "book_id");

      if (hasBookIdColumn) {
        console.log("Migrating data from book_id to book_copy_id...");

        // Get all loans with book_id but no book_copy_id
        const loansToMigrate = await db("loans")
          .whereNotNull("book_id")
          .whereNull("book_copy_id")
          .select("*");

        console.log(`Found ${loansToMigrate.length} loans to migrate`);

        // For each loan, find a suitable book copy
        for (const loan of loansToMigrate) {
          // Find the first available book copy for this book
          const bookCopy = await db("book_copies")
            .where({ book_id: loan.book_id })
            .first();

          if (bookCopy) {
            // Update the loan with the book copy
            await db("loans").where({ id: loan.id }).update({
              book_copy_id: bookCopy.id,
              updated_at: new Date(),
            });

            console.log(
              `Migrated loan ${loan.id} to use book copy ${bookCopy.id}`
            );
          } else {
            console.log(
              `Could not find book copy for book ${loan.book_id} for loan ${loan.id}`
            );
          }
        }
      }
    } else {
      console.log("Loans table already has book_copy_id column");
    }

    // Check for rating and review columns as well
    const hasRatingColumn = await db.schema.hasColumn("loans", "rating");
    const hasReviewColumn = await db.schema.hasColumn("loans", "review");

    if (!hasRatingColumn) {
      console.log("Adding rating column to loans table");
      await db.schema.table("loans", (table) => {
        table.integer("rating").nullable();
      });
    }

    if (!hasReviewColumn) {
      console.log("Adding review column to loans table");
      await db.schema.table("loans", (table) => {
        table.text("review").nullable();
      });
    }

    // Check for transaction_id column
    const hasTransactionIdColumn = await db.schema.hasColumn("loans", "transaction_id");
    
    if (!hasTransactionIdColumn) {
      console.log("Adding transaction_id column to loans table");
      await db.schema.table("loans", (table) => {
        table.string("transaction_id").nullable();
      });
      console.log("Added transaction_id column to loans table");
      
      // Generate transaction IDs for existing loans that were borrowed at the same time
      const loans = await db("loans").select("*").orderBy("checkout_date");
      
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
            await db("loans").where({ id: loan.id }).update({
              transaction_id: transactionId,
              updated_at: new Date()
            });
          }
          
          console.log(`Assigned transaction ID ${transactionId} to ${group.length} loans`);
        }
      }
    }

    return { success: true, message: "Loans table is up-to-date" };
  } catch (error) {
    console.error("Error updating loans table:", error);
    return { success: false, message: error.message };
  }
};

// Function to update book_copies table
const updateBookCopiesTable = async () => {
  try {
    console.log("Checking book_copies table for required fields...");

    // Check if book_copies table exists
    const hasBookCopies = await db.schema.hasTable("book_copies");
    if (!hasBookCopies) {
      console.log(
        "book_copies table doesn't exist yet - it will be created during initialization"
      );
      return {
        success: true,
        message: "book_copies table will be created during initialization",
      };
    }

    // Check if copy_number column exists
    const hasCopyNumberColumn = await db.schema.hasColumn(
      "book_copies",
      "copy_number"
    );
    if (!hasCopyNumberColumn) {
      console.log("Adding copy_number column to book_copies table");

      await db.schema.table("book_copies", (table) => {
        table.integer("copy_number").defaultTo(1);
      });

      console.log("Added copy_number column to book_copies table");

      // Update existing book copies with copy_number based on their sequence for each book
      const books = await db("books").select("id");
      for (const book of books) {
        const bookId = book.id;
        const copies = await db("book_copies")
          .where({ book_id: bookId })
          .orderBy("id", "asc");

        for (let i = 0; i < copies.length; i++) {
          await db("book_copies")
            .where({ id: copies[i].id })
            .update({ copy_number: i + 1 });
        }
      }

      console.log("Updated copy_number for all existing book copies");
    } else {
      console.log("book_copies table already has copy_number column");
    }

    return { success: true, message: "book_copies table is up to date" };
  } catch (error) {
    console.error("Error updating book_copies table:", error);
    return { success: false, message: error.message };
  }
};

const updateShelvesTable = async () => {
  try {
    console.log("Checking shelves table for required fields...");

    // Check if shelves table exists
    const hasShelves = await db.schema.hasTable("shelves");
    if (!hasShelves) {
      console.log(
        "shelves table doesn't exist yet - it will be created during initialization"
      );
      return {
        success: true,
        message: "shelves table will be created during initialization",
      };
    }

    // Check if section field exists
    const hasSectionField = await db.schema.hasColumn("shelves", "section");
    if (!hasSectionField) {
      console.log("Adding section field to shelves table");
      await db.schema.table("shelves", (table) => {
        table.string("section").nullable();
      });
      console.log("Added section field to shelves table");
    } else {
      console.log("shelves table already has section field");
    }

    // Check if code field exists
    const hasCodeField = await db.schema.hasColumn("shelves", "code");
    if (!hasCodeField) {
      console.log("Adding code field to shelves table");
      await db.schema.table("shelves", (table) => {
        table.string("code").nullable();
      });
      console.log("Added code field to shelves table");

      // Update existing shelves with codes based on name or section
      const shelves = await db("shelves").select("*");
      for (const shelf of shelves) {
        const sectionCode = shelf.section
          ? shelf.section.substring(0, 3).toUpperCase()
          : shelf.name.substring(0, 3).toUpperCase();
        const shelfCode = `${sectionCode}-${shelf.id}`;

        await db("shelves").where({ id: shelf.id }).update({ code: shelfCode });
      }
      console.log("Updated shelves with generated codes");
    } else {
      console.log("shelves table already has code field");
    }

    return { success: true, message: "shelves table is up to date" };
  } catch (error) {
    console.error("Error updating shelves table:", error);
    return { success: false, message: error.message };
  }
};

// Function to clear all loans from the database
const clearLoans = async () => {
  try {
    console.log("Clearing all loans from the database...");
    const deletedCount = await db("loans").del();
    console.log(`Cleared ${deletedCount} loans from database`);

    // Reset all book copies that were checked out to Available
    const updatedCopies = await db("book_copies")
      .where({ status: "Checked Out" })
      .update({
        status: "Available",
        updated_at: new Date(),
      });

    console.log(`Reset ${updatedCopies} book copies to Available status`);

    return {
      success: true,
      message: `Cleared ${deletedCount} loans and reset ${updatedCopies} book copies`,
    };
  } catch (error) {
    console.error("Error clearing loans:", error);
    return { success: false, error: error.message };
  }
};

const repairDatabase = async () => {
  return db.transaction(async (trx) => {
    try {
      // Get all loans that need book IDs
      const loansToRepair = await trx("loans")
        .join("book_copies", "loans.book_copy_id", "book_copies.id")
        .select("loans.id as loan_id", "book_copies.book_id as book_id");

      // Update each loan to include book details
      const updatedLoans = [];
      for (const loan of loansToRepair) {
        try {
          // Get book details
          const book = await trx("books").where({ id: loan.book_id }).first();

          if (book) {
            // Add book_id and book_title to loan record for faster access
            await trx("loans").where({ id: loan.loan_id }).update({
              book_id: book.id,
              book_title: book.title,
              book_isbn: book.isbn,
            });

            updatedLoans.push(loan.loan_id);
          }
        } catch (error) {
          console.error(`Error updating loan ${loan.loan_id}:`, error);
        }
      }

      return {
        success: true,
        message: `Updated ${updatedLoans.length} loans with book details`,
        updatedLoans,
      };
    } catch (error) {
      console.error("Error in repairDatabase:", error);
      throw error;
    }
  });
};

/**
 * Get dashboard statistics including total books, members, checked out books, and overdue returns
 * @returns {Promise<Object>} Object containing dashboard statistics
 */
const getDashboardStats = async () => {
  try {
    // Get total books count
    const [{ count: totalBooks }] = await db("books").count("* as count");

    // Get active members count
    const [{ count: activeMembers }] = await db("members")
      .where({ status: "Active" })
      .count("* as count");

    // Get checked out books count
    const [{ count: booksCheckedOut }] = await db("book_copies")
      .where({ status: "Checked Out" })
      .count("* as count");

    // Get overdue books count
    const today = new Date();
    const overdueLoans = await db("loans")
      .where({ status: "Active" })
      .where("due_date", "<", today)
      .count("* as count");

    const pendingReturns = overdueLoans[0].count;

    return {
      success: true,
      data: {
        totalBooks,
        activeMembers,
        booksCheckedOut,
        pendingReturns,
      },
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get most popular books based on checkout frequency
 * @param {number} limit Number of books to return
 * @returns {Promise<Object>} Object containing popular books data
 */
const getMostPopularBooks = async (limit = 5) => {
  try {
    const popularBooks = await db("loans")
      .join("books", "loans.book_id", "books.id")
      .select("books.id", "books.title", "books.author")
      .count("loans.id as borrow_count")
      .groupBy("books.id", "books.title", "books.author")
      .orderBy("borrow_count", "desc")
      .limit(limit);

    return {
      success: true,
      data: popularBooks,
    };
  } catch (error) {
    console.error("Error getting popular books:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get popular book categories based on total checkouts
 * @param {number} limit Number of categories to return
 * @returns {Promise<Object>} Object containing popular categories data
 */
const getPopularCategories = async (limit = 5) => {
  try {
    const popularCategories = await db("loans")
      .join("books", "loans.book_id", "books.id")
      .select("books.category")
      .count("loans.id as count")
      .whereNotNull("books.category")
      .groupBy("books.category")
      .orderBy("count", "desc")
      .limit(limit);

    return {
      success: true,
      data: popularCategories.map((category) => ({
        category: category.category || "Uncategorized",
        count: parseInt(category.count),
      })),
    };
  } catch (error) {
    console.error("Error getting popular categories:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get monthly checkout statistics for the current year
 * @returns {Promise<Object>} Object containing monthly checkout data
 */
const getMonthlyCheckouts = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Get checkout counts by month for current year
    const results = await db("loans")
      .select(db.raw("MONTH(checkout_date) as month"))
      .count("* as count")
      .whereRaw(`YEAR(checkout_date) = ?`, [currentYear])
      .groupByRaw("MONTH(checkout_date)")
      .orderByRaw("MONTH(checkout_date)");

    // Convert to the format needed for charts
    const monthlyData = months.map((monthName, index) => {
      const monthNumber = index + 1;
      const monthData = results.find((r) => parseInt(r.month) === monthNumber);
      return {
        month: monthName,
        count: monthData ? parseInt(monthData.count) : 0,
      };
    });

    return {
      success: true,
      data: monthlyData,
    };
  } catch (error) {
    console.error("Error getting monthly checkouts:", error);
    return { success: false, error: error.message };
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
  getAllShelves,
  getShelfById,
  addShelf,
  updateShelf,
  deleteShelf,
  getShelfContents,
  getAllBookCopies,
  getBookCopyById,
  getBookCopiesByBookId,
  addBookCopy,
  updateBookCopy,
  deleteBookCopy,
  moveBookCopy,
  getBookAvailability,
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
  updateLoansTable,
  updateBookCopiesTable,
  updateShelvesTable,
  clearLoans,
  repairDatabase,
  getDashboardStats,
  getMostPopularBooks,
  getPopularCategories,
  getMonthlyCheckouts,
};
