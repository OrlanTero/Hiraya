const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// Map to keep track of connected clients
const connectedClients = new Map();

/**
 * Sets up an Express and Socket.io server
 * @param {number} port - The port to run the server on
 * @returns {Object} Object containing expressApp, httpServer, and io instances
 */
function setupSocketServer(port = 3000) {
  console.log(`Setting up Express and Socket.io server on port ${port}`);

  // Initialize Express app
  const expressApp = express();

  // Create HTTP server
  const httpServer = http.createServer(expressApp);

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow connections from any origin
      methods: ["GET", "POST"],
    },
  });

  // Set up Express routes - Simplify to avoid path-to-regexp issues
  expressApp.get("/status", (req, res) => {
    res.json({ status: "ok", message: "Balanghay server is running" });
  });

  // Root route for health check
  expressApp.get("/", (req, res) => {
    res.json({ status: "ok", message: "Socket.io server is running" });
  });

  // Set up Socket.io connection handler
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Add client to connected clients map
    connectedClients.set(socket.id, {
      id: socket.id,
      connectedAt: new Date(),
      clientInfo: null,
    });

    // Broadcast new connection to all clients
    io.emit("client_count", connectedClients.size);

    // Handle client identification
    socket.on("identify", (clientInfo) => {
      console.log(`Client identified: ${socket.id}`, clientInfo);
      if (connectedClients.has(socket.id)) {
        const client = connectedClients.get(socket.id);
        client.clientInfo = clientInfo;
        connectedClients.set(socket.id, client);
      }
    });

    // Handle test messages
    socket.on("test_message", (data) => {
      console.log(`Received test message from ${socket.id}:`, data);

      // Echo the message back to the sender
      socket.emit("notification", {
        type: "test_response",
        message: `Received your message: ${data.message}`,
        timestamp: new Date(),
      });
    });

    // Handle member login events
    socket.on("member_login", (data) => {
      console.log(`Member login event from ${socket.id}:`, data);

      // Broadcast to all other clients
      socket.broadcast.emit("notification", {
        type: "member_login",
        memberId: data.memberId,
        timestamp: new Date(),
      });
    });

    // Handle book borrow events
    socket.on("book_borrowed", (data) => {
      console.log(`Book borrowed event from ${socket.id}:`, data);

      // Broadcast to all clients
      io.emit("notification", {
        type: "book_borrowed",
        memberId: data.memberId,
        bookIds: data.bookIds,
        timestamp: new Date(),
      });
    });

    // Handle book return events
    socket.on("book_returned", (data) => {
      console.log(`Book returned event from ${socket.id}:`, data);

      // Broadcast to all clients
      io.emit("notification", {
        type: "book_returned",
        loanIds: data.loanIds,
        timestamp: new Date(),
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Remove client from connected clients map
      connectedClients.delete(socket.id);

      // Broadcast updated client count
      io.emit("client_count", connectedClients.size);
    });
  });

  // Start the server
  httpServer.listen(port, () => {
    console.log(`Express and Socket.io server running on port ${port}`);
  });

  return { expressApp, httpServer, io, connectedClients };
}

/**
 * Broadcast an event to all connected clients
 * @param {Object} io - Socket.io instance
 * @param {string} eventName - Name of the event to emit
 * @param {Object} data - Data to send with the event
 * @returns {Object} Result object
 */
function broadcastEvent(io, eventName, data) {
  if (!io) {
    return { success: false, message: "Socket.io server not initialized" };
  }

  try {
    io.emit(eventName, data);
    return { success: true };
  } catch (error) {
    console.error("Error broadcasting socket event:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Get information about connected clients
 * @returns {Object} Object containing count and client information
 */
function getConnectedClients() {
  return {
    count: connectedClients.size,
    clients: Array.from(connectedClients.values()),
  };
}

module.exports = {
  setupSocketServer,
  broadcastEvent,
  getConnectedClients,
};
