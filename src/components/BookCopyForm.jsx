import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from "@mui/material";
import { Close, Save, QrCode, Bookmark, LocationOn } from "@mui/icons-material";

const BookCopyForm = ({ open, bookId, copyId, onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [book, setBook] = useState(null);
  const [shelves, setShelves] = useState([]);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    book_id: null,
    shelf_id: null,
    barcode: "",
    location_code: "",
    status: "Available",
    condition: "Good",
    acquisition_date: new Date().toISOString().split("T")[0],
    copy_number: 1,
  });

  // Fetch book details
  useEffect(() => {
    const fetchBookDetails = async () => {
      if (!bookId) return;

      try {
        const data = await window.api.getBookById(bookId);
        setBook(data);
        setFormData((prev) => ({
          ...prev,
          book_id: bookId,
        }));
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
      } catch (err) {
        console.error("Error fetching shelves:", err);
        setError("Failed to load shelves.");
      }
    };

    fetchShelves();
  }, []);

  // Fetch copy details if editing
  useEffect(() => {
    const fetchCopyDetails = async () => {
      if (!copyId) {
        // Generate a unique barcode for new copies
        if (book) {
          // Need to get existing copies to determine the next copy number
          try {
            const existingCopies = await window.api.getBookCopiesByBookId(
              bookId
            );
            const copyNumber = existingCopies ? existingCopies.length + 1 : 1;

            // Create a timestamp-based barcode
            const timestamp = new Date().getTime().toString().slice(-6);
            const newBarcode = `B${bookId
              .toString()
              .padStart(4, "0")}-${timestamp}`;

            setFormData((prev) => ({
              ...prev,
              barcode: newBarcode,
              copy_number: copyNumber,
            }));
          } catch (err) {
            console.error("Error getting existing copies:", err);
            // Fallback barcode generation
            const timestamp = new Date().getTime().toString().slice(-6);
            const newBarcode = `B${bookId
              .toString()
              .padStart(4, "0")}-${timestamp}`;

            setFormData((prev) => ({
              ...prev,
              barcode: newBarcode,
              copy_number: 1,
            }));
          }
        }
        setLoading(false);
        return;
      }

      try {
        const data = await window.api.getBookCopyById(copyId);
        setFormData({
          book_id: data.book_id,
          shelf_id: data.shelf_id,
          barcode: data.barcode,
          location_code: data.location_code || "",
          status: data.status || "Available",
          condition: data.condition || "Good",
          acquisition_date: data.acquisition_date
            ? new Date(data.acquisition_date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          copy_number: data.copy_number || 1,
        });
      } catch (err) {
        console.error("Error fetching book copy details:", err);
        setError("Failed to load book copy details.");
      } finally {
        setLoading(false);
      }
    };

    if (book || copyId) {
      fetchCopyDetails();
    }
  }, [copyId, book, bookId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const generateLocationCode = () => {
    if (!formData.shelf_id) return;

    const shelf = shelves.find((s) => s.id === formData.shelf_id);
    if (!shelf) return;

    // Create location code based on shelf section and book ID
    const sectionCode = shelf.section
      ? shelf.section.substring(0, 3).toUpperCase()
      : "GEN";
    const bookCode = bookId.toString().padStart(4, "0");
    const copyNumber = formData.barcode.split("-")[1] || "1";

    const locationCode = `${sectionCode}-${bookCode}-${copyNumber}`;

    setFormData({
      ...formData,
      location_code: locationCode,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Validation
    if (!formData.book_id || !formData.barcode) {
      setError("Book ID and barcode are required.");
      setSaving(false);
      return;
    }

    try {
      // If there's no location code and there is a shelf, generate a location code
      let updatedFormData = { ...formData };
      if (!formData.location_code && formData.shelf_id) {
        const shelf = shelves.find((s) => s.id === formData.shelf_id);
        if (shelf) {
          updatedFormData.location_code = `${shelf.code}-${formData.copy_number.toString().padStart(3, "0")}`;
        }
      }

      if (copyId) {
        // Update existing copy - note the different parameter format
        await window.api.updateBookCopy(copyId, updatedFormData);
      } else {
        // Add new copy
        await window.api.addBookCopy(updatedFormData);
      }

      // Navigate back
      onSave();
    } catch (err) {
      console.error("Error saving book copy:", err);
      setError("Failed to save book copy. " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogTitle>
          {copyId ? "Edit Book Copy" : "Add New Book Copy"}
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
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        {copyId ? "Edit Book Copy" : "Add New Book Copy"}
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
            <Typography variant="h6">{book.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              by {book.author}
            </Typography>
            <Chip
              label={book.isbn ? `ISBN: ${book.isbn}` : "No ISBN"}
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
        )}

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Barcode"
              name="barcode"
              value={formData.barcode}
              onChange={handleInputChange}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <QrCode sx={{ mr: 1, color: "action.active" }} />
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="shelf-label">Shelf Location</InputLabel>
              <Select
                labelId="shelf-label"
                name="shelf_id"
                value={formData.shelf_id || ""}
                onChange={handleInputChange}
                label="Shelf Location"
              >
                <MenuItem value="">
                  <em>Not shelved</em>
                </MenuItem>
                {shelves.map((shelf) => (
                  <MenuItem key={shelf.id} value={shelf.id}>
                    {shelf.name} ({shelf.location})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Location Code"
              name="location_code"
              value={formData.location_code}
              onChange={handleInputChange}
              fullWidth
              InputProps={{
                startAdornment: (
                  <LocationOn sx={{ mr: 1, color: "action.active" }} />
                ),
                endAdornment: formData.shelf_id ? (
                  <Button size="small" onClick={generateLocationCode}>
                    Generate
                  </Button>
                ) : null,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                label="Status"
              >
                <MenuItem value="Available">Available</MenuItem>
                <MenuItem value="Checked Out">Checked Out</MenuItem>
                <MenuItem value="Processing">Processing</MenuItem>
                <MenuItem value="Lost">Lost</MenuItem>
                <MenuItem value="Damaged">Damaged</MenuItem>
                <MenuItem value="On Hold">On Hold</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="condition-label">Condition</InputLabel>
              <Select
                labelId="condition-label"
                name="condition"
                value={formData.condition}
                onChange={handleInputChange}
                label="Condition"
              >
                <MenuItem value="New">New</MenuItem>
                <MenuItem value="Good">Good</MenuItem>
                <MenuItem value="Fair">Fair</MenuItem>
                <MenuItem value="Poor">Poor</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Acquisition Date"
              name="acquisition_date"
              type="date"
              value={formData.acquisition_date}
              onChange={handleInputChange}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookCopyForm;
