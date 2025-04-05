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

const Login = () => {
  const navigate = useNavigate();
  const { currentUser, login, loginWithQR, setRememberMe, loading } = useAuth();
  const { serverStatus, sendSocketMessage } = useServer();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [loginMethod, setLoginMethod] = useState("pin"); // pin, email

  // QR Scanner state
  const [openQRScanner, setOpenQRScanner] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [scanAttempts, setScanAttempts] = useState(0);

  const scanTimerRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

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

  // Handle PIN login
  const handlePinLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Log form data for debugging
    logFormSubmission({ email, pin, loginMethod, remember });

    if (loginMethod === "pin" && (!pin || pin.length < 4)) {
      setError("Please enter a valid PIN code (minimum 4 digits)");
      return;
    }

    if (loginMethod === "email" && (!email || !pin)) {
      setError("Please enter both email and password");
      return;
    }

    try {
      let result;

      if (loginMethod === "pin") {
        if (window.electronAPI && window.electronAPI.auth) {
          // Use the new electronAPI structure
          result = await window.electronAPI.auth.loginWithPin({
            pin_code: pin,
          });
        } else {
          // Fallback to context API
          result = await login(null, pin);
        }
      } else {
        if (window.electronAPI && window.electronAPI.auth) {
          // Use the new electronAPI structure
          result = await window.electronAPI.auth.login({
            username: email,
            password: pin,
          });
        } else {
          // Fallback to context API
          result = await login(email, pin);
        }
      }

      if (result && result.success) {
        // Save remember me preference
        await setRememberMe(remember);

        // Notify server about login via socket.io
        if (serverStatus.socketConnected) {
          sendSocketMessage("member_login", {
            memberId: result.user.id,
            memberName: result.user.name,
          });
        }

        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        setError((result && result.message) || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your credentials and try again.");
    }
  };

  // Toggle login method between PIN and Email
  const toggleLoginMethod = () => {
    setLoginMethod((prev) => (prev === "pin" ? "email" : "pin"));
    setError("");
    setPin("");
    setEmail("");
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

      // Try to use the new electronAPI
      let result;
      if (window.electronAPI && window.electronAPI.auth) {
        result = await window.electronAPI.auth.scanQRCode();
      } else if (window.api && window.api.scanQRCode) {
        // Legacy API
        result = await window.api.scanQRCode();
      } else {
        throw new Error("QR scanning not available");
      }

      if (result && result.success) {
        setScanResult(result.data);

        // Attempt login with QR code
        let loginResult;
        if (window.electronAPI && window.electronAPI.auth) {
          // Use new API
          loginResult = await window.electronAPI.auth.loginWithQR({
            qr_auth_key: result.data,
          });
        } else {
          // Use context API
          loginResult = await loginWithQR(result.data);
        }

        if (loginResult && loginResult.success) {
          // Save remember me preference
          await setRememberMe(remember);

          // Notify server about login via socket.io
          if (serverStatus.socketConnected) {
            sendSocketMessage("member_login", {
              memberId: loginResult.user.id,
              memberName: loginResult.user.name,
              method: "qr",
            });
          }

          // Close scanner and navigate to dashboard
          handleCloseQRScanner();
          navigate("/dashboard");
        } else {
          setScanError(
            (loginResult && loginResult.message) || "QR login failed"
          );

          // Try again after a delay
          if (scanAttempts < 3) {
            scanTimerRef.current = setTimeout(() => {
              if (scannerActive) {
                handleScanQRCode();
              }
            }, 3000);
          }
        }
      } else {
        setScanError("Failed to scan QR code");

        // Try again after a delay
        if (scanAttempts < 3) {
          scanTimerRef.current = setTimeout(() => {
            if (scannerActive) {
              handleScanQRCode();
            }
          }, 3000);
        }
      }
    } catch (err) {
      console.error("QR scan error:", err);
      setScanError("QR scan failed. Please try again.");

      // Try again after a delay
      if (scanAttempts < 3) {
        scanTimerRef.current = setTimeout(() => {
          if (scannerActive) {
            handleScanQRCode();
          }
        }, 3000);
      }
    }
  };

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
            <Tab
              icon={loginMethod === "pin" ? <KeyIcon /> : <EmailIcon />}
              label={loginMethod === "pin" ? "PIN" : "Email"}
              id="login-tab-0"
            />
            <Tab icon={<QrCodeIcon />} label="QR Code" id="login-tab-1" />
          </Tabs>
        </Paper>

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* First tab - PIN/Email login */}
        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handlePinLogin}>
            <CardContent>
              <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  onClick={toggleLoginMethod}
                  startIcon={
                    loginMethod === "pin" ? <EmailIcon /> : <KeyIcon />
                  }
                >
                  Switch to {loginMethod === "pin" ? "Email" : "PIN"} Login
                </Button>
              </Box>

              {loginMethod === "email" && (
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
              )}

              <TextField
                fullWidth
                label={loginMethod === "pin" ? "PIN Code" : "Password"}
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
                      >
                        {showPin ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={
                  loading || (loginMethod === "pin" ? !pin : !email || !pin)
                }
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
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 2,
              }}
            >
              <Typography variant="body1" gutterBottom>
                Scan your member QR code to login instantly.
              </Typography>

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

              <Typography variant="body2" color="text.secondary">
                Place your membership QR code in front of the camera.
              </Typography>
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
      </Card>
    </Box>
  );
};

export default Login;
