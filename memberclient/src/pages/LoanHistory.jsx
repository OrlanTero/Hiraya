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
} from "@mui/material";
import {
  Book as BookIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  AssignmentReturn as ReturnIcon,
  History as HistoryIcon,
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
    navigate(`/profile?tab=loans&loan_id=${loan.id}`);
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LoanHistory;
