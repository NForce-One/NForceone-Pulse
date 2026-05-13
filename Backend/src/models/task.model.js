import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Task = sequelize.define("Task", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
  },

  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  isBillableDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  status: {
    type: DataTypes.ENUM("PENDING", "IN_PROGRESS", "COMPLETED"),
    defaultValue: "PENDING",
  },

  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  assignedTo: {
    type: DataTypes.INTEGER, // Employee ID
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default Task;