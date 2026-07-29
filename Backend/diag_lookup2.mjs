import sequelize from "./src/config/db.js";
import { QueryTypes } from "sequelize";

const rows = await sequelize.query(
  `SELECT id, userId, entryDate, clientId, projectId, managerId, client, project, hours, status
   FROM time_entries
   WHERE userId = 720014 AND entryDate BETWEEN '2026-07-26' AND '2026-08-01'
   ORDER BY entryDate, projectId`,
  { type: QueryTypes.SELECT }
);
console.log(JSON.stringify(rows, null, 2));

const ts = await sequelize.query(
  `SELECT id, userId, weekStartDate, weekEndDate, status, totalHours FROM timesheets WHERE userId = 720014 AND weekStartDate = '2026-07-26'`,
  { type: QueryTypes.SELECT }
);
console.log("TIMESHEET:", JSON.stringify(ts, null, 2));
process.exit(0);
