import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Button,
  Chip,
  Tooltip,
  AppBar,
  Toolbar,
  Pagination,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  styled,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ArrowBack as ArrowBackIcon,
  Clear as ClearIcon,
  Book as BookIcon,
  LibraryBooks as LibraryBooksIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalLibrary as LocalLibraryIcon,
  Close as CloseIcon,
  StarRate as StarRateIcon,
  DateRange as DateRangeIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useServer } from "../contexts/ServerContext";

// Styled components for the book card
const BookWrapper = styled(Card)(({ theme, bookcolor }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[8],
  },
  position: "relative",
  overflow: "hidden",
}));

const BookSpine = styled(Box)(({ theme, bookcolor }) => ({
  width: "30px",
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  backgroundColor: bookcolor || theme.palette.primary.main,
  borderRight: "1px solid rgba(255,255,255,0.3)",
}));

const BookStatusChip = styled(Chip)(({ theme, status }) => ({
  position: "absolute",
  top: 10,
  right: 10,
  backgroundColor:
    status === "Available"
      ? theme.palette.success.main
      : theme.palette.error.main,
  color: theme.palette.common.white,
  fontWeight: "bold",
  zIndex: 1,
}));

// Book content wrapper
const BookContent = styled(CardContent)(({ theme }) => ({
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  paddingBottom: "16px !important", // Override the last child padding removal
  height: "calc(100% - 180px)", // Adjust according to image height
}));

const BookImage = styled(Box)(({ theme }) => ({
  height: 180,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
}));

