// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Log that preload is running
console.log("Preload script running");

// Expose API to the renderer process
contextBridge.exposeInMainWorld("api", {
  // Authentication
  login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
  loginWithPin: (pin_code) =>
    ipcRenderer.invoke("auth:loginWithPin", { pin_code }),
  loginWithQR: (qr_auth_key) =>
    ipcRenderer.invoke("auth:loginWithQR", { qr_auth_key }),

  // User Management
  getAllUsers: () => ipcRenderer.invoke("users:getAll"),
  getUserById: (id) => ipcRenderer.invoke("users:getById", id),
  addUser: (user) => ipcRenderer.invoke("users:add", user),
  updateUser: (id, user) => ipcRenderer.invoke("users:update", { id, user }),
  deleteUser: (id) => ipcRenderer.invoke("users:delete", id),

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

  // Debug utilities
  debug: {
    log: (message) => console.log("Renderer:", message),
    error: (message) => console.error("Renderer Error:", message),
  },
});

// Expose Node.js process versions
contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

// Log that preload is complete
console.log("Preload script completed");
