import "dotenv/config";
import app from "./app.js";
import seedAdminData from "./modules/admin/seeder/adminSeeder.js";
import { seedPlatformPermissions } from "./modules/admin/seeder/platformPermissionSeeder.js";

console.log("Starting server initialization...");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Run Admin Seeder on startup
  try {
    console.log("📦 Initializing startup seeders...");
    // await seedPlatformPermissions();
    // await seedAdminData(); // Uncomment if you want to run this too
    console.log("✅ Startup tasks completed.");
    console.log("🚀 cicd pipeline d");
  } catch (error) {
    console.error("❌ Failed to run startup seeders:", error);
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error("❌ Server Error:", error);
  }
});
