import React from "react";
import { Grid, Paper, Typography, Box } from "@mui/material";
import { Book, People, MenuBook, Assignment } from "@mui/icons-material";

const Dashboard = () => {
  // Mock data - would come from database in a real app
  const stats = {
    totalBooks: 1250,
    activeMembers: 324,
    booksCheckedOut: 78,
    pendingReturns: 15,
  };

  const StatCard = ({ icon, title, value, color }) => (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 2,
        borderTop: `4px solid ${color}`,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        <Box
          sx={{
            backgroundColor: `${color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            width: 40,
            height: 40,
          }}
        >
          {React.cloneElement(icon, { sx: { color: color } })}
        </Box>
      </Box>
      <Typography
        variant="h3"
        component="div"
        sx={{ fontWeight: "bold", mb: 1 }}
      >
        {value}
      </Typography>
    </Paper>
  );

  return (
    <>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "var(--secondary-dark)", mb: 4 }}
      >
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Book />}
            title="Total Books"
            value={stats.totalBooks}
            color="var(--primary)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<People />}
            title="Active Members"
            value={stats.activeMembers}
            color="var(--secondary)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<MenuBook />}
            title="Checked Out"
            value={stats.booksCheckedOut}
            color="var(--secondary-dark)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Assignment />}
            title="Pending Returns"
            value={stats.pendingReturns}
            color="var(--primary-dark)"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: "400px" }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Activity chart will be displayed here
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: "400px" }}>
            <Typography variant="h6" gutterBottom>
              Most Popular Books
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Popular books chart will be displayed here
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default Dashboard;
