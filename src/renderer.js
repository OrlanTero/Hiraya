import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Debug logging
console.log("Renderer process starting...");

// Log environment information if available
if (window.versions) {
  console.log(`Node.js version: ${window.versions.node()}`);
  console.log(`Chrome version: ${window.versions.chrome()}`);
  console.log(`Electron version: ${window.versions.electron()}`);
}

// Create root element
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error(
    "Root element not found! Make sure the HTML has a div with id='root'"
  );
} else {
  console.log("Root element found, initializing React app");

  try {
    // Initialize React
    const root = createRoot(rootElement);

    // Setup global error handler for React rendering errors
    window.addEventListener("error", (event) => {
      console.error("React rendering error:", event.error);
    });

    // Render the React app
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log("React app rendered successfully");

    // Log to main process through the API if available
    if (window.api && window.api.debug) {
      window.api.debug.log("React app initialized and rendered");
    }
  } catch (error) {
    console.error("Error rendering React app:", error);

    // Display error on screen
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; color: #c1121f; background-color: #fdf0d5;">
          <h2>Error Rendering Application</h2>
          <p>${error.message || "Unknown error"}</p>
          <pre>${error.stack || ""}</pre>
        </div>
      `;
    }

    // Log to main process through the API if available
    if (window.api && window.api.debug) {
      window.api.debug.error(
        error.message || "Unknown error rendering React app"
      );
    }
  }
}
