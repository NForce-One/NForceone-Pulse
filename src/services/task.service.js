import Task from "../models/task.model.js";

// CREATE TASK
export const createTask = async (data) => {
  return await Task.create(data);
};

// GET ALL TASKS
export const getAllTasks = async () => {
  return await Task.findAll();
};

// ✅ NEW: GET TASKS BY USER ID (FOR EMPLOYEE FILTER)
export const getTasksByUserId = async (userId) => {
  return await Task.findAll({
    where: {
      assignedTo: userId,
    },
  });
};

// GET TASK BY ID
export const getTaskById = async (id) => {
  return await Task.findByPk(id);
};

// UPDATE TASK
export const updateTask = async (id, data) => {
  const task = await Task.findByPk(id);

  if (!task) {
    throw new Error("Task not found");
  }

  await task.update(data);
  return task;
};

// DELETE TASK
export const deleteTask = async (id) => {
  const task = await Task.findByPk(id);

  if (!task) {
    throw new Error("Task not found");
  }

  await task.destroy();
  return { message: "Task deleted successfully" };
};