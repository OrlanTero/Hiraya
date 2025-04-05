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
  serverAPI = axios.create({
    baseURL: serverAddress,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Test the connection
  return serverAPI
    .get("/api/status")
    .then(() => {
      connectionStatus = {
        connected: true,
        message: "Connected to server",
        socketConnected: false,
      };

      // Initialize socket connection if HTTP connection is successful
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
      const response = await serverAPI.post("/api/auth/login", credentials);
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  });

  ipcMain.handle("auth:loginWithPin", async (event, { pin_code }) => {
    try {
      const response = await serverAPI.post("/api/auth/login-pin", {
        pin_code,
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
      const response = await serverAPI.post("/api/auth/login-qr", { qr_code });
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
      const response = await serverAPI.get("/api/books");
      return response.data;
    } catch (error) {
      console.error("Error fetching books:", error);
      return [];
    }
  });

  ipcMain.handle("books:getById", async (event, id) => {
    try {
      const response = await serverAPI.get(`/api/books/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching book ${id}:`, error);
      return null;
    }
  });

  // Members
  ipcMain.handle("members:getById", async (event, id) => {
    try {
      const response = await serverAPI.get(`/api/members/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching member ${id}:`, error);
      return null;
    }
  });

  // Loans
  ipcMain.handle("loans:getByMember", async (event, memberId) => {
    try {
      const response = await serverAPI.get(`/api/loans/member/${memberId}`);
      return response.data;
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
