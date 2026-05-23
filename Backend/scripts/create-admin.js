import bcrypt from "bcrypt";
import sequelize from "../src/config/db.js";
import "../src/models/user.model.js";
import User from "../src/models/user.model.js";

const email = "venkateshkodithyala44@gmail.com";
const password = "Venky@6446";

try {
  await sequelize.authenticate();
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    console.log("Admin user already exists");
    process.exit(0);
  }
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name: "Venkateshwarlu K", email, password: hashed, role: "ADMIN", isActive: true });
  console.log("Admin user created successfully");
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await sequelize.close();
}
