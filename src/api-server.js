const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

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
  app.post("/api/auth/login", (req, res) => {
    const { email, pin } = req.body;
    console.log("Login attempt:", { email: email || "PIN only", pin: "****" });

    let user;

    if (email) {
      // Email + PIN login
      user = mockDb.users.find((u) => u.email === email && u.pin === pin);
    } else {
      // PIN-only login
      user = mockDb.users.find((u) => u.pin === pin);
    }

    if (user) {
      // Create session
      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      mockDb.sessions.push(session);

      // Remove sensitive data
      const safeUser = { ...user };
      delete safeUser.pin;

      console.log(`User ${user.name} logged in successfully`);

      // Emit socket event
      if (socketServer) {
        socketServer.emit("user_login", {
          userId: user.id,
          userName: user.name,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        user: safeUser,
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      });
    } else {
      console.log("Login failed: Invalid credentials");
      res.json({
        success: false,
        message: "Invalid credentials",
      });
    }
  });

  app.post("/api/auth/login-qr", (req, res) => {
    const { qrData } = req.body;
    console.log("QR login attempt:", { qrData });

    // Find user by QR code
    const user = mockDb.users.find((u) => u.qrCode === qrData);

    if (user) {
      // Create session
      const sessionId = uuidv4();
      const session = {
        id: sessionId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      mockDb.sessions.push(session);

      // Remove sensitive data
      const safeUser = { ...user };
      delete safeUser.pin;

      console.log(`User ${user.name} logged in via QR code`);

      // Emit socket event
      if (socketServer) {
        socketServer.emit("user_login", {
          userId: user.id,
          userName: user.name,
          method: "qr",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        user: safeUser,
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      });
    } else {
      console.log("QR login failed: Invalid QR code");
      res.json({
        success: false,
        message: "Invalid QR code",
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
  app.get("/api/books", (req, res) => {
    console.log("Getting all books");
    res.json({
      success: true,
      books: mockDb.books,
    });
  });

  app.get("/api/books/:id", (req, res) => {
    // Cast id to string to avoid type issues
    const bookId = String(req.params.id);
    const book = mockDb.books.find((b) => b.id === bookId);

    console.log(
      `Getting book with ID ${bookId}:`,
      book ? "found" : "not found"
    );

    if (book) {
      res.json({
        success: true,
        book,
      });
    } else {
      res.json({
        success: false,
        message: "Book not found",
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

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error("API Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  });

  return app;
}

module.exports = { createApiServer };
