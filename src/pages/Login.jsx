import React, { useState, useEffect } from "react";
import logo from "../assets/logo.png";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [showQRLogin, setShowQRLogin] = useState(false);
  const [error, setError] = useState("");
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    console.log("Login component mounted");
    // Pre-load the image
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      console.log("Logo image loaded successfully");
      setLogoLoaded(true);
    };
    img.onerror = (e) => {
      console.error("Error loading logo:", e);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted with:", { username, password });

    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    try {
      const result = await window.api.login({ username, password });
      console.log("Login result:", result);

      if (result.success) {
        onLogin(result.user);
        return true;
      } else {
        setError(result.message || "Invalid username or password");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Error connecting to authentication service");
      return false;
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    console.log("PIN submitted:", pin);

    if (!pin) {
      setError("Please enter your PIN code");
      return;
    }

    try {
      const result = await window.api.loginWithPin(pin);
      console.log("PIN login result:", result);

      if (result.success) {
        onLogin(result.user);
        return true;
      } else {
        setError(result.message || "Invalid PIN code");
        return false;
      }
    } catch (error) {
      console.error("PIN login error:", error);
      setError("Error connecting to authentication service");
      return false;
    }
  };

  const togglePinLogin = () => {
    setShowPinLogin(!showPinLogin);
    setShowQRLogin(false);
    setError("");
  };

  const toggleQRLogin = () => {
    setShowQRLogin(!showQRLogin);
    setShowPinLogin(false);
    setError("");
  };

  const containerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "var(--secondary-dark)",
    padding: "16px",
  };

  const formContainerStyle = {
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "400px",
    width: "100%",
    borderRadius: "8px",
    backgroundColor: "white",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
  };

  const logoStyle = {
    width: "120px",
    marginBottom: "20px",
  };

  const titleStyle = {
    color: "var(--primary-dark)",
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "24px",
  };

  const subtitleStyle = {
    color: "var(--secondary-dark)",
    marginBottom: "24px",
    textAlign: "center",
  };

  const errorStyle = {
    width: "100%",
    padding: "10px",
    backgroundColor: "#ffebee",
    color: "#c62828",
    borderRadius: "4px",
    marginBottom: "16px",
    textAlign: "center",
  };

  const formStyle = {
    width: "100%",
  };

  const inputGroupStyle = {
    marginBottom: "16px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    color: "var(--secondary-dark)",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px",
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    backgroundColor: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "16px",
    marginBottom: "16px",
  };

  const linkButtonStyle = {
    background: "none",
    border: "none",
    color: "var(--primary)",
    textDecoration: "underline",
    cursor: "pointer",
    marginTop: "10px",
    fontSize: "14px",
  };

  const noteStyle = {
    color: "grey",
    fontSize: "12px",
    textAlign: "center",
    marginTop: "16px",
  };

  const renderLoginMethod = () => {
    if (showPinLogin) {
      return (
        <form onSubmit={handlePinSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle} htmlFor="pin">
              PIN Code
            </label>
            <input
              id="pin"
              type="password"
              style={inputStyle}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your 6-digit PIN"
              maxLength={6}
              required
            />
          </div>

          <button type="submit" style={buttonStyle}>
            Sign In with PIN
          </button>
        </form>
      );
    } else if (showQRLogin) {
      return (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <p>Scan the QR code to log in</p>
          <div
            style={{
              width: "200px",
              height: "200px",
              backgroundColor: "#f5f5f5",
              margin: "20px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px dashed #ddd",
            }}
          >
            <p style={{ color: "#999" }}>QR Scanner Placeholder</p>
          </div>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Position the QR code in front of your camera
          </p>
        </div>
      );
    } else {
      return (
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              style={inputStyle}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" style={buttonStyle}>
            Sign In
          </button>

          <p style={noteStyle}>Default login: admin / admin</p>
        </form>
      );
    }
  };

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        {logoLoaded ? (
          <img src={logo} alt="Hiraya Balanghay Logo" style={logoStyle} />
        ) : (
          <div style={{ ...logoStyle, backgroundColor: "#eee" }}></div>
        )}
        <h1 style={titleStyle}>Hiraya Balanghay</h1>
        <p style={subtitleStyle}>
          Sign in to access the Library Management System
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        {renderLoginMethod()}

        <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
          <button
            type="button"
            style={linkButtonStyle}
            onClick={togglePinLogin}
          >
            {showPinLogin ? "Use Password" : "Use PIN Code"}
          </button>
          <button type="button" style={linkButtonStyle} onClick={toggleQRLogin}>
            {showQRLogin ? "Use Password" : "Use QR Code"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
