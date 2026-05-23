import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ProjectUser = sequelize.define(
  "ProjectUser",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assignedAt: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "project_users",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["projectId", "userId"],
      },
    ],
  }
);

export default ProjectUser;
