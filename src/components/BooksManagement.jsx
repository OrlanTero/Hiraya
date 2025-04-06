import React, { useState, useEffect, useRef } from "react";
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
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MenuBook as MenuBookIcon,
  PhotoCamera as CameraIcon,
  ColorLens as ColorIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
  LibraryBooks as LibraryBooksIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import BookDetails from "./BookDetails";
import BookCopyForm from "./BookCopyForm";

const BooksManagement = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openCopyDialog, setOpenCopyDialog] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedCopyId, setSelectedCopyId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [tabValue, setTabValue] = useState(0);
  const frontCoverRef = useRef(null);
  const backCoverRef = useRef(null);
  const spineCoverRef = useRef(null);

  const [currentBook, setCurrentBook] = useState({
    id: null,
    title: "",
    author: "",
    isbn: "",
    category: "",
    status: "Available",
    publisher: "",
    publish_year: "",
    description: "",
    front_cover: null,
    back_cover: null,
    spine_cover: null,
    cover_color: "#6B4226",
  });

  // Load books from the database
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const booksData = await window.api.getAllBooks();
        setBooks(booksData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching books:", error);
        setSnackbar({
          open: true,
          message: "Failed to load books",
          severity: "error",
        });
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.isbn && book.isbn.includes(searchTerm))
  );

  const handleOpenDialog = (book = null) => {
    if (book) {
      setCurrentBook({ ...book });
    } else {
      setCurrentBook({
        id: null,
        title: "",
        author: "",
        isbn: "",
        category: "",
        status: "Available",
        publisher: "",
        publish_year: "",
        description: "",
        front_cover: null,
        back_cover: null,
        spine_cover: null,
        cover_color: "#6B4226",
      });
    }
    setOpenDialog(true);
    setTabValue(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDetailsDialog = (bookId) => {
    setSelectedBookId(bookId);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedBookId(null);
  };

  const handleOpenCopyDialog = (bookId, copyId = null) => {
    setSelectedBookId(bookId);
    setSelectedCopyId(copyId);
    setOpenCopyDialog(true);
  };

  const handleCloseCopyDialog = () => {
    setOpenCopyDialog(false);
    setSelectedBookId(null);
    setSelectedCopyId(null);
  };

  const handleCopySaved = (copyData) => {
    setSnackbar({
      open: true,
      message: `Book copy ${selectedCopyId ? "updated" : "added"} successfully`,
      severity: "success",
    });

    // Refresh book data
    if (openDetailsDialog && selectedBookId) {
      // If details dialog is open, it will refresh its own data
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentBook({
      ...currentBook,
      [name]: value,
    });
  };

  const handleFileChange = async (event, coverType) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentBook({
          ...currentBook,
          [coverType]: e.target.result,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(`Error reading ${coverType}:`, error);
      setSnackbar({
        open: true,
        message: `Failed to upload image: ${error.message}`,
        severity: "error",
      });
    }
  };

  const handleClickUpload = (coverType) => {
    switch (coverType) {
      case "front_cover":
        frontCoverRef.current.click();
        break;
      case "back_cover":
        backCoverRef.current.click();
        break;
      case "spine_cover":
        spineCoverRef.current.click();
        break;
      default:
        break;
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSaveBook = async () => {
    try {
      let result;
      if (currentBook.id) {
        // Update existing book
        result = await window.api.updateBook(currentBook.id, currentBook);
        setSnackbar({
          open: true,
          message: "Book updated successfully",
          severity: "success",
        });
      } else {
        // Add new book
        result = await window.api.addBook(currentBook);
        setSnackbar({
          open: true,
          message: "Book added successfully",
          severity: "success",
        });
      }

      // Refresh the book list
      const updatedBooks = await window.api.getAllBooks();
      setBooks(updatedBooks);

      handleCloseDialog();
    } catch (error) {
      console.error("Error saving book:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to save book"}`,
        severity: "error",
      });
    }
  };

  const handleDeleteBook = async (id) => {
    try {
      await window.api.deleteBook(id);

      // Remove from local state
      setBooks(books.filter((book) => book.id !== id));

      setSnackbar({
        open: true,
        message: "Book deleted successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting book:", error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || "Failed to delete book"}`,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const renderCoverPreview = (coverType) => {
    const coverData = currentBook[coverType];

    if (coverData) {
      return (
        <Box
          component="img"
          src={coverData}
          alt={`${coverType.replace("_", " ")} preview`}
          sx={{
            width: "100%",
            height: "auto",
            maxHeight: "200px",
            objectFit: "contain",
            border: "1px solid #ddd",
            borderRadius: "4px",
            mb: 2,
          }}
        />
      );
    } else {
      // Show color block if no image
      return (
        <Box
          sx={{
            width: "100%",
            height: "200px",
            bgcolor: currentBook.cover_color,
            border: "1px solid #ddd",
            borderRadius: "4px",
            mb: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
          }}
        >
          {coverType === "front_cover" && (
            <Typography variant="h6">
              {currentBook.title || "Front Cover"}
            </Typography>
          )}
          {coverType === "back_cover" && (
            <Typography variant="body2">Back Cover</Typography>
          )}
          {coverType === "spine_cover" && (
            <Typography
              variant="body2"
              sx={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                transform: "rotate(180deg)",
                height: "80%",
              }}
            >
              {currentBook.title || "Spine"}
            </Typography>
          )}
        </Box>
      );
    }
  };

  const renderBookCoverForTable = (book) => {
    if (book.front_cover) {
      return (
        <Box
          component="img"
          src={book.front_cover}
          alt={`Cover for ${book.title}`}
          sx={{ width: 40, height: 60, objectFit: "cover", borderRadius: 1 }}
        />
      );
    } else {
      return (
        <Box
          sx={{
            width: 40,
            height: 60,
            bgcolor: book.cover_color || "#6B4226",
            borderRadius: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            fontSize: "8px",
            textAlign: "center",
            lineHeight: 1,
            p: 0.5,
          }}
        >
          {book.title}
        </Box>
      );
    }
  };

  const renderTabContent = () => {
    switch (tabValue) {
      case 0: // Basic Info
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                name="title"
                label="Title"
                value={currentBook.title || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                name="author"
                label="Author"
                value={currentBook.author || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="isbn"
                label="ISBN"
                value={currentBook.isbn || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="category"
                label="Category"
                value={currentBook.category || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={currentBook.status || "Available"}
                  label="Status"
                  onChange={handleInputChange}
                >
                  <MenuItem value="Available">Available</MenuItem>
                  <MenuItem value="Checked Out">Checked Out</MenuItem>
                  <MenuItem value="Reserved">Reserved</MenuItem>
                  <MenuItem value="Lost">Lost</MenuItem>
                  <MenuItem value="Damaged">Damaged</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="publisher"
                label="Publisher"
                value={currentBook.publisher || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="publish_year"
                label="Publication Year"
                type="number"
                value={currentBook.publish_year || ""}
                onChange={handleInputChange}
                inputProps={{ min: 1000, max: new Date().getFullYear() }}
              />
            </Grid>
          </Grid>
        );
      case 1: // Description
        return (
          <TextField
            fullWidth
            multiline
            rows={8}
            name="description"
            label="Book Description"
            value={currentBook.description || ""}
            onChange={handleInputChange}
            variant="outlined"
          />
        );
      case 2: // Cover Images
        return (
          <Grid container spacing={3}>
            {/* Hidden file inputs */}
            <input
              ref={frontCoverRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange(e, "front_cover")}
            />
            <input
              ref={backCoverRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange(e, "back_cover")}
            />
            <input
              ref={spineCoverRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFileChange(e, "spine_cover")}
            />

            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  name="cover_color"
                  label="Cover Color"
                  type="color"
                  value={currentBook.cover_color || "#6B4226"}
                  onChange={handleInputChange}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ColorIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  This color will be used if no cover images are uploaded
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Front Cover
              </Typography>
              {renderCoverPreview("front_cover")}
              <Button
                variant="outlined"
                startIcon={<CameraIcon />}
                onClick={() => handleClickUpload("front_cover")}
                fullWidth
              >
                Upload Front Cover
              </Button>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Back Cover
              </Typography>
              {renderCoverPreview("back_cover")}
              <Button
                variant="outlined"
                startIcon={<CameraIcon />}
                onClick={() => handleClickUpload("back_cover")}
                fullWidth
              >
                Upload Back Cover
              </Button>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" gutterBottom>
                Spine Cover
              </Typography>
              {renderCoverPreview("spine_cover")}
              <Button
                variant="outlined"
                startIcon={<CameraIcon />}
                onClick={() => handleClickUpload("spine_cover")}
                fullWidth
              >
                Upload Spine Cover
              </Button>
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
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
          Books Management
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
          Add New Book
        </Button>
      </Box>

      <Paper elevation={3} sx={{ mb: 4, p: 2, borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search books by title, author, or ISBN..."
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
                Cover
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Title
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Author
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                ISBN
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Category
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Status
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBooks.length > 0 ? (
              filteredBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>{renderBookCoverForTable(book)}</TableCell>
                  <TableCell>
                    <Tooltip
                      title={book.description || "No description available"}
                      arrow
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {book.title}
                        {book.description && (
                          <InfoIcon
                            fontSize="small"
                            sx={{ ml: 1, opacity: 0.5 }}
                          />
                        )}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.isbn}</TableCell>
                  <TableCell>{book.category}</TableCell>
                  <TableCell>
                    <Chip
                      label={book.status}
                      color={
                        book.status === "Available"
                          ? "success"
                          : book.status === "Checked Out"
                          ? "warning"
                          : book.status === "Reserved"
                          ? "info"
                          : "error"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Book Details">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleOpenDetailsDialog(book.id)}
                        sx={{ mr: 1 }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add Copy">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleOpenCopyDialog(book.id)}
                        sx={{ mr: 1 }}
                      >
                        <LibraryBooksIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Book">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(book)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Book">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteBook(book.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
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
                    <MenuBookIcon
                      sx={{
                        fontSize: 40,
                        color: "var(--secondary-dark)",
                        opacity: 0.6,
                      }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      No books found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? "Try different search terms"
                        : "Add a new book to get started"}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Book Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentBook.id ? "Edit Book" : "Add New Book"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab icon={<MenuBookIcon />} label="Basic Info" />
              <Tab icon={<DescriptionIcon />} label="Description" />
              <Tab icon={<CameraIcon />} label="Cover Images" />
            </Tabs>
          </Box>

          {renderTabContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveBook}
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

      {/* Book Details Dialog */}
      {openDetailsDialog && (
        <BookDetails
          bookId={selectedBookId}
          onClose={handleCloseDetailsDialog}
          onEdit={(book) => {
            handleCloseDetailsDialog();
            handleOpenDialog(book);
          }}
          onAddCopy={(book) => {
            handleCloseDetailsDialog();
            handleOpenCopyDialog(book.id);
          }}
        />
      )}

      {/* Book Copy Form Dialog */}
      {openCopyDialog && (
        <BookCopyForm
          open={openCopyDialog}
          bookId={selectedBookId}
          copyId={selectedCopyId}
          onClose={handleCloseCopyDialog}
          onSave={handleCopySaved}
        />
      )}

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

export default BooksManagement;
