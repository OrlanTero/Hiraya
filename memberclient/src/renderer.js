// Renderer process - React entry point
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

console.log("Renderer process starting...");

// Log Node.js and Electron versions
console.log("Node.js version:", window.versions.node());
console.log("Chrome version:", window.versions.chrome());
console.log("Electron version:", window.versions.electron());

// Initialize React app when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Find the root element
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("Root element not found!");
    return;
  }

  console.log("Root element found, initializing React app");

  try {
    // Create root and render App component
    const root = createRoot(rootElement);
    root.render(React.createElement(App));
    console.log("React app rendered successfully");

    // If api.debug exists, log the initialization
    if (window.api && window.api.debug) {
      window.api.debug.log("React app initialized and rendered");
    }
  } catch (error) {
    console.error("Error rendering React app:", error);
    rootElement.innerHTML = `<div style="color: red; padding: 20px;">
      <h2>Error Loading Application</h2>
      <p>${error.message}</p>
    </div>`;
  }
});
