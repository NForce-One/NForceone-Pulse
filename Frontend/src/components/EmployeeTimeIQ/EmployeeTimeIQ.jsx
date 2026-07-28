import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Button } from "../ui/Button";
import {
  fetchETWeeklyTimesheet,
  saveETDraft,
  submitETTimesheet,
  updateETTimesheet,
  cancelETTimesheet,
  deleteETProjectEntries,
  fetchETManagerAction,
} from "../../services/employeeTimeIQApi";
import { fetchClients, fetchProjects, getManagers } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatHoursToHHMM } from "../../utils/timeFormat";
import { CommentModal } from "./CommentModal";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  RotateCcw,
  XCircle,
  Loader2,
  Clock,
  Trash2,
  MessageSquare,
  FileText,
  AlertTriangle,
} from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getWeekStart = (date) => {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return format(d, "yyyy-MM-dd");
};

const getWeekEnd = (date) => {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : new Date(date);
  d.setDate(d.getDate() - d.getDay() + 6);
  return format(d, "yyyy-MM-dd");
};

const generateWeekDates = (weekStartStr) => {
  const start = new Date(weekStartStr + "T00:00:00");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  return DAY_NAMES.map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = format(d, "yyyy-MM-dd");
    return { date: dateStr, dayName: DAY_NAMES[i], dateNum: d.getDate(), isToday: dateStr === todayStr };
  });
};

const parseHHMM = (value) => {
  if (!value && value !== 0) return 0;
  const str = String(value);
  const dotIdx = str.indexOf(".");
  if (dotIdx === -1) {
    const h = parseInt(str, 10);
    return isNaN(h) ? 0 : Math.max(0, h);
  }
  const hours = parseInt(str.substring(0, dotIdx), 10) || 0;
  const minsStr = str.substring(dotIdx + 1);
  const minutes = minsStr.length === 1
    ? parseInt(minsStr, 10)
    : parseInt(minsStr.substring(0, 2), 10);
  return Math.max(0, hours + (isNaN(minutes) ? 0 : minutes) / 60);
};

