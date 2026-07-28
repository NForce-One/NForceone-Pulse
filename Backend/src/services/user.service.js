import User from "../models/user.model.js";
import sequelize from "../config/db.js";
import bcrypt from "bcrypt";

export const getAllUsers = async (whereClause = {}) => {
  return await User.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: "Manager",
        attributes: ["id", "name", "email"],
      },
    ],
    attributes: { exclude: ["password", "resetToken", "resetTokenExpiry"] },
    order: [["createdAt", "DESC"]],
  });
};

export const getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ["password", "resetToken", "resetTokenExpiry"] },
    include: [
      {
        model: User,
        as: "Manager",
        attributes: ["id", "name", "email"],
      },
    ],
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Department is letters and spaces only. Blank/absent stays allowed so admin
// user creation without a department keeps working.
const DEPARTMENT_REGEX = /^[A-Za-z ]+$/;
const validateDepartment = (department) => {
  if (department === undefined || department === null || department === "") return;
  if (
    typeof department !== "string" ||
    department.trim() === "" ||
    !DEPARTMENT_REGEX.test(department)
  ) {
    throw new Error('"Department" must contain only letters and spaces.');
  }
};

const generateEmployeeId = async () => {
  const maxUser = await User.findOne({
    attributes: [[sequelize.fn("MAX", sequelize.col("employeeId")), "maxEmployeeId"]],
  });
  return (maxUser?.dataValues?.maxEmployeeId || 0) + 1;
};

export const getNextEmployeeId = async () => {
  const nextId = await generateEmployeeId();
  return nextId;
};

export const createUser = async (data) => {
  const { name, email, password, role, department, managerId, defaultHours } = data;

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;
  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must be at least 6 characters, include 1 uppercase and 1 special character"
    );
  }

  validateDepartment(department);

  const hashedPassword = await bcrypt.hash(password, 10);
  const employeeId = await generateEmployeeId();

  return await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || "EMPLOYEE",
    department,
    managerId,
    employeeId,
    defaultHours: defaultHours || 8.0,
    isActive: true,
  });
};

export const updateUser = async (id, data, { allowNameChange = false } = {}) => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new Error("User not found");
  }

  // Employee ID must remain unchanged on edit
  delete data.employeeId;

  // Name may only be changed by the admin User Management flow
  // (allowNameChange: true). Every other caller — notably the self-service
  // profile API — gets the current name resent as a no-op or rejected.
  if (data.name !== undefined && data.name !== user.name) {
    if (!allowNameChange) {
      throw new Error("Name can only be updated by an administrator through User Management");
    }
    if (typeof data.name !== "string" || !data.name.trim()) {
      throw new Error("Name is required");
    }
  } else {
    delete data.name;
  }

  validateDepartment(data.department);

  if (data.password) {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;
    if (!passwordRegex.test(data.password)) {
      throw new Error(
        "Password must be at least 6 characters, include 1 uppercase and 1 special character"
      );
    }
    data.password = await bcrypt.hash(data.password, 10);
  }

  await user.update(data);
  return await getUserById(id);
};

export const deleteUser = async (id) => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new Error("User not found");
  }

  await user.destroy();
  return { message: "User deleted successfully" };
};

export const toggleUserStatus = async (id) => {
  const user = await User.findByPk(id);

  if (!user) {
    throw new Error("User not found");
  }

  user.isActive = !user.isActive;
  await user.save();

  return {
    message: user.isActive ? "User activated" : "User deactivated",
    isActive: user.isActive,
  };
};

export const getMe = async (id) => {
  return await getUserById(id);
};

export const getUsersByManager = async (managerId) => {
  const users = await User.findAll({
    where: {
      managerId,
      isActive: true,
    },
    attributes: ["id", "name", "email", "defaultHours"],
    order: [["name", "ASC"]],
  });

  // Map to include first_name and last_name for frontend compatibility
  return users.map((u) => {
    const nameParts = (u.name || "").split(" ");
    return {
      id: u.id,
      name: u.name,
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      email: u.email,
      defaultHours: u.defaultHours,
    };
  });
};
