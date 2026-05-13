import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ApprovalHistory = sequelize.define(
  "ApprovalHistory",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    timesheetId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    timeEntryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM("SUBMITTED", "APPROVED", "REJECTED", "WITHDRAWN"),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "approval_history",
    timestamps: true,
  }
);

export default ApprovalHistory;
