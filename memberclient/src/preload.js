// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Log that preload is running
console.log("Member Client: Preload script running");

// Expose API to the renderer process
contextBridge.exposeInMainWorld("api", {
  // Authentication
  login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
  loginWithPin: (pin) =>
    ipcRenderer.invoke("auth:loginWithPin", { pin_code: pin }),
  loginWithQR: (qrCode) =>
    ipcRenderer.invoke("auth:loginWithQRCode", { qr_code: qrCode }),

  // Books
  getAllBooks: () => ipcRenderer.invoke("books:getAll"),
  getBookById: (id) => ipcRenderer.invoke("books:getById", id),

  // Member
  getMemberProfile: (id) => ipcRenderer.invoke("members:getById", id),

  // Loans
  getLoansByMember: (memberId) =>
    ipcRenderer.invoke("loans:getByMember", memberId),
  getReturnableBooks: (memberId) => 
    ipcRenderer.invoke("loans:getReturnableBooks", memberId),
  borrowBooks: (data) => ipcRenderer.invoke("loans:borrow", data),
  returnBook: (data) => ipcRenderer.invoke("loans:return", data),
  returnMultipleBooks: (data) => ipcRenderer.invoke("loans:returnMultiple", data),

  // Server connection
  connectToServer: (serverAddress) =>
    ipcRenderer.invoke("server:connect", serverAddress),
  getConnectionStatus: () => ipcRenderer.invoke("server:status"),

  // Socket.io related methods
  socketEmit: (event, data) => ipcRenderer.invoke("socket:emit", event, data),
  socketListen: (event, callback) => {
    // Set up a listener for socket events
    ipcRenderer.on(`socket:${event}`, (_, ...args) => callback(...args));

    // Return a function to remove the listener
    return () => {
      ipcRenderer.removeAllListeners(`socket:${event}`);
    };
  },

  // Settings
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  getSettings: () => ipcRenderer.invoke("settings:get"),

  // Utilities
  scanQRCode: () => ipcRenderer.invoke("utils:scanQRCode"),

  // Diagnostics
  testEndpoint: (endpoint) =>
    ipcRenderer.invoke("diagnostics:testEndpoint", endpoint),
  getServerConfig: () => ipcRenderer.invoke("diagnostics:getServerConfig"),
});

// Expose Node.js process versions
contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

// Log that preload is complete
console.log("Member Client: Preload script completed");
