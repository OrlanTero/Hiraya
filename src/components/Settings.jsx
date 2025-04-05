import React, { useState } from "react";
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
} from "@mui/material";
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
} from "@mui/icons-material";

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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLibrarySettings({
      ...librarySettings,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSettingsSave = () => {
    // In a real app, this would save to the database
    console.log("Settings saved:", librarySettings);
    // Show a success message or notification
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
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="email"
                  label="Email Address"
                  value={librarySettings.email}
                  onChange={handleSettingChange}
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
                  startIcon={<SaveIcon />}
                  onClick={handleSettingsSave}
                  sx={{
                    bgcolor: "var(--primary)",
                    "&:hover": {
                      bgcolor: "var(--primary-dark)",
                    },
                  }}
                >
                  Save Settings
                </Button>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                User Management
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                This section will contain user management settings.
              </Typography>
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
                <Paper
                  elevation={2}
                  sx={{ p: 3, textAlign: "center", borderRadius: 2 }}
                >
                  <BackupIcon
                    sx={{ fontSize: 48, color: "var(--secondary)", mb: 2 }}
                  />
                  <Typography variant="h6" gutterBottom>
                    Backup Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Create a backup of your current database.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<BackupIcon />}
                    sx={{
                      bgcolor: "var(--secondary)",
                      "&:hover": {
                        bgcolor: "var(--secondary-dark)",
                      },
                    }}
                  >
                    Create Backup
                  </Button>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  elevation={2}
                  sx={{ p: 3, textAlign: "center", borderRadius: 2 }}
                >
                  <RestoreIcon
                    sx={{ fontSize: 48, color: "var(--primary)", mb: 2 }}
                  />
                  <Typography variant="h6" gutterBottom>
                    Restore Database
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Restore data from a previous backup.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<RestoreIcon />}
                    sx={{
                      bgcolor: "var(--primary)",
                      "&:hover": {
                        bgcolor: "var(--primary-dark)",
                      },
                    }}
                  >
                    Restore Backup
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </>
  );
};

export default Settings;
