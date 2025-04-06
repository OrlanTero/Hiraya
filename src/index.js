const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const SettingsStore = require("./settings-store");
const {
  setupSocketServer,
  broadcastEvent,
  getConnectedClients,
} = require("./socket-server");
const { createApiServer } = require("./api-server");
const {
  initDatabase,
  authenticate,
  authenticateWithPin,
  authenticateWithQR,
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
  getAllUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  updateMembersTable,
  updateBooksTable,
  updateLoansTable,
  updateBookCopiesTable,
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
  resetDatabase,
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
  updateShelvesTable,
  clearLoans,
  repairDatabase,
} = require("./database/db");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Initialize settings store
const store = new SettingsStore({
  schema: {
    darkMode: {
      type: "boolean",
      default: false,
    },
    serverAddress: {
      type: "string",
      default: "http://localhost:3000",
    },
    apiAddress: {
      type: "string",
      default: "http://localhost:3001",
    },
    rememberUser: {
      type: "boolean",
      default: false,
    },
  },
});

let mainWindow;
let splashScreen;
let socketServer = { httpServer: null, io: null };
let apiServer = null;
const API_PORT = 3001;

// Set up session configuration for the windows
const configureSession = (session) => {
  // Configure CORS settings
  session.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;

    // Add CORS headers
    requestHeaders["Origin"] = "electron://balanghay";

    callback({ requestHeaders });
  });

  // Handle CORS preflight responses
  session.webRequest.onHeadersReceived((details, callback) => {
    const { responseHeaders } = details;

    // Add or append CORS headers to responses
    if (responseHeaders) {
      responseHeaders["Access-Control-Allow-Origin"] = ["*"];
      responseHeaders["Access-Control-Allow-Methods"] = [
        "GET, POST, PUT, DELETE, OPTIONS",
      ];
      responseHeaders["Access-Control-Allow-Headers"] = [
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      ];
    }

    callback({ responseHeaders });
  });

  // Set permission request handler
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow all permission requests
    callback(true);
  });
};

const createWindow = () => {
  console.log("Creating main window and splash screen");

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, "assets", "logo.png"),
    show: false, // Hide the window until it's ready
  });

  // Create splash screen
  splashScreen = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, "assets", "logo.png"),
  });

  // Configure sessions
  configureSession(mainWindow.webContents.session);
  configureSession(splashScreen.webContents.session);

  // Register permission handler to allow access to localhost:3001
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media" || permission === "geolocation") {
        callback(true);
      } else {
        callback(true);
      }
    }
  );

  // Set same permission handler for splash screen
  splashScreen.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(true);
    }
  );

  // Allow CORS for specific domains
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Access-Control-Allow-Origin": ["*"],
        },
      });
    }
  );

  // Load splash screen
  splashScreen.loadFile(path.join(__dirname, "index.html"));
  splashScreen.center();

  // For debugging
  if (process.env.NODE_ENV === "development") {
    splashScreen.webContents.openDevTools({ mode: "detach" });
  }

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Handle window ready-to-show event
  mainWindow.once("ready-to-show", () => {
    console.log("Main window ready to show");
  });

  // Initialize database
  initDatabase()
    .then(async () => {
      console.log("Database initialized");

      // Ensure members table has all required fields for authentication
      try {
        console.log("Updating members table...");
        await updateMembersTable();
        console.log("Members table updated successfully");
      } catch (err) {
        console.error("Error updating members table:", err);
      }

      // DEBUG: Print all users in the database
      try {
        const users = await getAllUsers();
        console.log("=== EXISTING USERS IN DATABASE ===");
        console.log(
          JSON.stringify(
            users.map((user) => ({
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              pin_code: user.pin_code,
              status: user.status,
            })),
            null,
            2
          )
        );
        console.log("=== END USER LIST ===");

        // Also print members for debugging
        const members = await getAllMembers();
        console.log("=== EXISTING MEMBERS IN DATABASE ===");
        console.log(
          JSON.stringify(
            members.map((member) => ({
              id: member.id,
              name: member.name,
              email: member.email,
              pin: member.pin,
              qr_code: member.qr_code ? "Yes" : "No",
              status: member.status,
            })),
            null,
            2
          )
        );
        console.log("=== END MEMBERS LIST ===");
      } catch (err) {
        console.error("Error fetching users/members:", err);
      }

      // Close splash screen and show main window after database init (and a minimum time)
      setTimeout(() => {
        console.log("Closing splash screen and showing main window");
        if (splashScreen && !splashScreen.isDestroyed()) {
          splashScreen.close();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();

          // For debugging
          if (process.env.NODE_ENV === "development") {
            mainWindow.webContents.openDevTools();
          }
        }
      }, 3000);
    })
    .catch((err) => {
      console.error("Database initialization error:", err);
    });

  // Open the DevTools.
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed event
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  splashScreen.on("closed", () => {
    splashScreen = null;
  });
};

