import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Timesheet = sequelize.define(
  "Timesheet",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    weekStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    weekEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    totalHours: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    billableHours: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PARTIALLY_APPROVED"),
      defaultValue: "DRAFT",
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "timesheets",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "weekStartDate"],
      },
    ],
  }
);

export default Timesheet;
