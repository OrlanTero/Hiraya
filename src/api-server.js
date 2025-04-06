const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const {
  authenticate,
  authenticateWithPin,
  authenticateWithQR,
  getAllBooks,
  getBookById,
  getAllMembers,
  getMemberById,
  getLoansByMember,
  borrowBooks,
  returnBook,
  updateLoan,
} = require("./database/db");

// Mock database for development
const mockDb = {
  users: [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      pin: "1234",
      role: "member",
      qrCode: "MEMBER-001-JOHN",
      borrowedBooks: [],
      reservedBooks: [],
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      pin: "5678",
      role: "member",
      qrCode: "MEMBER-002-JANE",
      borrowedBooks: [],
      reservedBooks: [],
    },
    {
      id: "3",
      name: "Admin User",
      email: "admin@example.com",
      pin: "admin",
      role: "admin",
      qrCode: "ADMIN-001",
      borrowedBooks: [],
      reservedBooks: [],
    },
  ],
  sessions: [],
  books: [
    {
      id: "1",
      title: "Introduction to Electron",
      author: "John Electron",
      isbn: "9781234567897",
      status: "available",
      dueDate: null,
      borrowerId: null,
    },
    {
      id: "2",
      title: "React for Beginners",
      author: "Jane Developer",
      isbn: "9789876543210",
      status: "available",
      dueDate: null,
      borrowerId: null,
    },
    {
      id: "3",
      title: "Socket.io and Real-time Apps",
      author: "Sam Socket",
      isbn: "9785678901234",
      status: "borrowed",
      dueDate: "2023-07-15",
      borrowerId: "1",
    },
  ],
};

