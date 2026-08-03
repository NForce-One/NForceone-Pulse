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
    // Denormalized so an APPROVED/REJECTED decision stays identifiable by
    // (userId, projectId) even after the underlying TimeEntry is deleted
    // (e.g. Cancel on a rejected project) — needed to tell a genuine
    // resubmission-to-the-same-manager apart from a first-time submission
    // once the employee re-adds and resubmits that project.
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM("SUBMITTED", "APPROVED", "REJECTED", "WITHDRAWN", "COMMENTED"),
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
