import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useServer } from "./ServerContext";

// Create context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rememberMe, setRememberMeState] = useState(false);
  const [storedUser, setStoredUser] = useLocalStorage("user", null);
  const [storedSession, setStoredSession] = useLocalStorage("session", null);
  const { apiRequest, serverStatus } = useServer();
  const [error, setError] = useState(null);

  // Check for stored session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (storedSession && storedUser) {
          setLoading(true);

          // Validate stored session with server
          const response = await apiRequest("/api/auth/validate-session", {
            method: "POST",
            body: JSON.stringify({
              sessionId: storedSession.id,
              userId: storedUser.id,
            }),
          });

          if (response.success) {
            setCurrentUser(storedUser);
            setIsAuthenticated(true);
            console.log(
              "Restored session - User is authenticated:",
              storedUser
            );
          } else {
            // Clear invalid session
            setStoredUser(null);
            setStoredSession(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        // Keep session if offline, clear if server rejected it
        if (serverStatus.apiConnected) {
          setStoredUser(null);
          setStoredSession(null);
          setIsAuthenticated(false);
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [
    storedSession,
    storedUser,
    setStoredUser,
    setStoredSession,
    serverStatus.apiConnected,
    apiRequest,
  ]);

  // Set "remember me" preference
  const setRememberMe = async (value) => {
    setRememberMeState(value);

    // Save to localStorage via electronAPI if available
    if (window.electronAPI?.settings) {
      window.electronAPI.settings.set("rememberUser", value);
    }

    if (!value) {
      // Clear stored user data if "remember me" is disabled
      await clearStoredUserData();
    }

    return { success: true };
  };

  // Clear stored user data
  const clearStoredUserData = async () => {
    setStoredUser(null);
    setStoredSession(null);
  };

  // Login with credentials
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      console.log("AuthContext - Attempting login with credentials", {
        ...credentials,
        password: credentials.password ? "[REDACTED]" : undefined,
      });

      const response = await window.api.login(credentials);
      console.log("AuthContext - Login response:", response);

      if (response.success) {
        // Ensure user ID is stored as a number if it's a numeric string
        if (response.user && typeof response.user.id === "string") {
          const numericId = parseInt(response.user.id, 10);
          if (!isNaN(numericId)) {
            console.log(
              `Converting user ID from string ${response.user.id} to number ${numericId}`
            );
            response.user.id = numericId;
          }
        }

        console.log(
          "AuthContext - Login successful, setting authenticated state"
        );
        setCurrentUser(response.user);
        setIsAuthenticated(true);

        // Store auth status in sessionStorage as fallback (used by ProtectedRoute)
        try {
          sessionStorage.setItem("isAuthenticated", "true");
          sessionStorage.setItem(
            "authenticatedUser",
            JSON.stringify(response.user)
          );
          console.log("AuthContext - Stored auth in sessionStorage");
        } catch (storageError) {
          console.error("Error storing auth in sessionStorage:", storageError);
        }

        return { success: true, user: response.user };
      } else {
        console.log("AuthContext - Login failed:", response.message);
        setError(response.message || "Login failed");
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error("AuthContext - Login error:", error);
      setError(error.message || "An unexpected error occurred");
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Login with QR code
  const loginWithQR = async (qrData, pin) => {
    try {
      setLoading(true);
      let response;

      // Try electronAPI first
      if (window.electronAPI?.auth) {
        console.log("Using electronAPI for QR login");
        response = await window.electronAPI.auth.loginWithQR({
          qr_auth_key: qrData,
          pin_code: pin,
        });
      } else {
        // Fallback to server API
        console.log("Using server API for QR login");
        // Make QR login request to server API with PIN for verification
        response = await apiRequest("/api/auth/login-qr", {
          method: "POST",
          body: JSON.stringify({
            qrData,
            pin,
          }),
        });
      }

      if (response && response.success && response.user) {
        // Save user to state
        setCurrentUser(response.user);

        // Store user and session if "remember me" is enabled
        if (rememberMe) {
          setStoredUser(response.user);
          setStoredSession(response.session);
        }

        return { success: true, user: response.user };
      } else {
        return {
          success: false,
          message:
            (response && response.message) ||
            "QR login failed. Invalid QR code or PIN.",
        };
      }
    } catch (error) {
      console.error("QR login error:", error);

      // Fallback for offline mode or development testing
      if (!serverStatus.apiConnected) {
        console.log("Using mock QR authentication in offline mode");

        // Mock QR login for testing (remove in production)
        const mockUser = {
          id: "12345",
          name: "Test User",
          email: "test@example.com",
          role: "member",
        };

        setCurrentUser(mockUser);

        if (rememberMe) {
          setStoredUser(mockUser);
          setStoredSession({ id: "mock-session-id" });
        }

        return { success: true, user: mockUser };
      }

      return {
        success: false,
        message: "Could not connect to server. Please try again later.",
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);

      // If connected to server, notify about logout
      if (serverStatus.apiConnected && storedSession) {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({
            sessionId: storedSession.id,
          }),
        });
      }

      // Clear user state and storage
      setCurrentUser(null);
      setIsAuthenticated(false);
      await clearStoredUserData();

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);

      // Still clear local data even if server request fails
      setCurrentUser(null);
      setIsAuthenticated(false);
      await clearStoredUserData();

      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    loginWithQR,
    logout,
    setRememberMe,
    rememberMe,
    // Expose these functions for exceptional cases where direct state update is needed
    setCurrentUser: (user) => {
      console.log("Direct setCurrentUser called with:", user);
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    },
    setIsAuthenticated: (value) => {
      console.log("Direct setIsAuthenticated called with:", value);
      setIsAuthenticated(value);
    },
    // Helper method to update auth state from sessionStorage or other sources
    updateAuthStateFromExternalSource: () => {
      try {
        // Check for auth data in sessionStorage (fallback)
        const storedAuthStatus = sessionStorage.getItem("isAuthenticated");
        const storedUserJson = sessionStorage.getItem("authenticatedUser");

        if (storedAuthStatus === "true" && storedUserJson) {
          console.log("Updating auth state from sessionStorage");
          const storedUser = JSON.parse(storedUserJson);
          setCurrentUser(storedUser);
          setIsAuthenticated(true);
          return true;
        }
      } catch (error) {
        console.error("Error updating auth state from external source:", error);
      }
      return false;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
