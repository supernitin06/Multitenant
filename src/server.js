import "dotenv/config";
import app from "./app.js";
import seedAdminData from "./modules/admin/seeder/adminSeeder.js";
import { seedPlatformPermissions } from "./modules/admin/seeder/platformPermissionSeeder.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Run Admin Seeder on startup
  try {

    // ... inside the startup function
    await seedPlatformPermissions();
  } catch (error) {
    console.error("Failed to run admin seeder:", error);
  }
});
