import React, { useState, useEffect } from "react";
import { Grid, Paper, Typography, Box, CircularProgress } from "@mui/material";
import { Book, People, MenuBook, Assignment } from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeMembers: 0,
    booksCheckedOut: 0,
    pendingReturns: 0,
  });
  const [popularBooks, setPopularBooks] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [monthlyCheckouts, setMonthlyCheckouts] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Get dashboard statistics
        const statsResult = await window.api.getDashboardStats();
        if (statsResult.success) {
          setStats(statsResult.data);
        } else {
          console.error("Failed to fetch dashboard stats:", statsResult.error);
        }

        // Get popular books
        const booksResult = await window.api.getMostPopularBooks(5);
        if (booksResult.success) {
          setPopularBooks(booksResult.data);
        } else {
          console.error("Failed to fetch popular books:", booksResult.error);
        }

        // Get popular categories
        const categoriesResult = await window.api.getPopularCategories(5);
        if (categoriesResult.success) {
          setPopularCategories(categoriesResult.data);
        } else {
          console.error(
            "Failed to fetch popular categories:",
            categoriesResult.error
          );
        }

        // Get monthly checkouts
        const fetchMonthlyCheckouts = async () => {
          try {
            const months = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];

            let monthlyData = [];
            let apiFound = false;

            // Try different approaches in order of preference
            if (typeof window.api.getMonthlyCheckouts === "function") {
              try {
                const result = await window.api.getMonthlyCheckouts();
                if (result && result.success && Array.isArray(result.data)) {
                  monthlyData = result.data;
                  apiFound = true;
                  console.log(
                    "Successfully fetched monthly checkouts via getMonthlyCheckouts()"
                  );
                }
              } catch (apiError) {
                console.warn("Error using getMonthlyCheckouts():", apiError);
              }
            }

            // Try DB API if direct API failed
            if (!apiFound && typeof window.api.db?.query === "function") {
              try {
                const currentYear = new Date().getFullYear();
                const query = `
                  SELECT strftime('%m', checkout_date) as month, COUNT(*) as count 
                  FROM loans 
                  WHERE strftime('%Y', checkout_date) = ? 
                  GROUP BY strftime('%m', checkout_date) 
                  ORDER BY month
                `;

                const results = await window.api.db.query(query, [
                  currentYear.toString(),
                ]);

                if (Array.isArray(results)) {
                  // Map the results to the format needed by the chart
                  monthlyData = months.map((monthName, index) => {
                    const monthNumber = (index + 1).toString().padStart(2, "0");
                    const monthData = results.find(
                      (r) => r.month === monthNumber
                    );
                    return {
                      month: monthName,
                      count: monthData ? parseInt(monthData.count) : 0,
                    };
                  });
                  apiFound = true;
                  console.log(
                    "Successfully fetched monthly checkouts via DB query"
                  );
                }
              } catch (dbError) {
                console.warn("Error querying loans table:", dbError);
              }
            }

            // If both approaches failed, use empty data
            if (!apiFound) {
              console.warn(
                "No API found for monthly checkouts, using empty data"
              );
              monthlyData = months.map((month) => ({ month, count: 0 }));
            }

            setMonthlyCheckouts(monthlyData);
          } catch (error) {
            console.error("Failed to fetch monthly checkouts:", error);
            // Set empty data on error
            setMonthlyCheckouts(
              [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((month) => ({ month, count: 0 }))
            );
          }
        };

        fetchMonthlyCheckouts();

        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data");
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        {loading ? <CircularProgress size={24} /> : value}
      </Typography>
    </Paper>
  );

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          Error loading dashboard: {error}
        </Typography>
      </Box>
    );
  }

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
              Monthly Book Checkouts
            </Typography>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : monthlyCheckouts.length > 0 ? (
              <Box sx={{ height: 300, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyCheckouts}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="count"
                      fill="var(--primary)"
                      name="Book Checkouts"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80%",
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No checkout data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: "400px" }}>
            <Typography variant="h6" gutterBottom>
              Most Popular Books
            </Typography>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : popularBooks.length > 0 ? (
              <Box sx={{ mt: 2, height: 300, overflowY: "auto" }}>
                {popularBooks.map((book, index) => (
                  <Box
                    key={book.id}
                    sx={{
                      mb: 2,
                      p: 2,
                      bgcolor: "background.paper",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {index + 1}. {book.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {book.author}
                    </Typography>
                    <Typography variant="body2" color="primary">
                      Borrowed {book.borrow_count} times
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80%",
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No popular books data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: "400px" }}>
            <Typography variant="h6" gutterBottom>
              Popular Categories
            </Typography>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : popularCategories.length > 0 ? (
              <Box sx={{ height: 300, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={popularCategories}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 60,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="count"
                      fill="var(--secondary)"
                      name="Books Checked Out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80%",
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No category data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default Dashboard;