// Create API server
function createApiServer(ipcMain, socketServer) {
  const app = express();

  // Enhanced CORS configuration
  const corsOptions = {
    origin: "*", // Simplify to allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  };

  // Apply CORS middleware
  app.use(cors(corsOptions));

  // Handle preflight requests
  app.options("*", cors(corsOptions));

  // Parse JSON bodies
  app.use(bodyParser.json());

  // Add a health check endpoint
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "API server is running",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Log all requests
  app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    res.header("Access-Control-Allow-Origin", "*");
    next();
  });

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    const { email, pin, username, password } = req.body;

    // Support both parameter formats
    const userIdentifier = email || username;
    const userPin = pin || password;

    console.log("Login attempt:", {
      identifier: userIdentifier || "PIN only",
      pin_provided: userPin ? "Yes" : "No",
      pin_length: userPin ? userPin.length : 0,
    });

    try {
      // Use real authentication function instead of mock data
      let authResult;

      if (userIdentifier) {
        // Email + PIN login
        authResult = await authenticate(userIdentifier, userPin);
      } else {
        // PIN-only login
        authResult = await authenticateWithPin(userPin);
      }

      if (authResult.success) {
        // Create session
        const sessionId = uuidv4();
        const session = {
          id: sessionId,
          userId: authResult.user.id,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // 7 days
        };

        console.log(
          `User ${
            authResult.user.username || authResult.user.name
          } logged in successfully`
        );

        // Emit socket event
        if (socketServer) {
          socketServer.emit("user_login", {
            userId: authResult.user.id,
            userName: authResult.user.username || authResult.user.name,
            timestamp: new Date().toISOString(),
          });
        }

        res.json({
          success: true,
          user: authResult.user,
          session: {
            id: session.id,
            expiresAt: session.expiresAt,
          },
        });
      } else {
        console.log("Login failed:", authResult.message);
        res.json({
          success: false,
          message: authResult.message || "Invalid credentials",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Authentication error",
        error: error.message,
      });
    }
  });

  app.post("/api/auth/login-qr", async (req, res) => {
    const { qrData, pin } = req.body;
    console.log("QR login attempt:", {
      qrData,
      pin: pin ? "****" : "not provided",
    });

    try {
      // Use real QR authentication with PIN verification
      const authResult = await authenticateWithQR(qrData, pin);

      if (authResult.success) {
        // Create session
        const sessionId = uuidv4();
        const session = {
          id: sessionId,
          userId: authResult.user.id,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // 7 days
        };

        console.log(
          `User ${
            authResult.user.username || authResult.user.name
          } logged in via QR code`
        );

        // Emit socket event
        if (socketServer) {
          socketServer.emit("user_login", {
            userId: authResult.user.id,
            userName: authResult.user.username || authResult.user.name,
            method: "qr",
            timestamp: new Date().toISOString(),
          });
        }

        res.json({
          success: true,
          user: authResult.user,
          session: {
            id: session.id,
            expiresAt: session.expiresAt,
          },
        });
      } else {
        console.log("QR login failed:", authResult.message);
        res.json({
          success: false,
          message: authResult.message || "Invalid QR code or PIN",
        });
      }
    } catch (error) {
      console.error("QR login error:", error);
      res.status(500).json({
        success: false,
        message: "Authentication error",
        error: error.message,
      });
    }
  });

  app.post("/api/auth/validate-session", (req, res) => {
    const { sessionId, userId } = req.body;
    console.log("Session validation:", { sessionId, userId });

    // Find session
    const session = mockDb.sessions.find(
      (s) => s.id === sessionId && s.userId === userId
    );

    if (session) {
      // Check if session is expired
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      if (now < expiresAt) {
        console.log("Session is valid");
        res.json({
          success: true,
          message: "Session is valid",
        });
      } else {
        // Remove expired session
        mockDb.sessions = mockDb.sessions.filter((s) => s.id !== sessionId);
        console.log("Session has expired");
        res.json({
          success: false,
          message: "Session has expired",
        });
      }
    } else {
      console.log("Invalid session");
      res.json({
        success: false,
        message: "Invalid session",
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const { sessionId } = req.body;
    console.log("Logout:", { sessionId });

    // Remove session
    mockDb.sessions = mockDb.sessions.filter((s) => s.id !== sessionId);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  });

  // Book endpoints
  app.get("/api/books", async (req, res) => {
    console.log("Getting all books");
    try {
      const books = await getAllBooks();
      console.log(`Returning ${books.length} books`);
      res.json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch books",
        error: error.message,
      });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    const bookId = req.params.id;
    console.log(`Getting book with ID ${bookId}`);

    try {
      const book = await getBookById(bookId);

      if (book) {
        res.json(book);
      } else {
        res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }
    } catch (error) {
      console.error(`Error fetching book ${bookId}:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch book",
        error: error.message,
      });
    }
  });

  // Member endpoints
  app.get("/api/members/:id", async (req, res) => {
    const memberId = req.params.id;
    console.log(
      `Getting member with ID: ${memberId} (type: ${typeof memberId})`
    );

    try {
      // Check if the ID is a numeric string and convert it
      let parsedId = memberId;

      if (typeof memberId === "string") {
        // Try to parse as integer first
        const numericId = parseInt(memberId, 10);
        if (!isNaN(numericId)) {
          console.log(
            `Converted string ID '${memberId}' to numeric ID ${numericId}`
          );
          parsedId = numericId;
        }
      }

      console.log(
        `Querying database with member ID ${parsedId} (type: ${typeof parsedId})`
      );
      const member = await getMemberById(parsedId);

      if (!member) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error(`Error getting member with ID ${memberId}:`, error);
      res.status(500).json({
        success: false,
        message: `Error retrieving member: ${error.message}`,
      });
    }
  });

  // Loan endpoints
  app.get("/api/loans/member/:id", async (req, res) => {
    const memberId = req.params.id;
    console.log(
      `Getting loans for member ${memberId} (type: ${typeof memberId})`
    );

    try {
      // Attempt to parse the ID to an integer if it's a string
      let parsedId = memberId;

      // If the ID is a string (it usually is from URL params), try to parse it
      if (typeof memberId === "string") {
        const numericId = parseInt(memberId, 10);
        if (!isNaN(numericId)) {
          console.log(
            `Converted string ID '${memberId}' to numeric ID ${numericId}`
          );
          parsedId = numericId;
        }
      }

      console.log(
        `Querying database with member ID ${parsedId} (type: ${typeof parsedId})`
      );
      const loans = await getLoansByMember(parsedId);

      // Log more details about the loans found
      console.log(`Found ${loans.length} loans for member ${memberId}`);
      if (loans.length > 0) {
        console.log(
          `Sample loan: ID=${loans[0].id}, Book=${loans[0].book_title}`
        );
      }

      res.json(loans);
    } catch (error) {
      console.error(`Error fetching loans for member ${memberId}:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch loans",
        error: error.message,
      });
    }
  });

  app.post("/api/loans/borrow", async (req, res) => {
    console.log("Borrowing book with data:", req.body);

    try {
      // Parse member_id and book_id to ensure they're in the correct format
      const borrowData = {
        ...req.body,
        member_id: parseInt(req.body.member_id.toString(), 10),
        book_id: parseInt(req.body.book_id.toString(), 10),
      };

      if (isNaN(borrowData.member_id) || isNaN(borrowData.book_id)) {
        throw new Error(
          `Invalid ID format. Member ID: ${req.body.member_id}, Book ID: ${req.body.book_id}`
        );
      }

      console.log("Processed borrow data:", borrowData);

      // Check if member exists
      const member = await getMemberById(borrowData.member_id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: `Member with ID ${borrowData.member_id} not found`,
        });
      }

      // Check if book exists
      const book = await getBookById(borrowData.book_id);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: `Book with ID ${borrowData.book_id} not found`,
        });
      }

      // Check if book is available
      if (book.status !== "Available") {
        return res.status(400).json({
          success: false,
          message: `Book "${book.title}" is not available for borrowing (current status: ${book.status})`,
        });
      }

      try {
        const result = await borrowBooks(borrowData);

        // Notify via socket if available
        if (socketServer) {
          socketServer.emit("book_borrowed", {
            bookId: borrowData.book_id,
            bookTitle: book.title,
            memberId: borrowData.member_id,
            memberName: member.name,
            timestamp: new Date().toISOString(),
          });
        }

        res.json({
          success: true,
          data: result,
          message: `"${book.title}" has been successfully borrowed`,
        });
      } catch (dbError) {
        console.error("Database error while borrowing book:", dbError);
        res.status(500).json({
          success: false,
          message: `Database error: ${dbError.message}`,
          details: dbError.toString(),
        });
      }
    } catch (error) {
      console.error("Error borrowing book:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to borrow book",
      });
    }
  });

  app.post("/api/loans/return", async (req, res) => {
    console.log("Returning book with data:", req.body);

    try {
      // Parse loan_id to ensure it's in the correct format
      const loanId = parseInt(req.body.loan_id.toString(), 10);

      if (isNaN(loanId)) {
        throw new Error(`Invalid loan ID format: ${req.body.loan_id}`);
      }

      const { rating, review, member_id } = req.body;

      // Create review data object
      const reviewData = {};
      if (rating) reviewData.rating = rating;
      if (review) reviewData.review = review;

      console.log(
        `Preparing to return loan ${loanId} with review data:`,
        reviewData
      );

      // Check if loan exists
      const loans = await getLoansByMember(member_id);
      const loan = loans.find((l) => l.id === loanId);

      if (!loan) {
        return res.status(404).json({
          success: false,
          message: `Loan with ID ${loanId} not found`,
        });
      }

      if (loan.return_date) {
        return res.status(400).json({
          success: false,
          message: `This book has already been returned on ${loan.return_date}`,
        });
      }

      // Return the book with rating and review data
      const result = await returnBook(loanId, reviewData);

      // Notify via socket if available
      if (socketServer && loan.book_title) {
        socketServer.emit("book_returned", {
          loanId: loanId,
          bookId: loan.book_id,
          bookTitle: loan.book_title,
          memberId: loan.member_id,
          memberName: loan.member_name,
          timestamp: new Date().toISOString(),
          rating: rating,
          review: review,
        });
      }

      res.json({
        success: true,
        message: loan.book_title
          ? `"${loan.book_title}" has been successfully returned`
          : "Book returned successfully",
      });
    } catch (error) {
      console.error("Error returning book:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to return book",
      });
    }
  });

  // User endpoints
  app.get("/api/users/:id/books", (req, res) => {
    const userId = req.params.id;
    const user = mockDb.users.find((u) => u.id === userId);
    console.log(
      `Getting books for user ${userId}:`,
      user ? "user found" : "user not found"
    );

    if (user) {
      const borrowedBooks = mockDb.books.filter((b) => b.borrowerId === userId);

      res.json({
        success: true,
        borrowedBooks,
        reservedBooks: user.reservedBooks,
      });
    } else {
      res.json({
        success: false,
        message: "User not found",
      });
    }
  });

  // IPC integration for Electron
  if (ipcMain) {
    // Only register if it doesn't already exist
    if (!ipcMain.listenerCount("scan-qr-code")) {
      ipcMain.handle("scan-qr-code", async () => {
        // Simulate QR code scanning
        // In a real app, this would activate the camera and scan
        const randomUser =
          mockDb.users[Math.floor(Math.random() * mockDb.users.length)];

        console.log(`Simulating QR scan, returning: ${randomUser.qrCode}`);
        return {
          success: true,
          data: randomUser.qrCode,
        };
      });
    }
  }

  // Handle API 404s
  app.use("/api/*", (req, res) => {
    console.log(`[API 404] ${req.method} ${req.url} was not found`);
    console.log("Request body:", req.body);

    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.url}`,
      error: "Not Found",
      available_endpoints: [
        "/api/auth/login",
        "/api/auth/login-qr",
        "/api/auth/validate-session",
        "/api/auth/logout",
      ],
    });
  });

  // Catch all route for debugging purposes
  app.use("*", (req, res) => {
    console.log(`[CATCH-ALL] ${req.method} ${req.url}`);

    res.status(404).json({
      success: false,
      message: "Route not found",
      error: "Not Found",
    });
  });

  return app;
}

module.exports = { createApiServer };
