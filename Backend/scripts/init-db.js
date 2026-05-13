import bcrypt from "bcrypt";
import { sequelize } from "../src/app.js";
import User from "../src/models/user.model.js";

async function initDb() {
  try {
    console.log("Connecting to TiDB...");
    await sequelize.authenticate();
    console.log("Connected successfully.");

    console.log("Syncing tables...");
    await sequelize.sync({ force: false });
    console.log("Tables synced.");

    const existingAdmin = await User.findOne({ where: { email: "admin@nforce.com" } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("Admin@Password123", 10);
      await User.create({
        name: "Admin",
        email: "admin@nforce.com",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      });
      console.log("Admin user created: admin@nforce.com / Admin@Password123");
    } else {
      console.log("Admin user already exists, skipping.");
    }

    const existingManager = await User.findOne({ where: { email: "manager@nforce.com" } });
    if (!existingManager) {
      const hashedPassword = await bcrypt.hash("Manager@Password123", 10);
      await User.create({
        name: "Manager",
        email: "manager@nforce.com",
        password: hashedPassword,
        role: "MANAGER",
        isActive: true,
      });
      console.log("Manager user created: manager@nforce.com / Manager@Password123");
    } else {
      console.log("Manager user already exists, skipping.");
    }

    console.log("Database initialization complete!");
  } catch (error) {
    console.error("Init DB failed:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

initDb();
