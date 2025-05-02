import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Tooltip,
  Badge,
  Avatar,
  InputAdornment,
} from "@mui/material";
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Database as DatabaseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  VpnKey as VpnKeyIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import DatabaseManager from "./DatabaseManager";

const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [librarySettings, setLibrarySettings] = useState({
    libraryName: "Hiraya Balanghay",
    email: "hirayabalanghay@library.com",
    phone: "(555) 123-4567",
    address: "123 Book Lane, Library City, 12345",
    loanDuration: 14,
    maxBooksPerMember: 5,
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    enableAutomaticRenewal: true,
  });

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState(null);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [userDialogMode, setUserDialogMode] = useState("add"); // 'add' or 'edit'
  const [currentUser, setCurrentUser] = useState({
    username: "",
    name: "",
    email: "",
    role: "staff",
    status: "active",
    password: "",
    pin_code: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Add validation state
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add state for delete confirmation dialog
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    userId: null,
    userName: "",
    userRole: "",
  });

  // Add library settings validation state
  const [librarySettingsErrors, setLibrarySettingsErrors] = useState({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Add state for user search
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Define fetchUsers at component level so it can be referenced anywhere
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setUserError(null);

      // Check if the API exists in any form
      if (!window.api) {
        throw new Error(
          "API not available - application may need to be restarted"
        );
      }

      let usersData = [];

      // Try different approaches in order of preference
      if (typeof window.api.getAllUsers === "function") {
        console.log("Using window.api.getAllUsers() to fetch users");
        const result = await window.api.getAllUsers();
        
        if (result && result.success) {
          usersData = result.users || result.data || [];
        } else if (Array.isArray(result)) {
          usersData = result;
        } else {
          console.warn("Unexpected response format from getAllUsers:", result);
          usersData = [];
        }
      } 
      // Fallback to database API if available
      else if (typeof window.api.db?.users?.getAll === "function") {
        console.log("Using window.api.db.users.getAll() to fetch users");
        const result = await window.api.db.users.getAll();
        usersData = Array.isArray(result) ? result : [];
      }
      // Direct DB query fallback
      else if (typeof window.api.db?.query === "function") {
        try {
          console.log("Using direct DB query to fetch users");
          usersData = await window.api.db.query("SELECT * FROM users");
        } catch (dbError) {
          console.error("Error querying users table:", dbError);
          throw new Error(`Database query failed: ${dbError.message}`);
        }
      } else {
        console.warn("No compatible API found for fetching users, using development data");
        // Development mode - use dummy data when no API is available
        if (process.env.NODE_ENV === 'development') {
          usersData = [
            {
              id: 1,
              username: "admin",
              name: "Admin User",
              email: "admin@example.com",
              role: "admin",
              status: "active",
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              username: "librarian1",
              name: "Librarian User",
              email: "librarian@example.com",
              role: "librarian",
              status: "active",
              created_at: new Date().toISOString(),
            },
            {
              id: 3,
              username: "staff1",
              name: "Staff User",
              email: "staff@example.com",
              role: "staff",
              status: "inactive",
              created_at: new Date().toISOString(),
            },
          ];
        } else {
          throw new Error("User management API not available");
        }
      }

      // Process the user data to ensure consistent format
      const processedUsers = usersData.map(user => ({
        id: user.id,
        username: user.username || '',
        name: user.name || user.username || 'Unknown',
        email: user.email || '',
        role: user.role || 'staff',
        status: user.status || 'active',
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at,
        // Never include password or pin_code in the list view
      }));

      console.log(`Successfully fetched ${processedUsers.length} users`);
      setUsers(processedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUserError(error.message || "Failed to load users");

      // Provide fallback data in development mode
      if (process.env.NODE_ENV === 'development') {
        setUsers([
          {
            id: 1,
            username: "admin",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin",
            status: "active",
          },
        ]);
      } else {
        setUsers([]);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  // Replace the original useEffect
  useEffect(() => {
    // Load users when component mounts
    fetchUsers();
  }, []);

  // Keep the tab change useEffect
  useEffect(() => {
    if (activeTab === 1) {
      fetchUsers();
    }
  }, [activeTab]);

  const validateForm = () => {
    const errors = {};

    // Username validation
    if (!currentUser.username?.trim()) {
      errors.username = "Username is required";
    } else if (currentUser.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    
    // Name validation
    if (!currentUser.name?.trim()) {
      errors.name = "Name is required";
    }

    // Email validation
    if (!currentUser.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(currentUser.email)) {
      errors.email = "Email format is invalid";
    }

    // Password validation for new users
    if (userDialogMode === "add") {
      if (!currentUser.password?.trim()) {
        errors.password = "Password is required for new users";
      } else if (currentUser.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
    } else if (currentUser.password?.trim() && currentUser.password.length < 6) {
      // For edits, only validate if a password is provided
      errors.password = "Password must be at least 6 characters";
    }

    // PIN code validation
    if (userDialogMode === "add" && !currentUser.pin_code?.trim()) {
      errors.pin_code = "PIN code is required for new users";
    } else if (currentUser.pin_code?.trim() && (currentUser.pin_code.length < 4 || currentUser.pin_code.length > 6)) {
      errors.pin_code = "PIN code must be 4-6 digits";
    } else if (currentUser.pin_code?.trim() && !/^\d+$/.test(currentUser.pin_code)) {
      errors.pin_code = "PIN code must contain only numbers";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddUserDialog = () => {
    setCurrentUser({
      username: "",
      name: "",
      email: "",
      role: "staff",
      status: "active",
      password: "",
      pin_code: "",
    });
    setFormErrors({});
    setUserDialogMode("add");
    setOpenUserDialog(true);
  };

  const handleOpenEditUserDialog = (user) => {
    setCurrentUser({
      id: user.id,
      username: user.username || "",
      name: user.name || "",
      email: user.email || "",
      role: user.role || "staff",
      status: user.status || "active",
      password: "", // Don't show existing password for security
      pin_code: "", // Don't show existing PIN for security
    });
    setFormErrors({});
    setUserDialogMode("edit");
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
  };

  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentUser({
      ...currentUser,
      [name]: value,
    });
  };

  const handleSaveUser = async () => {
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    setIsSubmitting(true);
    try {
      // Format the user data
      let userId = userDialogMode === "edit" ? currentUser.id : undefined;
      
      // Create a clean user data object
      const userData = {
        username: currentUser.username?.trim(),
        name: currentUser.name?.trim(),
        email: currentUser.email?.trim(),
        role: currentUser.role || 'staff',
        status: currentUser.status || 'active',
      };
      
      // Only include password or pin_code if they are provided
      if (currentUser.password?.trim()) {
        userData.password = currentUser.password.trim();
      }
      
      if (currentUser.pin_code?.trim()) {
        userData.pin_code = currentUser.pin_code.trim();
      }

      console.log(`Saving user in ${userDialogMode} mode`, userData);

      let success = false;
      let result = null;

      // Try the direct API methods first
      if (userDialogMode === "add" && typeof window.api.addUser === "function") {
        console.log("Using window.api.addUser");
        result = await window.api.addUser(userData);
        success = result && (result.success !== false);
      } else if (userDialogMode === "edit" && typeof window.api.updateUser === "function") {
        console.log("Using window.api.updateUser");
        result = await window.api.updateUser(userId, userData);
        success = result && (result.success !== false);
      }
      // Fall back to DB API if available
      else if (
        typeof window.api.db?.users?.add === "function" &&
        typeof window.api.db?.users?.update === "function"
      ) {
        if (userDialogMode === "add") {
          console.log("Using window.api.db.users.add");
          result = await window.api.db.users.add(userData);
        } else {
          console.log("Using window.api.db.users.update");
          result = await window.api.db.users.update(userId, userData);
        }
        success = result && (result.success !== false);
      }
      // Direct DB query as a last resort
      else if (typeof window.api.db?.query === "function") {
        try {
          if (userDialogMode === "add") {
            // Create columns and values for insert
            const columns = Object.keys(userData).join(", ");
            const placeholders = Object.keys(userData)
              .map(() => "?")
              .join(", ");
            const values = Object.values(userData);

            console.log("Using direct DB query for insert");
            await window.api.db.query(
              `INSERT INTO users (${columns}) VALUES (${placeholders})`,
              values
            );
          } else {
            // Create set clause for update
            const setClauses = Object.keys(userData)
              .map((key) => `${key} = ?`)
              .join(", ");
            const values = [...Object.values(userData), userId];

            console.log("Using direct DB query for update");
            await window.api.db.query(
              `UPDATE users SET ${setClauses} WHERE id = ?`,
              values
            );
          }
          success = true;
        } catch (dbError) {
          console.error("Error executing DB query:", dbError);
          throw new Error(`Database operation failed: ${dbError.message}`);
        }
      } else {
        console.warn("No compatible API found for saving user");
        
        // Simulate success for development
        if (process.env.NODE_ENV === 'development') {
          await new Promise((resolve) => setTimeout(resolve, 500));
          success = true;
        } else {
          throw new Error("User management API not available");
        }
      }

      // Handle API errors
      if (!success && result && result.message) {
        throw new Error(result.message);
      }

      setSnackbar({
        open: true,
        message:
          userDialogMode === "add"
            ? "User added successfully"
            : "User updated successfully",
        severity: "success",
      });

      handleCloseUserDialog();
      fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to save user"}`,
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmDialog = (user) => {
    setDeleteConfirmDialog({
      open: true,
      userId: user.id,
      userName: user.name || user.username,
      userRole: user.role,
    });
  };

  const closeDeleteConfirmDialog = () => {
    setDeleteConfirmDialog({
      open: false,
      userId: null,
      userName: "",
      userRole: "",
    });
  };

  const handleDeleteUser = async (userId) => {
    try {
      // Prevent deleting the last admin user
      if (
        deleteConfirmDialog.userRole === "admin" &&
        users.filter((u) => u.role === "admin").length <= 1
      ) {
        throw new Error("Cannot delete the last admin user");
      }

      setIsSubmitting(true);
      let success = false;
      let result = null;

      // Try direct API method
      if (typeof window.api.deleteUser === "function") {
        console.log("Using window.api.deleteUser");
        result = await window.api.deleteUser(userId);
        success = result && (result.success !== false);
      } 
      // Fall back to DB API
      else if (typeof window.api.db?.users?.delete === "function") {
        console.log("Using window.api.db.users.delete");
        result = await window.api.db.users.delete(userId);
        success = result && (result.success !== false);
      }
      // Direct DB query as last resort
      else if (typeof window.api.db?.query === "function") {
        try {
          console.log("Using direct DB query for deletion");
          await window.api.db.query("DELETE FROM users WHERE id = ?", [userId]);
          success = true;
        } catch (dbError) {
          console.error("Error executing DB query:", dbError);
          throw new Error(`Database deletion failed: ${dbError.message}`);
        }
      } else {
        console.warn("No compatible API found for deleting user");
        
        // Simulate success for development
        if (process.env.NODE_ENV === 'development') {
          await new Promise((resolve) => setTimeout(resolve, 500));
          success = true;
        } else {
          throw new Error("User management API not available");
        }
      }

      // Handle API errors
      if (!success && result && result.message) {
        throw new Error(result.message);
      }

      setSnackbar({
        open: true,
        message: "User deleted successfully",
        severity: "success",
      });
      
      // Update the user list
      fetchUsers();
      closeDeleteConfirmDialog();
    } catch (error) {
      console.error("Error deleting user:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to delete user"}`,
        severity: "error",
      });
      closeDeleteConfirmDialog();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const validateLibrarySettings = () => {
    const errors = {};

    if (!librarySettings.libraryName.trim()) {
      errors.libraryName = "Library name is required";
    }

    if (librarySettings.email && !/\S+@\S+\.\S+/.test(librarySettings.email)) {
      errors.email = "Email format is invalid";
    }

    if (librarySettings.loanDuration <= 0) {
      errors.loanDuration = "Loan duration must be greater than 0";
    }

    if (librarySettings.maxBooksPerMember <= 0) {
      errors.maxBooksPerMember = "Maximum books must be greater than 0";
    }

    setLibrarySettingsErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue =
      type === "checkbox"
        ? checked
        : type === "number"
        ? parseInt(value, 10) || 0
        : value;

    setLibrarySettings({
      ...librarySettings,
      [name]: newValue,
    });

    // Clear the specific error when the field is edited
    if (librarySettingsErrors[name]) {
      setLibrarySettingsErrors({
        ...librarySettingsErrors,
        [name]: null,
      });
    }
  };

  const handleSettingsSave = async () => {
    if (!validateLibrarySettings()) {
      setSnackbar({
        open: true,
        message: "Please correct the errors before saving",
        severity: "error",
      });
      return;
    }

    setIsSavingSettings(true);

    try {
      // Here you would normally save to the database
      // For demonstration, we'll just delay to simulate saving
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSnackbar({
        open: true,
        message: "Settings saved successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to save settings"}`,
        severity: "error",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Function to filter users
  const getFilteredUsers = () => {
    if (!userSearchTerm.trim()) {
      return users;
    }
    
    const searchLower = userSearchTerm.toLowerCase();
    return users.filter(user => 
      (user.name && user.name.toLowerCase().includes(searchLower)) ||
      (user.username && user.username.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.role && user.role.toLowerCase().includes(searchLower))
    );
  };
  
  // Function to handle search input change
  const handleUserSearchChange = (e) => {
    setUserSearchTerm(e.target.value);
  };

  return (
    <>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "var(--secondary-dark)", mb: 4 }}
      >
        Settings
      </Typography>

      <Paper elevation={3} sx={{ borderRadius: 2, mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "var(--secondary-dark)",
            borderRadius: "8px 8px 0 0",
            "& .MuiTab-root": { color: "var(--light)", opacity: 0.7 },
            "& .Mui-selected": { color: "var(--light)", opacity: 1 },
            "& .MuiTabs-indicator": { backgroundColor: "var(--primary)" },
          }}
        >
          <Tab label="General" />
          <Tab label="Users" />
          <Tab label="Backup" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Library Information
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="libraryName"
                  label="Library Name"
                  value={librarySettings.libraryName}
                  onChange={handleSettingChange}
                  error={!!librarySettingsErrors.libraryName}
                  helperText={librarySettingsErrors.libraryName || ""}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="email"
                  label="Email Address"
                  value={librarySettings.email}
                  onChange={handleSettingChange}
                  error={!!librarySettingsErrors.email}
                  helperText={librarySettingsErrors.email || ""}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="phone"
                  label="Phone Number"
                  value={librarySettings.phone}
                  onChange={handleSettingChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="address"
                  label="Address"
                  value={librarySettings.address}
                  onChange={handleSettingChange}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Loan Settings
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="loanDuration"
                  label="Default Loan Duration (days)"
                  type="number"
                  value={librarySettings.loanDuration}
                  onChange={handleSettingChange}
                  InputProps={{ inputProps: { min: 1, max: 90 } }}
                  error={!!librarySettingsErrors.loanDuration}
                  helperText={librarySettingsErrors.loanDuration || ""}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="maxBooksPerMember"
                  label="Maximum Books Per Member"
                  type="number"
                  value={librarySettings.maxBooksPerMember}
                  onChange={handleSettingChange}
                  InputProps={{ inputProps: { min: 1, max: 50 } }}
                  error={!!librarySettingsErrors.maxBooksPerMember}
                  helperText={librarySettingsErrors.maxBooksPerMember || ""}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Notification Settings
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={librarySettings.enableEmailNotifications}
                      onChange={handleSettingChange}
                      name="enableEmailNotifications"
                      color="primary"
                    />
                  }
                  label="Enable Email Notifications"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={librarySettings.enableSmsNotifications}
                      onChange={handleSettingChange}
                      name="enableSmsNotifications"
                      color="primary"
                    />
                  }
                  label="Enable SMS Notifications"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={librarySettings.enableAutomaticRenewal}
                      onChange={handleSettingChange}
                      name="enableAutomaticRenewal"
                      color="primary"
                    />
                  }
                  label="Enable Automatic Renewal"
                />
              </Grid>

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={
                    isSavingSettings ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  onClick={handleSettingsSave}
                  disabled={isSavingSettings}
                  sx={{
                    bgcolor: "var(--primary)",
                    "&:hover": {
                      bgcolor: "var(--primary-dark)",
                    },
                  }}
                >
                  {isSavingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h6">User Management</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddUserDialog}
                >
                  Add New User
                </Button>
              </Box>

              {/* Add search field */}
              {!loadingUsers && !userError && users.length > 0 && (
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search users by name, username, email, or role"
                  value={userSearchTerm}
                  onChange={handleUserSearchChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: userSearchTerm && (
                      <InputAdornment position="end">
                        <IconButton 
                          onClick={() => setUserSearchTerm("")} 
                          size="small"
                          edge="end"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
              )}

              {loadingUsers ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : userError ? (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  action={
                    <Button color="inherit" size="small" onClick={fetchUsers}>
                      Retry
                    </Button>
                  }
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: "bold", mb: 0.5 }}
                  >
                    Error Loading Users
                  </Typography>
                  <Typography variant="body2">{userError}</Typography>
                </Alert>
              ) : users.length === 0 ? (
                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{ p: 4, textAlign: "center", borderRadius: 2 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      py: 3,
                    }}
                  >
                    <PersonIcon
                      sx={{
                        fontSize: 48,
                        color: "text.secondary",
                        opacity: 0.6,
                      }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      No Users Found
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        maxWidth: "400px",
                        textAlign: "center",
                      }}
                    >
                      Your library doesn't have any users yet. Add
                      your first user to start managing access.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenAddUserDialog}
                      size="small"
                    >
                      Add First User
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px", mb: 2 }}
                  >
                    <Table>
                      <TableHead sx={{ bgcolor: "var(--secondary-light)" }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: "bold" }}>User</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Contact & Access</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Status
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: "bold" }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getFilteredUsers().map((user) => (
                          <TableRow
                            key={user.id}
                            hover
                            sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                              backgroundColor:
                                user.status === "inactive"
                                  ? "rgba(0, 0, 0, 0.04)"
                                  : "inherit",
                            }}
                          >
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor:
                                      user.role === "admin"
                                        ? "var(--primary)"
                                        : user.role === "librarian"
                                        ? "var(--secondary)"
                                        : "var(--gray)",
                                  }}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    {user.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block' }}
                                  >
                                    @{user.username}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {user.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.created_at ? `Created: ${new Date(user.created_at).toLocaleDateString()}` : ''}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  user.role.charAt(0).toUpperCase() +
                                  user.role.slice(1)
                                }
                                color={
                                  user.role === "admin"
                                    ? "primary"
                                    : user.role === "librarian"
                                    ? "secondary"
                                    : "default"
                                }
                                size="small"
                                sx={{
                                  fontWeight: 500,
                                  minWidth: "80px",
                                  justifyContent: "center",
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  user.status.charAt(0).toUpperCase() +
                                  user.status.slice(1)
                                }
                                color={
                                  user.status === "active" ? "success" : "error"
                                }
                                size="small"
                                sx={{
                                  fontWeight: 500,
                                  minWidth: "80px",
                                  justifyContent: "center",
                                }}
                                icon={
                                  user.status === "active" ? (
                                    <Badge
                                      sx={{
                                        "& .MuiBadge-badge": {
                                          backgroundColor: "#44b700",
                                          width: 8,
                                          height: 8,
                                          borderRadius: "50%",
                                          marginRight: 1,
                                          marginTop: 0.5,
                                        },
                                      }}
                                    />
                                  ) : null
                                }
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit User">
                                <IconButton
                                  color="primary"
                                  onClick={() => handleOpenEditUserDialog(user)}
                                  size="small"
                                  sx={{ mr: 1 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete User">
                                <span>
                                  <IconButton
                                    color="error"
                                    onClick={() => openDeleteConfirmDialog(user)}
                                    size="small"
                                    disabled={
                                      user.role === "admin" &&
                                      users.filter((u) => u.role === "admin").length <= 1
                                    }
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {userSearchTerm 
                        ? `${getFilteredUsers().length} of ${users.length} users found for "${userSearchTerm}"` 
                        : `${users.length} ${users.length === 1 ? "user" : "users"} found`}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      Last updated: {new Date().toLocaleTimeString()}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Database Backup and Restore
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Backup your library database to prevent data loss. You can
                  restore your data from a previous backup.
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Button
                  variant="contained"
                  startIcon={<BackupIcon />}
                  sx={{
                    bgcolor: "var(--primary)",
                    "&:hover": {
                      bgcolor: "var(--primary-dark)",
                    },
                    mr: 2,
                  }}
                >
                  Create Backup
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RestoreIcon />}
                  sx={{
                    borderColor: "var(--primary)",
                    color: "var(--primary)",
                    "&:hover": {
                      borderColor: "var(--primary-dark)",
                      color: "var(--primary-dark)",
                    },
                  }}
                >
                  Restore Backup
                </Button>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 3 }} />
                <DatabaseManager />
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

      {/* User Dialog */}
      <Dialog
        open={openUserDialog}
        onClose={handleCloseUserDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {userDialogMode === "add" ? (
              <><AddIcon color="primary" /> Add New User</>
            ) : (
              <><EditIcon color="primary" /> Edit User</>
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Basic Information Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                Basic Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="username"
                label="Username"
                fullWidth
                value={currentUser.username || ''}
                onChange={handleUserInputChange}
                required
                error={!!formErrors.username}
                helperText={formErrors.username || "Used for login, must be unique"}
                disabled={userDialogMode === "edit"} // Username cannot be changed after creation
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Display Name"
                fullWidth
                value={currentUser.name || ''}
                onChange={handleUserInputChange}
                required
                error={!!formErrors.name}
                helperText={formErrors.name || "Full name or display name"}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="email"
                label="Email"
                type="email"
                fullWidth
                value={currentUser.email || ''}
                onChange={handleUserInputChange}
                required
                error={!!formErrors.email}
                helperText={formErrors.email || "Valid email address for notifications"}
              />
            </Grid>
            
            {/* Access Control Section */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                Access Control
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={currentUser.role || 'staff'}
                  onChange={handleUserInputChange}
                  label="Role"
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="librarian">Librarian</MenuItem>
                  <MenuItem value="staff">Staff</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {currentUser.role === 'admin' 
                  ? 'Full access to all features and settings'
                  : currentUser.role === 'librarian'
                  ? 'Access to book and member management'
                  : 'Limited access to basic functions'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={currentUser.status || 'active'}
                  onChange={handleUserInputChange}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Inactive users cannot log in to the system
              </Typography>
            </Grid>
            
            {/* Authentication Section */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                Authentication
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="password"
                label={userDialogMode === "add" ? "Password" : "New Password (leave blank to keep current)"}
                type="password"
                fullWidth
                value={currentUser.password || ''}
                onChange={handleUserInputChange}
                required={userDialogMode === "add"}
                error={!!formErrors.password}
                helperText={formErrors.password || "Minimum 6 characters"}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="pin_code"
                label={userDialogMode === "add" ? "PIN Code" : "New PIN Code (leave blank to keep current)"}
                type="password"
                fullWidth
                value={currentUser.pin_code || ''}
                onChange={handleUserInputChange}
                helperText={formErrors.pin_code || "4-6 digit code for quick login"}
                required={userDialogMode === "add"}
                error={!!formErrors.pin_code}
                inputProps={{ maxLength: 6 }}
              />
            </Grid>
            
            {/* Additional information */}
            {userDialogMode === "edit" && (
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Leave password and PIN fields blank to keep existing values.
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseUserDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveUser}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting 
              ? (userDialogMode === "add" ? "Adding..." : "Saving...") 
              : (userDialogMode === "add" ? "Add User" : "Save Changes")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={closeDeleteConfirmDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ pb: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <DeleteIcon color="error" />
            Confirm User Deletion
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            id="delete-dialog-description"
            sx={{ mb: 2 }}
          >
            Are you sure you want to delete the user{" "}
            <strong>{deleteConfirmDialog.userName}</strong>?
          </Typography>
          
          {deleteConfirmDialog.userRole === 'admin' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Warning: Admin User
              </Typography>
              <Typography variant="body2">
                You are about to delete an admin user. Make sure there is at least one other admin user available to manage the system.
              </Typography>
            </Alert>
          )}
          
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              This action cannot be undone
            </Typography>
            <Typography variant="body2">
              The user will lose all access to the system immediately. Any data associated with this user account may also be affected.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDeleteConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => handleDeleteUser(deleteConfirmDialog.userId)}
            color="error"
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <DeleteIcon />}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete User"}
          </Button>
        </DialogActions>
      </Dialog>

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
    </>
  );
};

export default Settings;
