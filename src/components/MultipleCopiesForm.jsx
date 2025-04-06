import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Close,
  Add as AddIcon,
  Delete as DeleteIcon,
  LibraryBooks,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

const MultipleCopiesForm = ({ open, bookId, onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [book, setBook] = useState(null);
  const [shelves, setShelves] = useState([]);
  const [error, setError] = useState(null);
  const [numCopies, setNumCopies] = useState(1);
  const [templateCopy, setTemplateCopy] = useState({
    shelf_id: "",
    status: "Available",
    condition: "Good",
    acquisition_date: new Date().toISOString().split("T")[0],
  });
  const [generatedCopies, setGeneratedCopies] = useState([]);

  // Fetch book details
  useEffect(() => {
    const fetchBookDetails = async () => {
      if (!bookId) return;

      try {
        const data = await window.api.getBookById(bookId);
        setBook(data);
      } catch (err) {
        console.error("Error fetching book details:", err);
        setError("Failed to load book details.");
      }
    };

    fetchBookDetails();
  }, [bookId]);

  // Fetch shelves
  useEffect(() => {
    const fetchShelves = async () => {
      try {
        const data = await window.api.getAllShelves();
        setShelves(data);

        // If shelves are loaded, set default shelf_id to first shelf
        if (data && data.length > 0) {
          setTemplateCopy((prev) => ({
            ...prev,
            shelf_id: data[0].id,
          }));
        }
      } catch (err) {
        console.error("Error fetching shelves:", err);
        setError("Failed to load shelves.");
      } finally {
        setLoading(false);
      }
    };

    fetchShelves();
  }, []);

  // Fetch existing copies for this book
  useEffect(() => {
    const fetchExistingCopies = async () => {
      if (!bookId) return;

      try {
        const data = await window.api.getBookCopiesByBookId(bookId);
        console.log("Existing copies:", data);
      } catch (err) {
        console.error("Error fetching existing copies:", err);
      }
    };

    fetchExistingCopies();
  }, [bookId]);

  const handleTemplateChange = (e) => {
    const { name, value } = e.target;
    setTemplateCopy((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const generateCopies = () => {
    if (!book) return;

    // Get existing copies count for proper numbering
    window.api
      .getBookCopiesByBookId(bookId)
      .then((existingCopies) => {
        const startIndex = existingCopies ? existingCopies.length + 1 : 1;
        const newCopies = [];

        for (let i = 0; i < numCopies; i++) {
          const copyNumber = startIndex + i;
          const timestamp = new Date().getTime().toString().slice(-6);
          const newBarcode = `B${bookId
            .toString()
            .padStart(4, "0")}-${timestamp}-${copyNumber}`;

          const shelf = shelves.find((s) => s.id === templateCopy.shelf_id);
          let locationCode = "";

          if (shelf) {
            const sectionCode = shelf.section
              ? shelf.section.substring(0, 3).toUpperCase()
              : "GEN";
            const bookCode = bookId.toString().padStart(4, "0");
            locationCode = `${sectionCode}-${bookCode}-${copyNumber}`;
          }

          newCopies.push({
            book_id: bookId,
            shelf_id: templateCopy.shelf_id,
            barcode: newBarcode,
            location_code: locationCode,
            status: templateCopy.status,
            condition: templateCopy.condition,
            acquisition_date: templateCopy.acquisition_date,
            copy_number: copyNumber,
          });
        }

        setGeneratedCopies(newCopies);
      })
      .catch((err) => {
        console.error("Error getting existing copies:", err);
        // Fallback if we can't get existing copies
        const newCopies = [];
        for (let i = 0; i < numCopies; i++) {
          const copyNumber = i + 1;
          const timestamp = new Date().getTime().toString().slice(-6);
          const newBarcode = `B${bookId
            .toString()
            .padStart(4, "0")}-${timestamp}-${copyNumber}`;

          const shelf = shelves.find((s) => s.id === templateCopy.shelf_id);
          let locationCode = "";

          if (shelf) {
            const sectionCode = shelf.section
              ? shelf.section.substring(0, 3).toUpperCase()
              : "GEN";
            const bookCode = bookId.toString().padStart(4, "0");
            locationCode = `${sectionCode}-${bookCode}-${copyNumber}`;
          }

          newCopies.push({
            book_id: bookId,
            shelf_id: templateCopy.shelf_id,
            barcode: newBarcode,
            location_code: locationCode,
            status: templateCopy.status,
            condition: templateCopy.condition,
            acquisition_date: templateCopy.acquisition_date,
            copy_number: copyNumber,
          });
        }
        setGeneratedCopies(newCopies);
      });
  };

  const removeCopy = (index) => {
    setGeneratedCopies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (generatedCopies.length === 0) {
      setError("No copies have been generated. Please generate copies first.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Save each copy using API
      const results = await Promise.all(
        generatedCopies.map((copy) => window.api.addBookCopy(copy))
      );

      console.log("Added copies:", results);

      if (onSave) {
        onSave(results);
      }

      onClose();
    } catch (err) {
      console.error("Error saving book copies:", err);
      setError(`Failed to save book copies: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogTitle>
          Add Multiple Book Copies
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle>
        Add Multiple Book Copies
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {book && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Book: {book.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Author: {book.author}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ISBN: {book.isbn || "N/A"}
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              1. Configure Template for New Copies
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="shelf-label">Shelf Location</InputLabel>
              <Select
                labelId="shelf-label"
                name="shelf_id"
                value={templateCopy.shelf_id}
                label="Shelf Location"
                onChange={handleTemplateChange}
              >
                {shelves.map((shelf) => (
                  <MenuItem key={shelf.id} value={shelf.id}>
                    {shelf.name} ({shelf.location})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="condition-label">Condition</InputLabel>
              <Select
                labelId="condition-label"
                name="condition"
                value={templateCopy.condition}
                label="Condition"
                onChange={handleTemplateChange}
              >
                <MenuItem value="New">New</MenuItem>
                <MenuItem value="Excellent">Excellent</MenuItem>
                <MenuItem value="Good">Good</MenuItem>
                <MenuItem value="Fair">Fair</MenuItem>
                <MenuItem value="Poor">Poor</MenuItem>
                <MenuItem value="Damaged">Damaged</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                name="status"
                value={templateCopy.status}
                label="Status"
                onChange={handleTemplateChange}
              >
                <MenuItem value="Available">Available</MenuItem>
                <MenuItem value="Processing">Processing</MenuItem>
                <MenuItem value="On Hold">On Hold</MenuItem>
                <MenuItem value="Reserved">Reserved</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              name="acquisition_date"
              label="Acquisition Date"
              type="date"
              fullWidth
              value={templateCopy.acquisition_date}
              onChange={handleTemplateChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              2. Generate Copies
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              name="numCopies"
              label="Number of Copies to Create"
              type="number"
              fullWidth
              value={numCopies}
              onChange={(e) => setNumCopies(parseInt(e.target.value) || 1)}
              InputProps={{ inputProps: { min: 1, max: 50 } }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ height: "100%" }}
              startIcon={<RefreshIcon />}
              onClick={generateCopies}
            >
              Generate Copies
            </Button>
          </Grid>

          {generatedCopies.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                3. Review Generated Copies
              </Typography>

              <TableContainer component={Paper} sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Barcode</TableCell>
                      <TableCell>Location Code</TableCell>
                      <TableCell>Shelf</TableCell>
                      <TableCell>Condition</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generatedCopies.map((copy, index) => {
                      const shelf = shelves.find((s) => s.id === copy.shelf_id);
                      return (
                        <TableRow key={index}>
                          <TableCell>{copy.barcode}</TableCell>
                          <TableCell>{copy.location_code}</TableCell>
                          <TableCell>{shelf ? shelf.name : "N/A"}</TableCell>
                          <TableCell>
                            <Chip
                              label={copy.condition}
                              size="small"
                              color={
                                copy.condition === "New" ||
                                copy.condition === "Excellent"
                                  ? "success"
                                  : copy.condition === "Good"
                                  ? "primary"
                                  : copy.condition === "Fair"
                                  ? "warning"
                                  : "error"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={copy.status}
                              size="small"
                              color={
                                copy.status === "Available" ? "success" : "info"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove this copy">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeCopy(index)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || generatedCopies.length === 0}
          startIcon={<LibraryBooks />}
        >
          {saving ? "Saving..." : "Save All Copies"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MultipleCopiesForm;
