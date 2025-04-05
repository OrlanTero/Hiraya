import React, { useState, useEffect } from "react";
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
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

const BookCatalog = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const booksPerPage = 12;

  // Fetch books on component mount
  useEffect(() => {
    const fetchBooks = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        const allBooks = await window.api.getAllBooks();
        setBooks(allBooks);
        setFilteredBooks(allBooks);

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(allBooks.map((book) => book.category).filter(Boolean)),
        ];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [currentUser, navigate]);

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

  const handleBookClick = (bookId) => {
    navigate(`/books/${bookId}`);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <Box sx={{ textAlign: "center", p: 4 }}>
            <LibraryBooksIcon
              sx={{ fontSize: 60, color: "text.secondary", mb: 2 }}
            />
            <Typography variant="h6">No Books Found</Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filters
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              onClick={handleClearFilters}
            >
              Clear All Filters
            </Button>
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {currentBooks.map((book) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      transition: "transform 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => handleBookClick(book.id)}
                      sx={{
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                      }}
                    >
                      {/* Availability chip */}
                      <Chip
                        label={book.status}
                        color={
                          book.status === "Available" ? "success" : "error"
                        }
                        size="small"
                        icon={
                          book.status === "Available" ? (
                            <CheckCircleIcon />
                          ) : (
                            <CancelIcon />
                          )
                        }
                        sx={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          zIndex: 1,
                        }}
                      />

                      {/* Book cover */}
                      <Box
                        sx={{
                          height: 200,
                          bgcolor: book.cover_color || "#6B4226",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          position: "relative",
                        }}
                      >
                        {book.front_cover ? (
                          <CardMedia
                            component="img"
                            height="200"
                            image={book.front_cover}
                            alt={book.title}
                          />
                        ) : (
                          <Box
                            sx={{ textAlign: "center", p: 2, color: "white" }}
                          >
                            <BookIcon sx={{ fontSize: 60 }} />
                            <Typography
                              variant="subtitle1"
                              component="div"
                              sx={{ mt: 1 }}
                            >
                              {book.title}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Book info */}
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div" noWrap>
                          {book.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          by {book.author}
                        </Typography>
                        {book.category && (
                          <Chip
                            label={book.category}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
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
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default BookCatalog;
