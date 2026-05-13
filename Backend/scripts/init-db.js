import bcrypt from "bcrypt";
import { sequelize } from "../src/app.js";
import User from "../src/models/user.model.js";

const EMPLOYEES = [
  { name: "Alice Johnson", email: "alice@nforce.com", password: "Nforce@123", department: "Engineering" },
  { name: "Bob Smith", email: "bob@nforce.com", password: "Nforce@123", department: "Engineering" },
  { name: "Carol Williams", email: "carol@nforce.com", password: "Nforce@123", department: "Design" },
  { name: "David Brown", email: "david@nforce.com", password: "Nforce@123", department: "Marketing" },
  { name: "Eve Davis", email: "eve@nforce.com", password: "Nforce@123", department: "Engineering" },
  { name: "Frank Miller", email: "frank@nforce.com", password: "Nforce@123", department: "Sales" },
  { name: "Grace Wilson", email: "grace@nforce.com", password: "Nforce@123", department: "HR" },
  { name: "Henry Moore", email: "henry@nforce.com", password: "Nforce@123", department: "Engineering" },
  { name: "Ivy Taylor", email: "ivy@nforce.com", password: "Nforce@123", department: "Design" },
  { name: "Jack Anderson", email: "jack@nforce.com", password: "Nforce@123", department: "Marketing" },
];

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

    // Get manager ID for assigning employees
    const manager = await User.findOne({ where: { email: "manager@nforce.com" } });
    const managerId = manager.id;

    // Seed employees with managerId, always run (upsert by email)
    for (const emp of EMPLOYEES) {
      const existing = await User.findOne({ where: { email: emp.email } });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(emp.password, 10);
        await User.create({
          name: emp.name,
          email: emp.email,
          password: hashedPassword,
          role: "EMPLOYEE",
          department: emp.department,
          managerId,
          isActive: true,
          defaultHours: 8.0,
        });
        console.log(`Employee created: ${emp.email}`);
      } else {
        // Update existing employee to ensure managerId is set
        await existing.update({ managerId, isActive: true });
        console.log(`Employee updated (managerId assigned): ${emp.email}`);
      }
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
