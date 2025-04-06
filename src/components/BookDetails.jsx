import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Tooltip,
} from "@mui/material";
import {
  Close,
  Edit,
  Delete,
  Add,
  Info,
  Book,
  BookmarkBorder,
  Bookmark,
  LibraryBooks,
  LocationOn,
} from "@mui/icons-material";
import BookCopiesInfo from "./BookCopiesInfo";
import BookActions from "./BookActions";
import BookCopyForm from "./BookCopyForm";
import MultipleCopiesForm from "./MultipleCopiesForm";

const BookDetails = ({ bookId, onClose, onEdit, onDelete }) => {
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [openCopyForm, setOpenCopyForm] = useState(false);
  const [openMultipleCopiesForm, setOpenMultipleCopiesForm] = useState(false);
  const [selectedCopyId, setSelectedCopyId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        const data = await window.api.getBookById(bookId);
        setBook(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching book details:", err);
        setError("Failed to load book details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchBookDetails();
    }
  }, [bookId, refreshTrigger]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBorrowCopy = (copyId) => {
    // Redirect to loan management with the specific copy ID
    if (window.location.hash !== "#/loan-management") {
      window.location.hash = "#/loan-management";
    }

    // Store the copy ID in localStorage so loan management can access it
    localStorage.setItem("selectedBookCopyId", copyId);
    localStorage.setItem("redirectToBorrow", "true");
    console.log(`Preparing to borrow copy with ID: ${copyId}`);

    // Close the book details dialog
    onClose();
  };

  const handleAddCopy = () => {
    setSelectedCopyId(null);
    setOpenCopyForm(true);
  };

  const handleEditCopy = (copyId) => {
    setSelectedCopyId(copyId);
    setOpenCopyForm(true);
  };

  const handleAddMultipleCopies = () => {
    setOpenMultipleCopiesForm(true);
  };

  const handleCloseCopyForm = () => {
    setOpenCopyForm(false);
    setSelectedCopyId(null);
  };

  const handleCloseMultipleCopiesForm = () => {
    setOpenMultipleCopiesForm(false);
  };

  const handleSaveCopy = () => {
    handleCloseCopyForm();
    // Refresh the data
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSaveMultipleCopies = () => {
    handleCloseMultipleCopiesForm();
    // Refresh the data
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogTitle>
          Book Details
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

  if (error) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogTitle>
          Book Details
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">{error}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!book) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogTitle>
          Book Details
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info">No book information available.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} maxWidth="md" fullWidth>
      <DialogTitle>
        Book Details
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            {book.front_cover ? (
              <Box
                component="img"
                src={book.front_cover}
                alt={`Cover for ${book.title}`}
                sx={{
                  width: "100%",
                  borderRadius: 1,
                  boxShadow: 3,
                  maxHeight: "300px",
                  objectFit: "contain",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: 300,
                  bgcolor: book.cover_color || "#6B4226",
                  borderRadius: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#fff",
                  boxShadow: 3,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    p: 2,
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {book.title}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
              <BookActions
                book={book}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddCopy={handleAddCopy}
                onAddMultipleCopies={handleAddMultipleCopies}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom>
              {book.title}
            </Typography>

            <Typography variant="h6" color="text.secondary" gutterBottom>
              by {book.author}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <Chip
                label={book.category || "Uncategorized"}
                color="primary"
                variant="outlined"
              />
              <Chip label={`ISBN: ${book.isbn || "N/A"}`} variant="outlined" />
              <Chip
                label={book.status}
                color={
                  book.status === "Available"
                    ? "success"
                    : book.status === "Checked Out"
                    ? "warning"
                    : "error"
                }
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              {book.publisher && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Publisher</Typography>
                  <Typography variant="body2">{book.publisher}</Typography>
                </Grid>
              )}

              {book.publish_year && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Publication Year</Typography>
                  <Typography variant="body2">{book.publish_year}</Typography>
                </Grid>
              )}
            </Grid>

            {book.description && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography variant="body2" paragraph>
                  {book.description}
                </Typography>
              </Box>
            )}
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />

            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Copies & Availability" icon={<Book />} />
              <Tab label="Loan History" icon={<LibraryBooks />} />
            </Tabs>

            <Box sx={{ mt: 2 }}>
              {tabValue === 0 && (
                <BookCopiesInfo
                  bookId={bookId}
                  onBorrowCopy={handleBorrowCopy}
                  onEditCopy={handleEditCopy}
                  refreshKey={refreshTrigger}
                />
              )}

              {tabValue === 1 && (
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Loan History
                  </Typography>
                  <Alert severity="info">
                    Loan history feature coming soon.
                  </Alert>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Single Copy Form Dialog */}
      {openCopyForm && (
        <BookCopyForm
          open={openCopyForm}
          bookId={bookId}
          copyId={selectedCopyId}
          onClose={handleCloseCopyForm}
          onSave={handleSaveCopy}
        />
      )}

      {/* Multiple Copies Form Dialog */}
      {openMultipleCopiesForm && (
        <MultipleCopiesForm
          open={openMultipleCopiesForm}
          bookId={bookId}
          onClose={handleCloseMultipleCopiesForm}
          onSave={handleSaveMultipleCopies}
        />
      )}
    </Dialog>
  );
};

export default BookDetails;
