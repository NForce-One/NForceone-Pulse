import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("EMPLOYEE", "MANAGER", "ADMIN"),
      defaultValue: "EMPLOYEE",
    },
    // 🔥 NEW FIELDS (from spec)
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    defaultHours: {
      type: DataTypes.FLOAT,
      defaultValue: 8.0,
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetTokenExpiry: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

// 🔥 ADD SELF-RELATION (Manager)
User.belongsTo(User, { as: "Manager", foreignKey: "managerId" });
User.hasMany(User, { as: "Subordinates", foreignKey: "managerId" });

export default User;