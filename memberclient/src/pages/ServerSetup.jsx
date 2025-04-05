import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Badge,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Refresh as RefreshIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Check as CheckIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import { useServer } from "../contexts/ServerContext";

const ServerSetup = ({ darkMode, toggleDarkMode }) => {
  const {
    serverStatus,
    connectToServer,
    getServerStatus,
    sendSocketMessage,
    notifications,
    clearNotifications,
  } = useServer();

  const [serverAddress, setServerAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [socketEvents, setSocketEvents] = useState([]);

  // Load saved server address
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.api.getSettings();
        if (settings.serverAddress) {
          setServerAddress(settings.serverAddress);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };

    loadSettings();
  }, []);

  // Update status when serverStatus changes
  useEffect(() => {
    if (serverStatus.connected) {
      setSuccess(true);
      setError("");
      setStatusMessage("Connected to server");
    } else {
      setSuccess(false);
      setError(serverStatus.message || "Not connected to server");
      setStatusMessage("Not connected");
    }
  }, [serverStatus]);

  // Track socket events
  useEffect(() => {
    if (notifications.length > 0) {
      setSocketEvents((prev) => [
        ...prev,
        ...notifications.map((n) => ({
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          message: JSON.stringify(n),
        })),
      ]);
      clearNotifications();
    }
  }, [notifications, clearNotifications]);

  // Connect to server
  const handleConnect = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    setStatusMessage("Connecting to server...");

    try {
      if (!serverAddress) {
        setError("Please enter a server address");
        setStatusMessage("Connection failed");
        setLoading(false);
        return;
      }

      // Validate server address format
      let addressToUse = serverAddress;
      if (
        !addressToUse.startsWith("http://") &&
        !addressToUse.startsWith("https://")
      ) {
        addressToUse = `http://${addressToUse}`;
        setServerAddress(addressToUse);
      }

      const status = await connectToServer(addressToUse);

      if (status.connected) {
        setSuccess(true);
        setStatusMessage("Connected to server successfully");
      } else {
        setError(status.message || "Failed to connect to server");
        setStatusMessage("Connection failed");
      }
    } catch (err) {
      console.error("Connection error:", err);
      setError(`Connection error: ${err.message}`);
      setStatusMessage("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  // Check connection status
  const checkConnectionStatus = async () => {
    setLoading(true);
    setStatusMessage("Checking connection...");

    try {
      const status = await getServerStatus();

      if (status.connected) {
        setSuccess(true);
        setError("");
        setStatusMessage("Connected to server");
      } else {
        setSuccess(false);
        setError(status.message || "Not connected to server");
        setStatusMessage("Not connected");
      }
    } catch (err) {
      console.error("Error checking connection:", err);
      setSuccess(false);
      setError(`Error checking connection: ${err.message}`);
      setStatusMessage("Connection check failed");
    } finally {
      setLoading(false);
    }
  };

  // Send test message through socket
  const handleSendTestMessage = () => {
    if (!testMessage.trim()) return;

    sendSocketMessage("test_message", { message: testMessage });

    // Add to local events
    setSocketEvents((prev) => [
      ...prev,
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        message: `SENT: ${testMessage}`,
        sent: true,
      },
    ]);

    setTestMessage("");
  };

  // Clear socket events
  const handleClearSocketEvents = () => {
    setSocketEvents([]);
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: 2,
        background: darkMode
          ? "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)"
          : "linear-gradient(135deg, #e6e9f0 0%, #eef1f5 100%)",
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: "100%",
          boxShadow: 6,
          borderRadius: 2,
          overflow: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "white",
            p: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h5" component="h1">
            Server Connection
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={toggleDarkMode}
                color="default"
                icon={<LightModeIcon />}
                checkedIcon={<DarkModeIcon />}
              />
            }
            label=""
          />
        </Box>

        <CardContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Connect to your Balanghay Library server to access the member
            portal.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Successfully connected to server
            </Alert>
          )}

          <TextField
            fullWidth
            label="Server Address"
            placeholder="http://192.168.1.100:3000"
            margin="normal"
            variant="outlined"
            value={serverAddress}
            onChange={(e) => setServerAddress(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {success ? (
                    <CloudDoneIcon color="success" />
                  ) : (
                    <CloudOffIcon color="action" />
                  )}
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={checkConnectionStatus}
                    disabled={loading}
                  >
                    <RefreshIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
              mt: 1,
            }}
          >
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ display: "flex", alignItems: "center" }}
            >
              HTTP Status: {statusMessage}
              {loading && <CircularProgress size={16} sx={{ ml: 1 }} />}
            </Typography>

            <Chip
              label={
                serverStatus.socketConnected
                  ? "Socket Connected"
                  : "Socket Disconnected"
              }
              color={serverStatus.socketConnected ? "success" : "error"}
              size="small"
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || !serverAddress}
            onClick={handleConnect}
            startIcon={
              loading ? (
                <CircularProgress size={20} />
              ) : success ? (
                <CheckIcon />
              ) : null
            }
            sx={{ mt: 2 }}
          >
            {loading ? "Connecting..." : success ? "Connected" : "Connect"}
          </Button>

          {/* Socket.io Test Panel */}
          {serverStatus.socketConnected && (
            <Box sx={{ mt: 4 }}>
              <Divider>
                <Chip label="Socket.io Test" />
              </Divider>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Test Message"
                  placeholder="Type a message to send"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          color="primary"
                          onClick={handleSendTestMessage}
                          disabled={!testMessage.trim()}
                        >
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSendTestMessage();
                    }
                  }}
                />
              </Box>

              <Box
                sx={{
                  mt: 2,
                  maxHeight: 200,
                  overflowY: "auto",
                  bgcolor: darkMode ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.03)",
                  borderRadius: 1,
                  p: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="caption" fontWeight="bold">
                    Socket Events
                  </Typography>
                  <Button size="small" onClick={handleClearSocketEvents}>
                    Clear
                  </Button>
                </Box>

                {socketEvents.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                    sx={{ py: 2 }}
                  >
                    No events yet. Send a message to see events.
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {socketEvents.map((event) => (
                      <ListItem
                        key={event.id}
                        disablePadding
                        sx={{
                          py: 0.5,
                          px: 1,
                          bgcolor: event.sent
                            ? "rgba(25, 118, 210, 0.1)"
                            : "transparent",
                          borderRadius: 1,
                          mb: 0.5,
                        }}
                      >
                        <ListItemText
                          primary={event.message}
                          secondary={event.time}
                          primaryTypographyProps={{
                            variant: "body2",
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                          }}
                          secondaryTypographyProps={{
                            variant: "caption",
                            fontSize: "0.7rem",
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography variant="body2" color="textSecondary">
              Balanghay Library Member Client
            </Typography>
            {serverStatus.socketConnected && (
              <Typography
                variant="caption"
                color="textSecondary"
                display="block"
              >
                Socket ID: {serverStatus.socketId}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ServerSetup;
