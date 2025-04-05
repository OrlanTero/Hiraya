import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  InputAdornment,
  Chip,
  Avatar,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  QrCode as QrCodeIcon,
  Key as KeyIcon,
} from "@mui/icons-material";

const MembersManagement = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [currentMember, setCurrentMember] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
    membership_type: "Standard",
    status: "Active",
    pin: "",
    qr_code: "",
    address: "",
    date_of_birth: "",
    gender: "",
  });

  // Load members from the database
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersData = await window.api.getAllMembers();
        setMembers(membersData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching members:", error);
        setSnackbar({
          open: true,
          message: "Failed to load members",
          severity: "error",
        });
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.phone && member.phone.includes(searchTerm))
  );

  const handleOpenDialog = (member = null) => {
    if (member) {
      // Format date for the input field (YYYY-MM-DD)
      const formattedMember = { ...member };
      if (formattedMember.date_of_birth) {
        const date = new Date(formattedMember.date_of_birth);
        formattedMember.date_of_birth = date.toISOString().split("T")[0];
      }
      setCurrentMember(formattedMember);
    } else {
      setCurrentMember({
        id: null,
        name: "",
        email: "",
        phone: "",
        membership_type: "Standard",
        status: "Active",
        pin: "",
        qr_code: "",
        address: "",
        date_of_birth: "",
        gender: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentMember({
      ...currentMember,
      [name]: value,
    });
  };

  const generateQrCode = () => {
    const qrCode = "MEM-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    setCurrentMember({
      ...currentMember,
      qr_code: qrCode,
    });
  };

  const generatePin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setCurrentMember({
      ...currentMember,
      pin: pin,
    });
  };

  const handleSaveMember = async () => {
    try {
      let result;
      if (currentMember.id) {
        // Update existing member
        result = await window.api.updateMember(currentMember.id, currentMember);
        setSnackbar({
          open: true,
          message: "Member updated successfully",
          severity: "success",
        });
      } else {
        // Add new member
        result = await window.api.addMember(currentMember);
        setSnackbar({
          open: true,
          message: "Member added successfully",
          severity: "success",
        });
      }

      // Refresh the member list
      const updatedMembers = await window.api.getAllMembers();
      setMembers(updatedMembers);

      handleCloseDialog();
    } catch (error) {
      console.error("Error saving member:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to save member"}`,
        severity: "error",
      });
    }
  };

  const handleDeleteMember = async (id) => {
    try {
      await window.api.deleteMember(id);

      // Remove from local state
      setMembers(members.filter((member) => member.id !== id));

      setSnackbar({
        open: true,
        message: "Member deleted successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting member:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to delete member"}`,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: "var(--secondary-dark)" }}
        >
          Members Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            bgcolor: "var(--primary)",
            "&:hover": {
              bgcolor: "var(--primary-dark)",
            },
          }}
        >
          Add New Member
        </Button>
      </Box>

      <Paper elevation={3} sx={{ mb: 4, p: 2, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search members by name, email, or phone..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: "var(--secondary-dark)" }}>
            <TableRow>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Member
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Email
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Phone
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Membership Type
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Status
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Authentication
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar sx={{ bgcolor: "var(--secondary)", mr: 2 }}>
                        {member.name.charAt(0)}
                      </Avatar>
                      {member.name}
                    </Box>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>{member.membership_type}</TableCell>
                  <TableCell>
                    <Chip
                      label={member.status}
                      color={member.status === "Active" ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {member.pin && (
                        <Tooltip title={`PIN: ${member.pin}`}>
                          <Chip
                            icon={<KeyIcon />}
                            label="PIN"
                            size="small"
                            color="primary"
                          />
                        </Tooltip>
                      )}
                      {member.qr_code && (
                        <Tooltip title={`QR Code: ${member.qr_code}`}>
                          <Chip
                            icon={<QrCodeIcon />}
                            label="QR"
                            size="small"
                            color="secondary"
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(member)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box
                    sx={{
                      py: 3,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <PersonIcon
                      sx={{
                        fontSize: 40,
                        color: "var(--secondary-dark)",
                        opacity: 0.6,
                      }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      No members found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? "Try different search terms"
                        : "Add a new member to get started"}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Member Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentMember.id ? "Edit Member" : "Add New Member"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="name"
                label="Full Name"
                value={currentMember.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="email"
                label="Email Address"
                type="email"
                value={currentMember.email}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="phone"
                label="Phone Number"
                value={currentMember.phone || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="address"
                label="Address"
                value={currentMember.address || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                name="date_of_birth"
                label="Date of Birth"
                type="date"
                value={currentMember.date_of_birth || ""}
                onChange={handleInputChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                name="gender"
                label="Gender"
                value={currentMember.gender || ""}
                onChange={handleInputChange}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                name="membership_type"
                label="Membership Type"
                value={currentMember.membership_type}
                onChange={handleInputChange}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
                <option value="Student">Student</option>
                <option value="Senior">Senior</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                name="status"
                label="Status"
                value={currentMember.status}
                onChange={handleInputChange}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                name="pin"
                label="PIN Code"
                value={currentMember.pin || ""}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Generate PIN">
                        <IconButton onClick={generatePin} edge="end">
                          <KeyIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                name="qr_code"
                label="QR Code"
                value={currentMember.qr_code || ""}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Generate QR Code">
                        <IconButton onClick={generateQrCode} edge="end">
                          <QrCodeIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveMember}
            variant="contained"
            sx={{
              bgcolor: "var(--primary)",
              "&:hover": {
                bgcolor: "var(--primary-dark)",
              },
            }}
          >
            Save
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
    </>
  );
};

export default MembersManagement;
