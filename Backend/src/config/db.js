import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  dialect: "mysql",
  logging: false,
};

if (process.env.DB_SSL === "true") {
  dbConfig.dialectOptions = {
    ssl: {
      rejectUnauthorized: true,
    },
  };
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  dbConfig
);

export default sequelize;