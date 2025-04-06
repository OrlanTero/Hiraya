const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("fs");
const axios = require("axios");
const Store = require("electron-store").default || require("electron-store");
const { io } = require("socket.io-client");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Initialize settings store
const store = new Store({
  name: "member-client-settings",
  defaults: {
    serverAddress: "http://localhost:3000",
    apiAddress: "http://localhost:3001",
    rememberMe: false,
    lastMemberId: null,
    darkMode: false,
  },
});

// Global variables
let mainWindow;
let serverAPI;
let socketClient = null;
let connectionStatus = {
  connected: false,
  message: "Not connected to server",
  socketConnected: false,
};

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "assets", "logo.png"),
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open DevTools in development mode
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
};

// Initialize socket.io client
const initializeSocket = (serverAddress) => {
  // Disconnect existing socket if any
  if (socketClient) {
    socketClient.disconnect();
  }

  // Create new socket connection
  socketClient = io(serverAddress, {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Socket event listeners
  socketClient.on("connect", () => {
    console.log("Socket connected!", socketClient.id);
    connectionStatus.socketConnected = true;
    connectionStatus.socketId = socketClient.id;

    // Notify renderer process of connection
    if (mainWindow) {
      mainWindow.webContents.send("socket:connect", {
        connected: true,
        socketId: socketClient.id,
      });
    }
  });

  socketClient.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${reason}`);
    connectionStatus.socketConnected = false;

    // Notify renderer process of disconnection
    if (mainWindow) {
      mainWindow.webContents.send("socket:disconnect", { reason });
    }
  });

  // Set up generic event listener to forward events to renderer
  socketClient.onAny((event, ...args) => {
    if (mainWindow) {
      mainWindow.webContents.send(`socket:${event}`, ...args);
    }
  });

  return socketClient;
};

// Initialize axios instance with base settings
const initializeServerAPI = (serverAddress) => {
  // Get the API address from store (different from server/socket address)
  const apiAddress = store.get("apiAddress") || "http://localhost:3001";
  console.log(`Initializing API connection to ${apiAddress}`);

  serverAPI = axios.create({
    baseURL: apiAddress, // Use apiAddress instead of serverAddress
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Test the connection - use root path which exists according to the API server implementation
  return serverAPI
    .get("/") // Changed from /api/status to / which is guaranteed to exist
    .then(() => {
      connectionStatus = {
        connected: true,
        message: "Connected to server",
        socketConnected: false,
      };

      // Initialize socket connection if HTTP connection is successful
      // Socket still uses serverAddress, not apiAddress
      initializeSocket(serverAddress);

      return connectionStatus;
    })
    .catch((error) => {
      connectionStatus = {
        connected: false,
        message: `Connection failed: ${error.message}`,
        socketConnected: false,
      };
      return connectionStatus;
    });
};

// Set up IPC handlers
const setupIpcHandlers = () => {
  // Authentication
  ipcMain.handle("auth:login", async (event, credentials) => {
    try {
      console.log(
        `Attempting login with credentials: ${JSON.stringify({
          email: credentials.email || credentials.username,
          hasPin: !!credentials.pin || !!credentials.password,
        })}`
      );

      const response = await serverAPI.post("/api/auth/login", credentials);
      console.log("Login API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Login error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });

      return {
        success: false,
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  });

  ipcMain.handle("auth:loginWithPin", async (event, { pin_code }) => {
    try {
      const response = await serverAPI.post("/api/auth/login", {
        pin: pin_code,
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  });

  ipcMain.handle("auth:loginWithQRCode", async (event, { qr_code }) => {
    try {
      const response = await serverAPI.post("/api/auth/login-qr", {
        qrData: qr_code,
        pin: qr_code.pin || null,
      });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  });

  // Books
  ipcMain.handle("books:getAll", async () => {
    try {
      console.log("Fetching all books from API server...");
      const response = await serverAPI.get("/api/books");

      console.log("API Response structure:", {
        hasData: !!response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        hasBooks: response.data && response.data.books ? true : false,
        keys: response.data ? Object.keys(response.data) : [],
      });

      // Handle different response formats
      let books = [];

      if (Array.isArray(response.data)) {
        // Direct array response
        books = response.data;
      } else if (
        response.data &&
        response.data.books &&
        Array.isArray(response.data.books)
      ) {
        // Object with books array property
        books = response.data.books;
      } else if (response.data && typeof response.data === "object") {
        // Single book or unknown format
        books = [response.data];
      }

      console.log(`Processed ${books.length} books from API response`);
      return books;
    } catch (error) {
      console.error("Error fetching books:", error);
      return [];
    }
  });

  ipcMain.handle("books:getById", async (event, id) => {
    try {
      console.log(`Fetching book with ID ${id}...`);
      const response = await serverAPI.get(`/api/books/${id}`);

      console.log("Book by ID response:", {
        hasData: !!response.data,
        dataType: typeof response.data,
        keys: response.data ? Object.keys(response.data) : [],
      });

      // Handle different response formats
      let book = null;

      if (response.data && response.data.book) {
        // Object with book property
        book = response.data.book;
      } else if (response.data && typeof response.data === "object") {
        // Direct book object
        book = response.data;
      }

      return book;
    } catch (error) {
      console.error(`Error fetching book ${id}:`, error);
      return null;
    }
  });

  // Members
  ipcMain.handle("members:getById", async (event, id) => {
    try {
      console.log(`Fetching member with ID ${id}...`);
      const response = await serverAPI.get(`/api/members/${id}`);

      console.log("Member by ID response:", {
        hasData: !!response.data,
        dataType: typeof response.data,
        keys: response.data ? Object.keys(response.data) : [],
      });

      // Handle different response formats
      let member = null;

      if (response.data && response.data.member) {
        // Object with member property
        member = response.data.member;
      } else if (response.data && typeof response.data === "object") {
        // Direct member object
        member = response.data;
      }

      return member;
    } catch (error) {
      console.error(`Error fetching member ${id}:`, error);
      return null;
    }
  });

  // Loans
  ipcMain.handle("loans:getByMember", async (event, memberId) => {
    try {
      console.log(`Fetching loans for member ${memberId}...`);
      const response = await serverAPI.get(`/api/loans/member/${memberId}`);

      console.log("Member loans response:", {
        hasData: !!response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        hasLoans: response.data && response.data.loans ? true : false,
        keys: response.data ? Object.keys(response.data) : [],
      });

      // Handle different response formats
      let loans = [];

      if (Array.isArray(response.data)) {
        // Direct array response
        loans = response.data;
      } else if (
        response.data &&
        response.data.loans &&
        Array.isArray(response.data.loans)
      ) {
        // Object with loans array property
        loans = response.data.loans;
      } else if (
        response.data &&
        typeof response.data === "object" &&
        !Array.isArray(response.data)
      ) {
        // Single loan or unknown format
        loans = [response.data];
      }

      console.log(`Processed ${loans.length} loans from API response`);
      return loans;
    } catch (error) {
      console.error(`Error fetching loans for member ${memberId}:`, error);
      return [];
    }
  });

  ipcMain.handle("loans:borrow", async (event, data) => {
    try {
      const response = await serverAPI.post("/api/loans/borrow", data);
      return response.data;
    } catch (error) {
      console.error("Error borrowing books:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  });

  ipcMain.handle("loans:return", async (event, data) => {
    try {
      console.log("Return book data:", data);
      const response = await serverAPI.post("/api/loans/return", data);
      return response.data;
    } catch (error) {
      console.error("Error returning book:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  });

  // Server connection
  ipcMain.handle("server:connect", async (event, serverAddress) => {
    try {
      const status = await initializeServerAPI(serverAddress);
      if (status.connected) {
        // Save the server address if connection successful
        store.set("serverAddress", serverAddress);
      }
      return status;
    } catch (error) {
      connectionStatus = {
        connected: false,
        message: `Connection failed: ${error.message}`,
        socketConnected: false,
      };
      return connectionStatus;
    }
  });

  ipcMain.handle("server:status", () => {
    return connectionStatus;
  });

  // Socket.io related handlers
  ipcMain.handle("socket:emit", (event, eventName, data) => {
    if (socketClient && socketClient.connected) {
      socketClient.emit(eventName, data);
      return { success: true };
    } else {
      return {
        success: false,
        message: "Socket not connected",
      };
    }
  });

  // Add a diagnostics handler to test endpoints directly
  ipcMain.handle("diagnostics:testEndpoint", async (event, endpoint) => {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      const response = await serverAPI.get(endpoint);
      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      console.error(`Test endpoint error for ${endpoint}:`, error.message);
      return {
        success: false,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      };
    }
  });

  // Add a handler to check the server configuration
  ipcMain.handle("diagnostics:getServerConfig", async () => {
    return {
      serverAddress: store.get("serverAddress"),
      apiAddress: store.get("apiAddress"),
      serverApiBaseUrl: serverAPI?.defaults?.baseURL || "Not initialized",
    };
  });

  // Settings
  ipcMain.handle("settings:save", (event, settings) => {
    Object.keys(settings).forEach((key) => {
      store.set(key, settings[key]);
    });
    return { success: true };
  });

  ipcMain.handle("settings:get", () => {
    return store.store;
  });

  // Utilities
  ipcMain.handle("utils:scanQRCode", async () => {
    // This would integrate with a QR code scanning library
    // For now, just return a placeholder
    return {
      success: true,
      data: "MOCK_QR_CODE_SCAN_RESULT",
    };
  });
};

// App initialization
app.whenReady().then(async () => {
  try {
    // Initialize server connection
    const serverAddress = store.get("serverAddress");
    await initializeServerAPI(serverAddress);
  } catch (error) {
    console.error("Failed to initialize server connection:", error);
  }

  // Set up IPC handlers
  setupIpcHandlers();

  // Create the main window
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  // Close socket connection when quitting the app
  if (socketClient) {
    socketClient.disconnect();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  dialog.showErrorBox(
    "Error",
    `An unexpected error occurred: ${error.message}`
  );
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
