import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import { io } from "socket.io-client";

// Create context
const ServerContext = createContext(null);

// Provider component
export const ServerProvider = ({ children, value }) => {
  const [serverStatus, setServerStatus] = useState({
    apiConnected: false,
    socketConnected: false,
    lastPing: null,
    error: null,
  });
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  // Endpoint configuration - using local storage if available
  const API_URL =
    window.electronAPI?.settings?.get("apiAddress") || "http://localhost:3001";
  const SOCKET_URL =
    window.electronAPI?.settings?.get("serverAddress") ||
    "http://localhost:3000";

  // Log current configuration
  useEffect(() => {
    console.log("Server API URL:", API_URL);
    console.log("Socket URL:", SOCKET_URL);

    if (window.electronAPI?.settings) {
      console.log("Using electron settings API");
    } else {
      console.log("Electron settings API not available");
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    let newSocket;
    try {
      console.log(`Attempting to connect to socket at ${SOCKET_URL}`);

      newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ["websocket", "polling"],
      });
      socketRef.current = newSocket;

      // Socket event handlers
      newSocket.on("connect", () => {
        console.log(
          `Socket connected successfully! Socket ID: ${newSocket.id}`
        );
        setServerStatus((prev) => ({
          ...prev,
          socketConnected: true,
          error: null,
        }));
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        setServerStatus((prev) => ({
          ...prev,
          socketConnected: false,
          error: `Socket connection error: ${error.message}`,
        }));
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setServerStatus((prev) => ({
          ...prev,
          socketConnected: false,
        }));
      });

      newSocket.on("notification", (data) => {
        console.log("Notification received:", data);
        setNotifications((prev) => [data, ...prev].slice(0, 20));
      });
    } catch (error) {
      console.error("Error initializing socket:", error);
      setServerStatus((prev) => ({
        ...prev,
        socketConnected: false,
        error: `Socket initialization error: ${error.message}`,
      }));
    }

    // Clean up socket connection on unmount
    return () => {
      if (newSocket) {
        console.log("Cleaning up socket connection");
        newSocket.disconnect();
      }
    };
  }, [SOCKET_URL]);

  // Check API connectivity - simpler implementation to avoid route issues
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        console.log(`Checking API connectivity at ${API_URL}`);

        const response = await fetch(`${API_URL}/`, {
          method: "GET",
          headers: { Accept: "application/json" },
          mode: "cors",
          cache: "no-cache",
        });

        if (response.ok) {
          setServerStatus((prev) => ({
            ...prev,
            apiConnected: true,
            lastPing: new Date(),
            error: null,
          }));
          console.log("API connection successful");
        } else {
          throw new Error(`API returned status ${response.status}`);
        }
      } catch (error) {
        console.error("API connection failed:", error.message);
        setServerStatus((prev) => ({
          ...prev,
          apiConnected: false,
          lastPing: new Date(),
          error: `API connection error: ${error.message}`,
        }));
      }
    };

    // Check initially and then every 30 seconds
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000);

    return () => clearInterval(interval);
  }, [API_URL]);

  // Send message via socket
  const sendSocketMessage = (event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      console.log(`Sending socket message: ${event}`, data);
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn("Cannot send socket message - socket not connected");
    return false;
  };

  // API request function - simplified to avoid path-to-regexp issues
  const apiRequest = async (endpoint, options = {}) => {
    try {
      // Make sure endpoint is a simple string
      const cleanEndpoint = endpoint.replace(/^\/+/, "/");
      console.log(`Making API request to ${API_URL}${cleanEndpoint}`);

      const defaultOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        cache: "no-cache",
      };

      const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...(options.headers || {}),
        },
      };

      // Use a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_URL}${cleanEndpoint}`, {
        ...finalOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API response not OK: ${response.status}`);
      }

      const data = await response.json();

      setServerStatus((prev) => ({
        ...prev,
        apiConnected: true,
        lastPing: new Date(),
        error: null,
      }));

      return data;
    } catch (error) {
      console.error(`API request error:`, error);

      // Use fallback data in development
      if (process.env.NODE_ENV === "development") {
        return {
          success: false,
          error: error.message,
          fallback: true,
        };
      }

      throw error;
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Context value
  const contextValue = {
    serverStatus,
    API_URL,
    SOCKET_URL,
    socket: socketRef.current,
    notifications,
    clearNotifications,
    apiRequest,
    sendSocketMessage,
  };

  return (
    <ServerContext.Provider value={contextValue}>
      {children}
    </ServerContext.Provider>
  );
};

// Custom hook to use the server context
export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error("useServer must be used within a ServerProvider");
  }
  return context;
};

export default ServerContext;
