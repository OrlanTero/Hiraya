import React, { useState, useEffect } from "react";
import SplashScreen from "./pages/SplashScreen";
import Login from "./pages/Login";
import Main from "./pages/Main";
import "./index.css";

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Simulate splash screen delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      console.log("Splash screen timer completed, setting isLoading to false");
    }, 3000);

    // When the app loads, ensure the tables are updated with the needed fields
    if (window.api) {
      window.api
        .updateMembersTable()
        .then(() => console.log("Member table structure updated successfully"))
        .catch((err) => console.error("Error updating member table:", err));

      window.api
        .updateBooksTable()
        .then(() => console.log("Books table structure updated successfully"))
        .catch((err) => console.error("Error updating books table:", err));
    }

    return () => clearTimeout(timer);
  }, []);

  console.log("App component rendering, isLoading:", isLoading);

  const handleLogin = (userData) => {
    console.log("Login successful with user:", userData);
    setUser(userData);
    setIsAuthenticated(true);
    setAuthError(null);
    return true;
  };

  const handleLogout = () => {
    console.log("Logging out user:", user?.username);
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return <Main user={user} onLogout={handleLogout} />;
};

export default App;