const BookCatalog = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { sendSocketMessage } = useServer();

  // State
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedBook, setSelectedBook] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const booksPerPage = 12;

  // Fetch books function wrapped in useCallback for reuse
  const fetchBooks = useCallback(async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching all books from API...");
      const allBooks = await window.api.getAllBooks();
      console.log("Received books data:", allBooks);

      // Add default colors for books without cover images
      const booksWithColors = allBooks.map((book) => ({
        ...book,
        color: book.cover_color || book.color || generateBookColor(book.title),
        status: book.status || "Available",
      }));

      setBooks(booksWithColors);
      setFilteredBooks(booksWithColors);

      // Extract unique categories
      const uniqueCategories = [
        ...new Set(allBooks.map((book) => book.category).filter(Boolean)),
      ];
      setCategories(uniqueCategories);

      // Log the current user ID format for debugging
      console.log("Current user ID format:", {
        id: currentUser.id,
        type: typeof currentUser.id,
        memberId:
          parseInt(currentUser.id.toString().replace(/\D/g, ""), 10) ||
          currentUser.id,
      });
    } catch (error) {
      console.error("Error fetching books:", error);
      setSnackbar({
        open: true,
        message: "Failed to load books. Please try again later.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, navigate]);

  // Fetch books on component mount
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Add an event listener to refresh data when the window regains focus
  // This ensures data is up-to-date when returning from another tab/page
  useEffect(() => {
    const handleFocus = () => {
      console.log("Window focused, refreshing book data");
      fetchBooks();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchBooks]);

  // Listen to route changes to refresh data
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.hash === "#/books") {
        console.log("Returned to BookCatalog, refreshing data");
        fetchBooks();
      }
    };

    window.addEventListener("hashchange", handleRouteChange);

    return () => {
      window.removeEventListener("hashchange", handleRouteChange);
    };
  }, [fetchBooks]);

  // Generate consistent colors based on book title
  const generateBookColor = (title) => {
    if (!title) return "#7E57C2"; // Default color

    // Create a simple hash from the title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }

    // List of pleasing book spine colors
    const colors = [
      "#7E57C2", // Purple
      "#5C6BC0", // Indigo
      "#26A69A", // Teal
      "#EC407A", // Pink
      "#78909C", // Blue Grey
      "#FF7043", // Deep Orange
      "#9CCC65", // Light Green
      "#5C6BC0", // Indigo
      "#66BB6A", // Green
      "#8D6E63", // Brown
      "#42A5F5", // Blue
      "#FF5722", // Deep Orange
    ];

    // Use the hash to select a color
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Filter books when search/filter changes
  useEffect(() => {
    let result = [...books];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          (book.title && book.title.toLowerCase().includes(query)) ||
          (book.author && book.author.toLowerCase().includes(query)) ||
          (book.isbn && book.isbn.toLowerCase().includes(query)) ||
          (book.description && book.description.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      result = result.filter((book) => book.category === selectedCategory);
    }

    // Apply availability filter
    if (availabilityFilter !== "all") {
      result = result.filter((book) => book.status === availabilityFilter);
    }

    setFilteredBooks(result);
    setPage(1); // Reset to first page when filters change
  }, [searchQuery, selectedCategory, availabilityFilter, books]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
  };

  const handleAvailabilityChange = (event) => {
    setAvailabilityFilter(event.target.value);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setAvailabilityFilter("all");
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBorrowBook = async () => {
    if (!selectedBook || !currentUser) return;

    setBorrowLoading(true);

    try {
      console.log(
        `Attempting to borrow book: ${selectedBook.id} for user: ${currentUser.id}`
      );

      // Ensure IDs are numeric
      const memberId = parseInt(
        currentUser.id.toString().replace(/\D/g, ""),
        10
      );
      const bookId = parseInt(
        selectedBook.id.toString().replace(/\D/g, ""),
        10
      );

      if (isNaN(memberId) || isNaN(bookId)) {
        throw new Error(
          `Invalid ID format. Book ID: ${selectedBook.id}, User ID: ${currentUser.id}`
        );
      }

      const borrowData = {
        member_id: memberId,
        book_id: bookId,
        // Add a default due date - 14 days from now
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      };

      console.log("Sending borrow data:", borrowData);
      const result = await window.api.borrowBooks(borrowData);
      console.log("Borrow result:", result);

      if (result.success) {
        // Update book status in local state
        const updatedBooks = books.map((book) =>
          book.id === selectedBook.id
            ? { ...book, status: "Checked Out" }
            : book
        );

        setBooks(updatedBooks);
        setFilteredBooks(
          updatedBooks.filter(
            (book) =>
              (!searchQuery ||
                book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (book.isbn &&
                  book.isbn
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())) ||
                (book.description &&
                  book.description
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()))) &&
              (!selectedCategory || book.category === selectedCategory) &&
              (availabilityFilter === "all" ||
                book.status === availabilityFilter)
          )
        );

        // Notify server via socket
        sendSocketMessage &&
          sendSocketMessage("book_borrowed", {
            bookId: bookId,
            bookTitle: selectedBook.title,
            memberId: memberId,
            memberName: currentUser.name || currentUser.username,
          });

        setSnackbar({
          open: true,
          message:
            result.message || `Successfully borrowed "${selectedBook.title}"`,
          severity: "success",
        });

        // Close dialog
        setDialogOpen(false);
      } else {
        throw new Error(result.message || "Failed to borrow book");
      }
    } catch (error) {
      console.error("Error borrowing book:", error);
      setSnackbar({
        open: true,
        message: `Failed to borrow book: ${error.message || "Unknown error"}`,
        severity: "error",
      });
    } finally {
      setBorrowLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get current page books
  const indexOfLastBook = page * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBackToDashboard}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Book Catalog
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body2" color="inherit" sx={{ mr: 1 }}>
              {filteredBooks.length} books found
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 3, mb: 8, flexGrow: 1 }}>
        {/* Search and filter controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Books"
                variant="outlined"
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearchQuery("")} edge="end">
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  label="Category"
                >
                  <MenuItem value="">
                    <em>All Categories</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Availability</InputLabel>
                <Select
                  value={availabilityFilter}
                  onChange={handleAvailabilityChange}
                  label="Availability"
                >
                  <MenuItem value="all">All Books</MenuItem>
                  <MenuItem value="Available">Available</MenuItem>
                  <MenuItem value="Checked Out">Checked Out</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Book grid */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredBooks.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <LibraryBooksIcon
              sx={{ fontSize: 60, color: "text.secondary", mb: 2 }}
            />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              No Books Found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Try adjusting your search or filters to find what you're looking
              for.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleClearFilters}
              sx={{ mt: 2 }}
            >
              Clear All Filters
            </Button>
          </Paper>
        ) : (
          <>
            <Grid container spacing={3}>
              {currentBooks.map((book) => (
                <Grid item key={book.id} xs={12} sm={6} md={4} lg={3}>
                  <BookWrapper
                    bookcolor={book.color}
                    onClick={() => handleBookClick(book)}
                  >
                    <BookStatusChip
                      label={book.status || "Available"}
                      status={book.status || "Available"}
                      size="small"
                      icon={
                        book.status === "Available" ? (
                          <CheckCircleIcon />
                        ) : (
                          <CancelIcon />
                        )
                      }
                    />
                    <BookSpine bookcolor={book.color} />
                    <CardActionArea sx={{ height: "100%", pl: "30px" }}>
                      {book.cover_image ? (
                        <BookImage>
                          <img src={book.cover_image} alt={book.title} />
                        </BookImage>
                      ) : (
                        <BookImage
                          sx={{
                            bgcolor: alpha(book.color, 0.1),
                          }}
                        >
                          <BookIcon sx={{ fontSize: 80, color: book.color }} />
                        </BookImage>
                      )}
                      <BookContent>
                        <Typography variant="h6" component="div" noWrap>
                          {book.title}
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          noWrap
                        >
                          {book.author}
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                          }}
                        >
                          {book.category && (
                            <Chip
                              label={book.category}
                              size="small"
                              sx={{
                                bgcolor: alpha(book.color, 0.1),
                                color: book.color,
                              }}
                            />
                          )}
                        </Box>
                      </BookContent>
                    </CardActionArea>
                  </BookWrapper>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Book Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24,
          },
        }}
      >
        {selectedBook && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: `4px solid ${
                  selectedBook.color || theme.palette.primary.main
                }`,
                py: 2,
                bgcolor: alpha(
                  selectedBook.color || theme.palette.primary.main,
                  0.1
                ),
              }}
            >
              <Typography variant="h5" component="div">
                {selectedBook.title}
              </Typography>
              <IconButton onClick={handleCloseDialog}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ py: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  {selectedBook.cover_image ? (
                    <Box
                      sx={{
                        borderRadius: 1,
                        overflow: "hidden",
                        boxShadow: 3,
                        height: 400,
                        width: "100%",
                        "& img": {
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        },
                      }}
                    >
                      <img
                        src={selectedBook.cover_image}
                        alt={selectedBook.title}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 400,
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                        boxShadow: 3,
                        bgcolor: alpha(
                          selectedBook.color || theme.palette.primary.main,
                          0.1
                        ),
                      }}
                    >
                      <BookIcon
                        sx={{
                          fontSize: 120,
                          color:
                            selectedBook.color || theme.palette.primary.main,
                        }}
                      />
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={selectedBook.status || "Available"}
                      color={
                        selectedBook.status === "Available"
                          ? "success"
                          : "error"
                      }
                      sx={{ width: "100%", py: 2, fontSize: "1rem" }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Typography variant="h6" gutterBottom>
                    {selectedBook.title}
                  </Typography>

                  <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                    <PersonIcon sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="subtitle1">
                      {selectedBook.author || "Unknown Author"}
                    </Typography>
                  </Box>

                  {selectedBook.category && (
                    <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                      <CategoryIcon sx={{ mr: 1, color: "text.secondary" }} />
                      <Typography variant="body1">
                        {selectedBook.category}
                      </Typography>
                    </Box>
                  )}

                  {selectedBook.isbn && (
                    <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                      <BookIcon sx={{ mr: 1, color: "text.secondary" }} />
                      <Typography variant="body2">
                        ISBN: {selectedBook.isbn}
                      </Typography>
                    </Box>
                  )}

                  {selectedBook.publication_date && (
                    <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                      <DateRangeIcon sx={{ mr: 1, color: "text.secondary" }} />
                      <Typography variant="body2">
                        Published:{" "}
                        {new Date(
                          selectedBook.publication_date
                        ).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}

                  {selectedBook.rating && (
                    <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                      <StarRateIcon sx={{ mr: 1, color: "gold" }} />
                      <Typography variant="body2">
                        Rating: {selectedBook.rating}/5
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    Description
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{ maxHeight: "200px", overflow: "auto" }}
                  >
                    {selectedBook.description ||
                      "No description available for this book."}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseDialog} color="inherit">
                Close
              </Button>
              {selectedBook.status === "Available" && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<LocalLibraryIcon />}
                  onClick={handleBorrowBook}
                  disabled={borrowLoading}
                >
                  {borrowLoading ? "Borrowing..." : "Borrow Book"}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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

export default BookCatalog;
