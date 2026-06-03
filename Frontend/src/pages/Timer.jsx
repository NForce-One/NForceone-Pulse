import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  saveTimer,
  convertTimerToEntry,
  getActiveTimer,
  fetchClients,
  fetchProjects,
  fetchTasks,
} from "../services/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Play, Pause, Square, RotateCcw, ArrowRight, AlertCircle } from "lucide-react";

export const TimerPage = () => {
  const navigate = useNavigate();
  // Timer state
  const [timer, setTimer] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Dropdown data
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Form state
  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    task: "",
    description: "",
  });

  // UI state
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Refs
  const intervalRef = useRef(null);
  const autoSaveRef = useRef(null);

  // ================= LOAD DROPDOWNS =================
  const loadDropdownData = useCallback(async () => {
    try {
      const [clientsRes, projectsRes, tasksRes] = await Promise.all([
        fetchClients(),
        fetchProjects(),
        fetchTasks(),
      ]);
      setClients(clientsRes?.data || []);
      setProjects(projectsRes?.data || []);
      setTasks(tasksRes?.data || []);
    } catch (err) {
      console.error("Failed to load dropdown data", err);
    }
  }, []);

  // ================= RESTORE TIMER ON MOUNT =================
  const restoreTimer = useCallback(async () => {
    try {
      const response = await getActiveTimer();
      const existingTimer = response?.data;

      if (existingTimer) {
        setTimer(existingTimer);
        setForm({
          clientId: existingTimer.clientId || "",
          projectId: existingTimer.projectId || "",
          task: tasks.find((t) => t.id === existingTimer.taskId)?.title || existingTimer.taskName || "",
          description: existingTimer.description || "",
        });

        // Calculate elapsed time
        const start = new Date(existingTimer.startTime);
        const now = new Date();
        let elapsedMs = now - start - (existingTimer.totalPausedMs || 0);

        // If paused, subtract current pause duration
        if (existingTimer.status === "PAUSED" && existingTimer.pausedAt) {
          elapsedMs -= (now - new Date(existingTimer.pausedAt));
        }

        const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
        setElapsedSeconds(elapsedSec);

        if (existingTimer.status === "RUNNING") {
          setIsRunning(true);
          setIsPaused(false);
        } else if (existingTimer.status === "PAUSED") {
          setIsRunning(false);
          setIsPaused(true);
        }
      }
    } catch (err) {
      // No active timer found - that's fine
    } finally {
      setIsRestoring(false);
    }
  }, []);

  // ================= CALCULATE ELAPSED TIME =================
  const calculateElapsed = useCallback(() => {
    if (!timer) return 0;
    const start = new Date(timer.startTime);
    const now = new Date();
    let elapsedMs = now - start - (timer.totalPausedMs || 0);

    if (timer.status === "PAUSED" && timer.pausedAt) {
      elapsedMs -= (now - new Date(timer.pausedAt));
    }

    return Math.max(0, Math.floor(elapsedMs / 1000));
  }, [timer]);

  // ================= START TICKING =================
  const startTicking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);
  }, [calculateElapsed]);

  // ================= STOP TICKING =================
  const stopTicking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ================= AUTO-SAVE TIMER STATE =================
  const startAutoSave = useCallback((timerId) => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(async () => {
      try {
        await saveTimer(timerId);
      } catch (err) {
        console.error("Auto-save failed, will retry...", err);
      }
    }, 30000); // Every 30 seconds
  }, []);

  const stopAutoSave = useCallback(() => {
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }
  }, []);

  // ================= MOUNT: RESTORE + LOAD DATA =================
  useEffect(() => {
    loadDropdownData();
    restoreTimer();
  }, [loadDropdownData, restoreTimer]);

  // ================= EFFECT: MANAGE TICKING =================
  useEffect(() => {
    if (isRunning && timer) {
      startTicking();
      startAutoSave(timer.id);
    } else {
      stopTicking();
      stopAutoSave();
    }
    return () => {
      stopTicking();
      stopAutoSave();
    };
  }, [isRunning, timer, startTicking, stopTicking, startAutoSave, stopAutoSave]);

  // ================= FORMAT TIME =================
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ================= HANDLE INPUT CHANGE =================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "clientId" ? { projectId: "" } : {}),
    }));
    setError("");
  };

  // ================= FILTERED ACTIVE PROJECTS BY SELECTED CLIENT =================
  const filteredProjects = useMemo(() => {
    if (!form.clientId) return [];
    return projects.filter(
      (p) => Number(p.clientId) === Number(form.clientId) && p.status === "ACTIVE"
    );
  }, [form.clientId, projects]);

  // ================= VALIDATE FORM =================
  const validateForm = () => {
    if (!form.clientId) {
      setError("Please select a Client");
      return false;
    }
    if (!form.projectId) {
      setError("Please select a Project");
      return false;
    }
    const selectedProject = projects.find(
      (p) => Number(p.id) === Number(form.projectId) && Number(p.clientId) === Number(form.clientId)
    );
    if (!selectedProject) {
      setError("Selected project does not match the selected client");
      return false;
    }
    if (!form.task || form.task.trim() === "") {
      setError("Please enter a Task name");
      return false;
    }
    if (!form.description || form.description.trim() === "") {
      setError("Please enter a Description");
      return false;
    }
    return true;
  };

  // ================= START TIMER =================
  const handleStart = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const matchedClient = clients.find((c) => Number(c.id) === Number(form.clientId));
      const matchedProject = projects.find((p) => Number(p.id) === Number(form.projectId));
      const matchedTask = tasks.find((t) => t.title.toLowerCase() === form.task.toLowerCase());

      const payload = {
        clientId: Number(form.clientId),
        projectId: Number(form.projectId),
        taskId: matchedTask ? matchedTask.id : null,
        client: matchedClient?.name || form.clientId,
        project: matchedProject?.name || form.projectId,
        task: form.task.trim(),
        description: form.description.trim(),
      };

      const response = await startTimer(payload);
      const newTimer = response?.data;
      setTimer(newTimer);
      setElapsedSeconds(0);
      setIsRunning(true);
      setIsPaused(false);
      setSuccessMsg("Timer started!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start timer");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= PAUSE TIMER =================
  const handlePause = async () => {
    if (!timer) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await pauseTimer(timer.id);
      setTimer(response?.data);
      setIsRunning(false);
      setIsPaused(true);
      stopTicking();
      stopAutoSave();
      // Update elapsed one final time
      setElapsedSeconds(calculateElapsed());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to pause timer");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= RESUME TIMER =================
  const handleResume = async () => {
    if (!timer) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await resumeTimer(timer.id);
      setTimer(response?.data);
      setIsRunning(true);
      setIsPaused(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resume timer");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= STOP TIMER (discard) =================
  const handleStop = async () => {
    if (!timer) return;
    if (!window.confirm("Stop and discard this timer?")) return;

    setIsLoading(true);
    setError("");

    try {
      await stopTimer(timer.id);
      setTimer(null);
      setElapsedSeconds(0);
      setIsRunning(false);
      setIsPaused(false);
      setSuccessMsg("Timer stopped.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to stop timer");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= STOP TIMER AND CREATE TIME ENTRY =================
  const handleConvertToEntry = async () => {
    if (!timer) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await convertTimerToEntry(timer.id);
      const result = response?.data;

      setTimer(null);
      setElapsedSeconds(0);
      setIsRunning(false);
      setIsPaused(false);
      setForm({ clientId: "", projectId: "", task: "", description: "" });

      setSuccessMsg("Time entry created successfully! Redirecting...");

      navigate("/timesheet");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to stop timer and create entry");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= LOADING STATE =================
  if (isRestoring) {
    return (
      <div className="space-y-6">
<h1 className="text-[32px] font-bold text-[#1E293B] leading-tight">Timer</h1>
         <div className="text-center py-12 text-[#64748B]">Restoring timer state...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-bold text-[#1E293B] leading-tight flex items-center gap-2">
          <Play className="w-6 h-6 text-[#5B3CC4]" />
          Timer
        </h1>
        <p className="text-[#64748B]">Track time with start, pause, resume, and stop controls</p>
      </div>

      {/* ERROR / SUCCESS MESSAGES */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 backdrop-blur-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg backdrop-blur-sm">
          {successMsg}
        </div>
      )}

      {/* ACTIVE TIMER DISPLAY */}
      {timer && (
        <Card className="border-[#5B3CC4]/20 shadow-[0_0_30px_rgba(91,60,196,0.08)]">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Badge variant={isPaused ? "warning" : "success"} className="text-sm px-4 py-1">
                  {isRunning ? "⏱ Running" : "⏸ Paused"}
                </Badge>
              </div>
              <div className="text-7xl font-mono font-bold text-[#1E293B] mb-4 tracking-wider">
                {formatTime(elapsedSeconds)}
              </div>

              {/* Timer context info */}
              <div className="flex justify-center gap-4 text-sm text-[#64748B] mb-6 flex-wrap">
                <span className="bg-[#F1F5F9] px-3 py-1 rounded-lg">Client: {timer.clientName || (clients.find((c) => Number(c.id) === Number(form.clientId))?.name) || "-"}</span>
                <span className="bg-[#F1F5F9] px-3 py-1 rounded-lg">Project: {timer.projectName || (projects.find((p) => Number(p.id) === Number(form.projectId))?.name) || "-"}</span>
                <span className="bg-[#F1F5F9] px-3 py-1 rounded-lg">Task: {timer.taskName || form.task || "-"}</span>
              </div>
              {timer.description && (
                <p className="text-sm text-[#64748B] mb-6 italic">"{timer.description}"</p>
              )}

              {/* CONTROLS */}
              <div className="flex justify-center gap-3 flex-wrap">
                {!isPaused && (
                  <Button
                    onClick={handlePause}
                    disabled={isLoading}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                {isPaused && (
                  <Button
                    onClick={handleResume}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30 hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}
                <Button
                  onClick={handleStop}
                  disabled={isLoading}
                  variant="danger"
                  className="hover:scale-105 active:scale-95"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop (Discard)
                </Button>
                <Button
                  onClick={handleConvertToEntry}
                  disabled={isLoading}
                  className="bg-[#5B3CC4] hover:bg-[#4B2CB4] shadow-lg shadow-[#5B3CC4]/30 hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Stop & Add to Timesheet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FORM: Only shown when no active timer */}
      {!timer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#1E293B] flex items-center gap-2">
              <Play className="w-5 h-5 text-green-600" />
              Start New Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStart();
              }}
              className="space-y-4"
            >
              {/* CLIENT */}
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">
                  Client <span className="text-[#5B3CC4]">*</span>
                </label>
                <select
                  name="clientId"
                  value={form.clientId}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:border-[#5B3CC4] focus:ring-1 focus:ring-[#5B3CC4]/30 transition-colors"
                >
                  <option value="">-- Select Client --</option>
                  {clients
                    .filter((c) => c.status === "ACTIVE")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* PROJECT */}
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">
                  Project <span className="text-[#5B3CC4]">*</span>
                </label>
                <select
                  name="projectId"
                  value={form.projectId}
                  onChange={handleInputChange}
                  required
                  disabled={!form.clientId}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] placeholder-[#64748B] focus:outline-none focus:border-[#5B3CC4] focus:ring-1 focus:ring-[#5B3CC4]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!form.clientId
                      ? "-- Select a client first --"
                      : filteredProjects.length === 0
                      ? "No projects available"
                      : "Select Project"}
                  </option>
                  {filteredProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* TASK */}
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">
                  Task <span className="text-[#5B3CC4]">*</span>
                </label>
                <Input
                  name="task"
                  value={form.task}
                  onChange={handleInputChange}
                  placeholder="Enter task name"
                  required
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">
                  Description <span className="text-[#5B3CC4]">*</span>
                </label>
                <Input
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="What are you working on?"
                  required
                />
              </div>

              {/* START BUTTON */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30 hover:scale-[1.02] active:scale-[0.98] text-lg py-6"
              >
                <Play className="w-5 h-5 mr-2" />
                {isLoading ? "Starting..." : "Start Timer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
