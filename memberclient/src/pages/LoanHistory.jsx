import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Chip,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Rating,
  TextField,
} from "@mui/material";
import {
  Book as BookIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  AssignmentReturn as ReturnIcon,
  History as HistoryIcon,
  PersonOutline as PersonIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Print as PrintIcon,
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
      id={`loan-tabpanel-${index}`}
      aria-labelledby={`loan-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const LoanHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { sendSocketMessage } = useServer();
  const [loans, setLoans] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [pastLoans, setPastLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [returnLoading, setReturnLoading] = useState(false);
  const [bookRating, setBookRating] = useState(0);
  const [bookReview, setBookReview] = useState("");

  // Receipt state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [returnQRCode, setReturnQRCode] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Set active tab based on URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "overdue") {
      setTabValue(1);
    } else if (tab === "past") {
      setTabValue(2);
    } else if (tab === "current") {
      setTabValue(0);
    }
  }, [location]);

  // Fetch loan history data
  const fetchLoanData = useCallback(async () => {
    if (!currentUser) {
      console.error("No current user found, navigating to login");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching loan history data for user:", currentUser);

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

      console.log("Using user ID for loan lookup:", userId, typeof userId);

      // Get loans
      try {
        const loanData = await window.api.getLoansByMember(userId);
        console.log("API Response for loans:", loanData);

        if (!loanData || loanData.length === 0) {
          console.log("No loans found for user");
          setLoans([]);
          setActiveLoans([]);
          setOverdueLoans([]);
          setPastLoans([]);
          return;
        }

        setLoans(loanData);

        // Separate active, overdue, and past loans
        const currentDate = new Date();

        const active = [];
        const overdue = [];

        // Process active loans and identify overdue ones
        loanData
          .filter((loan) => !loan.return_date)
          .forEach((loan) => {
            console.log("Processing active loan:", loan);
            const dueDate = new Date(loan.due_date);
            if (dueDate < currentDate) {
              console.log("Loan is overdue:", loan.book_title);
              overdue.push(loan);
            } else {
              console.log("Loan is active (not overdue):", loan.book_title);
              active.push(loan);
            }
          });

        console.log("Active loans:", active.length);
        console.log("Overdue loans:", overdue.length);

        setActiveLoans(active);
        setOverdueLoans(overdue);

        const past = loanData.filter((loan) => loan.return_date);
        console.log("Past loans:", past.length);
        setPastLoans(past);
      } catch (loanError) {
        console.error("Specific error fetching loans:", loanError);

        // Try getting loans with numeric ID if string was used
        try {
          console.log("Attempting to retry with numeric ID");
          const numericId = parseInt(currentUser.id);
          if (!isNaN(numericId)) {
            console.log("Retrying with numeric ID:", numericId);
            const loanData = await window.api.getLoansByMember(numericId);
            console.log("Retry response:", loanData);

            if (loanData && loanData.length > 0) {
              setLoans(loanData);

              // Process loans as before
              const currentDate = new Date();
              const active = [];
              const overdue = [];

              loanData
                .filter((loan) => !loan.return_date)
                .forEach((loan) => {
                  const dueDate = new Date(loan.due_date);
                  if (dueDate < currentDate) {
                    overdue.push(loan);
                  } else {
                    active.push(loan);
                  }
                });

              setActiveLoans(active);
              setOverdueLoans(overdue);
              setPastLoans(loanData.filter((loan) => loan.return_date));
            }
          }
        } catch (retryError) {
          console.error("Retry with numeric ID also failed:", retryError);
        }
      }
    } catch (error) {
      console.error("Error fetching loan data:", error);
      setSnackbar({
        open: true,
        message: "Failed to load loan history. Please try again later.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, navigate]);

  // Fetch loan data on component mount
  useEffect(() => {
    fetchLoanData();
  }, [fetchLoanData]);

  // Add an event listener to refresh data when the window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("Window focused, refreshing loan history data");
      fetchLoanData();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchLoanData]);

  // Listen to route changes to refresh data
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.hash.startsWith("#/loans")) {
        console.log("Returned to LoanHistory, refreshing data");
        fetchLoanData();
      }
    };

    window.addEventListener("hashchange", handleRouteChange);

    return () => {
      window.removeEventListener("hashchange", handleRouteChange);
    };
  }, [fetchLoanData]);

  // Update URL when tab changes manually
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    const tabNames = ["current", "overdue", "past"];
    navigate(`/loans?tab=${tabNames[newValue]}`, { replace: true });
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    try {
      const options = { year: "numeric", month: "short", day: "numeric" };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const calculateDaysOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = Math.abs(today - due);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleOpenReturnDialog = (loan) => {
    console.log("Opening return dialog for loan:", loan);
    setSelectedLoan(loan);
    setReturnDialogOpen(true);
  };

  const handleReturnBook = async () => {
    if (!selectedLoan) return;

    try {
      setReturnLoading(true);
      console.log("Returning book with loan ID:", selectedLoan.id);

      const result = await window.api.returnBook({
        loan_id: selectedLoan.id,
        member_id: currentUser.id,
        rating: bookRating > 0 ? bookRating : undefined,
        review: bookReview.trim() || undefined,
      });

      console.log("Return book result:", result);

      if (result.success) {
        // Generate return receipt data
        const returnDate = new Date();
        const receiptData = {
          transaction_id: `RET-${Date.now()}`,
          loan_id: selectedLoan.id,
          book_title: selectedLoan.book_title,
          book_id: selectedLoan.book_id,
          member_name: currentUser.name || currentUser.username,
          member_id: currentUser.id,
          borrow_date: selectedLoan.loan_date,
          return_date: returnDate.toISOString(),
          rating: bookRating,
          review: bookReview.trim() || undefined,
        };

        setReceiptData(receiptData);

        // Generate QR code for the receipt
        setReturnQRCode(
          `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=RETURN_${
            selectedLoan.id
          }_${returnDate.getTime()}`
        );

        // Update the loan in the active loans list
        const updatedLoan = {
          ...selectedLoan,
          return_date: returnDate.toISOString(),
          status: "Returned",
          rating: bookRating,
          review: bookReview,
        };

        setActiveLoans((prevLoans) =>
          prevLoans.filter((loan) => loan.id !== selectedLoan.id)
        );

        setPastLoans((prevLoans) => [...prevLoans, updatedLoan]);

        // Update loans by status
        updateLoansByStatus();

        // Notify server via socket if available
        if (typeof window.socket !== "undefined" && window.socket) {
          window.socket.emit("book_return_notification", {
            member_id: currentUser.id,
            book_id: selectedLoan.book_id,
            loan_id: selectedLoan.id,
          });
        }

        // Show success message
        setSnackbar({
          open: true,
          message: result.message || "Book returned successfully",
          severity: "success",
        });

        // Close return dialog and show receipt
        setReturnDialogOpen(false);
        setReceiptDialogOpen(true);
      } else {
        // Show error message
        setSnackbar({
          open: true,
          message: result.message || "Failed to return book",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error returning book:", error);
      setSnackbar({
        open: true,
        message: "Error returning book. Please try again.",
        severity: "error",
      });
    } finally {
      setReturnLoading(false);
    }
  };

  const handleCloseReceiptDialog = () => {
    setReceiptDialogOpen(false);
    setReceiptData(null);
    setReturnQRCode("");
    setBookRating(0);
    setBookReview("");
  };

  const handlePrintReceipt = () => {
    const receiptWindow = window.open("", "_blank");

    if (receiptWindow) {
      const html = `
        <html>
          <head>
            <title>Return Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
              .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
              .qr-code { text-align: center; margin: 20px 0; }
              .details { margin-bottom: 20px; }
              .details div { margin-bottom: 5px; }
              .footer { text-align: center; border-top: 1px solid #eee; padding-top: 10px; font-size: 12px; }
              .label { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>Balanghay Library</h2>
                <h3>Book Return Receipt</h3>
              </div>
              
              <div class="details">
                <div><span class="label">Transaction ID:</span> ${
                  receiptData.transaction_id
                }</div>
                <div><span class="label">Date:</span> ${new Date(
                  receiptData.return_date
                ).toLocaleString()}</div>
                <div><span class="label">Member:</span> ${
                  receiptData.member_name
                } (#${receiptData.member_id})</div>
                <div><span class="label">Book:</span> ${
                  receiptData.book_title
                }</div>
                <div><span class="label">Borrowed On:</span> ${new Date(
                  receiptData.borrow_date
                ).toLocaleDateString()}</div>
                <div><span class="label">Returned On:</span> ${new Date(
                  receiptData.return_date
                ).toLocaleDateString()}</div>
                ${
                  receiptData.rating
                    ? `<div><span class="label">Rating:</span> ${receiptData.rating}/5</div>`
                    : ""
                }
                ${
                  receiptData.review
                    ? `<div><span class="label">Review:</span> "${receiptData.review}"</div>`
                    : ""
                }
              </div>
              
              <div class="qr-code">
                <img src="${returnQRCode}" alt="Return QR Code" />
                <div>Scan to verify return</div>
              </div>
              
              <div class="footer">
                <p>Thank you for using Balanghay Library!</p>
                <p>For any questions, please contact us at library@balanghay.org</p>
              </div>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `;

      receiptWindow.document.open();
      receiptWindow.document.write(html);
      receiptWindow.document.close();
    } else {
      setSnackbar({
        open: true,
        message: "Popup blocked. Please allow popups to print receipts.",
        severity: "warning",
      });
    }
  };

  const updateLoansByStatus = () => {
    const currentDate = new Date();

    // Create active and overdue lists based on current loans
    const active = [];
    const overdue = [];

    loans
      .filter((loan) => !loan.return_date)
      .forEach((loan) => {
        const dueDate = new Date(loan.due_date);
        if (dueDate < currentDate) {
          overdue.push(loan);
        } else {
          active.push(loan);
        }
      });

    setActiveLoans(active);
    setOverdueLoans(overdue);

    // Update past loans
    const past = loans.filter((loan) => loan.return_date);
    setPastLoans(past);
  };

  // Show loading indicator while fetching data
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading loan history...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, display: "flex", alignItems: "center" }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToDashboard}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Loan History
        </Typography>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label={`Current Loans (${activeLoans.length})`} />
          <Tab
            label={`Overdue Loans (${overdueLoans.length})`}
            sx={{ color: overdueLoans.length > 0 ? "error.main" : "inherit" }}
          />
          <Tab label={`Past Loans (${pastLoans.length})`} />
        </Tabs>

        {/* Current Loans Tab */}
        <TabPanel value={tabValue} index={0}>
          {activeLoans.length === 0 ? (
            <Paper
              sx={{
                p: 3,
                textAlign: "center",
                bgcolor: "background.default",
              }}
            >
              <Typography variant="body1" color="text.secondary">
                You have no current loans.
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
              {activeLoans.map((loan) => (
                <Grid item xs={12} key={loan.id}>
                  <Paper
                    sx={{
                      p: 2,
                      borderLeft: "4px solid #4caf50",
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
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        Borrowed: {formatDate(loan.loan_date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
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
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Overdue Loans Tab */}
        <TabPanel value={tabValue} index={1}>
          {overdueLoans.length === 0 ? (
            <Paper
              sx={{
                p: 3,
                textAlign: "center",
                bgcolor: "background.default",
              }}
            >
              <Typography variant="body1" color="text.secondary">
                You have no overdue loans. Great job!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {overdueLoans.map((loan) => {
                const daysOverdue = calculateDaysOverdue(loan.due_date);
                return (
                  <Grid item xs={12} key={loan.id}>
                    <Paper
                      sx={{
                        p: 2,
                        borderLeft: "4px solid #f44336",
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
                          <Chip
                            icon={<WarningIcon />}
                            label={`${daysOverdue} ${
                              daysOverdue === 1 ? "day" : "days"
                            } overdue`}
                            color="error"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          Borrowed: {formatDate(loan.loan_date)}
                        </Typography>
                        <Typography variant="body2" color="error">
                          Due: {formatDate(loan.due_date)}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<ReturnIcon />}
                        onClick={() => handleOpenReturnDialog(loan)}
                        sx={{ ml: 2, flexShrink: 0 }}
                      >
                        Return Now
                      </Button>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </TabPanel>

        {/* Past Loans Tab */}
        <TabPanel value={tabValue} index={2}>
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
              {pastLoans.map((loan) => {
                const wasOverdue =
                  new Date(loan.return_date) > new Date(loan.due_date);
                return (
                  <Grid item xs={12} md={6} key={loan.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                          <Avatar
                            sx={{
                              bgcolor: loan.book_color || "#6B4226",
                              mr: 2,
                            }}
                          >
                            <BookIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1">
                              {loan.book_title}
                              {wasOverdue && (
                                <Chip
                                  label="Returned Late"
                                  color="warning"
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
                              color={
                                wasOverdue ? "warning.main" : "text.secondary"
                              }
                            >
                              Due: {formatDate(loan.due_date)}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="success.main"
                              sx={{ fontWeight: "bold" }}
                            >
                              Returned: {formatDate(loan.return_date)}
                            </Typography>
                            {loan.rating && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Rating: {loan.rating}/5
                              </Typography>
                            )}
                            {loan.review && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5, fontStyle: "italic" }}
                              >
                                "{loan.review}"
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* Return Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Return Book
          <IconButton
            aria-label="close"
            onClick={() => setReturnDialogOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedLoan && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedLoan.book_title}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Box
                  sx={{
                    mr: 2,
                    width: 80,
                    height: 120,
                    overflow: "hidden",
                    borderRadius: 1,
                  }}
                >
                  <img
                    src={selectedLoan.cover_image || "/default-book-cover.png"}
                    alt={selectedLoan.book_title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Borrowed on:{" "}
                    {new Date(selectedLoan.loan_date).toLocaleDateString()}
                  </Typography>
                  {selectedLoan.due_date && (
                    <Typography
                      variant="body2"
                      color={
                        new Date(selectedLoan.due_date) < new Date()
                          ? "error.main"
                          : "text.secondary"
                      }
                    >
                      Due on:{" "}
                      {new Date(selectedLoan.due_date).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                How was the book?
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography
                  component="legend"
                  variant="body2"
                  color="text.secondary"
                  gutterBottom
                >
                  Rate this book
                </Typography>
                <Rating
                  value={bookRating}
                  onChange={(event, newValue) => {
                    setBookRating(newValue);
                  }}
                  size="large"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  label="Write a review (optional)"
                  multiline
                  rows={3}
                  value={bookReview}
                  onChange={(e) => setBookReview(e.target.value)}
                  fullWidth
                  variant="outlined"
                  placeholder="Share your thoughts about this book..."
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <Button
                  onClick={() => setReturnDialogOpen(false)}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleReturnBook}
                  disabled={returnLoading}
                  startIcon={
                    returnLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <CheckIcon />
                    )
                  }
                >
                  {returnLoading ? "Processing..." : "Confirm Return"}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onClose={handleCloseReceiptDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Book Return Receipt
          <IconButton
            aria-label="close"
            onClick={handleCloseReceiptDialog}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {receiptData && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography variant="h5" component="div">
                  Balanghay Library
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Book Return Confirmation
                </Typography>
              </Box>

              <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Transaction ID
                    </Typography>
                    <Typography variant="body1">
                      {receiptData.transaction_id}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Date
                    </Typography>
                    <Typography variant="body1">
                      {new Date(receiptData.return_date).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Book
                    </Typography>
                    <Typography variant="h6">
                      {receiptData.book_title}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Borrowed On
                    </Typography>
                    <Typography variant="body1">
                      {new Date(receiptData.borrow_date).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Returned On
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: "success.main", fontWeight: "bold" }}
                    >
                      {new Date(receiptData.return_date).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  {receiptData.rating > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Rating
                      </Typography>
                      <Rating value={receiptData.rating} readOnly />
                    </Grid>
                  )}
                  {receiptData.review && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Review
                      </Typography>
                      <Typography variant="body1" sx={{ fontStyle: "italic" }}>
                        "{receiptData.review}"
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Scan QR code to verify return
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <img
                    src={returnQRCode}
                    alt="Return QR Code"
                    style={{ width: 150, height: 150 }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PrintIcon />}
                  onClick={handlePrintReceipt}
                >
                  Print Receipt
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default LoanHistory;