const decimalToHHMMString = (value) => {
  if (!value && value !== 0) return "";
  const totalMinutes = Math.round(value * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}.${m.toString().padStart(2, "0")}`;
};

const parseHHMMToParts = (value) => {
  if (!value && value !== 0) return { h: "", m: "" };
  const str = String(value);
  const dotIdx = str.indexOf(".");
  if (dotIdx === -1) {
    return { h: str, m: "" };
  }
  const h = str.substring(0, dotIdx);
  const rawM = str.substring(dotIdx + 1);
  const m = rawM.length === 1 ? rawM + "0" : rawM.substring(0, 2);
  return { h, m };
};

const hhmmPartsToString = (h, m) => {
  const hours = parseInt(h, 10);
  const mins = parseInt(m, 10);
  const hVal = isNaN(hours) ? 0 : Math.max(0, hours);
  const mVal = isNaN(mins) ? 0 : Math.min(59, Math.max(0, mins));
  if ((h === "" || h === undefined) && (m === "" || m === undefined)) return "";
  if (hVal === 0 && mVal === 0 && (h === "" || h === "0") && (m === "" || m === "0")) return "";
  return `${hVal}.${mVal.toString().padStart(2, "0")}`;
};

const getSnackbarStyles = (type) => {
  if (type === "success") return "bg-green-600 text-white";
  if (type === "error") return "bg-red-600 text-white";
  return "bg-[#1E293B] text-white";
};

export const EmployeeTimeIQ = () => {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const weekEnd = getWeekEnd(currentWeekStart);
  const weekDates = useMemo(() => generateWeekDates(currentWeekStart), [currentWeekStart]);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(currentWeekStart + "T00:00:00");
    const selected = new Date(weekStart);
    selected.setDate(weekStart.getDate() + dayOfWeek);
    setSelectedDate(format(selected, "yyyy-MM-dd"));
  }, [currentWeekStart]);

  const [clients, setClients] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [selectedClient, setSelectedClient] = useState(() => {
    const saved = sessionStorage.getItem("timeiq_selectedClient");
    return saved ? Number(saved) : "";
  });
  const [selectedProject, setSelectedProject] = useState(() => {
    const saved = sessionStorage.getItem("timeiq_selectedProject");
    return saved ? Number(saved) : "";
  });
  const [selectedManager, setSelectedManager] = useState(() => {
    const saved = sessionStorage.getItem("timeiq_selectedManager");
    return saved ? Number(saved) : "";
  });
  const [allManagers, setAllManagers] = useState([]);
  const [managersLoaded, setManagersLoaded] = useState(false);

  const [projectRows, setProjectRows] = useState([]);
  const [timesheetStatus, setTimesheetStatus] = useState(null);
  const [timesheetId, setTimesheetId] = useState(null);
  // Keyed by project row id — each project can be routed to a different
  // manager, so each one's approve/reject action is tracked independently.
  const [managerActionsByRow, setManagerActionsByRow] = useState({});
  const [managerActionModal, setManagerActionModal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [clientError, setClientError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ client: "", project: "", manager: "" });

  const totalHours = useMemo(() => {
    return projectRows.reduce((sum, row) => {
      return sum + Object.values(row.days).reduce((daySum, d) => daySum + (Math.max(0, parseHHMM(d.hours))), 0);
    }, 0);
  }, [projectRows]);

  const isSubmitted = timesheetStatus === "SUBMITTED";
  const isApproved = timesheetStatus === "APPROVED";
  const isRejected = timesheetStatus === "REJECTED";
  const isReadOnly = isSubmitted || isApproved || isRejected;

  const showSnackbar = useCallback((message, type = "info", duration = 3000) => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), duration);
  }, []);

  const [commentModalRowId, setCommentModalRowId] = useState(null);
  const [commentValue, setCommentValue] = useState("");

  const filteredProjects = useMemo(() => {
    if (!selectedClient) return [];
    return allProjects.filter(
      (p) => Number(p.clientId) === Number(selectedClient) && p.status === "ACTIVE"
    );
  }, [selectedClient, allProjects]);

  const getProjectsForClient = useCallback((clientId) => {
    if (!clientId) return [];
    return allProjects.filter(
      (p) => Number(p.clientId) === Number(clientId) && p.status === "ACTIVE"
    );
  }, [allProjects]);

  useEffect(() => {
    // Restore cached dropdown data for instant display
    try {
      const cached = sessionStorage.getItem("c_timeiq_dropdowns");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data.clients) setClients(parsed.data.clients);
        if (parsed.data.projects) setAllProjects(parsed.data.projects);
        if (parsed.data.managers) setAllManagers(parsed.data.managers);
      }
    } catch (_e) { /* ignore */ }

    (async () => {
      try {
        const [clientsRes, projectsRes] = await Promise.all([
          fetchClients({ status: "ACTIVE" }),
          fetchProjects({ status: "ACTIVE" }),
        ]);
        const clients = clientsRes?.data || [];
        const projects = projectsRes?.data || [];
        setClients(clients);
        setAllProjects(projects);
      } catch (err) {
        console.error("Failed to load clients/projects", err);
      }
    })();

    (async () => {
      try {
        const managersRes = await getManagers();
        const mgrData = managersRes?.data || managersRes || [];
        const managers = Array.isArray(mgrData) ? mgrData : [];
        setAllManagers(managers);
        setManagersLoaded(true);
      } catch (err) {
        console.error("Failed to load managers", err);
        setManagersLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    sessionStorage.setItem("timeiq_weekStart", currentWeekStart);
  }, [currentWeekStart]);

  useEffect(() => {
    if (selectedClient) {
      sessionStorage.setItem("timeiq_selectedClient", String(selectedClient));
    } else {
      sessionStorage.removeItem("timeiq_selectedClient");
    }
  }, [selectedClient]);
  useEffect(() => {
    if (selectedProject) {
      sessionStorage.setItem("timeiq_selectedProject", String(selectedProject));
    } else {
      sessionStorage.removeItem("timeiq_selectedProject");
    }
  }, [selectedProject]);
  useEffect(() => {
    if (selectedManager) {
      sessionStorage.setItem("timeiq_selectedManager", String(selectedManager));
    } else {
      sessionStorage.removeItem("timeiq_selectedManager");
    }
  }, [selectedManager]);

  const handleClientChange = useCallback((clientId) => {
    const id = clientId ? Number(clientId) : "";
    setSelectedClient(id);
    setSelectedProject("");
    setSelectedManager("");
    setFieldErrors((prev) => ({ ...prev, client: "", project: "", manager: "" }));
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      setClientError("");
      return;
    }
    const client = clients.find((c) => Number(c.id) === Number(selectedClient));
    setClientError(
      client && client.status === "INACTIVE"
        ? "The selected client is inactive. You cannot proceed with creating a project for this client."
        : ""
    );
  }, [selectedClient, clients]);

  const handleProjectChange = useCallback((projectId) => {
    const id = projectId ? Number(projectId) : "";
    if (selectedProject && selectedProject !== id) {
      setSelectedManager("");
    }
    setSelectedProject(id);
    setFieldErrors((prev) => ({ ...prev, project: "" }));
  }, [selectedProject]);

  const loadWeekData = useCallback(async (weekStart) => {
    try {
      setLoading(true);
      const dates = generateWeekDates(weekStart);
      const res = await fetchETWeeklyTimesheet(weekStart);
      if (res?.success && res?.data) {
        const { timesheet, entries } = res.data;
        setTimesheetStatus(timesheet?.status || null);
        setTimesheetId(timesheet?.id || null);

        const rowMap = {};
        (entries || []).forEach((entry) => {
          const hoursNum = parseFloat(entry.hours);
          const hasHours = !isNaN(hoursNum) && hoursNum > 0;
          if (!hasHours && !entry.description && !entry.comment) return;
          console.log("[loadWeekData] entry comment:", entry.comment, "projectId:", entry.projectId, "date:", entry.entryDate);

          const key = entry.projectId
            ? `proj-${entry.projectId}`
            : `unassigned-${(entry.client || '')}-${(entry.project || '')}`;
          if (!rowMap[key]) {
            rowMap[key] = {
              rowId: key,
              clientId: entry.clientId || null,
              clientName: entry.client || "",
              projectId: entry.projectId || null,
              projectName: entry.project || "",
              managerId: entry.managerId || null,
              comment: entry.comment || "",
              days: {},
            };
          }
          if (entry.comment && !rowMap[key].comment) {
            rowMap[key].comment = entry.comment;
          }
          rowMap[key].days[entry.entryDate] = {
            hours: decimalToHHMMString(entry.hours),
            description: entry.description || "",
          };
        });

        const rows = Object.values(rowMap);
        rows.forEach((row) => {
          dates.forEach((wd) => {
            if (!row.days[wd.date]) {
              row.days[wd.date] = { hours: "", description: "" };
            }
          });
        });

        setProjectRows(rows);
      } else {
        setProjectRows([]);
        setTimesheetStatus(null);
        setTimesheetId(null);
      }
    } catch (err) {
      console.error("Failed to load weekly data:", err);
      setProjectRows([]);
      setTimesheetId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setProjectRows([]);
    setTimesheetStatus(null);
    setTimesheetId(null);
    setManagerActionsByRow({});
    setFieldErrors({ client: "", project: "", manager: "" });
    loadWeekData(currentWeekStart);
  }, [currentWeekStart, loadWeekData]);

  useEffect(() => {
    if (!timesheetId) {
      setManagerActionsByRow({});
      return;
    }
    fetchETManagerAction(timesheetId).then((res) => {
      const actions = Array.isArray(res?.data) ? res.data : [];
      setManagerActionsByRow(Object.fromEntries(actions.map((a) => [a.rowId, a])));
    }).catch(() => setManagerActionsByRow({}));
  }, [timesheetId]);

  const saveTimeoutRef = useRef(null);
  const dataRef = useRef({ projectRows: [], isReadOnly: false, currentWeekStart: "", weekDates: [], selectedManager: "" });
  dataRef.current = { projectRows, isReadOnly, currentWeekStart, weekDates, selectedManager };
  const unmountDataRef = useRef({ rows: [], isReadOnly: false, weekStart: "" });
  unmountDataRef.current = { rows: projectRows, isReadOnly, weekStart: currentWeekStart };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  const handleCellChange = useCallback((rowId, date, value) => {
    if (value !== "" && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) return;
    if (parseFloat(value) > 24) return;
    const newHours = parseHHMM(value);
    const otherTotal = projectRows.reduce((sum, r) => {
      if (r.rowId === rowId) return sum;
      return sum + parseHHMM(r.days[date]?.hours);
    }, 0);
    if (otherTotal + newHours > 24) {
      const maxAllowed = Math.max(0, 24 - otherTotal);
      if (maxAllowed <= 0) {
        showSnackbar("Maximum 24 hours can be logged per day across all projects.", "error");
        return;
      }
      showSnackbar("Maximum 24 hours can be logged per day across all projects.", "error");
      setProjectRows((prev) =>
        prev.map((r) =>
          r.rowId !== rowId
            ? r
            : {
                ...r,
                days: {
                  ...r.days,
                  [date]: { ...(r.days[date] || { hours: "", description: "" }), hours: decimalToHHMMString(maxAllowed) },
                },
              }
        )
      );
    } else {
      setProjectRows((prev) =>
        prev.map((row) =>
          row.rowId !== rowId
            ? row
            : {
                ...row,
                days: { ...row.days, [date]: { ...(row.days[date] || { hours: "", description: "" }), hours: value } },
              }
        )
      );
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      const { projectRows: curRows, isReadOnly: ro, currentWeekStart: ws, weekDates: wd } = dataRef.current;
      if (ro || curRows.length === 0) return;
      const row = curRows.find((r) => r.rowId === rowId);
      if (!row || row.isPending) return;
      console.log("[autoSave] timer fired for rowId:", rowId, "comment:", row.comment, "date:", new Date().toISOString());
      const data = {
        weekStartDate: ws,
        dailyEntries: wd.map((w, idx) => ({
          entryDate: w.date,
          hours: parseHHMM(row.days[w.date]?.hours),
          description: row.days[w.date]?.description || "",
          comment: idx === 0 ? (row.comment || "") : undefined,
          clientId: row.clientId,
          projectId: row.projectId,
          managerId: row.managerId,
          clientName: row.clientName,
          projectName: row.projectName,
        })),
      };
      saveETDraft(data).catch(() => {});
    }, 800);
  }, [projectRows, showSnackbar]);





  const handleAddProject = useCallback(() => {
    const errors = {};
    if (!selectedClient) errors.client = "Please select a Client.";
    if (!selectedProject) errors.project = "Please select a Project.";
    if (!selectedManager) errors.manager = "Please select a Manager.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    if (projectRows.some((r) => Number(r.projectId) === Number(selectedProject))) {
      showSnackbar("This project is already added for this week", "error");
      return;
    }
    const selectedProjectData = allProjects.find((p) => Number(p.id) === Number(selectedProject));
    const selectedClientData = clients.find((c) => Number(c.id) === Number(selectedClient));
    if (selectedClientData && selectedClientData.status === "INACTIVE") {
      setClientError(
        "The selected client is inactive. You cannot proceed with creating a project for this client."
      );
      return;
    }
    const rowId = `proj-${selectedProject}`;
    const newRow = {
      rowId,
      clientId: Number(selectedClient),
      clientName: selectedClientData?.name || "",
      projectId: Number(selectedProject),
      projectName: selectedProjectData?.name || "",
      managerId: Number(selectedManager),
      days: {},
    };
    weekDates.forEach((wd) => {
      newRow.days[wd.date] = { hours: "", description: "" };
    });
    setProjectRows((prev) => [...prev, newRow]);
    setSelectedClient("");
    setSelectedProject("");
    setSelectedManager("");
    setFieldErrors({ client: "", project: "", manager: "" });
  }, [selectedClient, selectedProject, selectedManager, allProjects, clients, weekDates, projectRows, showSnackbar]);

  const handlePendingClientChange = useCallback((rowId, clientId) => {
    const id = clientId ? Number(clientId) : null;
    const client = clients.find((c) => Number(c.id) === id);
    setProjectRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId
          ? { ...row, clientId: id, clientName: client?.name || "", projectId: null, projectName: "" }
          : row
      )
    );
  }, [clients]);

  const handlePendingProjectChange = useCallback((rowId, projectId) => {
    const id = projectId ? Number(projectId) : null;
    const project = allProjects.find((p) => Number(p.id) === id);
    if (!project) return;
    if (projectRows.some((r) => Number(r.projectId) === id && r.rowId !== rowId)) {
      showSnackbar("This project is already added for this week", "error");
      return;
    }
    const client = clients.find((c) => Number(c.id) === Number(project.clientId));
    setProjectRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              isPending: false,
              projectId: id,
              projectName: project.name,
              clientId: Number(project.clientId),
              clientName: client?.name || "",
              rowId: `proj-${id}`,
            }
          : row
      )
    );
  }, [allProjects, clients, projectRows, showSnackbar]);

  const handleRemoveProject = useCallback(async (rowId) => {
    const row = projectRows.find((r) => r.rowId === rowId);
    if (!row) return;
    const hasHours = Object.values(row.days).some((d) => parseHHMM(d.hours) > 0);
    if (hasHours && !window.confirm(`Remove "${row.projectName}" and its hours?`)) return;
    try {
      const pId = row.projectId || "null";
      await deleteETProjectEntries(pId, currentWeekStart, row.clientName, row.projectName);
    } catch (err) {
      console.error("Failed to delete project entries:", err);
    }
    setProjectRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }, [projectRows, currentWeekStart]);

  const handleCommentSave = useCallback(async (rowId, date, text) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const updatedRows = projectRows.map((row) =>
      row.rowId === rowId ? { ...row, comment: text } : row
    );
    setProjectRows(updatedRows);

    const dailyEntries = updatedRows.filter((r) => !r.isPending).flatMap((row) =>
      weekDates.map((wd, idx) => ({
        entryDate: wd.date,
        hours: parseHHMM(row.days[wd.date]?.hours),
        description: row.days[wd.date]?.description || "",
        comment: idx === 0 ? (row.comment || "") : undefined,
        clientId: row.clientId,
        projectId: row.projectId,
        managerId: selectedManager ? Number(selectedManager) : row.managerId,
        clientName: row.clientName,
        projectName: row.projectName,
      }))
    );
    if (dailyEntries.length > 0) {
      console.log("[handleCommentSave] saving comment:", text, "rowId:", rowId, "entries:", dailyEntries.map((e) => ({ date: e.entryDate, comment: e.comment, pid: e.projectId })));
      try {
        await saveETDraft({ weekStartDate: currentWeekStart, dailyEntries });
        showSnackbar("Comment saved", "success");
      } catch (err) {
        console.error("Failed to save comment:", err);
        showSnackbar("Failed to save comment to server", "error");
      }
    }
    setCommentModalRowId(null);
    setCommentValue("");
  }, [projectRows, weekDates, currentWeekStart, selectedManager, showSnackbar]);

  const handleCommentDelete = useCallback(async (rowId, date) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const updatedRows = projectRows.map((row) =>
      row.rowId === rowId ? { ...row, comment: "" } : row
    );
    setProjectRows(updatedRows);

    const dailyEntries = updatedRows.filter((r) => !r.isPending).flatMap((row) =>
      weekDates.map((wd, idx) => ({
        entryDate: wd.date,
        hours: parseHHMM(row.days[wd.date]?.hours),
        description: row.days[wd.date]?.description || "",
        comment: idx === 0 ? (row.comment || "") : undefined,
        clientId: row.clientId,
        projectId: row.projectId,
        managerId: selectedManager ? Number(selectedManager) : row.managerId,
        clientName: row.clientName,
        projectName: row.projectName,
      }))
    );
    if (dailyEntries.length > 0) {
      try {
        await saveETDraft({ weekStartDate: currentWeekStart, dailyEntries });
        showSnackbar("Comment deleted", "info");
      } catch (err) {
        console.error("Failed to delete comment:", err);
        showSnackbar("Failed to delete comment on server", "error");
      }
    }
    setCommentModalRowId(null);
    setCommentValue("");
  }, [projectRows, weekDates, currentWeekStart, selectedManager, showSnackbar]);

  const prepareSaveData = useCallback(() => ({
    weekStartDate: currentWeekStart,
    dailyEntries: projectRows.filter((r) => !r.isPending).flatMap((row) =>
      weekDates.map((wd, idx) => {
        const dayData = row.days[wd.date] || { hours: "", description: "" };
        return {
          entryDate: wd.date,
          hours: parseHHMM(dayData.hours),
          description: dayData.description || "",
          comment: idx === 0 ? (row.comment || "") : undefined,
          clientId: row.clientId,
          projectId: row.projectId,
          managerId: row.managerId || (selectedManager ? Number(selectedManager) : null),
          clientName: row.clientName,
          projectName: row.projectName,
        };
      })
    ),
  }), [currentWeekStart, projectRows, selectedManager, weekDates]);

  const handleSaveDraft = useCallback(async () => {
    if (projectRows.length === 0) {
      showSnackbar("Please add at least one project", "error");
      return;
    }
    const exceededDay = weekDates.find((wd) => {
      const dayTotal = projectRows.reduce((sum, row) => {
        return sum + parseHHMM(row.days[wd.date]?.hours);
      }, 0);
      return dayTotal > 24;
    });
    if (exceededDay) {
      showSnackbar("Maximum 24 hours can be logged per day across all projects.", "error");
      return;
    }
    try {
      setSaving(true);
      const data = prepareSaveData();
      const res = await saveETDraft(data);
      if (res?.success) {
        setTimesheetStatus(res.data?.timesheet?.status || "DRAFT");
        showSnackbar("Draft saved successfully!", "success");
      } else {
        showSnackbar(res?.message || "Failed to save draft", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to save draft", "error");
    } finally {
      setSaving(false);
    }
  }, [projectRows, weekDates, prepareSaveData, showSnackbar]);

  const handleSubmit = useCallback(async () => {
    if (projectRows.length === 0) {
      showSnackbar("Please add at least one project", "error");
      return;
    }
    if (projectRows.some((r) => !r.isPending && !r.managerId)) {
      showSnackbar("Please assign a manager to every project before submitting.", "error");
      return;
    }
    if (totalHours <= 0) {
      showSnackbar("Cannot submit empty timesheet. Add hours first.", "error");
      return;
    }
    const exceededDay = weekDates.find((wd) => {
      const dayTotal = projectRows.reduce((sum, row) => {
        return sum + parseHHMM(row.days[wd.date]?.hours);
      }, 0);
      return dayTotal > 24;
    });
    if (exceededDay) {
      showSnackbar("Maximum 24 hours can be logged per day across all projects.", "error");
      return;
    }
    if (!window.confirm("Submit this timesheet for approval?")) return;
    try {
      setSubmitting(true);
      const data = prepareSaveData();
      const saveRes = await saveETDraft(data);
      if (!saveRes?.success) {
        showSnackbar(saveRes?.message || "Failed to save before submit", "error");
        setSubmitting(false);
        return;
      }
      setTimesheetStatus(saveRes.data?.timesheet?.status || "DRAFT");
      const res = await submitETTimesheet(data);
      if (res?.success) {
        setTimesheetStatus("SUBMITTED");
        showSnackbar("Timesheet submitted successfully!", "success");
        window.dispatchEvent(new Event("approval-status-changed"));
      } else {
        showSnackbar(res?.message || "Failed to submit", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  }, [projectRows, totalHours, weekDates, prepareSaveData, showSnackbar]);

  const handleUpdate = useCallback(async () => {
    if (!window.confirm("Revert to draft for editing?")) return;
    try {
      setSaving(true);
      const res = await updateETTimesheet({ weekStartDate: currentWeekStart });
      if (res?.success) {
        setTimesheetStatus("DRAFT");
        showSnackbar("Timesheet reverted to draft. Edit and re-submit.", "success");
      } else {
        showSnackbar(res?.message || "Failed to update", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to update", "error");
    } finally {
      setSaving(false);
    }
  }, [currentWeekStart, showSnackbar]);

  const handleCancel = useCallback(async () => {
    if (projectRows.length === 0) {
      return;
    }
    if (timesheetStatus === "SUBMITTED") {
      if (!window.confirm("Cancel this submitted timesheet? All entries for this week will be permanently removed and this cannot be undone.")) {
        return;
      }
    }
    try {
      const res = await cancelETTimesheet(currentWeekStart);
      if (res?.success) {
        await loadWeekData(currentWeekStart);
        showSnackbar("Timesheet cancelled. All entries removed.", "info");
      } else {
        showSnackbar("Failed to cancel timesheet", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to cancel", "error");
    }
  }, [currentWeekStart, timesheetStatus, projectRows, loadWeekData, showSnackbar]);

  const navigateWeek = useCallback((direction) => {
    const cur = new Date(currentWeekStart + "T00:00:00");
    cur.setDate(cur.getDate() + (direction === "prev" ? -7 : 7));
    setCurrentWeekStart(format(cur, "yyyy-MM-dd"));
  }, [currentWeekStart]);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(getWeekStart(new Date()));
  }, []);

  if (loading && projectRows.length === 0 && !timesheetStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#B33A2F] animate-spin" />
      </div>
    );
  }

  const isBusy = saving || submitting;

  return (
    <div className="relative">
      {snackbar && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg animate-in slide-in-from-right-2 ${getSnackbarStyles(snackbar.type)}`}>
          {snackbar.message}
        </div>
      )}

      {/* ===== SECTION 1: Week Nav + Total Hours (UNTOUCHABLE) ===== */}
      <div className="flex items-center justify-between mb-3 bg-white rounded-xl border border-[#E2E8F0] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateWeek("prev")} className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#B33A2F]/30 transition-all" title="Previous week">
            <ChevronLeft className="w-4 h-4 text-[#64748B]" />
          </button>
          <div className="text-center min-w-[180px]">
            <p className="week-nav-date text-sm font-semibold text-[#1E293B]" style={{ textDecoration: "none", WebkitTextDecoration: "none", borderBottom: "none", outline: "none", boxShadow: "none", userSelect: "none" }}>
              {format(new Date(currentWeekStart + "T00:00:00"), "MMM dd")} - {format(new Date(weekEnd + "T00:00:00"), "MMM dd, yyyy")}
            </p>
            <p className="text-[11px] font-medium text-[#B33A2F] mt-0.5">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <button onClick={() => navigateWeek("next")} className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#B33A2F]/30 transition-all" title="Next week">
            <ChevronRight className="w-4 h-4 text-[#64748B]" />
          </button>
          <button onClick={goToCurrentWeek} className="ml-1 px-2.5 py-1.5 text-[11px] font-medium text-[#B33A2F] border border-[#B33A2F]/30 rounded-lg hover:bg-[#B33A2F]/5 transition-all">
            Today
          </button>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#B33A2F]/10 to-[#D45A4F]/5 px-4 py-2 rounded-lg border border-[#B33A2F]/20">
          <Clock className="w-4 h-4 text-[#B33A2F]" />
          <div>
            <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider leading-tight">Total</p>
            <p className="text-lg font-bold text-[#1E293B] leading-tight">{formatHoursToHHMM(totalHours)}</p>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: Dropdowns (UNTOUCHABLE) ===== */}
      <div className="flex items-center gap-3 mb-3 bg-white rounded-xl border border-[#E2E8F0] px-4 py-2.5">
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5 uppercase tracking-wider">Client</label>
          <select
            value={selectedClient}
            onChange={(e) => handleClientChange(e.target.value)}
            disabled={isReadOnly}
            className={`h-8 w-full rounded-lg border bg-white px-2 py-1.5 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
              clientError || fieldErrors.client
                ? "border-red-400 focus:ring-red-200"
                : "border-[#E2E8F0] focus:ring-[#B33A2F]"
            }`}
          >
            <option value="">{clients.length === 0 ? "Loading..." : "Select Client"}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {(clientError || fieldErrors.client) && (
            <p className="mt-1 text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {clientError || fieldErrors.client}
            </p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5 uppercase tracking-wider">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={!selectedClient || isReadOnly}
            className={`h-8 w-full rounded-lg border bg-white px-2 py-1.5 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
              fieldErrors.project
                ? "border-red-400 focus:ring-red-200"
                : "border-[#E2E8F0] focus:ring-[#B33A2F]"
            }`}
          >
            <option value="">{!selectedClient ? "Select client first" : filteredProjects.length === 0 ? "No projects" : "Select Project"}</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {fieldErrors.project && (
            <p className="mt-1 text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {fieldErrors.project}
            </p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5 uppercase tracking-wider">{user?.role === "MANAGER" ? "Admin" : "Manager"}</label>
          <select
            value={selectedManager}
            onChange={(e) => {
              setSelectedManager(e.target.value ? Number(e.target.value) : "");
              if (e.target.value) setFieldErrors((prev) => ({ ...prev, manager: "" }));
            }}
            disabled={!selectedClient || isReadOnly}
            className={`h-8 w-full rounded-lg border bg-white px-2 py-1.5 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
              fieldErrors.manager
                ? "border-red-400 focus:ring-red-200"
                : "border-[#E2E8F0] focus:ring-[#B33A2F]"
            }`}
          >
            <option value="">{!managersLoaded ? "Loading..." : allManagers.length === 0 ? "No Managers Available" : user?.role === "MANAGER" ? "Select Admin" : "Select Manager"}</option>
            {allManagers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {fieldErrors.manager && (
            <p className="mt-1 text-[11px] font-medium text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {fieldErrors.manager}
            </p>
          )}
        </div>
      </div>

      {!isReadOnly && (
        <button
          onClick={handleAddProject}
          className="mb-3 h-9 rounded-lg border-2 border-dashed border-[#E2E8F0] text-sm font-medium text-[#B33A2F] hover:border-[#B33A2F] hover:bg-[#B33A2F]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed px-4"
        >
+ Add Record
        </button>
      )}

      {/* ===== SECTION 3: Multi-Project Weekly Table ===== */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-3 py-2 text-left text-[10px] font-bold text-[#64748B] uppercase tracking-wider min-w-[130px]">
                Project
              </th>
              {weekDates.map((wd) => (
                <th key={wd.date} className={`px-1.5 py-2 text-center border-l border-[#E2E8F0] ${wd.isToday ? "bg-[#B33A2F]/5" : ""}`}>
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{wd.dayName}</p>
                  <p className={`text-xs font-bold ${wd.isToday ? "text-[#B33A2F]" : "text-[#1E293B]"}`}>{wd.dateNum}</p>
                </th>
              ))}
              <th className="px-2 py-2 text-center border-l border-[#E2E8F0] w-14">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">COMMENT</p>
              </th>
              <th className="px-2 py-2 text-center border-l border-[#E2E8F0] min-w-[75px]">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">WEEK</p>
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">TOTAL</p>
              </th>
              <th className="px-2 py-2 text-center border-l border-[#E2E8F0] min-w-[90px]">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">STATUS</p>
              </th>
              <th className="px-2 py-2 text-center border-l border-[#E2E8F0] w-10"></th>
            </tr>
          </thead>
          <tbody>
            {projectRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                  No records added yet. Select a client, project and manager above and click "+ Add Record".
                </td>
              </tr>
            ) : (
              projectRows.map((row) => {
                const rowTotal = Object.values(row.days).reduce(
                  (s, d) => s + (Math.max(0, parseHHMM(d.hours))), 0
                );
                const rowAction = managerActionsByRow[row.rowId];
                // A project a manager already approved stays locked even if a
                // different manager's rejection elsewhere unlocks the rest of
                // the timesheet for edits/resubmission.
                const rowApproved = rowAction?.status === "APPROVED";
                return (
                  <tr key={row.rowId} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="px-3 py-2 border-r border-[#E2E8F0]">
                      {/* [TEMP-HIDE] Add Project dropdown logic commented out per requirement */}
                      {/* {row.isPending ? (
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                          <select
                            value={row.clientId || ""}
                            onChange={(e) => handlePendingClientChange(row.rowId, e.target.value)}
                            className="h-7 rounded-lg border border-[#E2E8F0] bg-white px-1.5 py-1 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#B33A2F] focus:border-transparent"
                          >
                            <option value="">Select Client</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <select
                            value={row.projectId || ""}
                            onChange={(e) => handlePendingProjectChange(row.rowId, e.target.value)}
                            disabled={!row.clientId}
                            className="h-7 rounded-lg border border-[#E2E8F0] bg-white px-1.5 py-1 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#B33A2F] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">{!row.clientId ? "Select client first" : "Select Project"}</option>
                            {row.clientId && getProjectsForClient(row.clientId).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : ( */}
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#1E293B] truncate max-w-[160px]">{row.projectName}</span>
                          <span className="text-[10px] text-[#64748B] truncate max-w-[160px]">{row.clientName}</span>
                          {(() => {
                            const mgr = allManagers.find((m) => Number(m.id) === Number(row.managerId));
                            return mgr ? (
                              <span className="text-[10px] text-[#94A3B8] truncate max-w-[160px]">Manager: {mgr.name}</span>
                            ) : null;
                          })()}
                        </div>
                      {/* )} */}
                    </td>
                    {weekDates.map((wd) => {
                      const dayData = row.days[wd.date] || { hours: "", description: "" };
                      const parts = parseHHMMToParts(dayData.hours);
                      const cellDisabled = isReadOnly || row.isPending || rowApproved;
                      const cellInputClass = "h-6 rounded border border-[#E2E8F0] bg-white text-[10px] text-[#1E293B] font-medium text-center focus:outline-none focus:ring-1 focus:ring-[#B33A2F] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden [-moz-appearance:textfield]";
                      return (
                        <td key={wd.date} className={`px-1 py-1.5 border-l border-[#E2E8F0] ${wd.isToday ? "bg-[#B33A2F]/[0.02]" : ""}`}>
                          <div className="flex items-center justify-center gap-0.5">
                            <input
                              type="number"
                              min="0"
                              max="23"
                              step="1"
                              value={parts.h}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v !== "" && (isNaN(parseInt(v, 10)) || parseInt(v, 10) < 0)) return;
                                if (parseInt(v, 10) > 23) return;
                                handleCellChange(row.rowId, wd.date, hhmmPartsToString(v, parts.m));
                              }}
                              disabled={cellDisabled}
                              className={`${cellInputClass} w-[28px]`}
                              placeholder="0"
                            />
                            <span className="text-[9px] text-[#94A3B8] font-medium select-none">hrs</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              step="1"
                              value={parts.m}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v !== "" && (isNaN(parseInt(v, 10)) || parseInt(v, 10) < 0)) return;
                                if (parseInt(v, 10) > 59) return;
                                handleCellChange(row.rowId, wd.date, hhmmPartsToString(parts.h, v));
                              }}
                              disabled={cellDisabled}
                              className={`${cellInputClass} w-[28px]`}
                              placeholder="00"
                            />
                            <span className="text-[9px] text-[#94A3B8] font-medium select-none">min</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-1.5 py-2 text-center border-l border-[#E2E8F0] w-14">
                      <button
                        onClick={() => {
                          setCommentModalRowId(row.rowId);
                          setCommentValue(row.comment || "");
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors mx-auto"
                        title={row.comment ? "Edit comment" : "Add comment"}
                      >
                        {row.comment ? (
                          <FileText className="w-4 h-4 text-[#B33A2F]" />
                        ) : (
                          <FileText className="w-4 h-4 text-[#94A3B8]" />
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-center border-l border-[#E2E8F0]">
                      <span className="text-sm font-bold text-[#1E293B]">{formatHoursToHHMM(rowTotal)}</span>
                    </td>
                    <td className="px-2 py-2 text-center border-l border-[#E2E8F0]">
                      {(() => {
                        if (rowAction) {
                          const isApproved = rowAction.status === "APPROVED";
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                isApproved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {isApproved ? "Approved" : "Rejected"}
                              </span>
                              {rowAction.comment && (
                                <button
                                  onClick={() => setManagerActionModal(rowAction)}
                                  className="p-0.5 rounded bg-[#B33A2F]/10 text-[#B33A2F] ring-1 ring-[#B33A2F]/30"
                                  title="View comment"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        }
                        if (timesheetStatus === "SUBMITTED") {
                          return <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">Pending</span>;
                        }
                        return <span className="text-[#94A3B8]">-</span>;
                      })()}
                    </td>
                    <td className="px-2 py-2 text-center border-l border-[#E2E8F0]">
                      {!isReadOnly && !rowApproved && (
                        <button
                          onClick={() => handleRemoveProject(row.rowId)}
                          className="p-1 rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-500 transition-colors"
                          title={`Remove ${row.projectName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {projectRows.length > 0 && (
            <tfoot>
              <tr className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0]">
                <td className="px-3 py-2 border-r border-[#E2E8F0]">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Daily Totals</span>
                </td>
                {weekDates.map((wd) => {
                  const dayTotal = projectRows.reduce(
                    (s, row) => s + (Math.max(0, parseHHMM(row.days[wd.date]?.hours))), 0
                  );
                  const isOverLimit = dayTotal > 24;
                  return (
                    <td key={wd.date} className="px-2 py-2 text-center border-l border-[#E2E8F0]">
                      <span className={`text-xs font-bold ${isOverLimit ? "text-red-600" : "text-[#1E293B]"}`}>{formatHoursToHHMM(dayTotal)}</span>
                      {isOverLimit && (
                        <div className="text-[9px] text-red-500 font-semibold mt-0.5">Over 24h!</div>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 border-l border-[#E2E8F0]"></td>
                <td className="px-2 py-2 text-center border-l border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#B33A2F]">{formatHoursToHHMM(totalHours)}</span>
                </td>
                <td className="px-2 py-2 border-l border-[#E2E8F0]"></td>
                <td className="px-2 py-2 border-l border-[#E2E8F0]"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ===== SECTION 4: Buttons ===== */}
      {/* Once every project is approved there's nothing left to do here — the
          per-project "Approved" status is already visible in the grid above. */}
      {!isApproved && (
        <div className="flex items-center justify-end gap-2 mt-3">
          {isRejected ? (
            <Button variant="danger" onClick={handleUpdate} disabled={isBusy} className="h-8 text-xs px-3">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> {saving ? "Reverting..." : "Update"}
            </Button>
          ) : isSubmitted ? (
            <>
              <Button variant="ghost" onClick={handleCancel} disabled={isBusy} className="h-8 text-xs px-3 text-[#64748B]">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button variant="outline" onClick={handleUpdate} disabled={isBusy} className="h-8 text-xs px-3">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> {saving ? "Reverting..." : "Update"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleSaveDraft} disabled={isBusy || projectRows.length === 0} className="h-8 text-xs px-3">
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Save Draft
              </Button>
              <Button onClick={handleSubmit} disabled={isBusy || projectRows.length === 0 || totalHours <= 0} className="h-8 text-xs px-3">
                {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Submit
              </Button>
            </>
          )}
        </div>
      )}

      {commentModalRowId && (
        <CommentModal
          isOpen={!!commentModalRowId}
          rowId={commentModalRowId}
          date={weekDates[0]?.date || ""}
          dayName={format(new Date(selectedDate + "T00:00:00"), "EEEE")}
          fullDate={format(new Date(selectedDate + "T00:00:00"), "MMMM d, yyyy")}
          hoursLogged={projectRows.find((r) => r.rowId === commentModalRowId)?.comment ? 0 : 0}
          value={commentValue}
          onChange={setCommentValue}
          onSave={handleCommentSave}
          onDelete={handleCommentDelete}
          onClose={() => {
            setCommentModalRowId(null);
            setCommentValue("");
          }}
        />
      )}

      {managerActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setManagerActionModal(null)}></div>
          <div className="relative w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h2 className="text-lg font-semibold text-[#1E293B] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#B33A2F]" />
                Admin Response
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Admin Status</span>
                <div className="mt-1">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                    managerActionModal.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {managerActionModal.status === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Admin</span>
                <p className="mt-1 text-sm font-medium text-[#1E293B]">{managerActionModal.managerName}</p>
              </div>
              {managerActionModal.comment && (
                <div>
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Comment</span>
                  <p className="mt-1 text-sm text-[#1E293B] bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0]">
                    "{managerActionModal.comment}"
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Date</span>
                <p className="mt-1 text-sm text-[#64748B]">
                  {format(new Date(managerActionModal.date), "dd-MMM-yyyy")}
                </p>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
              <button
                onClick={() => setManagerActionModal(null)}
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#1E293B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
