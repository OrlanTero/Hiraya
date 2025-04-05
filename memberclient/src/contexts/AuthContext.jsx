import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useServer } from "./ServerContext";

// Create context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
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
          } else {
            // Clear invalid session
            setStoredUser(null);
            setStoredSession(null);
          }
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        // Keep session if offline, clear if server rejected it
        if (serverStatus.apiConnected) {
          setStoredUser(null);
          setStoredSession(null);
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

  // Login with PIN
  const login = async (email, pin) => {
    try {
      setLoading(true);
      let response;

      // Try electronAPI first
      if (window.electronAPI?.auth) {
        console.log("Using electronAPI for login");
        if (email) {
          response = await window.electronAPI.auth.login({
            username: email,
            password: pin,
          });
        } else {
          response = await window.electronAPI.auth.loginWithPin({
            pin_code: pin,
          });
        }
      } else {
        // Fallback to server API
        console.log("Using server API for login");
        // Create login payload based on whether email is provided
        const loginPayload = email ? { email, pin } : { pin };

        // Make login request to server API
        response = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(loginPayload),
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
            "Login failed. Please check your credentials.",
        };
      }
    } catch (error) {
      console.error("Login error:", error);

      // Fallback for offline mode or development testing
      if (!serverStatus.apiConnected) {
        console.log("Using mock authentication in offline mode");

        // Mock login for testing (remove in production)
        const mockUser = {
          id: "12345",
          name: "Test User",
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
        message: "Could not connect to server. Please try again later.",
      };
    } finally {
      setLoading(false);
    }
  };

  // Login with QR code
  const loginWithQR = async (qrData) => {
    try {
      setLoading(true);
      let response;

      // Try electronAPI first
      if (window.electronAPI?.auth) {
        console.log("Using electronAPI for QR login");
        response = await window.electronAPI.auth.loginWithQR({
          qr_auth_key: qrData,
        });
      } else {
        // Fallback to server API
        console.log("Using server API for QR login");
        // Make QR login request to server API
        response = await apiRequest("/api/auth/login-qr", {
          method: "POST",
          body: JSON.stringify({ qrData }),
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
            "QR login failed. Invalid QR code.",
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
      await clearStoredUserData();

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);

      // Still clear local data even if server request fails
      setCurrentUser(null);
      await clearStoredUserData();

      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    loginWithQR,
    logout,
    setRememberMe,
    rememberMe,
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
