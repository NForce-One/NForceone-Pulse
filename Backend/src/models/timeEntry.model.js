import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./user.model.js";

const TimeEntry = sequelize.define(
  "TimeEntry",
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
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    client: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    project: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    task: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    workItemRef: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    entryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    hours: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    isBillable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    status: {
      type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
      defaultValue: "DRAFT",
    },
  },
  {
    tableName: "time_entries",
    timestamps: true,
  }
);

TimeEntry.belongsTo(User, { foreignKey: "userId" });
TimeEntry.belongsTo(User, { foreignKey: "managerId", as: "Manager" });

export default TimeEntry;