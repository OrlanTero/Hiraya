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
    login: (credentials) => {
      console.log("Login called with credentials:", {
        hasEmail: !!credentials.email,
        hasUsername: !!credentials.username,
        hasPinOrPassword: !!(credentials.pin || credentials.password),
        type: typeof credentials,
      });

      // Handle both formats
      const formattedCredentials =
        typeof credentials === "string"
          ? { pin_code: credentials } // String format (just PIN)
          : credentials; // Object format

      return ipcRenderer
        .invoke("auth:login", formattedCredentials)
        .then((result) => {
          console.log("IPC login result:", result);
          return result;
        })
        .catch((err) => {
          console.error("IPC login error:", err);
          return {
            success: false,
            message: `IPC error: ${err.message || "Unknown error"}`,
          };
        });
    },
    loginWithPin: (pin) => {
      console.log("LoginWithPin called with:", {
        pin_type: typeof pin,
        is_object: typeof pin === "object",
        value: typeof pin === "object" ? pin.pin_code : pin,
      });

      // Ensure pin is in the expected format
      const formattedPin = typeof pin === "object" ? pin : { pin_code: pin };

      return ipcRenderer
        .invoke("auth:loginWithPin", formattedPin)
        .then((result) => {
          console.log("IPC loginWithPin result:", result);
          return result;
        })
        .catch((err) => {
          console.error("IPC loginWithPin error:", err);
          return {
            success: false,
            message: `IPC error: ${err.message || "Unknown error"}`,
          };
        });
    },
    loginWithQR: ({ qr_auth_key, pin_code }) => {
      console.log("LoginWithQR called with:", {
        has_qr: !!qr_auth_key,
        has_pin: !!pin_code,
        qr_type: typeof qr_auth_key,
        pin_type: typeof pin_code,
      });

      return ipcRenderer
        .invoke("auth:loginWithQR", { qr_auth_key, pin_code })
        .then((result) => {
          console.log("IPC loginWithQR result:", result);
          return result;
        })
        .catch((err) => {
          console.error("IPC loginWithQR error:", err);
          return {
            success: false,
            message: `IPC error: ${err.message || "Unknown error"}`,
          };
        });
    },
    scanQRCode: () => {
      console.log("scanQRCode called");
      return ipcRenderer
        .invoke("scan-qr-code")
        .then((result) => {
          console.log("IPC scanQRCode result:", result);
          return result;
        })
        .catch((err) => {
          console.error("IPC scanQRCode error:", err);
          return {
            success: false,
            message: `IPC error: ${err.message || "Unknown error"}`,
          };
        });
    },
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
  login: (credentials) => {
    console.log("Legacy login called with:", credentials);
    // Convert legacy format to new format if needed
    const formattedCredentials =
      typeof credentials === "string"
        ? { pin_code: credentials }
        : {
            // Map various parameter formats consistently
            email: credentials.email || credentials.username || null,
            pin:
              credentials.pin ||
              credentials.pin_code ||
              credentials.password ||
              null,
          };

    console.log("Formatted credentials for IPC:", formattedCredentials);

    return ipcRenderer
      .invoke("auth:login", formattedCredentials)
      .then((result) => {
        console.log("Legacy IPC login result:", result);
        return result;
      })
      .catch((err) => {
        console.error("Legacy IPC login error:", err);
        return {
          success: false,
          message: `IPC error: ${err.message || "Unknown error"}`,
        };
      });
  },
  loginWithPin: (pin) => {
    console.log("Legacy loginWithPin called with:", {
      pin_type: typeof pin,
      value_length: typeof pin === "string" ? pin.length : "N/A",
    });

    // Ensure consistent format
    const formattedPin = { pin_code: pin };

    return ipcRenderer
      .invoke("auth:loginWithPin", formattedPin)
      .then((result) => {
        console.log("Legacy IPC loginWithPin result:", result);
        return result;
      })
      .catch((err) => {
        console.error("Legacy IPC loginWithPin error:", err);
        return {
          success: false,
          message: `IPC error: ${err.message || "Unknown error"}`,
        };
      });
  },
  loginWithQR: ({ qr_auth_key, pin_code }) => {
    console.log("Legacy loginWithQR called with:", {
      has_qr: !!qr_auth_key,
      has_pin: !!pin_code,
      qr_value: qr_auth_key,
      pin_value: pin_code,
    });

    return ipcRenderer
      .invoke("auth:loginWithQR", { qr_auth_key, pin_code })
      .then((result) => {
        console.log("Legacy IPC loginWithQR result:", result);
        return result;
      })
      .catch((err) => {
        console.error("Legacy IPC loginWithQR error:", err);
        return {
          success: false,
          message: `IPC error: ${err.message || "Unknown error"}`,
        };
      });
  },
  scanQRCode: () => {
    console.log("Legacy scanQRCode called");
    return ipcRenderer
      .invoke("scan-qr-code")
      .then((result) => {
        console.log("Legacy IPC scanQRCode result:", result);
        return result;
      })
      .catch((err) => {
        console.error("Legacy IPC scanQRCode error:", err);
        return {
          success: false,
          message: `IPC error: ${err.message || "Unknown error"}`,
        };
      });
  },

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

  // Database management
  resetDatabase: () => ipcRenderer.invoke("database:reset"),

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