// Initialize the database when the app is ready
app.whenReady().then(async () => {
  // Set up IPC handlers
  setupIpcHandlers();

  // Initialize database
  try {
    await initDatabase();
    await updateBookCopiesTable();
    await updateLoansTable();
    await updateShelvesTable();
    console.log("Database initialized and updated successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }

  // Create window
  createWindow();

  // Set up Socket.io server
  socketServer = setupSocketServer(3000);

  // Set up API server
  const apiApp = createApiServer(ipcMain, socketServer.io);
  apiServer = apiApp.listen(API_PORT, () => {
    console.log(`API server running on port ${API_PORT}`);
  });

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Close the HTTP server if it exists
    if (socketServer.httpServer) {
      socketServer.httpServer.close(() => {
        console.log("Socket.io HTTP server closed");
      });
    }

    // Close the API server if it exists
    if (apiServer) {
      apiServer.close(() => {
        console.log("API server closed");
      });
    }

    app.quit();
  }
});

// Set up IPC handlers for database operations
function setupIpcHandlers() {
  console.log("Setting up IPC handlers");

  // Authentication
  ipcMain.handle("auth:login", async (event, credentials) => {
    console.log(
      "auth:login handler received:",
      typeof credentials,
      credentials
    );

    // Handle various credential formats
    let userIdentifier = null;
    let userPin = null;

    try {
      // Complex object handling with detailed logging
      if (typeof credentials === "string") {
        // Simple string format - treat as PIN
        console.log("Credentials is a string, treating as PIN");
        userPin = credentials;
      } else if (typeof credentials === "object") {
        // Extract fields with comprehensive fallbacks
        userIdentifier = credentials.email || credentials.username || null;
        userPin =
          credentials.pin ||
          credentials.pin_code ||
          credentials.password ||
          null;

        console.log("Extracted credentials:", {
          has_identifier: !!userIdentifier,
          identifier_type: userIdentifier ? typeof userIdentifier : "none",
          has_pin: !!userPin,
          pin_length: userPin ? userPin.length : 0,
        });
      }

      if (!userIdentifier && !userPin) {
        console.error("No valid credentials provided");
        return {
          success: false,
          message: "No valid credentials provided",
        };
      }

      // Authenticate based on available credentials
      let result;
      if (userIdentifier) {
        console.log(`Authenticating with identifier: ${userIdentifier}`);
        result = await authenticate(userIdentifier, userPin);
      } else if (userPin) {
        console.log(`Authenticating with PIN only, length: ${userPin.length}`);
        result = await authenticateWithPin(userPin);
      }

      console.log(
        "Authentication result:",
        result.success ? "Success" : "Failed",
        result.message || ""
      );

      return result;
    } catch (error) {
      console.error("Error in auth:login handler:", error);
      return {
        success: false,
        message: `Authentication error: ${error.message}`,
        error: error.message,
      };
    }
  });

  ipcMain.handle("auth:loginWithPin", async (event, pin_data) => {
    try {
      console.log(
        "auth:loginWithPin handler received:",
        typeof pin_data,
        pin_data
      );

      // Handle various pin_data formats:
      // 1. String: direct PIN code
      // 2. Object with pin_code: { pin_code: "1234" }
      // 3. Object with pin: { pin: "1234" }
      let pin_code;

      if (typeof pin_data === "string") {
        // Direct PIN string
        pin_code = pin_data;
      } else if (typeof pin_data === "object") {
        // Object format - try different property names
        pin_code = pin_data.pin_code || pin_data.pin || null;
      } else {
        pin_code = null;
      }

      console.log(
        "Extracted PIN code for authentication, length:",
        pin_code ? pin_code.length : 0
      );

      if (!pin_code) {
        console.error("No PIN code provided in request");
        return { success: false, message: "No PIN code provided" };
      }

      // Call the authentication function
      const result = await authenticateWithPin(pin_code);
      console.log(
        "authenticateWithPin result:",
        result.success ? "Success" : "Failed"
      );
      return result;
    } catch (error) {
      console.error(
        "Error occurred in handler for 'auth:loginWithPin':",
        error
      );
      return {
        success: false,
        message: `PIN authentication error: ${error.message}`,
        error: error.message,
      };
    }
  });

  ipcMain.handle(
    "auth:loginWithQR",
    async (event, { qr_auth_key, pin_code }) => {
      console.log("Auth login with QR request received");
      // Pass both QR auth key and PIN for verification
      return await authenticateWithQR(qr_auth_key, pin_code);
    }
  );

  // QR code scanning is now handled in api-server.js

  // Settings handlers
  ipcMain.handle("settings:get", async () => {
    try {
      return {
        success: true,
        settings: store.store,
      };
    } catch (error) {
      console.error("Error getting settings:", error);
      return {
        success: false,
        message: "Failed to get settings",
        error: error.message,
      };
    }
  });

  ipcMain.handle("settings:save", async (event, settings) => {
    try {
      // Update only the provided settings
      Object.keys(settings).forEach((key) => {
        store.set(key, settings[key]);
      });

      return {
        success: true,
        settings: store.store,
      };
    } catch (error) {
      console.error("Error saving settings:", error);
      return {
        success: false,
        message: "Failed to save settings",
        error: error.message,
      };
    }
  });

  // User Management
  ipcMain.handle("users:getAll", async () => {
    return await getAllUsers();
  });

  ipcMain.handle("users:getById", async (event, id) => {
    return await getUserById(id);
  });

  ipcMain.handle("users:add", async (event, user) => {
    return await addUser(user);
  });

  ipcMain.handle("users:update", async (event, { id, user }) => {
    return await updateUser(id, user);
  });

  ipcMain.handle("users:delete", async (event, id) => {
    return await deleteUser(id);
  });

  // Books
  ipcMain.handle("books:getAll", async () => {
    return await getAllBooks();
  });

  ipcMain.handle("books:getById", async (event, id) => {
    return await getBookById(id);
  });

  ipcMain.handle("books:add", async (event, book) => {
    return await addBook(book);
  });

  ipcMain.handle("books:update", async (event, { id, book }) => {
    return await updateBook(id, book);
  });

  ipcMain.handle("books:delete", async (event, id) => {
    return await deleteBook(id);
  });

  // Make sure to update books table with the needed fields during initialization
  ipcMain.handle("books:updateTable", async () => {
    return await updateBooksTable();
  });

  // Members
  ipcMain.handle("members:getAll", async () => {
    return await getAllMembers();
  });

  ipcMain.handle("members:getById", async (event, id) => {
    return await getMemberById(id);
  });

  ipcMain.handle("members:add", async (event, member) => {
    return await addMember(member);
  });

  ipcMain.handle("members:update", async (event, { id, member }) => {
    return await updateMember(id, member);
  });

  ipcMain.handle("members:delete", async (event, id) => {
    return await deleteMember(id);
  });

  // Make sure to update members table with new fields during initialization
  ipcMain.handle("members:updateTable", async () => {
    return await updateMembersTable();
  });

  // Make sure to update loans table with book_copy_id field
  ipcMain.handle("loans:updateTable", async () => {
    return await updateLoansTable();
  });

  // Make sure to update book_copies table with copy_number field
  ipcMain.handle("bookcopies:updateTable", async () => {
    return await updateBookCopiesTable();
  });

  // Make sure to update shelves table with section and code fields
  ipcMain.handle("shelves:updateTable", async () => {
    return await updateShelvesTable();
  });

  // Database management
  ipcMain.handle("database:reset", async () => {
    try {
      console.log("Database reset requested through IPC");
      const result = await resetDatabase();
      return result;
    } catch (error) {
      console.error("Error in database:reset handler:", error);
      return {
        success: false,
        message: `Reset failed: ${error.message}`,
      };
    }
  });

  // Loans
  ipcMain.handle("loans:getAll", async () => {
    return await getAllLoans();
  });

  ipcMain.handle("loans:getByMember", async (event, memberId) => {
    return await getLoansByMember(memberId);
  });

  ipcMain.handle("loans:getActive", async () => {
    return await getActiveLoans();
  });

  ipcMain.handle("loans:getOverdue", async () => {
    return await getOverdueLoans();
  });

  ipcMain.handle("loans:add", async (event, loan) => {
    const result = await addLoan(loan);

    // Emit socket.io event for book borrowing if successful
    if (result.success && socketServer.io) {
      socketServer.io.emit("notification", {
        type: "book_borrowed",
        memberId: loan.member_id,
        bookIds: loan.book_ids,
        timestamp: new Date(),
      });
    }

    return result;
  });

  ipcMain.handle("loans:update", async (event, id, loan) => {
    const result = await updateLoan(id, loan);

    // Emit socket.io event for book returning if successful
    if (result.success && socketServer.io) {
      socketServer.io.emit("notification", {
        type: "book_returned",
        loanIds: [id],
        timestamp: new Date(),
      });
    }

    return result;
  });

  ipcMain.handle("loans:returnBook", async (event, id, reviewData) => {
    const result = await returnBook(id, reviewData);

    // Emit socket.io event for book returning if successful
    if (result.success && socketServer.io) {
      socketServer.io.emit("notification", {
        type: "book_returned",
        loanIds: [id],
        timestamp: new Date(),
      });
    }

    return result;
  });

  ipcMain.handle("loans:borrowBooks", async (event, memberData) => {
    const result = await borrowBooks(memberData);

    // Emit socket.io event for book borrowing if successful
    if (result.success && socketServer.io) {
      socketServer.io.emit("notification", {
        type: "book_borrowed",
        memberId: memberData.member_id,
        bookIds: memberData.book_ids,
        timestamp: new Date(),
      });
    }

    return result;
  });

  ipcMain.handle("loans:returnBooks", async (event, loanIds) => {
    const result = await returnBooks(loanIds);

    // Emit socket.io event for book returning if successful
    if (result.success && socketServer.io) {
      socketServer.io.emit("notification", {
        type: "book_returned",
        loanIds: loanIds,
        timestamp: new Date(),
      });
    }

    return result;
  });

  ipcMain.handle("loans:returnBooksViaQRCode", async (event, qrData) => {
    const result = await returnBooksViaQRCode(qrData);

    // Emit socket.io event for book returning via QR if successful
    if (result.success && socketServer.io) {
      socketServer.io.emit("notification", {
        type: "book_returned_qr",
        qrData: qrData,
        timestamp: new Date(),
      });
    }

    return result;
  });

  ipcMain.handle("loans:clearLoans", async () => {
    const result = await clearLoans();
    return result;
  });

  ipcMain.handle("loans:repairDatabase", async () => {
    const result = await repairDatabase();
    return result;
  });

  // Socket.io related IPC handlers
  ipcMain.handle("socket:getClients", () => {
    return getConnectedClients();
  });

  ipcMain.handle("socket:broadcast", (event, { eventName, data }) => {
    return broadcastEvent(socketServer.io, eventName, data);
  });

  // Shelves
  ipcMain.handle("shelves:getAll", async () => {
    return await getAllShelves();
  });

  ipcMain.handle("shelves:getById", async (event, id) => {
    return await getShelfById(id);
  });

  ipcMain.handle("shelves:add", async (event, shelf) => {
    return await addShelf(shelf);
  });

  ipcMain.handle("shelves:update", async (event, { id, shelf }) => {
    return await updateShelf(id, shelf);
  });

  ipcMain.handle("shelves:delete", async (event, id) => {
    return await deleteShelf(id);
  });

  ipcMain.handle("shelves:getContents", async (event, shelfId) => {
    return await getShelfContents(shelfId);
  });

  // Book Copies
  ipcMain.handle("bookcopies:getAll", async () => {
    return await getAllBookCopies();
  });

  ipcMain.handle("bookcopies:getById", async (event, id) => {
    return await getBookCopyById(id);
  });

  ipcMain.handle("bookcopies:getByBookId", async (event, bookId) => {
    return await getBookCopiesByBookId(bookId);
  });

  ipcMain.handle("bookcopies:add", async (event, bookCopy) => {
    return await addBookCopy(bookCopy);
  });

  ipcMain.handle("bookcopies:update", async (event, { id, copy }) => {
    return await updateBookCopy(id, copy);
  });

  ipcMain.handle("bookcopies:delete", async (event, id) => {
    return await deleteBookCopy(id);
  });

  ipcMain.handle("bookcopies:move", async (event, { id, shelfId }) => {
    return await moveBookCopy(id, shelfId);
  });

  ipcMain.handle("books:getAvailability", async (event, bookId) => {
    return await getBookAvailability(bookId);
  });
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
