const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
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
} = require("./database/db");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow;
let splashScreen;

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
    },
    icon: path.join(__dirname, "assets", "logo.png"),
  });

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
    .then(() => {
      console.log("Database initialized");

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

// Ensure React Devtools is available if in development mode
app.whenReady().then(() => {
  console.log("Electron app ready, creating window");
  createWindow();

  // Set up IPC handlers
  setupIpcHandlers();

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
    app.quit();
  }
});

// Set up IPC handlers for database operations
function setupIpcHandlers() {
  console.log("Setting up IPC handlers");

  // Authentication
  ipcMain.handle("auth:login", async (event, { username, password }) => {
    console.log("Auth login request received:", { username });
    return await authenticate(username, password);
  });

  ipcMain.handle("auth:loginWithPin", async (event, { pin_code }) => {
    console.log("Auth login with PIN request received");
    return await authenticateWithPin(pin_code);
  });

  ipcMain.handle("auth:loginWithQR", async (event, { qr_auth_key }) => {
    console.log("Auth login with QR request received");
    return await authenticateWithQR(qr_auth_key);
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

  ipcMain.handle("loans:borrow", async (event, memberData) => {
    return await borrowBooks(memberData);
  });

  ipcMain.handle("loans:return", async (event, loanIds) => {
    return await returnBooks(loanIds);
  });

  // Add the new IPC handler for QR code returns
  ipcMain.handle("loans:returnViaQR", async (event, qrData) => {
    try {
      const result = await returnBooksViaQRCode(qrData);
      return result;
    } catch (error) {
      console.error("Error in loans:returnViaQR:", error);
      return {
        success: false,
        message: error.message || "Failed to return books via QR code",
      };
    }
  });
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
