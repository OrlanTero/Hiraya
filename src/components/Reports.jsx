import React from "react";
import { Typography, Paper, Grid, Box } from "@mui/material";
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

const Reports = () => {
  // Mock data for reports
  const checkoutData = [
    { month: "Jan", count: 45 },
    { month: "Feb", count: 52 },
    { month: "Mar", count: 38 },
    { month: "Apr", count: 49 },
    { month: "May", count: 62 },
    { month: "Jun", count: 58 },
  ];

  const popularCategoriesData = [
    { category: "Fiction", count: 120 },
    { category: "Science", count: 85 },
    { category: "History", count: 63 },
    { category: "Biography", count: 49 },
    { category: "Self-Help", count: 37 },
  ];

  return (
    <>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "var(--secondary-dark)", mb: 4 }}
      >
        Reports
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Monthly Book Checkouts
            </Typography>

            <Box sx={{ height: 300, width: "100%" }}>
              {/* This is a placeholder for a chart - in a real app, you'd use a charting library */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={checkoutData}
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
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Popular Categories
            </Typography>

            <Box sx={{ height: 300, width: "100%" }}>
              {/* This is a placeholder for a chart */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={popularCategoriesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    fill="var(--secondary)"
                    name="Books in Category"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Overdue Books Report
            </Typography>

            <Box sx={{ p: 5, textAlign: "center" }}>
              <Typography variant="body1" color="text.secondary">
                Detailed overdue books report will be implemented here.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default Reports;
