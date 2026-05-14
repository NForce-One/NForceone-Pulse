import * as timerService from "../services/timer.service.js";

// ================= GET ACTIVE TIMER =================
export const getActiveTimer = async (req, res) => {
  try {
    const timer = await timerService.getActiveTimerByUser(req.user.id);
    res.json({
      success: true,
      data: timer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= START TIMER =================
export const startTimer = async (req, res) => {
  try {
    const { clientId, projectId, taskId, description, client, project, task } = req.body;

    if (!client || !project || !task || !description) {
      return res.status(400).json({
        success: false,
        message: "Client, Project, Task and Description are all required",
      });
    }

    const timer = await timerService.startTimer({
      userId: req.user.id,
      clientId,
      projectId,
      taskId,
      client,
      project,
      task,
      description,
    });

    res.status(201).json({
      success: true,
      data: timer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= PAUSE TIMER =================
export const pauseTimer = async (req, res) => {
  try {
    const timer = await timerService.pauseTimer(req.params.id, req.user.id);
    res.json({
      success: true,
      data: timer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= RESUME TIMER =================
export const resumeTimer = async (req, res) => {
  try {
    const timer = await timerService.resumeTimer(req.params.id, req.user.id);
    res.json({
      success: true,
      data: timer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= STOP TIMER =================
export const stopTimer = async (req, res) => {
  try {
    const result = await timerService.stopTimer(req.params.id, req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= STOP TIMER AND CREATE TIME ENTRY =================
export const stopTimerAndCreateEntry = async (req, res) => {
  try {
    const result = await timerService.stopTimerAndCreateEntry(req.params.id, req.user.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= SAVE TIMER STATE (AUTO-SAVE) =================
export const saveTimerState = async (req, res) => {
  try {
    const timer = await timerService.saveTimerState(req.params.id, req.user.id);
    res.json({
      success: true,
      data: timer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
