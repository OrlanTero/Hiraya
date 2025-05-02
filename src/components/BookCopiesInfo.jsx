import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  LibraryBooks,
  CheckCircle,
  Cancel,
  Warning,
  Info,
  Room,
  Bookmark,
  MoveToInbox,
  Edit as EditIcon,
} from "@mui/icons-material";

const BookCopiesInfo = ({
  bookId,
  onBorrowCopy,
  onEditCopy,
  refreshKey = 0,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!bookId) return;

      try {
        setLoading(true);
        // Use window.api instead of fetch
        const data = await window.api.getBookAvailability(bookId);
        setAvailability(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching book availability:", err);
        setError(
          "Failed to load book copies information. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      fetchAvailability();
    }
  }, [bookId, refreshKey]);

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

  if (!availability) {
    return (
      <Alert severity="info">
        No copies information available for this book.
      </Alert>
    );
  }

  const {
    total_copies,
    available_copies,
    checked_out_copies,
    damaged_copies,
    available_copies_details,
  } = availability;

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 0, width: "100%" }}>
      <Typography variant="h6" gutterBottom>
        <LibraryBooks sx={{ mr: 1, verticalAlign: "middle" }} />
        Copies Information
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Box
            sx={{
              textAlign: "center",
              p: 1,
              bgcolor: "background.paper",
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="h6">{total_copies}</Typography>
            <Typography variant="body2" color="textSecondary">
              Total Copies
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box
            sx={{
              textAlign: "center",
              p: 1,
              bgcolor: "background.paper",
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="h6" color="success.main">
              {available_copies}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Available
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box
            sx={{
              textAlign: "center",
              p: 1,
              bgcolor: "background.paper",
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="h6" color="info.main">
              {checked_out_copies}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Checked Out
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box
            sx={{
              textAlign: "center",
              p: 1,
              bgcolor: "background.paper",
              borderRadius: 1,
              boxShadow: 1,
            }}
          >
            <Typography variant="h6" color="warning.main">
              {damaged_copies}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Damaged
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {available_copies > 0 ? (
        <>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{ fontWeight: "bold", mb: 2 }}
          >
            Available Copies:
          </Typography>
          <List
            sx={{ bgcolor: "background.paper", borderRadius: 1, width: "100%" }}
          >
            {available_copies_details.map((copy) => (
              <ListItem
                key={copy.id}
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": {
                    borderBottom: "none",
                  },
                }}
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title="Borrow this copy">
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => onBorrowCopy && onBorrowCopy(copy.id)}
                      >
                        Borrow
                      </Button>
                    </Tooltip>
                    {onEditCopy && (
                      <Tooltip title="Edit copy details">
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          onClick={() => onEditCopy(copy.id)}
                          startIcon={<EditIcon />}
                        >
                          Edit
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                }
              >
                <ListItemIcon>
                  <Bookmark />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      {copy.barcode}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" component="span">
                        Location:{" "}
                        {copy.shelf
                          ? `${copy.shelf.name} (${copy.shelf.location})`
                          : "Not shelved"}
                      </Typography>
                      <br />
                      <Typography variant="body2" component="span">
                        Call Number: {copy.location_code || "N/A"}
                      </Typography>
                      <br />
                      <Chip
                        size="small"
                        label={copy.condition || "Good"}
                        color={
                          copy.condition === "New"
                            ? "success"
                            : copy.condition === "Good"
                            ? "primary"
                            : copy.condition === "Fair"
                            ? "info"
                            : "warning"
                        }
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      ) : (
        <Alert severity="info">
          No copies are currently available. Please check back later or place a
          reservation.
        </Alert>
      )}
    </Paper>
  );
};

export default BookCopiesInfo;
