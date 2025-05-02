import React, { useState, useEffect } from "react";
import logo from "../assets/logo.png";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  const noteStyle = {
    color: "grey",
    fontSize: "12px",
    textAlign: "center",
    marginTop: "16px",
  };

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        {logoLoaded && <img src={logo} alt="Library Logo" style={logoStyle} />}
        <h1 style={titleStyle}>Balanghay</h1>
        <p style={subtitleStyle}>Library Management System</p>

        {error && <div style={errorStyle}>{error}</div>}

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
              placeholder="Enter your username"
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
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" style={buttonStyle}>
            Sign In
          </button>
        </form>

        <p style={noteStyle}>
          Admin access only. Please use your credentials to sign in.
        </p>
      </div>
    </div>
  );
};

export default Login;
