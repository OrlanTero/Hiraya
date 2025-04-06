import React, { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BookCatalog from "./pages/BookCatalog";
import MemberProfile from "./pages/MemberProfile";

// Context for application state
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ServerProvider } from "./contexts/ServerContext";

// Define themes
const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4a5568",
    },
    secondary: {
      main: "#805ad5",
    },
    background: {
      default: "#f7fafc",
      paper: "#ffffff",
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#63b3ed",
    },
    secondary: {
      main: "#9f7aea",
    },
    background: {
      default: "#1a202c",
      paper: "#2d3748",
    },
  },
});

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const {
    isAuthenticated,
    loading,
    currentUser,
    setCurrentUser,
    setIsAuthenticated,
  } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute check - DETAILED INFO:");
  console.log("- isAuthenticated:", isAuthenticated);
  console.log("- loading:", loading);
  console.log("- currentUser:", currentUser);
  console.log("- location:", location);

  // CRITICAL FIX: Check for auth state in sessionStorage or location state
  // This handles the case where login was successful but auth state isn't in context yet
  useEffect(() => {
    if (!isAuthenticated && !loading && !currentUser) {
      // Check for auth data in location state (from navigate call)
      if (location.state?.forceAuth && location.state?.authenticatedUser) {
        console.log(
          "Auth data found in location state, forcing authentication"
        );

        // Set auth state from location state
        if (setIsAuthenticated && typeof setIsAuthenticated === "function") {
          setIsAuthenticated(true);
        }

        if (setCurrentUser && typeof setCurrentUser === "function") {
          setCurrentUser(location.state.authenticatedUser);
        }

        return;
      }

      // Check for auth data in sessionStorage (fallback)
      try {
        const storedAuthStatus = sessionStorage.getItem("isAuthenticated");
        const storedUserJson = sessionStorage.getItem("authenticatedUser");

        if (storedAuthStatus === "true" && storedUserJson) {
          console.log(
            "Auth data found in sessionStorage, forcing authentication"
          );
          const storedUser = JSON.parse(storedUserJson);

          // Set auth state from sessionStorage
          if (setIsAuthenticated && typeof setIsAuthenticated === "function") {
            setIsAuthenticated(true);
          }

          if (setCurrentUser && typeof setCurrentUser === "function") {
            setCurrentUser(storedUser);
          }
        }
      } catch (error) {
        console.error("Error checking sessionStorage auth:", error);
      }
    }
  }, [
    isAuthenticated,
    loading,
    currentUser,
    setIsAuthenticated,
    setCurrentUser,
    location,
  ]);

  // If we're still loading, show a loading indicator
  if (loading) {
    console.log("ProtectedRoute - Still loading, showing loading spinner");
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Authenticating...
        </Typography>
      </Box>
    );
  }

  // Check location state for forced auth (from login flow)
  const forceAuthFromState = location.state?.forceAuth === true;

  // Check sessionStorage for authenticated flag
  let authFromStorage = false;
  try {
    authFromStorage = sessionStorage.getItem("isAuthenticated") === "true";
  } catch (e) {
    console.error("Error reading from sessionStorage:", e);
  }

  // If not authenticated through any method, redirect to login
  if (!isAuthenticated && !forceAuthFromState && !authFromStorage) {
    console.log("ProtectedRoute - Not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  console.log(
    "ProtectedRoute - Authentication validated, rendering protected content"
  );
  return children;
};

const App = () => {
  const [initializing, setInitializing] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Load saved settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get saved settings
        const settings = await window.api.getSettings();
        setDarkMode(settings?.darkMode || false);
      } catch (error) {
        console.error("Error loading settings:", error);
        setSnackbar({
          open: true,
          message: "Error loading application settings",
          severity: "error",
        });
      } finally {
        // Short delay to prevent flash of loading screen
        setTimeout(() => {
          setInitializing(false);
        }, 1000);
      }
    };

    loadSettings();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    window.api.saveSettings({ darkMode: newMode });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Show loading while initializing
  if (initializing) {
    return (
      <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <CircularProgress size={60} />
          <Box sx={{ mt: 2 }}>Initializing application...</Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <ServerProvider>
        <AuthProvider>
          <Router>
            {console.log("App rendering Router component")}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    {console.log("Rendering Dashboard route")}
                    <Dashboard
                      darkMode={darkMode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/books"
                element={
                  <ProtectedRoute>
                    <BookCatalog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <MemberProfile />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ServerProvider>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App;
