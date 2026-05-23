import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const BillingRate = sequelize.define(
  "BillingRate",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    billingRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    costRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: "billing_rates",
    timestamps: true,
  }
);

export default BillingRate;
