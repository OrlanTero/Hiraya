import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  Avatar,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Snackbar,
  Alert,
  alpha,
} from "@mui/material";
import {
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Book as BookIcon,
  StarRate as StarRateIcon,
  Warning as WarningIcon,
  EventAvailable as EventAvailableIcon,
  QrCode as QrCodeIcon,
  AssignmentReturn as ReturnIcon,
  Done as DoneIcon,
  ThumbUp as ThumbUpIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useServer } from "../contexts/ServerContext";

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MemberProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { sendSocketMessage } = useServer();
  const [profile, setProfile] = useState(null);
  const [loans, setLoans] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [pastLoans, setPastLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // State for book return functionality
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [returnLoading, setReturnLoading] = useState(false);
  const [bookRating, setBookRating] = useState(0);
  const [bookReview, setBookReview] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Set active tab based on URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "loans") {
      setTabValue(1);

      // Check if there's a loan_id parameter for auto-opening the return dialog
      const loanId = params.get("loan_id");
      if (loanId && loans.length > 0) {
        console.log("Found loan_id in URL:", loanId);

        // Find the loan by ID
        const loanToReturn = loans.find(
          (loan) => loan.id.toString() === loanId.toString()
        );

        if (loanToReturn) {
          console.log("Found loan to return:", loanToReturn);
          setSelectedLoan(loanToReturn);
          setReturnDialogOpen(true);
        }
      }
    }
  }, [location, loans]);

  // Fetch profile data function wrapped in useCallback for reuse
  const fetchProfileData = React.useCallback(async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching member profile and loans data...");

      // Parse ID to integer if it's a string
      let userId = currentUser.id;
      if (typeof userId === "string") {
        const numericId = parseInt(userId, 10);
        if (!isNaN(numericId)) {
          console.log(
            `Converting user ID from string ${userId} to number ${numericId}`
          );
          userId = numericId;
        }
      }

      console.log("Using user ID for profile lookup:", userId, typeof userId);

      // Get member profile
      const memberProfile = await window.api.getMemberProfile(userId);
      setProfile(memberProfile);

      // Get loans
      const loanData = await window.api.getLoansByMember(userId);
      console.log("Received loans data:", loanData);

      setLoans(loanData);

      // Separate active and past loans
      setActiveLoans(loanData.filter((loan) => !loan.return_date));
      setPastLoans(loanData.filter((loan) => loan.return_date));

      // Generate QR code for member
      generateQRCode(memberProfile);
    } catch (error) {
      console.error("Error fetching profile data:", error);
      setSnackbar({
        open: true,
        message: "Failed to load profile data. Please try again later.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, navigate]);

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Add an event listener to refresh data when the window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("Window focused, refreshing member profile data");
      fetchProfileData();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchProfileData]);

  // Listen to route changes to refresh data
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.hash.startsWith("#/profile")) {
        console.log("Returned to MemberProfile, refreshing data");
        fetchProfileData();
      }
    };

    window.addEventListener("hashchange", handleRouteChange);

    return () => {
      window.removeEventListener("hashchange", handleRouteChange);
    };
  }, [fetchProfileData]);

  const generateQRCode = (profile) => {
    // In a real implementation, this would generate a QR code using a library
    // For now, just use a placeholder URL
    setQrCodeUrl(
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MEMBER_ID_${profile?.id}`
    );
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const isLoanOverdue = (loan) => {
    if (loan.return_date) return false;

    const today = new Date();
    const dueDate = new Date(loan.due_date);
    return dueDate < today;
  };

  // Open return dialog
  const handleOpenReturnDialog = (loan) => {
    setSelectedLoan(loan);
    setBookRating(0);
    setBookReview("");
    setReturnDialogOpen(true);
  };

  // Close return dialog
  const handleCloseReturnDialog = () => {
    setReturnDialogOpen(false);
    setSelectedLoan(null);
  };

  // Handle book return
  const handleReturnBook = async () => {
    if (!selectedLoan || !currentUser) return;

    setReturnLoading(true);

    try {
      console.log(
        `Attempting to return book: ${selectedLoan.book_id} for user: ${currentUser.id}`
      );

      const returnData = {
        loan_id: selectedLoan.id,
        member_id: currentUser.id,
        book_id: selectedLoan.book_id,
        rating: bookRating,
        review: bookReview,
        return_date: new Date().toISOString().split("T")[0],
      };

      const result = await window.api.returnBook(returnData);
      console.log("Return result:", result);

      if (result.success) {
        // Update loans state
        const updatedLoans = loans.map((loan) =>
          loan.id === selectedLoan.id
            ? { ...loan, return_date: returnData.return_date }
            : loan
        );

        setLoans(updatedLoans);

        // Update active and past loans
        setActiveLoans(updatedLoans.filter((loan) => !loan.return_date));
        setPastLoans(updatedLoans.filter((loan) => loan.return_date));

        // Notify server via socket
        sendSocketMessage &&
          sendSocketMessage("book_returned", {
            bookId: selectedLoan.book_id,
            bookTitle: selectedLoan.book_title,
            memberId: currentUser.id,
            memberName: currentUser.name || currentUser.username,
            rating: bookRating,
          });

        setSnackbar({
          open: true,
          message: `Successfully returned "${selectedLoan.book_title}"`,
          severity: "success",
        });

        // Close dialog
        setReturnDialogOpen(false);
      } else {
        throw new Error(result.message || "Failed to return book");
      }
    } catch (error) {
      console.error("Error returning book:", error);
      setSnackbar({
        open: true,
        message: `Failed to return book: ${error.message || "Unknown error"}`,
        severity: "error",
      });
    } finally {
      setReturnLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading profile...
        </Typography>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          p: 3,
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          Error: Could not load member profile
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleBackToDashboard}
          startIcon={<ArrowBackIcon />}
        >
          Return to Dashboard
        </Button>
      </Box>
    );
  }

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
            Member Profile
          </Typography>
          {activeLoans.length > 0 && (
            <Chip
              icon={<BookIcon />}
              label={`${activeLoans.length} Active Loans`}
              color="secondary"
              variant="outlined"
              sx={{ color: "white", borderColor: "white" }}
            />
          )}
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 3, mb: 4, flexGrow: 1 }}>
        <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
          {/* Profile header */}
          <Box
            sx={{
              p: 3,
              bgcolor: "primary.main",
              color: "white",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "secondary.main",
                color: "white",
                mr: 2,
              }}
            >
              {profile.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h4">{profile.name}</Typography>
              <Typography variant="subtitle1">
                <Chip
                  label={profile.membership_type}
                  size="small"
                  color="secondary"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={profile.status}
                  size="small"
                  color={profile.status === "Active" ? "success" : "error"}
                />
              </Typography>
            </Box>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Member Information" />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <span>Loan History</span>
                  {activeLoans.length > 0 && (
                    <Chip
                      label={activeLoans.length}
                      size="small"
                      color="primary"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              }
            />
            <Tab label="QR Code" />
          </Tabs>

          {/* Member info tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Personal Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <List>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary="Name" secondary={profile.name} />
                      </ListItem>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <EmailIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Email"
                          secondary={profile.email}
                        />
                      </ListItem>
                      {profile.phone && (
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar>
                              <PhoneIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Phone"
                            secondary={profile.phone}
                          />
                        </ListItem>
                      )}
                      {profile.address && (
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar>
                              <LocationIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Address"
                            secondary={profile.address}
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Membership Details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <List>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <CalendarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Member Since"
                          secondary={formatDate(profile.join_date)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <StarRateIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Membership Type"
                          secondary={profile.membership_type}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <EventAvailableIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Membership Expiry"
                          secondary={formatDate(profile.expiry_date)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <BookIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Total Books Borrowed"
                          secondary={loans.length}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Loan history tab */}
          <TabPanel value={tabValue} index={1}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Current Loans{" "}
                {activeLoans.length > 0 && `(${activeLoans.length})`}
              </Typography>
              {activeLoans.length === 0 ? (
                <Paper
                  sx={{
                    p: 3,
                    textAlign: "center",
                    bgcolor: "background.default",
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    You have no active loans.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate("/books")}
                    sx={{ mt: 2 }}
                  >
                    Browse Books
                  </Button>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {activeLoans.map((loan) => {
                    const isOverdue = isLoanOverdue(loan);
                    return (
                      <Grid item xs={12} key={loan.id}>
                        <Paper
                          sx={{
                            p: 2,
                            borderLeft: isOverdue
                              ? "4px solid #f44336"
                              : "4px solid #4caf50",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 60,
                              bgcolor: loan.book_color || "#6B4226",
                              mr: 2,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              color: "white",
                              flexShrink: 0,
                            }}
                          >
                            <BookIcon />
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1">
                              {loan.book_title}
                              {isOverdue && (
                                <Chip
                                  icon={<WarningIcon />}
                                  label="Overdue"
                                  color="error"
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              Borrowed: {formatDate(loan.loan_date)}
                            </Typography>
                            <Typography
                              variant="body2"
                              color={isOverdue ? "error" : "text.secondary"}
                              sx={{ fontWeight: isOverdue ? "bold" : "normal" }}
                            >
                              Due: {formatDate(loan.due_date)}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<ReturnIcon />}
                            onClick={() => handleOpenReturnDialog(loan)}
                            sx={{ ml: 2, flexShrink: 0 }}
                          >
                            Return
                          </Button>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Past Loans {pastLoans.length > 0 && `(${pastLoans.length})`}
              </Typography>
              {pastLoans.length === 0 ? (
                <Paper
                  sx={{
                    p: 3,
                    textAlign: "center",
                    bgcolor: "background.default",
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    You have no past loans.
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ overflow: "hidden" }}>
                  <List>
                    {pastLoans.map((loan, index) => (
                      <React.Fragment key={loan.id}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar
                              sx={{ bgcolor: loan.book_color || "#6B4226" }}
                            >
                              <BookIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={loan.book_title}
                            secondary={
                              <React.Fragment>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                >
                                  Borrowed: {formatDate(loan.loan_date)}
                                </Typography>
                                {" — "}
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                >
                                  Returned: {formatDate(loan.return_date)}
                                </Typography>
                              </React.Fragment>
                            }
                          />
                          {loan.rating && (
                            <ListItemSecondaryAction>
                              <Tooltip title={`Your rating: ${loan.rating}/5`}>
                                <Box
                                  sx={{ display: "flex", alignItems: "center" }}
                                >
                                  <Rating
                                    value={parseInt(loan.rating)}
                                    readOnly
                                    size="small"
                                  />
                                </Box>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                        {index < pastLoans.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          </TabPanel>

          {/* QR code tab */}
          <TabPanel value={tabValue} index={2}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                p: 3,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Your Membership QR Code
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                align="center"
                sx={{ maxWidth: 500, mb: 3 }}
              >
                Show this QR code at the library for quick and easy checkouts.
                Your member ID and basic information are encoded in this QR
                code.
              </Typography>
              <Paper
                elevation={4}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <img
                    src={qrCodeUrl}
                    alt="Member QR Code"
                    style={{ width: 200, height: 200 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Member ID: {profile.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {profile.name}
                </Typography>
              </Paper>
            </Box>
          </TabPanel>
        </Paper>
      </Container>

      {/* Return Book Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={handleCloseReturnDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Return Book</DialogTitle>
        <DialogContent>
          {selectedLoan && (
            <Box sx={{ pt: 1 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 3 }}>
                <Box
                  sx={{
                    width: 50,
                    height: 75,
                    bgcolor: selectedLoan.book_color || "#6B4226",
                    mr: 2,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "white",
                    flexShrink: 0,
                    borderRadius: 1,
                  }}
                >
                  <BookIcon />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {selectedLoan.book_title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Borrowed: {formatDate(selectedLoan.loan_date)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Due: {formatDate(selectedLoan.due_date)}
                  </Typography>
                  {isLoanOverdue(selectedLoan) && (
                    <Typography
                      variant="body2"
                      color="error.main"
                      sx={{ fontWeight: "bold", mt: 1 }}
                    >
                      This book is overdue. Late fees may apply.
                    </Typography>
                  )}
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="h6" gutterBottom>
                How was this book?
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Rate this book (optional)
                </Typography>
                <Rating
                  name="book-rating"
                  value={bookRating}
                  onChange={(event, newValue) => {
                    setBookRating(newValue);
                  }}
                  size="large"
                />
              </Box>

              <TextField
                label="Review (optional)"
                multiline
                rows={4}
                fullWidth
                variant="outlined"
                value={bookReview}
                onChange={(e) => setBookReview(e.target.value)}
                placeholder="Share your thoughts about this book..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnDialog}>Cancel</Button>
          <Button
            onClick={handleReturnBook}
            variant="contained"
            color="primary"
            startIcon={<DoneIcon />}
            disabled={returnLoading}
          >
            {returnLoading ? "Processing..." : "Confirm Return"}
          </Button>
        </DialogActions>
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

export default MemberProfile;
