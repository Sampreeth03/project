// server.js (FINALIZED CORE)

// Imports the configured Express app and the database connection logic
const { app } = require("./app");

const { connectDB } = require("./config/database");

const PORT = 5000;

// Connect to the database
connectDB();

// Start the HTTP server
app.listen(PORT, () => {
    console.log(`Express API is running on http://localhost:${PORT}`);
});