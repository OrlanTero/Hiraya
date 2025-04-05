const fs = require("fs");
const path = require("path");

// Path to the file
const filePath = path.join(
  __dirname,
  "src",
  "components",
  "LoanManagement.jsx"
);

// Read the file content
fs.readFile(filePath, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  // Find the first occurrence of the component declaration
  const componentStartIndex = data.indexOf("const LoanManagement = () => {");
  if (componentStartIndex === -1) {
    console.error("Component declaration not found");
    return;
  }

  // Get the content before the component declaration (imports, etc.)
  const beforeComponent = data.substring(0, componentStartIndex);

  // Get the content from the component declaration
  let componentContent = data.substring(componentStartIndex);

  // Find subsequent import statements (they shouldn't be there)
  const duplicateImportIndex = componentContent.indexOf("import React");

  if (duplicateImportIndex !== -1) {
    // Cut off the content at the duplicate import to remove duplicates
    componentContent = componentContent.substring(0, duplicateImportIndex);

    // Find the next component declaration after the duplicate import
    const nextComponentIndex = data.indexOf(
      "const LoanManagement = () => {",
      componentStartIndex + 1
    );

    if (nextComponentIndex !== -1) {
      // Get any missing content from the next component
      const restOfComponent = data.substring(
        nextComponentIndex + "const LoanManagement = () => {".length
      );

      // Find the end of the component (the last export default statement)
      const exportIndex = restOfComponent.lastIndexOf(
        "export default LoanManagement;"
      );
      if (exportIndex !== -1) {
        // Append everything until the export statement
        componentContent += restOfComponent.substring(
          0,
          exportIndex + "export default LoanManagement;".length
        );
      }
    }
  }

  // Check if the component ends properly
  if (!componentContent.includes("export default LoanManagement;")) {
    componentContent += "\n\nexport default LoanManagement;";
  }

  // Create the fixed content
  const fixedContent = beforeComponent + componentContent;

  // Write the fixed content back to the file
  fs.writeFile(filePath, fixedContent, "utf8", (err) => {
    if (err) {
      console.error("Error writing file:", err);
      return;
    }
    console.log("File fixed successfully");
  });
});
