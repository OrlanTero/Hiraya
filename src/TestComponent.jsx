import React from "react";

const TestComponent = () => {
  return (
    <div
      style={{
        padding: "20px",
        textAlign: "center",
        backgroundColor: "var(--light)",
        color: "var(--primary-dark)",
      }}
    >
      <h1>Test Component</h1>
      <p>If you can see this, React rendering is working!</p>
      <button
        style={{
          padding: "10px 20px",
          backgroundColor: "var(--primary)",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={() => alert("Button clicked!")}
      >
        Click Me
      </button>
    </div>
  );
};

export default TestComponent;
