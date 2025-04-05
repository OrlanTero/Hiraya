import React, { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  CssBaseline,
  Avatar,
  Chip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Book as BookIcon,
  People as PeopleIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Dashboard as DashboardIcon,
  LibraryBooks as LibraryBooksIcon,
  ViewList as ViewListIcon,
  PersonOutline as UserIcon,
} from "@mui/icons-material";
import BooksManagement from "../components/BooksManagement";
import MembersManagement from "../components/MembersManagement";
import LoanManagement from "../components/LoanManagement";
import Dashboard from "../components/Dashboard";
import Reports from "../components/Reports";
import Settings from "../components/Settings";

const drawerWidth = 240;

const Main = ({ user, onLogout }) => {
  const [open, setOpen] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleMenuSelect = (menuItem) => {
    if (menuItem === "logout") {
      onLogout();
    } else {
      setSelectedMenu(menuItem);
    }
  };

  // Check if user has access to this menu item
  const hasAccess = (menuItem) => {
    if (!user) return false;

    // Admin has access to everything
    if (user.role === "admin") return true;

    // Librarian access restrictions
    if (user.role === "librarian") {
      if (menuItem === "settings") return false;
      return true;
    }

    // Default for unknown roles - only dashboard
    return menuItem === "dashboard";
  };

  const renderContent = () => {
    switch (selectedMenu) {
      case "dashboard":
        return <Dashboard />;
      case "books":
        return <BooksManagement />;
      case "members":
        return <MembersManagement />;
      case "loans":
        return <LoanManagement />;
      case "reports":
        return <Reports />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "var(--primary-dark)",
          transition: (theme) =>
            theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          ...(open && {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: (theme) =>
              theme.transitions.create(["width", "margin"], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: "none" }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Hiraya Balanghay - Library Management System
          </Typography>
          {user && (
            <Chip
              avatar={
                <Avatar sx={{ bgcolor: "var(--accent)" }}>
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
              }
              label={`${user.username} (${
                user.role.charAt(0).toUpperCase() + user.role.slice(1)
              })`}
              variant="outlined"
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.3)",
                "& .MuiChip-label": { color: "white" },
              }}
            />
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "var(--secondary-dark)",
            color: "var(--light)",
            borderRight: "none",
            transition: (theme) =>
              theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            px: [1],
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              color: "var(--light)",
              fontWeight: "bold",
              ml: 2,
            }}
          >
            Hiraya Balanghay
          </Typography>
          <IconButton onClick={toggleDrawer} sx={{ color: "var(--light)" }}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider sx={{ bgcolor: "rgba(253, 240, 213, 0.2)" }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton
              selected={selectedMenu === "dashboard"}
              onClick={() => handleMenuSelect("dashboard")}
              sx={{
                minHeight: 48,
                px: 2.5,
                "&.Mui-selected": {
                  bgcolor: "rgba(198, 18, 31, 0.3)",
                  "&:hover": {
                    bgcolor: "rgba(198, 18, 31, 0.4)",
                  },
                },
                "&:hover": {
                  bgcolor: "rgba(198, 18, 31, 0.2)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "var(--light)" }}>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          </ListItem>

          {hasAccess("books") && (
            <ListItem disablePadding>
              <ListItemButton
                selected={selectedMenu === "books"}
                onClick={() => handleMenuSelect("books")}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  "&.Mui-selected": {
                    bgcolor: "rgba(198, 18, 31, 0.3)",
                    "&:hover": {
                      bgcolor: "rgba(198, 18, 31, 0.4)",
                    },
                  },
                  "&:hover": {
                    bgcolor: "rgba(198, 18, 31, 0.2)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "var(--light)" }}>
                  <BookIcon />
                </ListItemIcon>
                <ListItemText primary="Books Management" />
              </ListItemButton>
            </ListItem>
          )}

          {hasAccess("loans") && (
            <ListItem disablePadding>
              <ListItemButton
                selected={selectedMenu === "loans"}
                onClick={() => handleMenuSelect("loans")}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  "&.Mui-selected": {
                    bgcolor: "rgba(198, 18, 31, 0.3)",
                    "&:hover": {
                      bgcolor: "rgba(198, 18, 31, 0.4)",
                    },
                  },
                  "&:hover": {
                    bgcolor: "rgba(198, 18, 31, 0.2)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "var(--light)" }}>
                  <LibraryBooksIcon />
                </ListItemIcon>
                <ListItemText primary="Loan Management" />
              </ListItemButton>
            </ListItem>
          )}

          {hasAccess("members") && (
            <ListItem disablePadding>
              <ListItemButton
                selected={selectedMenu === "members"}
                onClick={() => handleMenuSelect("members")}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  "&.Mui-selected": {
                    bgcolor: "rgba(198, 18, 31, 0.3)",
                    "&:hover": {
                      bgcolor: "rgba(198, 18, 31, 0.4)",
                    },
                  },
                  "&:hover": {
                    bgcolor: "rgba(198, 18, 31, 0.2)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "var(--light)" }}>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Members" />
              </ListItemButton>
            </ListItem>
          )}

          {hasAccess("reports") && (
            <ListItem disablePadding>
              <ListItemButton
                selected={selectedMenu === "reports"}
                onClick={() => handleMenuSelect("reports")}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  "&.Mui-selected": {
                    bgcolor: "rgba(198, 18, 31, 0.3)",
                    "&:hover": {
                      bgcolor: "rgba(198, 18, 31, 0.4)",
                    },
                  },
                  "&:hover": {
                    bgcolor: "rgba(198, 18, 31, 0.2)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "var(--light)" }}>
                  <BarChartIcon />
                </ListItemIcon>
                <ListItemText primary="Reports" />
              </ListItemButton>
            </ListItem>
          )}
        </List>
        <Divider sx={{ bgcolor: "rgba(253, 240, 213, 0.2)" }} />
        <List>
          {hasAccess("settings") && (
            <ListItem disablePadding>
              <ListItemButton
                selected={selectedMenu === "settings"}
                onClick={() => handleMenuSelect("settings")}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  "&.Mui-selected": {
                    bgcolor: "rgba(198, 18, 31, 0.3)",
                    "&:hover": {
                      bgcolor: "rgba(198, 18, 31, 0.4)",
                    },
                  },
                  "&:hover": {
                    bgcolor: "rgba(198, 18, 31, 0.2)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "var(--light)" }}>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItemButton>
            </ListItem>
          )}

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleMenuSelect("logout")}
              sx={{
                minHeight: 48,
                px: 2.5,
                "&:hover": {
                  bgcolor: "rgba(198, 18, 31, 0.2)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "var(--light)" }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{
          backgroundColor: "var(--light)",
          flexGrow: 1,
          height: "100vh",
          overflow: "auto",
          p: 3,
          pt: 10,
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
};

export default Main;
