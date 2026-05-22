import * as taskService from "../services/task.service.js";

// CREATE TASK
export const createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.body);

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET TASKS (✅ FIXED ROLE BASED)
export const getTasks = async (req, res) => {
  try {
    const user = req.user;

    let tasks;

    // 👑 ADMIN → all tasks
    if (user.role === "ADMIN") {
      tasks = await taskService.getAllTasks();
    }

    // 👨‍💼 MANAGER → all tasks
    else if (user.role === "MANAGER") {
      tasks = await taskService.getAllTasks();
    }

    // 👨‍💻 EMPLOYEE → only assigned tasks
    else if (user.role === "EMPLOYEE") {
      tasks = await taskService.getTasksByUserId(user.id);
    }

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE TASK (IMPORTANT ROLE LOGIC)
export const updateTask = async (req, res) => {
  try {
    const user = req.user; // from token
    const taskId = req.params.id;

    let updateData = req.body;

    // 🔒 EMPLOYEE → can only update status
    if (user.role === "EMPLOYEE") {
      updateData = {
        status: req.body.status,
      };
    }

    const task = await taskService.updateTask(taskId, updateData);

    res.json({
      success: true,
      data: task,
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE TASK
export const deleteTask = async (req, res) => {
  try {
    const result = await taskService.deleteTask(req.params.id);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};