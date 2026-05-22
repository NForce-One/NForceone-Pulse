import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Timer = sequelize.define(
  "Timer",
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
    clientName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    projectName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taskName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    pausedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalPausedMs: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("RUNNING", "PAUSED"),
      defaultValue: "RUNNING",
    },
    lastSaved: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "timers",
    timestamps: true,
  }
);

export default Timer;
