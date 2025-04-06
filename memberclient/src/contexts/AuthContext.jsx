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
  const login = async (email, pin) => {
    try {
      setLoading(true);
      console.log("AuthContext login called with:", {
        hasEmail: !!email,
        emailType: typeof email,
        hasPIN: !!pin,
        pinLength: pin ? pin.length : 0,
      });

      let response = null;

      // Try IPC methods first (preferred)
      if (window.electronAPI?.auth?.login) {
        console.log("Using electronAPI.auth.login");
        try {
          response = await window.electronAPI.auth.login({
            email: email,
            pin: pin,
          });
          console.log("electronAPI.auth.login response:", response);
        } catch (ipcError) {
          console.error("IPC login error:", ipcError);
          // Don't throw, try other methods
        }
      }

      // Try legacy IPC if modern failed
      if (!response && window.api?.login) {
        console.log("Using legacy api.login");
        try {
          response = await window.api.login({
            email: email,
            pin: pin,
          });
          console.log("legacy api.login response:", response);
        } catch (legacyError) {
          console.error("Legacy IPC login error:", legacyError);
          // Don't throw, try API method
        }
      }

      // Last resort: use API
      if (!response && serverStatus.apiConnected) {
        console.log("Using API /api/auth/login");
        try {
          // Create login payload
          const loginPayload = { email, pin };

          // Make login request
          response = await apiRequest("/api/auth/login", {
            method: "POST",
            body: JSON.stringify(loginPayload),
          });
          console.log("API login response:", response);
        } catch (apiError) {
          console.error("API login error:", apiError);
          // Don't throw, we'll handle below
        }
      }

      // Handle the response (whichever method succeeded)
      if (response && response.success && response.user) {
        console.log(
          "Login successful:",
          response.user.username || response.user.email
        );

        // Debug log before setting currentUser
        console.log("Before setCurrentUser call, current value:", currentUser);

        // Set authenticated flag immediately
        setIsAuthenticated(true);
        console.log("Setting isAuthenticated to true");

        // Save user to state
        setCurrentUser(response.user);

        // Debug log after setCurrentUser call
        console.log("After setCurrentUser call with:", response.user);

        // Store user and session if "remember me" is enabled
        if (rememberMe) {
          setStoredUser(response.user);
          if (response.session) {
            setStoredSession(response.session);
          }
        }

        return { success: true, user: response.user };
      } else {
        console.log("Login failed:", response?.message || "Unknown reason");
        return {
          success: false,
          message:
            (response && response.message) ||
            "Login failed. Please check your credentials.",
        };
      }
    } catch (error) {
      console.error("Login error:", error);

      // Fallback for offline mode (development testing only)
      if (
        !serverStatus.apiConnected &&
        process.env.NODE_ENV === "development"
      ) {
        console.warn(
          "DEVELOPMENT MODE: Using mock authentication in offline mode"
        );

        // Mock login for testing (remove in production)
        const mockUser = {
          id: "dev-12345",
          name: "Test User",
          username: email || "test@example.com",
          email: email || "test@example.com",
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
        message: `Login failed: ${
          error.message || "Connection error. Please try again."
        }`,
      };
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
