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
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

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
  const [profile, setProfile] = useState(null);
  const [loans, setLoans] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [pastLoans, setPastLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Set active tab based on URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "loans") {
      setTabValue(1);
    }
  }, [location]);

  // Fetch member profile and loans
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        // Get member profile
        const memberProfile = await window.api.getMemberProfile(currentUser.id);
        setProfile(memberProfile);

        // Get loans
        const loanData = await window.api.getLoansByMember(currentUser.id);
        setLoans(loanData);

        // Separate active and past loans
        setActiveLoans(loanData.filter((loan) => !loan.return_date));
        setPastLoans(loanData.filter((loan) => loan.return_date));

        // Generate QR code for member
        generateQRCode(memberProfile);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [currentUser, navigate]);

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
                  color={profile.status === "Active" ? "success" : "default"}
                />
              </Typography>
            </Box>
          </Box>

          {/* Tabs navigation */}
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="profile tabs"
              variant="fullWidth"
            >
              <Tab
                label="Profile Information"
                id="profile-tab-0"
                aria-controls="profile-tabpanel-0"
                icon={<PersonIcon />}
                iconPosition="start"
              />
              <Tab
                label={`Loan History (${loans.length})`}
                id="profile-tab-1"
                aria-controls="profile-tabpanel-1"
                icon={<BookIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Profile information tab */}
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
                      <ListItem sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.light" }}>
                            <EmailIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Email"
                          secondary={profile.email || "Not provided"}
                        />
                      </ListItem>
                      <ListItem sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.light" }}>
                            <PhoneIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Phone"
                          secondary={profile.phone || "Not provided"}
                        />
                      </ListItem>
                      <ListItem sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.light" }}>
                            <LocationIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Address"
                          secondary={profile.address || "Not provided"}
                        />
                      </ListItem>
                      <ListItem sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.light" }}>
                            <CalendarIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Date of Birth"
                          secondary={
                            profile.date_of_birth
                              ? formatDate(profile.date_of_birth)
                              : "Not provided"
                          }
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Membership Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ textAlign: "center", mb: 3 }}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Membership QR Code
                      </Typography>
                      <Box
                        component="img"
                        src={qrCodeUrl}
                        alt="Membership QR Code"
                        sx={{
                          width: 150,
                          height: 150,
                          display: "block",
                          margin: "0 auto",
                          border: "1px solid #eee",
                          borderRadius: 1,
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1 }}
                      >
                        Scan this code at the library
                      </Typography>
                    </Box>

                    <List>
                      <ListItem sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "secondary.light" }}>
                            <StarRateIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Membership Type"
                          secondary={profile.membership_type || "Standard"}
                        />
                      </ListItem>
                      <ListItem sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "secondary.light" }}>
                            <EventAvailableIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Member Since"
                          secondary={
                            profile.created_at
                              ? formatDate(profile.created_at)
                              : "Unknown"
                          }
                        />
                      </ListItem>
                      <ListItem sx={{ py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "secondary.light" }}>
                            <BookIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Active Loans"
                          secondary={`${activeLoans.length} books currently borrowed`}
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
            {loans.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <BookIcon
                  sx={{ fontSize: 60, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6">No Loan History</Typography>
                <Typography variant="body2" color="text.secondary">
                  You haven't borrowed any books yet
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={() => navigate("/books")}
                >
                  Browse Books
                </Button>
              </Box>
            ) : (
              <>
                {activeLoans.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Current Loans
                    </Typography>
                    <List>
                      {activeLoans.map((loan) => (
                        <Paper
                          key={loan.id}
                          sx={{
                            mb: 2,
                            borderLeft: isLoanOverdue(loan)
                              ? "4px solid #f44336" // red for overdue
                              : "4px solid #4caf50", // green for current
                          }}
                        >
                          <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                              <Avatar
                                sx={{ bgcolor: loan.book_color || "#6B4226" }}
                                variant="rounded"
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
                                    Borrowed: {formatDate(loan.checkout_date)}
                                  </Typography>
                                  {" — "}
                                  Due: {formatDate(loan.due_date)}
                                  {isLoanOverdue(loan) && (
                                    <Chip
                                      icon={<WarningIcon />}
                                      label="Overdue"
                                      size="small"
                                      color="error"
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </React.Fragment>
                              }
                            />
                          </ListItem>
                        </Paper>
                      ))}
                    </List>
                  </Box>
                )}

                {pastLoans.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Past Loans
                    </Typography>
                    <List>
                      {pastLoans.map((loan) => (
                        <Paper
                          key={loan.id}
                          sx={{ mb: 2, borderLeft: "4px solid #9e9e9e" }} // gray for returned
                        >
                          <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                              <Avatar
                                sx={{ bgcolor: loan.book_color || "#6B4226" }}
                                variant="rounded"
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
                                    Borrowed: {formatDate(loan.checkout_date)}
                                  </Typography>
                                  {" — "}
                                  Returned: {formatDate(loan.return_date)}
                                </React.Fragment>
                              }
                            />
                          </ListItem>
                        </Paper>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            )}
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default MemberProfile;
