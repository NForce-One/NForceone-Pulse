import Timer from "../models/timer.model.js";
import TimeEntry from "../models/timeEntry.model.js";

// ================= GET ACTIVE/PAUSED TIMER BY USER =================
export const getActiveTimerByUser = async (userId) => {
  return await Timer.findOne({
    where: {
      userId,
      status: ["RUNNING", "PAUSED"],
    },
  });
};

// ================= START TIMER =================
export const startTimer = async (data) => {
  const { userId, clientId, projectId, taskId, description, client, project, task } = data;

  // Validate required fields
  const clientName = client?.trim();
  const projectName = project?.trim();
  const taskName = task?.trim();

  if (!clientName) {
    throw new Error("Client name is required");
  }
  if (!projectName) {
    throw new Error("Project name is required");
  }
  if (!taskName) {
    throw new Error("Task name is required");
  }
  if (!description || description.trim() === "") {
    throw new Error("Description is required");
  }

  // Check if user already has an active or paused timer
  const existingTimer = await getActiveTimerByUser(userId);
  if (existingTimer) {
    throw new Error("You already have an active timer. Stop it first.");
  }

  return await Timer.create({
    userId,
    clientId: clientId || null,
    projectId: projectId || null,
    taskId: taskId || null,
    clientName: clientName,
    projectName: projectName,
    taskName: taskName,
    description: description.trim(),
    startTime: new Date(),
    status: "RUNNING",
    totalPausedMs: 0,
  });
};

// ================= PAUSE TIMER =================
export const pauseTimer = async (timerId, userId) => {
  const timer = await Timer.findOne({
    where: { id: timerId, userId },
  });

  if (!timer) {
    throw new Error("Timer not found");
  }

  if (timer.status !== "RUNNING") {
    throw new Error("Timer is not running");
  }

  timer.status = "PAUSED";
  timer.pausedAt = new Date();
  await timer.save();

  return timer;
};

// ================= RESUME TIMER =================
export const resumeTimer = async (timerId, userId) => {
  const timer = await Timer.findOne({
    where: { id: timerId, userId },
  });

  if (!timer) {
    throw new Error("Timer not found");
  }

  if (timer.status !== "PAUSED") {
    throw new Error("Timer is not paused");
  }

  // Accumulate paused duration
  if (timer.pausedAt) {
    const pausedDuration = new Date() - new Date(timer.pausedAt);
    timer.totalPausedMs = (timer.totalPausedMs || 0) + pausedDuration;
  }

  timer.status = "RUNNING";
  timer.pausedAt = null;
  await timer.save();

  return timer;
};

// ================= STOP TIMER =================
export const stopTimer = async (timerId, userId) => {
  const timer = await Timer.findOne({
    where: { id: timerId, userId },
  });

  if (!timer) {
    throw new Error("Timer not found");
  }

  // Calculate final elapsed time
  const now = new Date();
  let totalElapsedMs = now - new Date(timer.startTime);

  // Subtract accumulated paused time
  totalElapsedMs -= timer.totalPausedMs || 0;

  // If currently paused, subtract current pause duration
  if (timer.status === "PAUSED" && timer.pausedAt) {
    totalElapsedMs -= (now - new Date(timer.pausedAt));
  }

  const hours = totalElapsedMs / (1000 * 60 * 60);
  const minutes = totalElapsedMs / (1000 * 60);

  // Destroy timer record
  await timer.destroy();

  return {
    hours: Math.round(hours * 100) / 100,
    minutes: Math.round(minutes * 100) / 100,
    startTime: timer.startTime,
    endTime: now,
    clientId: timer.clientId,
    projectId: timer.projectId,
    taskId: timer.taskId,
    clientName: timer.clientName,
    projectName: timer.projectName,
    taskName: timer.taskName,
    description: timer.description,
  };
};

// ================= STOP TIMER AND CREATE TIME ENTRY =================
export const stopTimerAndCreateEntry = async (timerId, userId) => {
  const timerData = await stopTimer(timerId, userId);

  const entryDate = new Date(timerData.startTime).toISOString().split("T")[0];

  const user = await (async () => {
    const User = (await import("../models/user.model.js")).default;
    return await User.findByPk(userId, { attributes: ["managerId"] });
  })();

  const timeEntry = await TimeEntry.create({
    userId,
    managerId: user?.managerId || null,
    clientId: timerData.clientId,
    projectId: timerData.projectId,
    taskId: timerData.taskId,
    client: timerData.clientName || "Manual",
    project: timerData.projectName || "Manual",
    task: timerData.taskName || "Manual",
    entryDate,
    startTime: new Date(timerData.startTime).toTimeString().split(" ")[0],
    endTime: new Date(timerData.endTime).toTimeString().split(" ")[0],
    hours: timerData.hours,
    description: timerData.description,
    isBillable: true,
    status: "DRAFT",
  });

  return { timer: timerData, timeEntry };
};

// ================= SAVE TIMER STATE (AUTO-SAVE) =================
export const saveTimerState = async (timerId, userId) => {
  const timer = await Timer.findOne({
    where: { id: timerId, userId },
  });

  if (!timer) {
    throw new Error("Timer not found");
  }

  timer.lastSaved = new Date();
  await timer.save();

  return timer;
};

// ================= GET TIMER BY ID =================
export const getTimerById = async (timerId, userId) => {
  return await Timer.findOne({
    where: { id: timerId, userId },
  });
};
