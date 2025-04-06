const { initDatabase, db, addUser } = require("./db");

async function checkDatabase() {
  try {
    // Initialize the database
    await initDatabase();
    console.log("Database initialized");

    // Check existing users
    const users = await db("users").select("*");
    console.log(
      "Existing users:",
      users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        pin_code: user.pin_code,
        status: user.status,
      }))
    );

    // Check if test user exists
    const testUser = users.find((u) => u.email === "test@example.com");

    if (!testUser) {
      console.log("Adding test user...");

      // Add a test user
      await db("users").insert({
        username: "testuser",
        email: "test@example.com",
        password: "password",
        role: "member",
        status: "active",
        pin_code: "1234",
        qr_auth_key: "TEST-USER-" + Date.now(),
      });

      console.log("Test user added successfully!");
    } else {
      console.log("Test user already exists");
    }

    console.log("\nLogin with these credentials:");
    console.log("Email: test@example.com");
    console.log("PIN: 1234");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDatabase();
