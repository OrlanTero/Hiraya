import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Refresh,
  ViewList,
  BookmarkBorder,
  LibraryBooks,
  MoveToInbox,
  Visibility,
  Close,
} from "@mui/icons-material";

const ShelvesManager = () => {
  const [shelves, setShelves] = useState([]);
  const [selectedShelf, setSelectedShelf] = useState(null);
  const [shelfContents, setShelfContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingContents, setLoadingContents] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState("add"); // 'add', 'edit', 'delete'
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    section: "",
    description: "",
    capacity: 100,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [tabValue, setTabValue] = useState(0);

  const fetchShelves = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/shelves");

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setShelves(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching shelves:", err);
      setError("Failed to load shelves. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchShelfContents = async (shelfId) => {
    try {
      setLoadingContents(true);
      const response = await fetch(`/api/shelves/${shelfId}/contents`);

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setShelfContents(data);
      setError(null);
    } catch (err) {
      console.error(`Error fetching shelf contents for shelf ${shelfId}:`, err);
      setError("Failed to load shelf contents. Please try again later.");
      setShelfContents([]);
    } finally {
      setLoadingContents(false);
    }
  };

  useEffect(() => {
    fetchShelves();
  }, []);

  const handleOpenDialog = (type, shelf = null) => {
    setDialogType(type);
    if (type === "add") {
      setFormData({
        name: "",
        location: "",
        section: "",
        description: "",
        capacity: 100,
      });
    } else if (type === "edit" && shelf) {
      setFormData({
        name: shelf.name,
        location: shelf.location,
        section: shelf.section || "",
        description: shelf.description || "",
        capacity: shelf.capacity || 100,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "capacity" ? parseInt(value, 10) || 0 : value,
    });
  };

  const handleSubmit = async () => {
    try {
      let response;
      let message;

      if (dialogType === "add") {
        response = await fetch("/api/shelves", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
        message = "Shelf added successfully!";
      } else if (dialogType === "edit") {
        response = await fetch(`/api/shelves/${selectedShelf.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
        message = "Shelf updated successfully!";
      }

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      setSnackbar({
        open: true,
        message,
        severity: "success",
      });

      handleCloseDialog();
      fetchShelves();
    } catch (err) {
      console.error("Error saving shelf:", err);
      setSnackbar({
        open: true,
        message: `Failed to ${dialogType} shelf: ${err.message}`,
        severity: "error",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/shelves/${selectedShelf.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.statusText}`);
      }

      setSnackbar({
        open: true,
        message: "Shelf deleted successfully!",
        severity: "success",
      });

      handleCloseDialog();
      setSelectedShelf(null);
      setShelfContents([]);
      fetchShelves();
    } catch (err) {
      console.error("Error deleting shelf:", err);
      setSnackbar({
        open: true,
        message: `Failed to delete shelf: ${err.message}`,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const handleSelectShelf = (shelf) => {
    setSelectedShelf(shelf);
    fetchShelfContents(shelf.id);
    setTabValue(0);
  };

  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  const renderShelfDialog = () => {
    return (
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogType === "add"
            ? "Add New Shelf"
            : dialogType === "edit"
            ? "Edit Shelf"
            : "Delete Shelf"}
        </DialogTitle>
        <DialogContent>
          {dialogType === "delete" ? (
            <DialogContentText>
              Are you sure you want to delete the shelf "{selectedShelf?.name}"?
              This action cannot be undone.
            </DialogContentText>
          ) : (
            <>
              <TextField
                margin="dense"
                name="name"
                label="Shelf Name"
                type="text"
                fullWidth
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <TextField
                margin="dense"
                name="location"
                label="Location"
                type="text"
                fullWidth
                value={formData.location}
                onChange={handleInputChange}
                required
                helperText="e.g. Floor 1, Wing A, etc."
              />
              <TextField
                margin="dense"
                name="section"
                label="Section"
                type="text"
                fullWidth
                value={formData.section}
                onChange={handleInputChange}
                helperText="e.g. Fiction, Non-Fiction, Reference, etc."
              />
              <TextField
                margin="dense"
                name="description"
                label="Description"
                type="text"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
              />
              <TextField
                margin="dense"
                name="capacity"
                label="Capacity"
                type="number"
                fullWidth
                value={formData.capacity}
                onChange={handleInputChange}
                InputProps={{ inputProps: { min: 1 } }}
                helperText="Maximum number of books this shelf can hold"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          {dialogType === "delete" ? (
            <Button onClick={handleDelete} color="error">
              Delete
            </Button>
          ) : (
            <Button onClick={handleSubmit} color="primary" variant="contained">
              {dialogType === "add" ? "Add" : "Save"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  };

  const renderShelvesTable = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (shelves.length === 0) {
      return (
        <Alert severity="info">
          No shelves found. Add a new shelf to get started.
        </Alert>
      );
    }

    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Section</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shelves.map((shelf) => (
              <TableRow
                key={shelf.id}
                hover
                selected={selectedShelf?.id === shelf.id}
                onClick={() => handleSelectShelf(shelf)}
              >
                <TableCell>{shelf.name}</TableCell>
                <TableCell>{shelf.location}</TableCell>
                <TableCell>{shelf.section || "-"}</TableCell>
                <TableCell>{shelf.capacity}</TableCell>
                <TableCell>
                  <Tooltip title="View Contents">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectShelf(shelf);
                      }}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShelf(shelf);
                        handleOpenDialog("edit", shelf);
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShelf(shelf);
                        handleOpenDialog("delete");
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderShelfContents = () => {
    if (!selectedShelf) {
      return <Alert severity="info">Select a shelf to view its contents</Alert>;
    }

    if (loadingContents) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (shelfContents.length === 0) {
      return <Alert severity="info">This shelf is empty</Alert>;
    }

    return (
      <List>
        {shelfContents.map((item) => (
          <ListItem key={item.id}>
            <ListItemIcon>
              <BookmarkBorder />
            </ListItemIcon>
            <ListItemText
              primary={item.title}
              secondary={
                <>
                  <Typography variant="body2" component="span">
                    {item.author} - {item.isbn || "No ISBN"}
                  </Typography>
                  <br />
                  <Typography variant="body2" component="span">
                    Barcode: {item.barcode}
                  </Typography>
                  <br />
                  <Chip
                    size="small"
                    label={item.status}
                    color={item.status === "Available" ? "success" : "error"}
                    sx={{ mt: 0.5, mr: 0.5 }}
                  />
                  <Chip
                    size="small"
                    label={item.condition || "Good"}
                    color={
                      item.condition === "New"
                        ? "success"
                        : item.condition === "Good"
                        ? "primary"
                        : item.condition === "Fair"
                        ? "info"
                        : "warning"
                    }
                    sx={{ mt: 0.5 }}
                  />
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderShelfDetails = () => {
    if (!selectedShelf) {
      return null;
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">{selectedShelf.name}</Typography>
            <Box>
              <Tooltip title="Edit Shelf">
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog("edit", selectedShelf)}
                  sx={{ mr: 1 }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Shelf">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleOpenDialog("delete")}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Tabs value={tabValue} onChange={handleChangeTab}>
            <Tab label="Details" />
            <Tab label="Contents" />
          </Tabs>

          <Box sx={{ mt: 2 }}>
            {tabValue === 0 ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Location</Typography>
                  <Typography variant="body1">
                    {selectedShelf.location}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Section</Typography>
                  <Typography variant="body1">
                    {selectedShelf.section || "-"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Capacity</Typography>
                  <Typography variant="body1">
                    {selectedShelf.capacity} books
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Current Usage</Typography>
                  <Typography variant="body1">
                    {shelfContents.length} / {selectedShelf.capacity} books (
                    {Math.round(
                      (shelfContents.length / selectedShelf.capacity) * 100
                    )}
                    %)
                  </Typography>
                </Grid>
                {selectedShelf.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Description</Typography>
                    <Typography variant="body1">
                      {selectedShelf.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            ) : (
              renderShelfContents()
            )}
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5">
            <LibraryBooks sx={{ mr: 1, verticalAlign: "middle" }} />
            Shelves Manager
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchShelves}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog("add")}
            >
              Add Shelf
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={selectedShelf ? 6 : 12}>
            {renderShelvesTable()}
          </Grid>
          {selectedShelf && (
            <Grid item xs={12} md={6}>
              {renderShelfDetails()}
            </Grid>
          )}
        </Grid>
      </Paper>

      {renderShelfDialog()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ShelvesManager;
