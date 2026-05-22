import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

function shouldUseSsl() {
  if (process.env.DB_SSL === "false") return false;
  const host = process.env.DB_HOST || process.env.MYSQLHOST || "";
  const url = process.env.MYSQL_URL || process.env.DB_URL || "";
  if (host.includes(".railway.internal") || url.includes(".railway.internal")) return false;
  return true;
}

// Use Railway's MYSQL_URL (connection string) if available, else fall back to individual vars
const DB_URL = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || process.env.DB_URL;

let sequelize;
if (DB_URL) {
  sequelize = new Sequelize(DB_URL, {
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      connectTimeout: 10000,
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
    },
    pool: {
      max: 2,
      min: 0,
      acquire: 15000,
      idle: 5000,
    },
  });
} else {
  const DB_NAME = process.env.DB_NAME || process.env.MYSQLDATABASE || "railway";
  const DB_USER = process.env.DB_USER || process.env.MYSQLUSER || "root";
  const DB_PASSWORD = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || "";
  const DB_HOST = process.env.DB_HOST || process.env.MYSQLHOST || "localhost";
  const DB_PORT = parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306;

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      connectTimeout: 10000,
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
    },
    pool: {
      max: 2,
      min: 0,
      acquire: 15000,
      idle: 5000,
    },
  });
}

export default sequelize;