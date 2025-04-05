// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Log that preload is running
console.log("Preload script running");

// Create default settings
const defaultSettings = {
  darkMode: false,
  serverAddress: "http://localhost:3000",
  apiAddress: "http://localhost:3001",
  rememberUser: false,
};

// Simple settings store for renderer process
const rendererSettings = {
  // Get a setting with default fallback
  get: (key) => {
    try {
      if (typeof localStorage !== "undefined") {
        const settings = JSON.parse(
          localStorage.getItem("app-settings") || "{}"
        );
        return key
          ? settings[key] !== undefined
            ? settings[key]
            : defaultSettings[key]
          : settings;
      }
    } catch (err) {
      console.error("Error getting local setting:", err);
    }
    return key ? defaultSettings[key] : defaultSettings;
  },

  // Set a setting
  set: (key, value) => {
    try {
      if (typeof localStorage !== "undefined") {
        const settings = JSON.parse(
          localStorage.getItem("app-settings") || "{}"
        );
        if (typeof key === "object") {
          Object.assign(settings, key);
        } else {
          settings[key] = value;
        }
        localStorage.setItem("app-settings", JSON.stringify(settings));
        return settings;
      }
    } catch (err) {
      console.error("Error saving local setting:", err);
    }
    return null;
  },

  // Get all settings
  getAll: () => {
    try {
      if (typeof localStorage !== "undefined") {
        return JSON.parse(localStorage.getItem("app-settings") || "{}");
      }
    } catch (err) {
      console.error("Error getting all settings:", err);
    }
    return defaultSettings;
  },
};

// Expose protected methods for renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Settings API (both remote and local)
  settings: {
    get: (key) => rendererSettings.get(key),
    set: (key, value) => rendererSettings.set(key, value),
    getAll: () => rendererSettings.getAll(),
    setAll: (settings) => rendererSettings.set(settings),
    // Also provide access to main process settings
    getRemote: () => ipcRenderer.invoke("settings:get"),
    saveRemote: (settings) => ipcRenderer.invoke("settings:save", settings),
  },

  // Authentication
  auth: {
    login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
    loginWithPin: (pin) => ipcRenderer.invoke("auth:loginWithPin", pin),
    loginWithQR: (qrData) => ipcRenderer.invoke("auth:loginWithQR", qrData),
    scanQRCode: () => ipcRenderer.invoke("scan-qr-code"),
  },

  // Database operations
  db: {
    // Users
    users: {
      getAll: () => ipcRenderer.invoke("users:getAll"),
      getById: (id) => ipcRenderer.invoke("users:getById", id),
      add: (user) => ipcRenderer.invoke("users:add", user),
      update: (id, user) => ipcRenderer.invoke("users:update", { id, user }),
      delete: (id) => ipcRenderer.invoke("users:delete", id),
    },

    // Books
    books: {
      getAll: () => ipcRenderer.invoke("books:getAll"),
      getById: (id) => ipcRenderer.invoke("books:getById", id),
      add: (book) => ipcRenderer.invoke("books:add", book),
      update: (id, book) => ipcRenderer.invoke("books:update", { id, book }),
      delete: (id) => ipcRenderer.invoke("books:delete", id),
      updateTable: () => ipcRenderer.invoke("books:updateTable"),
    },

    // Members
    members: {
      getAll: () => ipcRenderer.invoke("members:getAll"),
      getById: (id) => ipcRenderer.invoke("members:getById", id),
      add: (member) => ipcRenderer.invoke("members:add", member),
      update: (id, member) =>
        ipcRenderer.invoke("members:update", { id, member }),
      delete: (id) => ipcRenderer.invoke("members:delete", id),
      updateTable: () => ipcRenderer.invoke("members:updateTable"),
    },

    // Loans
    loans: {
      getAll: () => ipcRenderer.invoke("loans:getAll"),
      getByMember: (memberId) =>
        ipcRenderer.invoke("loans:getByMember", memberId),
      getActive: () => ipcRenderer.invoke("loans:getActive"),
      getOverdue: () => ipcRenderer.invoke("loans:getOverdue"),
      borrow: (memberData) => ipcRenderer.invoke("loans:borrow", memberData),
      return: (loanIds) => ipcRenderer.invoke("loans:return", loanIds),
      returnViaQR: (qrData) => ipcRenderer.invoke("loans:returnViaQR", qrData),
    },
  },

  // Socket.io related
  socket: {
    getClients: () => ipcRenderer.invoke("socket:getClients"),
    broadcast: (eventName, data) =>
      ipcRenderer.invoke("socket:broadcast", { eventName, data }),
  },
});

// Expose API for legacy compatibility
contextBridge.exposeInMainWorld("api", {
  // Legacy API for backward compatibility
  // Authentication
  login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
  loginWithPin: (pin) => ipcRenderer.invoke("auth:loginWithPin", pin),
  loginWithQR: (qrData) => ipcRenderer.invoke("auth:loginWithQR", qrData),
  scanQRCode: () => ipcRenderer.invoke("scan-qr-code"),

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),

  // Books
  getAllBooks: () => ipcRenderer.invoke("books:getAll"),
  getBookById: (id) => ipcRenderer.invoke("books:getById", id),
  addBook: (book) => ipcRenderer.invoke("books:add", book),
  updateBook: (id, book) => ipcRenderer.invoke("books:update", { id, book }),
  deleteBook: (id) => ipcRenderer.invoke("books:delete", id),
  updateBooksTable: () => ipcRenderer.invoke("books:updateTable"),

  // Members
  getAllMembers: () => ipcRenderer.invoke("members:getAll"),
  getMemberById: (id) => ipcRenderer.invoke("members:getById", id),
  addMember: (member) => ipcRenderer.invoke("members:add", member),
  updateMember: (id, member) =>
    ipcRenderer.invoke("members:update", { id, member }),
  deleteMember: (id) => ipcRenderer.invoke("members:delete", id),
  updateMembersTable: () => ipcRenderer.invoke("members:updateTable"),

  // Loans
  getAllLoans: () => ipcRenderer.invoke("loans:getAll"),
  getLoansByMember: (memberId) =>
    ipcRenderer.invoke("loans:getByMember", memberId),
  getActiveLoans: () => ipcRenderer.invoke("loans:getActive"),
  getOverdueLoans: () => ipcRenderer.invoke("loans:getOverdue"),
  borrowBooks: (memberData) => ipcRenderer.invoke("loans:borrow", memberData),
  returnBooks: (loanIds) => ipcRenderer.invoke("loans:return", loanIds),
  returnBooksViaQR: (qrData) => ipcRenderer.invoke("loans:returnViaQR", qrData),

  // Socket.io related
  getConnectedClients: () => ipcRenderer.invoke("socket:getClients"),
  broadcastEvent: (eventName, data) =>
    ipcRenderer.invoke("socket:broadcast", { eventName, data }),
});

// Expose Node.js process versions
contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

// Log that preload is complete
console.log("Preload script completed");
