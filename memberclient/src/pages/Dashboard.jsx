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

const Dashboard = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [bookCount, setBookCount] = useState(0);

  // Fetch user data and loans on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!currentUser) {
          navigate("/login");
          return;
        }

        // Get member profile
        const memberProfile = await window.api.getMemberProfile(currentUser.id);
        setUserData(memberProfile);

        // Get active loans
        const loans = await window.api.getLoansByMember(currentUser.id);
        const active = loans.filter((loan) => !loan.return_date);
        setActiveLoans(active);

        // Get total book count
        const books = await window.api.getAllBooks();
        setBookCount(books.length);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

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
    navigate("/profile?tab=loans");
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
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
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
              <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
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
      </Container>

      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Dashboard;
