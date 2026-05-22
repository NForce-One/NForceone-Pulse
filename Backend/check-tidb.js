import mysql from "mysql2/promise";

const TIDB = {
  host: "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "3bfXSYPLqVsqxaP.root",
  password: "Ragi@437",
  database: "nforce_timetracker",
  ssl: { rejectUnauthorized: false },
};

async function main() {
  try {
    const conn = await mysql.createConnection(TIDB);
    const [databases] = await conn.execute("SHOW DATABASES");
    console.log("Databases:", databases.map(d => Object.values(d)[0]));
    
    const [tables] = await conn.execute("SHOW TABLES FROM `nforce_timetracker`");
    console.log("Tables:", tables.map(t => Object.values(t)[0]));
    
    await conn.end();
  } catch (err) {
    console.error("Error:", err.code, err.message);
  }
}

main();
