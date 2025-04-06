const electron = require("electron");
const path = require("path");
const fs = require("fs");

// Get the userData path
const userDataPath = (electron.app || electron.remote.app).getPath("userData");
const dbPath = path.join(userDataPath, "database");
const dbFilePath = path.join(dbPath, "hiraya_balanghay.sqlite");

console.log("Starting database reset procedure...");
console.log(`Database location: ${dbFilePath}`);

// Check if the database file exists
if (fs.existsSync(dbFilePath)) {
  console.log("Database file found. Deleting file...");
  try {
    fs.unlinkSync(dbFilePath);
    console.log("Database file deleted successfully.");
    console.log(
      "Next time you start the application, a fresh database will be created."
    );
  } catch (error) {
    console.error("Error deleting database file:", error);
  }
} else {
  console.log("Database file not found. No action needed.");
  console.log(
    "Next time you start the application, a fresh database will be created."
  );
}

console.log("\nDatabase reset procedure completed.");
console.log("Please restart your application to initialize a fresh database.");

// Exit the process
process.exit(0);
