import "dotenv/config";
import app from "./app.js";

console.log("Starting server initialization...");

const PORT = process.env.PORT || 5000;

// Seed data (permissions, roles, demo accounts) is loaded with `npm run seed`.
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error("❌ Server Error:", error);
  }
});
