import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  CircularProgress,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Tab,
  Tabs,
  Alert,
  InputAdornment,
} from "@mui/material";
import {
  Login as LoginIcon,
  Email as EmailIcon,
  Key as KeyIcon,
  QrCode as QrCodeIcon,
  CameraAlt as CameraIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBackIos as ArrowBackIosIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useServer } from "../contexts/ServerContext";

// TabPanel component for the login tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`login-tabpanel-${index}`}
      aria-labelledby={`login-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Helper function for navigation debugging
const debugNavigation = (message, data = {}) => {
  console.log(`[Navigation Debug] ${message}`, data);

  // Record navigation attempts for debugging
  if (window.electronAPI?.debug) {
    window.electronAPI.debug.logNavigation(message, data);
  }
};

// Force redirect to a path as a last resort
const forceRedirect = (path) => {
  debugNavigation(`Force redirecting to ${path}`, {
    currentHash: window.location.hash,
  });

  // Try multiple navigation methods to ensure transition occurs
  try {
    // First, try changing hash directly (most reliable in Electron)
    window.location.hash = `#${path}`;

    // Second, try reload with hash (if first method fails)
    setTimeout(() => {
      if (window.location.hash !== `#${path}`) {
        debugNavigation("First redirect attempt failed, reloading with path", {
          path,
        });
        window.location.href = `index.html#${path}`;
      }
    }, 300);

    // Final fallback using reload (extreme case)
    setTimeout(() => {
      const currentHash = window.location.hash;
      if (currentHash !== `#${path}`) {
        debugNavigation("Both redirect attempts failed, forcing reload", {
          currentHash,
          targetPath: path,
        });
        window.location.reload();
      }
    }, 800);
  } catch (error) {
    console.error("Force redirect error:", error);
    // Ultimate fallback - reload the app
    window.location.reload();
  }
};

