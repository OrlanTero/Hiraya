import React, { useEffect, useState } from "react";
import logo from "../assets/logo.png";

const SplashScreen = () => {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Add a small delay before fading in for a smoother animation
    const timer = setTimeout(() => {
      setFadeIn(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "var(--secondary-dark)",
    color: "var(--light)",
    opacity: fadeIn ? 1 : 0,
    transition: "opacity 1s ease-in-out",
  };

  const logoStyle = {
    width: "200px",
    marginBottom: "20px",
  };

  const titleStyle = {
    fontSize: "2.5rem",
    marginBottom: "10px",
    fontWeight: "bold",
    textAlign: "center",
  };

  const subtitleStyle = {
    fontSize: "1.5rem",
    opacity: 0.9,
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      <img src={logo} alt="Hiraya Balanghay Logo" style={logoStyle} />
      <h1 style={titleStyle}>Hiraya Balanghay</h1>
      <p style={subtitleStyle}>Library Management System</p>
    </div>
  );
};

export default SplashScreen;
