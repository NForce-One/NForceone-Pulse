import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Railay MySQL
const RAILWAY = {
  host: "kodama.proxy.rlwy.net",
  port: 28003,
  user: "root",
  password: "aIBCfOcVHIXEIKJVRlIiHdRvggkyCK1w",
  database: "railway",
};

// TiDB
const TIDB = {
  host: "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "3bfXSYPLqVsqxaP.root",
  password: "Ragi@437",
  database: "nforce_timetracker",
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, "tidb-ca.pem")),
  },
};

async function getConnection(config, isTiDB = false) {
  const conn = await mysql.createConnection(config);
  return conn;
}

async function main() {
  console.log("Connecting to Railway MySQL...");
  const src = await getConnection(RAILWAY);

  console.log("Connecting to TiDB...");
  const dst = await getConnection(TIDB);

  // Create database on TiDB if not exists
  console.log("Ensuring TiDB database exists...");
  const tidbNoDb = await mysql.createConnection({
    host: TIDB.host,
    port: TIDB.port,
    user: TIDB.user,
    password: TIDB.password,
    ssl: TIDB.ssl,
  });
  await tidbNoDb.execute(`CREATE DATABASE IF NOT EXISTS \`${TIDB.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await tidbNoDb.end();

  // Get all tables from Railway
  const [tables] = await src.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
    [RAILWAY.database]
  );

  const tableNames = tables.map((t) => t.TABLE_NAME);
  console.log(`Found ${tableNames.length} tables: ${tableNames.join(", ")}`);

  for (const table of tableNames) {
    console.log(`\n--- Processing: ${table} ---`);

    // Get CREATE TABLE
    const [createResult] = await src.execute(`SHOW CREATE TABLE \`${table}\``);
    let createSql = createResult[0]["Create Table"];

    // Disable FK checks for TiDB
    await dst.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Drop if exists on TiDB
    await dst.execute(`DROP TABLE IF EXISTS \`${table}\``);

    // TiDB may not support some engine/row format options - clean up
    createSql = createSql.replace(/ENGINE=InnoDB/i, "");
    createSql = createSql.replace(/AUTO_INCREMENT=\d+/i, "");
    createSql = createSql.replace(/DEFAULT CHARSET=\w+/i, "DEFAULT CHARSET=utf8mb4");
    createSql = createSql.replace(/COLLATE=\w+/i, "COLLATE=utf8mb4_unicode_ci");
    createSql = createSql.replace(/ROW_FORMAT=\w+/i, "");
    createSql = createSql.replace(/COMMENT='[^']*'/g, "");
    createSql = createSql.replace(/\/\*![0-9]+\s*[^*]*\*\//g, "");
    createSql = createSql.trim() + ";";

    try {
      await dst.execute(createSql);
      console.log(`  Created table: ${table}`);
    } catch (err) {
      console.error(`  Failed to create table ${table}:`, err.message);
      console.error(`  SQL: ${createSql.substring(0, 200)}`);
      continue;
    }

    // Get data from Railway
    const [rows] = await src.execute(`SELECT * FROM \`${table}\``);
    console.log(`  Found ${rows.length} rows`);

    if (rows.length === 0) continue;

    // Batch insert
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const colNames = columns.map((c) => `\`${c}\``).join(", ");
    const insertSql = `INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders})`;

    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      for (const row of batch) {
        const values = columns.map((c) => row[c]);
        try {
          await dst.execute(insertSql, values);
        } catch (err) {
          console.error(`    Error inserting row ${i}:`, err.message);
        }
      }
      console.log(`    Inserted ${Math.min(i + batchSize, rows.length)}/${rows.length} rows`);
    }

    await dst.execute("SET FOREIGN_KEY_CHECKS = 1");
  }

  console.log("\nMigration complete!");
  await src.end();
  await dst.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
