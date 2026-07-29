import sequelize from "./src/config/db.js";
import { QueryTypes } from "sequelize";

const projects = await sequelize.query(
  `SELECT id, name, clientId FROM projects WHERE id IN (240007, 300006)`,
  { type: QueryTypes.SELECT }
);
console.log(JSON.stringify(projects, null, 2));
process.exit(0);
