import React, { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BookCatalog from "./pages/BookCatalog";
import MemberProfile from "./pages/MemberProfile";

// Context for application state
import { AuthProvider } from "./contexts/AuthContext";
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
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                  />
                }
              />
              <Route path="/books" element={<BookCatalog />} />
              <Route path="/profile" element={<MemberProfile />} />
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
