import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  Snackbar,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  RestartAlt as ResetIcon,
} from "@mui/icons-material";

const DatabaseManager = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleResetDatabase = async () => {
    setLoading(true);
    try {
      const result = await window.api.resetDatabase();

      if (result.success) {
        setSnackbar({
          open: true,
          message:
            "Database reset successfully. You may need to restart the application.",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: `Failed to reset database: ${result.message}`,
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error resetting database:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Unknown error occurred"}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
      handleCloseDialog();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Database Management
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom>
            Reset Database
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This action will reset the database to its initial state. All
            members, loans, books, and users will be deleted and replaced with
            sample data. This cannot be undone.
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleOpenDialog}
            disabled={loading}
          >
            Reset Database
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            Confirm Database Reset
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            You are about to reset the entire database to its initial state.
            This will delete all current data including members, books, loans,
            and users. The database will be recreated with sample data only.
            <br />
            <br />
            <Alert severity="warning">
              This action cannot be undone! You may need to restart the
              application after reset.
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} autoFocus>
            Cancel
          </Button>
          <Button
            onClick={handleResetDatabase}
            color="error"
            variant="contained"
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <ResetIcon />
              )
            }
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Database"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DatabaseManager;
