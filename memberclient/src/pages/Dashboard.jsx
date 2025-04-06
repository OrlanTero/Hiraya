import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  Avatar,
  Badge,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  CircularProgress,
  Switch,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Book as BookIcon,
  LibraryBooks as LibraryBooksIcon,
  History as HistoryIcon,
  Bookmark as BookmarkIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

// Custom card for dashboard items
const DashboardCard = ({ title, icon, description, count, onClick, color }) => (
  <Card
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      transition: "transform 0.2s",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: 6,
      },
    }}
  >
    <CardActionArea
      onClick={onClick}
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
      }}
    >
      <Box
        sx={{
          p: 2,
          backgroundColor: color || "primary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {icon}
      </Box>
      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        {count !== undefined && (
          <Typography
            variant="h4"
            color="text.primary"
            sx={{ fontWeight: "bold", alignSelf: "flex-end" }}
          >
            {count}
          </Typography>
        )}
      </CardContent>
    </CardActionArea>
  </Card>
);

// Auth check wrapper component
const AuthCheck = ({ isAuthenticated, navigate, children }) => {
  useEffect(() => {
    console.log(
      "AuthCheck - Immediate check on isAuthenticated:",
      isAuthenticated
    );
    if (!isAuthenticated) {
      console.log("AuthCheck - Not authenticated, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return isAuthenticated ? children : null;
};

const Dashboard = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const {
    currentUser,
    isAuthenticated,
    logout,
    setCurrentUser,
    setIsAuthenticated,
    updateAuthStateFromExternalSource,
  } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [pastLoans, setPastLoans] = useState([]);
  const [overdueLoans, setOverdueLoans] = useState([]);
  const [bookCount, setBookCount] = useState(0);

  // CRITICAL FIX: Attempt to restore authentication state from sessionStorage on component mount
  useEffect(() => {
    const attemptAuthRestore = async () => {
      console.log("Dashboard - Attempting to restore auth state if needed");

      // If user is already authenticated in context, nothing to do
      if (isAuthenticated && currentUser) {
        console.log("Dashboard - User already authenticated in context");
        return;
      }

      try {
        // Check if we have auth data in location state (from navigation)
        const locationState = window.history.state?.usr;
        if (locationState?.forceAuth && locationState?.authenticatedUser) {
          console.log(
            "Dashboard - Found auth data in location state:",
            locationState
          );

          if (setIsAuthenticated && typeof setIsAuthenticated === "function") {
            setIsAuthenticated(true);
          }

          if (setCurrentUser && typeof setCurrentUser === "function") {
            setCurrentUser(locationState.authenticatedUser);
          }

          return;
        }

        // Try to restore from sessionStorage
        const storedAuthStatus = sessionStorage.getItem("isAuthenticated");
        const storedUserJson = sessionStorage.getItem("authenticatedUser");

        if (storedAuthStatus === "true" && storedUserJson) {
          console.log("Dashboard - Found auth data in sessionStorage");

          // If both direct functions are available, use them
          if (setIsAuthenticated && setCurrentUser) {
            const storedUser = JSON.parse(storedUserJson);
            setIsAuthenticated(true);
            setCurrentUser(storedUser);
          }
          // Otherwise try the helper function if available
          else if (updateAuthStateFromExternalSource) {
            updateAuthStateFromExternalSource();
          }
          // Last resort: Set local state and reload to force auth context update
          else {
            console.warn(
              "Dashboard - No direct auth update methods available, will redirect"
            );
            navigate("/login", { replace: true });
          }
        }
      } catch (error) {
        console.error("Dashboard - Error restoring auth state:", error);
      }
    };

    attemptAuthRestore();
  }, []);

  // Check authentication status on mount - use more direct approach
  useEffect(() => {
    console.log("Dashboard - AUTHENTICATION STATUS CHECK");
    console.log("Dashboard - isAuthenticated:", isAuthenticated);
    console.log("Dashboard - currentUser:", currentUser);
    console.log(
      "Dashboard - sessionStorage.isAuthenticated:",
      sessionStorage.getItem("isAuthenticated")
    );

    const checkAuth = async () => {
      // Wait a moment to allow auth state restoration to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check if authenticated in context
      if (isAuthenticated && currentUser) {
        console.log("Dashboard - User is authenticated in context, continuing");
        return;
      }

      // Check if authenticated in sessionStorage
      const storedAuth = sessionStorage.getItem("isAuthenticated") === "true";
      const storedUser = sessionStorage.getItem("authenticatedUser");

      if (storedAuth && storedUser) {
        console.log(
          "Dashboard - User is authenticated in sessionStorage, continuing"
        );

        // Try to update context if possible
        if (updateAuthStateFromExternalSource) {
          updateAuthStateFromExternalSource();
        }
        return;
      }

      // Neither context nor sessionStorage has authentication
      console.log("Dashboard - NOT AUTHENTICATED! REDIRECTING TO LOGIN");
      navigate("/login", { replace: true });
    };

    checkAuth();
  }, [
    isAuthenticated,
    currentUser,
    navigate,
    updateAuthStateFromExternalSource,
  ]);

  // Fetch user data and loans on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Extract user ID from various possible sources
        let userId = null;

        // First try from context
        if (currentUser && currentUser.id) {
          userId = currentUser.id;
        }
        // Then try from sessionStorage
        else {
          try {
            const storedUserJson = sessionStorage.getItem("authenticatedUser");
            if (storedUserJson) {
              const storedUser = JSON.parse(storedUserJson);
              userId = storedUser.id;
            }
          } catch (e) {
            console.error("Error parsing stored user:", e);
          }
        }

        if (!userId) {
          console.warn("Dashboard - No user ID available for data fetching");
          setLoading(false);
          return;
        }

        // Parse ID to integer if it's a string
        if (typeof userId === "string") {
          const numericId = parseInt(userId, 10);
          if (!isNaN(numericId)) {
            console.log(
              `Dashboard - Converting user ID from string ${userId} to number ${numericId}`
            );
            userId = numericId;
          }
        }

        console.log(
          "Dashboard - Fetching data with userId:",
          userId,
          typeof userId
        );

        // Get member profile
        let memberProfile;
        try {
          memberProfile = await window.api.getMemberProfile(userId);
          console.log("Dashboard - Got member profile:", memberProfile);
          setUserData(memberProfile);
        } catch (error) {
          console.error("Error fetching member profile:", error);
        }

        // Get loans
        try {
          const loanData = await window.api.getLoansByMember(userId);
          console.log("Dashboard - Got loans:", loanData);

          // Separate active and overdue loans
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

          // Set past loans (returned books)
          const past = loanData.filter((loan) => loan.return_date);
          setPastLoans(past);
        } catch (error) {
          console.error("Error fetching loans:", error);
        }

        // Get total book count
        try {
          const books = await window.api.getAllBooks();
          console.log("Dashboard - Got books count:", books.length);
          setBookCount(books.length);
        } catch (error) {
          console.error("Error fetching books:", error);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have an authenticated state (from any source)
    const isUserAuthenticated =
      isAuthenticated || sessionStorage.getItem("isAuthenticated") === "true";

    if (isUserAuthenticated) {
      console.log("Dashboard - User is authenticated, fetching data");
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentUser, isAuthenticated]);

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleLogout = () => {
    logout(navigate);
  };

  const handleViewProfile = () => {
    navigate("/profile");
  };

  const handleViewBooks = () => {
    navigate("/books");
  };

  const handleViewLoans = () => {
    navigate("/loans");
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
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  const drawerContent = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mb: 1,
            bgcolor: "primary.main",
          }}
        >
          {userData?.name.charAt(0) || "M"}
        </Avatar>
        <Typography variant="h6" sx={{ mt: 1 }}>
          {userData?.name || "Member"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {userData?.membership_type || "Standard"} Member
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleViewProfile}>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="My Profile" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleViewBooks}>
            <ListItemIcon>
              <BookIcon />
            </ListItemIcon>
            <ListItemText primary="Book Catalog" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleViewLoans}>
            <ListItemIcon>
              <Badge badgeContent={activeLoans.length} color="primary">
                <HistoryIcon />
              </Badge>
            </ListItemIcon>
            <ListItemText primary="Loan History" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={toggleDarkMode}>
            <ListItemIcon>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </ListItemIcon>
            <ListItemText primary={darkMode ? "Light Mode" : "Dark Mode"} />
            <Switch edge="end" checked={darkMode} onChange={toggleDarkMode} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <AuthCheck isAuthenticated={isAuthenticated} navigate={navigate}>
      <Box
        sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Balanghay Library
            </Typography>
            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={activeLoans.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Profile">
              <IconButton color="inherit" onClick={handleViewProfile}>
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}
                >
                  {userData?.name.charAt(0) || "M"}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              Welcome, {userData?.name || "Member"}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here's an overview of your library activity
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <DashboardCard
                title="Current Loans"
                icon={<BookmarkIcon />}
                description="Books you currently have borrowed"
                count={activeLoans.length}
                onClick={handleViewLoans}
                color="#1976d2"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <DashboardCard
                title="Overdue Books"
                icon={<WarningIcon />}
                description="Books that need to be returned"
                count={overdueLoans.length}
                onClick={() => navigate("/loans?tab=overdue")}
                color="#f44336"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <DashboardCard
                title="Book Catalog"
                icon={<LibraryBooksIcon />}
                description="Browse all available books"
                count={bookCount}
                onClick={handleViewBooks}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <DashboardCard
                title="My Profile"
                icon={<PersonIcon />}
                description="View your membership details"
                onClick={handleViewProfile}
                color="#d32f2f"
              />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <DashboardCard
                title="Reading History"
                icon={<HistoryIcon />}
                description="Books you've previously borrowed"
                count={pastLoans ? pastLoans.length : 0}
                onClick={handleViewLoans}
                color="#7b1fa2"
              />
            </Grid>
          </Grid>

          {activeLoans.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Your Current Loans
              </Typography>
              <Grid container spacing={2}>
                {activeLoans.map((loan) => (
                  <Grid item xs={12} sm={6} md={4} key={loan.id}>
                    <Card sx={{ display: "flex", height: "100%" }}>
                      <Box
                        sx={{
                          width: 80,
                          backgroundColor: loan.book_color || "#6B4226",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {loan.book_cover ? (
                          <CardMedia
                            component="img"
                            sx={{ width: 80 }}
                            image={loan.book_cover}
                            alt={loan.book_title}
                          />
                        ) : (
                          <BookIcon sx={{ fontSize: 40, color: "white" }} />
                        )}
                      </Box>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" component="div">
                          {loan.book_title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Due: {new Date(loan.due_date).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleViewLoans}
                  startIcon={<HistoryIcon />}
                >
                  View All Loans
                </Button>
              </Box>
            </Box>
          )}

          {overdueLoans.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" color="error" gutterBottom>
                Overdue Books
              </Typography>
              <Grid container spacing={2}>
                {overdueLoans.map((loan) => (
                  <Grid item xs={12} sm={6} md={4} key={loan.id}>
                    <Card
                      sx={{
                        display: "flex",
                        height: "100%",
                        borderLeft: "4px solid #f44336",
                      }}
                    >
                      <Box
                        sx={{
                          width: 80,
                          backgroundColor: loan.book_color || "#6B4226",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {loan.book_cover ? (
                          <CardMedia
                            component="img"
                            sx={{ width: 80 }}
                            image={loan.book_cover}
                            alt={loan.book_title}
                          />
                        ) : (
                          <BookIcon sx={{ fontSize: 40, color: "white" }} />
                        )}
                      </Box>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" component="div">
                          {loan.book_title}
                        </Typography>
                        <Typography variant="body2" color="error">
                          Due: {new Date(loan.due_date).toLocaleDateString()}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          sx={{ mt: 1 }}
                          onClick={() => navigate("/loans?tab=overdue")}
                        >
                          Return Now
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => navigate("/loans?tab=overdue")}
                  startIcon={<WarningIcon />}
                >
                  View All Overdue Books
                </Button>
              </Box>
            </Box>
          )}
        </Container>

        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
          {drawerContent}
        </Drawer>
      </Box>
    </AuthCheck>
  );
};

export default Dashboard;