const Login = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    isAuthenticated,
    login,
    loginWithQR,
    setRememberMe,
    loading,
  } = useAuth();
  const { serverStatus, sendSocketMessage } = useServer();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [qrPin, setQrPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [redirecting, setRedirecting] = useState(false);

  // QR Scanner state
  const [openQRScanner, setOpenQRScanner] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [scanAttempts, setScanAttempts] = useState(0);
  const [showQrPinInput, setShowQrPinInput] = useState(false);

  const scanTimerRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    console.log("Login component useEffect - auth check");
    console.log(
      "Login component useEffect - isAuthenticated:",
      isAuthenticated
    );
    console.log("Login component useEffect - currentUser:", currentUser);
    console.log("Login component useEffect - redirecting:", redirecting);

    if (isAuthenticated && !redirecting) {
      console.log(
        "User is authenticated and not already redirecting, navigating to dashboard"
      );
      // Set redirecting first to prevent navigation loops
      setRedirecting(true);
      debugNavigation("Navigating from useEffect auth check", {
        isAuthenticated,
        currentUser,
      });
      navigate("/dashboard");
    }
  }, [isAuthenticated, currentUser, navigate, redirecting]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  // Global error handler for navigation issues
  useEffect(() => {
    const handleNavigationError = (event) => {
      debugNavigation("Navigation error event caught", {
        message: event.message,
      });

      // Check if we're stuck on login when we should be redirected
      if (isAuthenticated && !redirecting) {
        console.warn(
          "Navigation error detected when authenticated - forcing redirect"
        );
        setRedirecting(true);
        forceRedirect("/dashboard");
      }
    };

    // Add global error listener
    window.addEventListener("error", handleNavigationError);

    return () => {
      window.removeEventListener("error", handleNavigationError);
    };
  }, [isAuthenticated, redirecting]);

  // Log form submission for debugging
  const logFormSubmission = (data) => {
    console.log("Form submitted with: ", data);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError("");

    // Reset QR scanner state when changing tabs
    if (newValue === 1) {
      setScanResult(null);
      setScanError("");
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Log form data for debugging
    logFormSubmission({ email, pin, remember });

    if (!email || !pin) {
      setError("Please enter both email and PIN");
      return;
    }

    if (pin.length < 4) {
      setError("Please enter a valid PIN code (minimum 4 digits)");
      return;
    }

    try {
      console.log("Attempting login with:", { email, pin, remember });
      setRedirecting(true);
      debugNavigation("Starting login attempt", { email });

      let result = null;

      // First try: electronAPI.auth (preferred modern approach)
      if (window.electronAPI && window.electronAPI.auth) {
        console.log("Using electronAPI.auth.login...");
        result = await window.electronAPI.auth.login({
          email: email,
          pin: pin,
        });
        console.log("electronAPI.auth.login result:", result);
      }
      // Second try: legacy API interface
      else if (window.api && window.api.login) {
        console.log("Using window.api.login...");
        result = await window.api.login({
          email: email, // Use email even with legacy API
          pin: pin, // Use pin even with legacy API
        });
        console.log("window.api.login result:", result);
      }
      // Last resort: Context API (avoid this if possible)
      else if (login) {
        console.log("Using AuthContext login (not recommended)...");
        result = await login(email, pin);
        console.log("AuthContext login result:", result);
      } else {
        throw new Error("No authentication methods available");
      }

      console.log("Final login result:", result);

      if (result && result.success) {
        console.log("Login successful, saving remember me preference");
        // Save remember me preference
        await setRememberMe(remember);

        // CRITICAL FIX: If we're using window.api.login we need to manually trigger the auth context update
        // because it's not automatically connected to the AuthContext
        if (window.api && window.api.login && !window.electronAPI?.auth) {
          // This is the case where we used legacy API which doesn't update AuthContext
          try {
            // Direct update via the context API if available
            if (login && typeof login === "function") {
              console.log(
                "Manually synchronizing AuthContext after successful API login"
              );
              // Set state directly if we have access to the auth context
              const syncResult = await login(email, pin);
              console.log("Manual AuthContext sync result:", syncResult);

              // Wait a short time for state to propagate
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } catch (syncErr) {
            console.warn("Failed to sync AuthContext state:", syncErr);
            // Continue anyway - we'll use our emergency navigation
          }
        }

        // Notify server about login via socket.io if connected
        if (serverStatus.socketConnected) {
          sendSocketMessage("member_login", {
            memberId: result.user.id,
            memberName: result.user.username || result.user.name,
            method: "email",
          });
        }

        // Store the user info in sessionStorage as a fallback
        try {
          // Even if AuthContext isn't updated, store the user in sessionStorage
          // This can be used by the Dashboard to recover state
          console.log("Storing authenticated user in sessionStorage");
          sessionStorage.setItem(
            "authenticatedUser",
            JSON.stringify(result.user)
          );
          sessionStorage.setItem("isAuthenticated", "true");
        } catch (storageErr) {
          console.warn("Failed to store user in sessionStorage:", storageErr);
        }

        // Critical change: IMMEDIATELY navigate to dashboard without waiting for state updates
        debugNavigation("Login successful, navigating to dashboard", {
          userId: result.user.id,
        });
        console.log("Login successful, immediately navigating to dashboard");

        try {
          // First try React Router navigation
          navigate("/dashboard", {
            state: {
              authenticatedUser: result.user,
              forceAuth: true,
              loginTimestamp: Date.now(),
            },
          });

          // As a backup, directly set window location after a short delay
          setTimeout(() => {
            if (window.location.hash !== "#/dashboard") {
              debugNavigation("Using fallback navigation", {
                currentHash: window.location.hash,
              });
              console.log("Fallback: using window.location for navigation");
              window.location.hash = "#/dashboard";

              // If we're really stuck, use the force redirect as a final fallback
              setTimeout(() => {
                if (window.location.hash !== "#/dashboard") {
                  debugNavigation(
                    "Navigation appears stuck, using force redirect"
                  );
                  forceRedirect("/dashboard");
                }
              }, 1000);
            }
          }, 500);

          return; // Important to return here
        } catch (navError) {
          console.error("Navigation error:", navError);
          debugNavigation("Navigation error occurred", {
            error: navError.message,
          });
          // Use force redirect if direct method fails
          setTimeout(() => forceRedirect("/dashboard"), 300);
          return;
        }
      } else {
        setRedirecting(false);
        setError(
          (result && result.message) ||
            "Login failed. Please check your credentials."
        );
      }
    } catch (err) {
      debugNavigation("Login error occurred", { error: err.message });
      console.error("Login error:", err);
      setRedirecting(false);
      setError(
        `Login failed: ${
          err.message || "Please check your credentials and try again."
        }`
      );
    }
  };

  // Open QR scanner
  const handleOpenQRScanner = () => {
    setOpenQRScanner(true);
    setScannerActive(true);
    setScanResult(null);
    setScanError("");
    setScanAttempts(0);
  };

  // Close QR scanner
  const handleCloseQRScanner = () => {
    setOpenQRScanner(false);
    setScannerActive(false);
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
    }
  };

  // Handle QR code scan
  const handleScanQRCode = async () => {
    try {
      setScanError("");
      setScanAttempts((prev) => prev + 1);
      console.log(`QR Scan attempt #${scanAttempts + 1}`);

      // Try to use the new electronAPI
      let result;
      if (window.electronAPI && window.electronAPI.auth) {
        console.log("Using electronAPI.auth.scanQRCode() for QR scanning");
        result = await window.electronAPI.auth.scanQRCode();
        console.log("QR scan result from electronAPI:", result);
      } else if (window.api && window.api.scanQRCode) {
        console.log("Using legacy api.scanQRCode() for QR scanning");
        result = await window.api.scanQRCode();
        console.log("QR scan result from legacy API:", result);
      } else {
        console.error("No QR scanning API available");
        throw new Error("QR scanning not available");
      }

      if (result && result.success) {
        console.log("QR scan successful:", result.data);
        setScanResult(result.data);
        // Show PIN input form after successful QR scan
        setShowQrPinInput(true);
        setScannerActive(false);
      } else {
        console.error("QR scan failed:", result);
        setScanError("Failed to scan QR code");

        // Try again after a delay
        if (scanAttempts < 3) {
          console.log(`Scheduling retry #${scanAttempts + 1} in 3 seconds`);
          scanTimerRef.current = setTimeout(() => {
            if (scannerActive) {
              handleScanQRCode();
            }
          }, 3000);
        } else {
          console.log("Maximum scan attempts reached");
        }
      }
    } catch (err) {
      console.error("QR scan error:", err);
      setScanError(`QR scan failed: ${err.message}`);

      // Try again after a delay
      if (scanAttempts < 3) {
        console.log(`Scheduling error retry #${scanAttempts + 1} in 3 seconds`);
        scanTimerRef.current = setTimeout(() => {
          if (scannerActive) {
            handleScanQRCode();
          }
        }, 3000);
      } else {
        console.log("Maximum scan attempts reached after error");
      }
    }
  };

  // New function to handle QR login with PIN
  const handleQrPinSubmit = async (e) => {
    e.preventDefault();
    setScanError("");

    if (!qrPin || qrPin.length < 4) {
      setScanError("Please enter a valid PIN code (minimum 4 digits)");
      return;
    }

    try {
      console.log("Attempting QR+PIN login with:", {
        qr_auth_key: scanResult,
        pin_code: qrPin,
        pin_length: qrPin.length,
      });

      setRedirecting(true);
      debugNavigation("Starting QR login attempt", {
        qrAuthKey: scanResult?.substring(0, 10) + "...",
      });

      // Attempt login with QR code and PIN - direct IPC approach to bypass REST API
      let loginResult;

      // Try all possible API interfaces
      if (window.electronAPI && window.electronAPI.auth) {
        // New electronAPI structure
        loginResult = await window.electronAPI.auth.loginWithQR({
          qr_auth_key: scanResult,
          pin_code: qrPin,
        });
        console.log("QR login response from electronAPI.auth:", loginResult);
      } else if (window.api) {
        // Legacy API interface
        loginResult = await window.api.loginWithQR({
          qr_auth_key: scanResult,
          pin_code: qrPin,
        });
        console.log("QR login response from api:", loginResult);
      } else {
        // Last resort: Context API
        loginResult = await loginWithQR(scanResult, qrPin);
        console.log("QR login response from context API:", loginResult);
      }

      console.log("Final QR login response:", loginResult);

      if (loginResult && loginResult.success) {
        // Save remember me preference
        await setRememberMe(remember);

        // Notify server about login via socket.io
        if (serverStatus.socketConnected) {
          sendSocketMessage("member_login", {
            memberId: loginResult.user.id,
            memberName: loginResult.user.username || loginResult.user.name,
            method: "qr",
          });
        }

        // Close scanner and immediately navigate to dashboard
        handleCloseQRScanner();

        debugNavigation("QR login successful, navigating to dashboard", {
          userId: loginResult.user.id,
        });

        try {
          // First try React Router navigation
          navigate("/dashboard");

          // As a backup, directly set window location after a short delay
          setTimeout(() => {
            if (window.location.hash !== "#/dashboard") {
              debugNavigation("Using fallback navigation for QR login", {
                currentHash: window.location.hash,
              });
              console.log(
                "Fallback: using window.location for QR login navigation"
              );
              window.location.hash = "#/dashboard";

              // If we're really stuck, use the force redirect as a final fallback
              setTimeout(() => {
                if (window.location.hash !== "#/dashboard") {
                  debugNavigation(
                    "Navigation appears stuck after QR login, using force redirect"
                  );
                  forceRedirect("/dashboard");
                }
              }, 1000);
            }
          }, 500);

          return; // Important to return here
        } catch (navError) {
          console.error("QR login navigation error:", navError);
          debugNavigation("QR navigation error occurred", {
            error: navError.message,
          });
          // Use force redirect if direct method fails
          setTimeout(() => forceRedirect("/dashboard"), 300);
          return;
        }
      } else {
        setRedirecting(false);
        setScanError((loginResult && loginResult.message) || "QR login failed");
      }
    } catch (err) {
      debugNavigation("QR login error occurred", { error: err.message });
      console.error("QR login error:", err);
      setRedirecting(false);
      setScanError(
        `QR login failed: ${
          err.message || "Please check your PIN and try again."
        }`
      );
    }
  };

  if (redirecting || loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Logging in...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: 2,
        background: "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)",
      }}
    >
      <Card
        sx={{
          maxWidth: 450,
          width: "100%",
          boxShadow: 8,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "white",
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Balanghay Library
          </Typography>
          <Typography variant="subtitle1">Member Portal Login</Typography>
        </Box>

        <Paper sx={{ borderRadius: 0 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab icon={<EmailIcon />} label="Email" id="login-tab-0" />
            <Tab icon={<QrCodeIcon />} label="QR Code" id="login-tab-1" />
          </Tabs>
        </Paper>

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* First tab - Email/PIN login */}
        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleLogin}>
            <CardContent>
              <Box sx={{ mb: 3, textAlign: "center" }}>
                <Typography variant="h6" gutterBottom>
                  Login with Email and PIN
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your email address and PIN code to sign in
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="Email Address"
                margin="normal"
                variant="outlined"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="PIN Code"
                margin="normal"
                variant="outlined"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPin(!showPin)}
                        edge="end"
                        aria-label={showPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showPin ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ mt: 2, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Remember me"
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={loading || !email || !pin}
                sx={{ mt: 2 }}
                startIcon={
                  loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <LoginIcon />
                  )
                }
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </CardContent>
          </form>
        </TabPanel>

        {/* Second tab - QR Code login */}
        <TabPanel value={tabValue} index={1}>
          <CardContent>
            <Box sx={{ mb: 3, textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                Login with QR Code
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use your membership QR code for quick access
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                mt: 2,
              }}
            >
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                startIcon={<CameraIcon />}
                onClick={handleOpenQRScanner}
                disabled={loading}
              >
                Open QR Scanner
              </Button>

              <Box
                sx={{
                  p: 3,
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  boxShadow: 1,
                  textAlign: "center",
                  width: "100%",
                }}
              >
                <Typography variant="body2" color="text.secondary" paragraph>
                  1. Click the button above to open the scanner
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  2. Place your QR code in front of the camera
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3. Enter your PIN when prompted
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </TabPanel>

        {/* QR Scanner Dialog */}
        <Dialog
          open={openQRScanner}
          onClose={handleCloseQRScanner}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h6">Scan QR Code</Typography>
              <IconButton
                edge="end"
                color="inherit"
                onClick={handleCloseQRScanner}
              >
                <ArrowBackIosIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                my: 2,
                gap: 2,
              }}
            >
              {/* QR Scanner UI */}
              <Paper
                elevation={3}
                sx={{
                  width: "100%",
                  height: 300,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  bgcolor: "black",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {scannerActive ? (
                  <>
                    <Box
                      sx={{
                        position: "absolute",
                        width: "80%",
                        height: "80%",
                        border: "2px solid green",
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                        zIndex: 2,
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: 20,
                          height: 20,
                          borderTop: "2px solid white",
                          borderLeft: "2px solid white",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          width: 20,
                          height: 20,
                          borderTop: "2px solid white",
                          borderRight: "2px solid white",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          width: 20,
                          height: 20,
                          borderBottom: "2px solid white",
                          borderLeft: "2px solid white",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: 20,
                          height: 20,
                          borderBottom: "2px solid white",
                          borderRight: "2px solid white",
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        right: 0,
                        height: 2,
                        bgcolor: "red",
                        animation: "scan 2s linear infinite",
                        "@keyframes scan": {
                          "0%": {
                            top: "20%",
                          },
                          "50%": {
                            top: "80%",
                          },
                          "100%": {
                            top: "20%",
                          },
                        },
                        zIndex: 3,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        position: "absolute",
                        bottom: 10,
                        color: "white",
                        textAlign: "center",
                        width: "100%",
                        zIndex: 4,
                      }}
                    >
                      Scanning...
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant="body1"
                    sx={{ color: "white", textAlign: "center" }}
                  >
                    Camera is inactive
                  </Typography>
                )}
              </Paper>

              {/* Scan error message */}
              {scanError && (
                <Alert severity="error" sx={{ width: "100%" }}>
                  {scanError}
                </Alert>
              )}

              {/* Scan result */}
              {scanResult && (
                <Alert severity="info" sx={{ width: "100%" }}>
                  QR Code detected! Authenticating...
                </Alert>
              )}

              {showQrPinInput && scanResult && (
                <Box sx={{ p: 2, textAlign: "center" }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    QR Code Scanned Successfully
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Please enter your PIN code to complete login
                  </Typography>

                  <form onSubmit={handleQrPinSubmit}>
                    <TextField
                      fullWidth
                      label="PIN Code"
                      type={showPin ? "text" : "password"}
                      value={qrPin}
                      onChange={(e) => setQrPin(e.target.value)}
                      margin="normal"
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <KeyIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPin(!showPin)}
                              edge="end"
                              aria-label={showPin ? "Hide PIN" : "Show PIN"}
                            >
                              {showPin ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    {scanError && (
                      <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
                        {scanError}
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      sx={{ mt: 2 }}
                      disabled={!qrPin || qrPin.length < 4}
                      startIcon={
                        loading ? <CircularProgress size={20} /> : <LoginIcon />
                      }
                    >
                      {loading ? "Verifying..." : "Verify PIN"}
                    </Button>
                  </form>
                </Box>
              )}

              <Button
                variant="contained"
                color="primary"
                onClick={handleScanQRCode}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? "Processing..." : "Start Scanning"}
              </Button>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseQRScanner} color="primary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add a small diagnostic link at the bottom */}
        <Box mt={4} textAlign="center">
          <Button
            size="small"
            color="secondary"
            onClick={async () => {
              try {
                debugNavigation("Running diagnostic test", {
                  component: "Login",
                });

                // Display current configuration
                const config = await window.api.getServerConfig();
                console.log("Server config:", config);

                // Test root endpoint
                const rootTest = await window.api.testEndpoint("/");
                console.log("Root endpoint test:", rootTest);

                // Test auth endpoint
                const authTest = await window.api.testEndpoint(
                  "/api/auth/login"
                );
                console.log("Auth endpoint test:", authTest);

                // Check navigation and authentication state
                const navState = {
                  currentLocation: window.location.href,
                  currentHash: window.location.hash,
                  isAuthenticated: isAuthenticated,
                  hasCurrentUser: !!currentUser,
                  redirectingState: redirecting,
                  navigationAvailable: typeof navigate === "function",
                };
                console.log("Navigation diagnostic:", navState);

                // Gather environment info
                const envInfo = {
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                  renderer: window.electronAPI?.getVersions
                    ? await window.electronAPI.getVersions()
                    : {
                        electron: "unknown",
                        chrome: "unknown",
                        node: "unknown",
                      },
                };
                console.log("Environment info:", envInfo);

                alert(`API Connection Test:\n
Server Address: ${config.serverAddress}\n
API Address: ${config.apiAddress}\n
API Base URL: ${config.serverApiBaseUrl}\n
Root endpoint: ${rootTest.success ? "SUCCESS" : "FAILED"}\n
Auth endpoint: ${authTest.success ? "SUCCESS" : "FAILED"}\n
Navigation state: ${JSON.stringify(navState, null, 2)}\n
Check console for details`);
              } catch (error) {
                console.error("Diagnostic error:", error);
                debugNavigation("Diagnostic error", { error: error.message });
                alert("Diagnostic failed. See console for details.");
              }
            }}
          >
            Run Connection Diagnostic
          </Button>

          {/* Add a direct navigation button for emergency use */}
          <Button
            size="small"
            color="primary"
            sx={{ ml: 2 }}
            onClick={() => {
              debugNavigation("Manual navigation button clicked", {
                isAuthenticated,
                currentUser: !!currentUser,
              });
              forceRedirect("/dashboard");
            }}
          >
            Emergency Dashboard Access
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default Login;
