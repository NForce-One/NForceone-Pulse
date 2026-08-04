import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { Button } from "../ui/Button";
import {
  fetchETWeeklyTimesheet,
  saveETDraft,
  submitETTimesheet,
  updateETTimesheet,
  updateETProjectDetails,
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
  ChevronDown,
  Pencil,
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

const deriveRowStatus = (row, managerActionsByRow) => {
  const rowAction = managerActionsByRow[row.rowId];
  if (rowAction) {
    if (rowAction.status === "APPROVED") return "APPROVED";
    if (rowAction.status === "REJECTED") return "REJECTED";
  }
  const statuses = row.entryStatuses || [];
  if (statuses.length === 0) return "DRAFT";
  const allApproved = statuses.every((s) => s === "APPROVED");
  if (allApproved) return "APPROVED";
  const anyRejected = statuses.some((s) => s === "REJECTED");
  if (anyRejected) return "REJECTED";
  const anySubmitted = statuses.some((s) => s === "SUBMITTED");
  if (anySubmitted) {
    // Only a genuine resubmission to the SAME manager who last decided this
    // row counts as Re-Submitted — if the employee reassigned it to a
    // different manager (via the Project Details edit), that manager is
    // seeing it for the first time, so it must read as Pending.
    if (rowAction?.priorActorId && Number(rowAction.priorActorId) === Number(row.managerId)) {
      return "RE-SUBMITTED";
    }
    return "SUBMITTED";
  }
  return "DRAFT";
};

export const EmployeeTimeIQ = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  // If the page was opened with ?weekStart=YYYY-MM-DD (e.g. from a
  // notification's "View Timesheet" action), open exactly that week instead of
  // the current week. The date is normalized to the week's Monday so any valid
  // date inside the week targets the correct week.
  const initialWeekStart = (() => {
    const param = searchParams.get("weekStart");
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      return getWeekStart(param);
    }
    return getWeekStart(new Date());
  })();
  const [currentWeekStart, setCurrentWeekStart] = useState(initialWeekStart);
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
  const [managerCommentExpanded, setManagerCommentExpanded] = useState(false);
  useEffect(() => { setManagerCommentExpanded(false); }, [managerActionModal]);
  const pollingRef = useRef(null);

  const refreshManagerActions = useCallback(async () => {
    if (!timesheetId) return;
    try {
      const res = await fetchETManagerAction(timesheetId);
      const actions = Array.isArray(res?.data) ? res.data : [];
      const actionsMap = Object.fromEntries(actions.map((a) => [a.rowId, a]));
      setManagerActionsByRow(actionsMap);
    } catch (e) {
      console.error("Failed to refresh manager actions:", e);
    }
  }, [timesheetId]);

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

  const showSnackbar = useCallback((message, type = "info", duration = 3000) => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), duration);
  }, []);

  const [commentModalRowId, setCommentModalRowId] = useState(null);
  const [commentValue, setCommentValue] = useState("");

  const [openActionsRowId, setOpenActionsRowId] = useState(null);
  // Menu renders in a portal (see below) so it escapes the grid's
  // overflow-x-auto clipping; position is computed from the trigger
  // button's rect at open time.
  const [actionsMenuPos, setActionsMenuPos] = useState(null);
  const actionsMenuRefs = useRef({});
  const actionsPortalRefs = useRef({});
  const gridScrollRef = useRef(null);

  // Per-row inline edit for the PROJECT DETAILS cell (pencil toggle).
  // Keyed by rowId so multiple rows can be edited independently; presence
  // of a key means that row is currently in edit mode.
  const [detailsEditByRow, setDetailsEditByRow] = useState({});

  const closeActionsMenu = useCallback(() => {
    setOpenActionsRowId(null);
    setActionsMenuPos(null);
  }, []);

  useEffect(() => {
    if (!openActionsRowId) return;
    const handleClickOutside = (e) => {
      const triggerEl = actionsMenuRefs.current[openActionsRowId];
      const portalEl = actionsPortalRefs.current[openActionsRowId];
      const insideTrigger = triggerEl && triggerEl.contains(e.target);
      const insidePortal = portalEl && portalEl.contains(e.target);
      if (!insideTrigger && !insidePortal) {
        closeActionsMenu();
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") closeActionsMenu();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openActionsRowId, closeActionsMenu]);

  const filteredProjects = useMemo(() => {
    if (!selectedClient) return [];
    return allProjects.filter(
      (p) => Number(p.clientId) === Number(selectedClient) && p.status === "ACTIVE"
    );
  }, [selectedClient, allProjects]);

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
              savedOnServer: true,
              persistedProjectId: entry.projectId || null,
              days: {},
              entryStatuses: [],
            };
          }
          if (entry.comment && !rowMap[key].comment) {
            rowMap[key].comment = entry.comment;
          }
          rowMap[key].days[entry.entryDate] = {
            hours: decimalToHHMMString(entry.hours),
            description: entry.description || "",
          };
          if (entry.status) {
            rowMap[key].entryStatuses.push(entry.status);
          }
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

  const handleProjectChange = useCallback((projectId) => {
    const id = projectId ? Number(projectId) : "";
    if (selectedProject && selectedProject !== id) {
      setSelectedManager("");
    }
    setSelectedProject(id);
    setFieldErrors((prev) => ({ ...prev, project: "" }));
  }, [selectedProject]);

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
    refreshManagerActions();
  }, [timesheetId, refreshManagerActions]);

  useEffect(() => {
    if (!timesheetId || timesheetStatus !== "SUBMITTED") {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    pollingRef.current = setInterval(refreshManagerActions, 30000);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [timesheetId, timesheetStatus, refreshManagerActions]);

  const saveTimeoutRef = useRef(null);
  const dataRef = useRef({ projectRows: [], currentWeekStart: "", weekDates: [], selectedManager: "", managerActionsByRow: {} });
  dataRef.current = { projectRows, currentWeekStart, weekDates, selectedManager, managerActionsByRow };
  const unmountDataRef = useRef({ rows: [], weekStart: "" });
  unmountDataRef.current = { rows: projectRows, weekStart: currentWeekStart };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  const handleOpenDetailsEdit = useCallback((row) => {
    setDetailsEditByRow((prev) => ({
      ...prev,
      [row.rowId]: {
        clientId: row.clientId || "",
        projectId: row.projectId || "",
        managerId: row.managerId || "",
      },
    }));
  }, []);

  const handleCancelDetailsEdit = useCallback((rowId) => {
    setDetailsEditByRow((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, []);

  const handleDetailsDraftChange = useCallback((rowId, field, value) => {
    setDetailsEditByRow((prev) => {
      const draft = prev[rowId];
      if (!draft) return prev;
      const updated = { ...draft, [field]: value };
      if (field === "clientId") updated.projectId = "";
      return { ...prev, [rowId]: updated };
    });
  }, []);

  // The pencil icon only ever renders on a Draft row (native Draft, or a
  // Pending/Rejected/Approved row the employee reverted to Draft via Update),
  // but reassignment itself must never touch hours, comments, or status —
  // this only changes which project the existing entries belong to.
  const handleSaveDetailsEdit = useCallback(async (row) => {
    const draft = detailsEditByRow[row.rowId];
    if (!draft) return;
    if (!draft.clientId || !draft.projectId) {
      showSnackbar("Please select a Client and Project.", "error");
      return;
    }
    const newProjectId = Number(draft.projectId);
    if (
      newProjectId !== Number(row.projectId) &&
      projectRows.some((r) => r.rowId !== row.rowId && Number(r.projectId) === newProjectId)
    ) {
      showSnackbar("This project is already added for this week", "error");
      return;
    }
    const client = clients.find((c) => Number(c.id) === Number(draft.clientId));
    const project = allProjects.find((p) => Number(p.id) === newProjectId);
    const updatedRow = {
      ...row,
      rowId: `proj-${newProjectId}`,
      clientId: Number(draft.clientId),
      clientName: client?.name || "",
      projectId: newProjectId,
      projectName: project?.name || "",
      managerId: draft.managerId ? Number(draft.managerId) : null,
    };
    setDetailsEditByRow((prev) => {
      const next = { ...prev };
      delete next[row.rowId];
      return next;
    });

    if (!row.savedOnServer) {
      // Nothing persisted yet for this row — just update local state, the
      // same as adding the project with the corrected details from the start.
      setProjectRows((prev) => prev.map((r) => (r.rowId === row.rowId ? updatedRow : r)));
      return;
    }
    try {
      const res = await updateETProjectDetails({
        weekStartDate: currentWeekStart,
        oldProjectId: row.projectId,
        clientId: updatedRow.clientId,
        projectId: updatedRow.projectId,
        managerId: updatedRow.managerId,
      });
      if (res?.success) {
        setProjectRows((prev) => prev.map((r) => (r.rowId === row.rowId ? updatedRow : r)));
        if (row.rowId !== updatedRow.rowId) {
          setManagerActionsByRow((prev) => {
            if (!prev[row.rowId]) return prev;
            const next = { ...prev };
            next[updatedRow.rowId] = next[row.rowId];
            delete next[row.rowId];
            return next;
          });
        }
        showSnackbar("Project details updated", "success");
      } else {
        showSnackbar(res?.message || "Failed to save project details", "error");
      }
    } catch (err) {
      console.error("Failed to save project details:", err);
      showSnackbar(err.response?.data?.message || err.message || "Failed to save project details", "error");
    }
  }, [detailsEditByRow, clients, allProjects, projectRows, currentWeekStart, showSnackbar]);

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
      const { projectRows: curRows, currentWeekStart: ws, weekDates: wd, managerActionsByRow: mabr } = dataRef.current;
      if (curRows.length === 0) return;
      const row = curRows.find((r) => r.rowId === rowId);
      if (!row || row.isPending) return;
      const rStatus = deriveRowStatus(row, mabr);
      if (rStatus !== "DRAFT" && rStatus !== "REJECTED") return;
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
    if (!selectedManager) errors.manager = user?.role === "MANAGER" ? "Please select an Admin." : "Please select a Manager.";
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
  }, [selectedClient, selectedProject, selectedManager, allProjects, clients, weekDates, projectRows, showSnackbar, user]);

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

    const row = projectRows.find((r) => r.rowId === rowId);
    if (!row) return;
    const updatedRow = { ...row, comment: text };
    setProjectRows((prev) => prev.map((r) => (r.rowId === rowId ? updatedRow : r)));

    // Only this row's own entries are saved — a comment edit on one project
    // must never touch another project's entries or status.
    if (!updatedRow.isPending) {
      const dailyEntries = weekDates.map((wd, idx) => ({
        entryDate: wd.date,
        hours: parseHHMM(updatedRow.days[wd.date]?.hours),
        description: updatedRow.days[wd.date]?.description || "",
        comment: idx === 0 ? (updatedRow.comment || "") : undefined,
        clientId: updatedRow.clientId,
        projectId: updatedRow.projectId,
        managerId: updatedRow.managerId,
        clientName: updatedRow.clientName,
        projectName: updatedRow.projectName,
      }));
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
  }, [projectRows, weekDates, currentWeekStart, showSnackbar]);

  const handleCommentDelete = useCallback(async (rowId, date) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const row = projectRows.find((r) => r.rowId === rowId);
    if (!row) return;
    const updatedRow = { ...row, comment: "" };
    setProjectRows((prev) => prev.map((r) => (r.rowId === rowId ? updatedRow : r)));

    // Only this row's own entries are saved — a comment edit on one project
    // must never touch another project's entries or status.
    if (!updatedRow.isPending) {
      const dailyEntries = weekDates.map((wd, idx) => ({
        entryDate: wd.date,
        hours: parseHHMM(updatedRow.days[wd.date]?.hours),
        description: updatedRow.days[wd.date]?.description || "",
        comment: idx === 0 ? (updatedRow.comment || "") : undefined,
        clientId: updatedRow.clientId,
        projectId: updatedRow.projectId,
        managerId: updatedRow.managerId,
        clientName: updatedRow.clientName,
        projectName: updatedRow.projectName,
      }));
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
  }, [projectRows, weekDates, currentWeekStart, showSnackbar]);

  const prepareSaveData = useCallback(() => ({
    weekStartDate: currentWeekStart,
    // Only currently-editable rows (Draft/Rejected) are included — a bulk
    // Save Draft must never touch a sibling project that's already
    // Submitted/Re-Submitted/Approved.
    dailyEntries: projectRows.filter((r) => {
      if (r.isPending) return false;
      const status = deriveRowStatus(r, managerActionsByRow);
      return status === "DRAFT" || status === "REJECTED";
    }).flatMap((row) =>
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
  }), [currentWeekStart, projectRows, selectedManager, weekDates, managerActionsByRow]);

  const handleSaveDraftRow = useCallback(async (row) => {
    if (!row || row.isPending) return;
    const rowTotal = Object.values(row.days).reduce(
      (sum, d) => sum + Math.max(0, parseHHMM(d.hours)), 0
    );
    if (rowTotal <= 0) {
      showSnackbar("Cannot save an empty project. Add hours first.", "error");
      return;
    }
    const exceededDay = weekDates.find((wd) => {
      const dayTotal = projectRows.reduce((sum, r) => sum + parseHHMM(r.days[wd.date]?.hours), 0);
      return dayTotal > 24;
    });
    if (exceededDay) {
      showSnackbar("Maximum 24 hours can be logged per day across all projects.", "error");
      return;
    }
    try {
      setSaving(true);
      const dailyEntries = weekDates.map((wd, idx) => ({
        entryDate: wd.date,
        hours: parseHHMM(row.days[wd.date]?.hours),
        description: row.days[wd.date]?.description || "",
        comment: idx === 0 ? (row.comment || "") : undefined,
        clientId: row.clientId,
        projectId: row.projectId,
        managerId: row.managerId,
        clientName: row.clientName,
        projectName: row.projectName,
      }));
      const res = await saveETDraft({ weekStartDate: currentWeekStart, dailyEntries });
      if (res?.success) {
        const newTsId = res.data?.timesheet?.id;
        if (newTsId) setTimesheetId(newTsId);
        setProjectRows((prev) =>
          prev.map((r) =>
            r.rowId === row.rowId
              ? { ...r, savedOnServer: true, persistedProjectId: r.projectId }
              : r
          )
        );
        showSnackbar(`"${row.projectName}" draft saved!`, "success");
      } else {
        showSnackbar(res?.message || "Failed to save draft", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to save draft", "error");
    } finally {
      setSaving(false);
    }
  }, [projectRows, weekDates, currentWeekStart, showSnackbar]);

  // Submitting is per-project — this must only ever affect the ONE row
  // passed in, never any sibling project in the same week.
  const handleSubmitRow = useCallback(async (row) => {
    if (!row.managerId) {
      showSnackbar(
        user?.role === "MANAGER" ? "Please assign an admin before submitting." : "Please assign a manager before submitting.",
        "error"
      );
      return;
    }
    const rowTotal = Object.values(row.days).reduce(
      (sum, d) => sum + Math.max(0, parseHHMM(d.hours)), 0
    );
    if (rowTotal <= 0) {
      showSnackbar("Cannot submit an empty project. Add hours first.", "error");
      return;
    }
    const exceededDay = weekDates.find((wd) => {
      const dayTotal = projectRows.reduce((sum, r) => sum + parseHHMM(r.days[wd.date]?.hours), 0);
      return dayTotal > 24;
    });
    if (exceededDay) {
      showSnackbar("Maximum 24 hours can be logged per day across all projects.", "error");
      return;
    }
    if (!window.confirm(`Submit "${row.projectName}" for approval?`)) return;
    try {
      setSubmitting(true);
      const dailyEntries = weekDates.map((wd, idx) => ({
        entryDate: wd.date,
        hours: parseHHMM(row.days[wd.date]?.hours),
        description: row.days[wd.date]?.description || "",
        comment: idx === 0 ? (row.comment || "") : undefined,
        clientId: row.clientId,
        projectId: row.projectId,
        managerId: row.managerId,
        clientName: row.clientName,
        projectName: row.projectName,
      }));
      const saveRes = await saveETDraft({ weekStartDate: currentWeekStart, dailyEntries });
      if (!saveRes?.success) {
        showSnackbar(saveRes?.message || "Failed to save before submit", "error");
        return;
      }
      const res = await submitETTimesheet({ weekStartDate: currentWeekStart, projectId: row.projectId, dailyEntries });
      if (res?.success) {
        const newTsId = res.data?.timesheet?.id;
        if (newTsId) setTimesheetId(newTsId);
        setProjectRows((prev) =>
          prev.map((r) =>
            r.rowId === row.rowId
              ? { ...r, entryStatuses: ["SUBMITTED"], savedOnServer: true }
              : r
          )
        );
        setManagerActionsByRow((prev) => {
          const next = { ...prev };
          delete next[row.rowId];
          return next;
        });
        showSnackbar(`"${row.projectName}" submitted successfully!`, "success");
        window.dispatchEvent(new Event("approval-status-changed"));
        refreshManagerActions();
      } else {
        showSnackbar(res?.message || "Failed to submit", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  }, [weekDates, projectRows, currentWeekStart, showSnackbar, refreshManagerActions, user]);

  // Reverting to draft is per-project — must never affect a sibling
  // project's own Submitted/Approved status.
  const handleUpdateRow = useCallback(async (row) => {
    if (!window.confirm(`Revert "${row.projectName}" to draft for editing?`)) return;
    try {
      setSaving(true);
      const res = await updateETTimesheet({ weekStartDate: currentWeekStart, projectId: row.projectId });
      if (res?.success) {
        const newTsId = res.data?.timesheet?.id;
        if (newTsId) setTimesheetId(newTsId);
        setProjectRows((prev) =>
          prev.map((r) =>
            r.rowId === row.rowId
              ? { ...r, entryStatuses: ["DRAFT"] }
              : r
          )
        );
        // Clear the CURRENT decision optimistically but keep priorActorId —
        // that's what tells a later resubmission apart as "same manager"
        // (Re-Submitted) vs "newly assigned manager" (Pending) — the async
        // refreshManagerActions() call below reconciles with the server.
        setManagerActionsByRow((prev) => {
          const existing = prev[row.rowId];
          if (!existing) return prev;
          return { ...prev, [row.rowId]: { ...existing, status: null } };
        });
        showSnackbar(`"${row.projectName}" reverted to draft. Edit and re-submit.`, "success");
        refreshManagerActions();
      } else {
        showSnackbar(res?.message || "Failed to update", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to update", "error");
    } finally {
      setSaving(false);
    }
  }, [currentWeekStart, showSnackbar, refreshManagerActions]);

  // Cancelling is per-project — must never remove or affect a sibling
  // project's entries or status.
  const handleCancelRow = useCallback(async (row) => {
    if (!window.confirm(`Cancel "${row.projectName}"? All non-approved entries for this project will be permanently removed and this cannot be undone. Any entries already approved by a manager will be kept.`)) {
      return;
    }
    try {
      const res = await cancelETTimesheet(currentWeekStart, row.projectId);
      if (res?.success) {
        setProjectRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
        setManagerActionsByRow((prev) => {
          const next = { ...prev };
          delete next[row.rowId];
          return next;
        });
        showSnackbar(`"${row.projectName}" cancelled. Non-approved entries removed.`, "info");
      } else {
        showSnackbar("Failed to cancel timesheet", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to cancel", "error");
    }
  }, [currentWeekStart, showSnackbar]);

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
            disabled={!selectedClient}
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
            disabled={!selectedClient}
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

      <button
        onClick={handleAddProject}
        className="mb-3 h-9 rounded-lg border-2 border-dashed border-[#E2E8F0] text-sm font-medium text-[#B33A2F] hover:border-[#B33A2F] hover:bg-[#B33A2F]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed px-4"
      >
+ Add Record
      </button>

      {/* ===== SECTION 3: Multi-Project Weekly Table ===== */}
      <div
        ref={gridScrollRef}
        onScroll={closeActionsMenu}
        className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto"
      >
        <table className="w-full min-w-[1002px]">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-3 pt-2 pb-1 text-left text-[10px] font-bold text-[#64748B] uppercase tracking-wider w-[190px] min-w-[190px]">
                Project Details
              </th>
              {weekDates.map((wd) => (
                <th key={wd.date} className={`px-1 py-2 text-center border-l border-[#E2E8F0] w-[76px] min-w-[76px] ${wd.isToday ? "bg-[#B33A2F]/5" : ""}`}>
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{wd.dayName}</p>
                  <p className={`text-xs font-bold ${wd.isToday ? "text-[#B33A2F]" : "text-[#1E293B]"}`}>{wd.dateNum}</p>
                </th>
              ))}
              <th className="px-1 py-2 text-center border-l border-[#E2E8F0] w-[62px] min-w-[62px]">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">COMMENT</p>
              </th>
              <th className="px-1 py-2 text-center border-l border-[#E2E8F0] w-[70px] min-w-[70px]">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">WEEK</p>
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">TOTAL</p>
              </th>
              <th className="px-1 py-2 text-center border-l border-[#E2E8F0] w-[62px] min-w-[62px]">
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">STATUS</p>
              </th>
              <th className="px-1 py-2 text-center border-l border-[#E2E8F0] w-[86px] min-w-[86px]"></th>
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
                const rowApproved = rowAction?.status === "APPROVED";
                const rowStatus = deriveRowStatus(row, managerActionsByRow);
                // Each project has its own independent lifecycle — a row's own
                // status (not the week's aggregate) decides whether it's editable.
                // Rejected/Pending/Approved stay fully read-only (including the
                // Project Details edit icon) until the employee explicitly clicks
                // Update, which reverts the row to Draft (see handleUpdateRow) —
                // only then can hours, comments, and project details be changed
                // and re-submitted.
                const rowEditable = rowStatus === "DRAFT";
                return (
                  <tr key={row.rowId} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="px-[10px] py-1.5 relative align-middle border-r border-[#E2E8F0] w-[190px] min-w-[190px]">
                      {detailsEditByRow[row.rowId] ? (
                        <div>
                          <dl className="grid grid-cols-[auto_1fr] gap-x-1 gap-y-[2px] items-center pr-[28px]">
                            <dt className="flex justify-between min-w-[48px] text-[11px] font-semibold text-[#8B8C92]">
                              <span>Client</span><span>:</span>
                            </dt>
                            <dd className="m-0 min-w-0">
                              <select
                                value={detailsEditByRow[row.rowId].clientId}
                                onChange={(e) => handleDetailsDraftChange(row.rowId, "clientId", e.target.value)}
                                className="h-[24px] w-full min-w-[90px] rounded-[3px] border border-[#DDDEE2] bg-white px-[6px] text-[11.5px] font-semibold text-[#0A0A0B] truncate focus:outline-none focus:ring-1 focus:ring-[#B33A2F] focus:border-transparent"
                              >
                                <option value="">Select Client</option>
                                {clients.filter((c) => c.status === "ACTIVE").map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </dd>
                            <dt className="flex justify-between min-w-[48px] text-[11px] font-semibold text-[#8B8C92]">
                              <span>Project</span><span>:</span>
                            </dt>
                            <dd className="m-0 min-w-0">
                              <select
                                value={detailsEditByRow[row.rowId].projectId}
                                onChange={(e) => handleDetailsDraftChange(row.rowId, "projectId", e.target.value)}
                                disabled={!detailsEditByRow[row.rowId].clientId}
                                className="h-[24px] w-full min-w-[90px] rounded-[3px] border border-[#DDDEE2] bg-white px-[6px] text-[11.5px] font-semibold text-[#0A0A0B] truncate focus:outline-none focus:ring-1 focus:ring-[#B33A2F] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">{!detailsEditByRow[row.rowId].clientId ? "Select client first" : "Select Project"}</option>
                                {allProjects.filter((p) => Number(p.clientId) === Number(detailsEditByRow[row.rowId].clientId) && p.status === "ACTIVE").map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </dd>
                            <dt className="flex justify-between min-w-[48px] text-[11px] font-semibold text-[#8B8C92]">
                              <span>{user?.role === "MANAGER" ? "Admin" : "Manager"}</span><span>:</span>
                            </dt>
                            <dd className="m-0 min-w-0">
                              <select
                                value={detailsEditByRow[row.rowId].managerId}
                                onChange={(e) => handleDetailsDraftChange(row.rowId, "managerId", e.target.value)}
                                className="h-[24px] w-full min-w-[90px] rounded-[3px] border border-[#DDDEE2] bg-white px-[6px] text-[11.5px] font-semibold text-[#0A0A0B] truncate focus:outline-none focus:ring-1 focus:ring-[#B33A2F] focus:border-transparent"
                              >
                                <option value="">Select {user?.role === "MANAGER" ? "Admin" : "Manager"}</option>
                                {allManagers.map((m) => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </dd>
                            <dt aria-hidden="true"></dt>
                            <dd className="m-0 min-w-0">
                              <div className="flex gap-1 mt-[4px]">
                                <button
                                  type="button"
                                  onClick={() => handleSaveDetailsEdit(row)}
                                  className="flex-1 py-[3px] rounded-[3px] text-center text-[9.5px] font-bold leading-[1.3] bg-[#E01F26] border border-[#E01F26] text-white hover:bg-[#B3161C] transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelDetailsEdit(row.rowId)}
                                  className="flex-1 py-[3px] rounded-[3px] text-center text-[9.5px] font-bold leading-[1.3] bg-white border border-[#DDDEE2] text-[#6B6C72] hover:bg-[#F8FAFC] transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </dd>
                          </dl>
                        </div>
                      ) : (
                        <>
                          {rowEditable && (
                            <button
                              type="button"
                              onClick={() => handleOpenDetailsEdit(row)}
                              title="Edit project details"
                              className="absolute top-[6px] right-[6px] w-[22px] h-[22px] flex items-center justify-center rounded-[4px] border border-[#E6E7EA] bg-white text-[#8B8C92] hover:border-[#E01F26] hover:text-[#E01F26] transition-colors"
                            >
                              <Pencil className="w-[13px] h-[13px]" strokeWidth={1.75} />
                            </button>
                          )}
                          <dl className="grid grid-cols-[auto_1fr] gap-x-1 gap-y-[2px] items-baseline pr-[26px]">
                            <dt className="flex justify-between min-w-[48px] text-[11px] font-semibold text-[#8B8C92]">
                              <span>Client</span><span>:</span>
                            </dt>
                            <dd className="m-0 text-[12.5px] font-bold text-[#1E293B] truncate">{row.clientName || "-"}</dd>
                            <dt className="flex justify-between min-w-[48px] text-[11px] font-semibold text-[#8B8C92]">
                              <span>Project</span><span>:</span>
                            </dt>
                            <dd className="m-0 text-[12.5px] font-bold text-[#1E293B] truncate">{row.projectName || "-"}</dd>
                            <dt className="flex justify-between min-w-[48px] text-[11px] font-semibold text-[#8B8C92]">
                              <span>{user?.role === "MANAGER" ? "Admin" : "Manager"}</span><span>:</span>
                            </dt>
                            <dd className="m-0 text-[12.5px] font-bold text-[#1E293B] truncate">
                              {(() => {
                                const mgr = allManagers.find((m) => Number(m.id) === Number(row.managerId));
                                return mgr ? mgr.name : "-";
                              })()}
                            </dd>
                          </dl>
                        </>
                      )}
                    </td>
                    {weekDates.map((wd) => {
                      const dayData = row.days[wd.date] || { hours: "", description: "" };
                      const parts = parseHHMMToParts(dayData.hours);
                      const cellDisabled = !rowEditable || row.isPending || rowApproved || !row.projectId;
                      const cellInputClass = "h-[26px] rounded border border-[#E2E8F0] bg-white text-[10px] text-[#1E293B] font-medium text-center focus:outline-none focus:ring-1 focus:ring-[#B33A2F] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden [-moz-appearance:textfield]";
                      return (
                        <td key={wd.date} className={`px-0.5 py-1.5 align-middle text-center border-l border-[#E2E8F0] w-[76px] min-w-[76px] ${wd.isToday ? "bg-[#B33A2F]/[0.02]" : ""}`}>
                          <div className="flex items-center justify-center gap-px">
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
                              className={`${cellInputClass} w-[18px]`}
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
                              className={`${cellInputClass} w-[20px]`}
                              placeholder="00"
                            />
                            <span className="text-[9px] text-[#94A3B8] font-medium select-none">min</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-1 py-2 align-middle text-center border-l border-[#E2E8F0] w-[62px] min-w-[62px]">
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
                    <td className="px-1 py-2 align-middle text-center border-l border-[#E2E8F0] w-[70px] min-w-[70px]">
                      <span className="text-sm font-bold text-[#1E293B]">{formatHoursToHHMM(rowTotal)}</span>
                    </td>
                    <td className="px-1 py-2 align-middle text-center border-l border-[#E2E8F0] w-[62px] min-w-[62px]">
                      {(() => {
                        if (rowStatus === "APPROVED") {
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                Approved
                              </span>
                              {rowAction?.comment && (
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
                        if (rowStatus === "REJECTED") {
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                Rejected
                              </span>
                              {rowAction?.comment && (
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
                        if (rowStatus === "SUBMITTED") {
                          return <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">Pending</span>;
                        }
                        if (rowStatus === "RE-SUBMITTED") {
                          return <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">Re-Submitted</span>;
                        }
                        if (rowStatus === "DRAFT" && row.savedOnServer) {
                          return <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full">Draft</span>;
                        }
                        return <span className="text-[#94A3B8]">-</span>;
                      })()}
                    </td>
                    <td className="px-1 py-2 align-middle text-center border-l border-[#E2E8F0] w-[86px] min-w-[86px]">
                      {(() => {
                        let actionItems = [];
                        if (rowStatus === "DRAFT") {
                          actionItems = [
                            { key: "delete", label: "Delete", icon: Trash2, danger: true, onClick: () => handleRemoveProject(row.rowId) },
                            { key: "save", label: "Save Draft", icon: Save, disabled: isBusy, onClick: () => handleSaveDraftRow(row) },
                            { key: "submit", label: "Submit", icon: Send, disabled: isBusy || rowTotal <= 0, onClick: () => handleSubmitRow(row) },
                          ];
                        } else if (rowStatus === "SUBMITTED" || rowStatus === "RE-SUBMITTED") {
                          // Update reverts this project to Draft (without touching any
                          // sibling project) so it can be corrected and re-submitted —
                          // Cancel remains available to withdraw it entirely instead.
                          actionItems = [
                            { key: "update", label: "Update", icon: RotateCcw, disabled: isBusy, onClick: () => handleUpdateRow(row) },
                            { key: "cancel", label: "Cancel", icon: XCircle, disabled: isBusy, onClick: () => handleCancelRow(row) },
                          ];
                        } else if (rowStatus === "REJECTED") {
                          // Only Update — Cancel permanently deletes the entries, and
                          // this project has already been through manager review once;
                          // Update reverts it to Draft so it can be corrected and
                          // re-submitted (Save Draft/Submit reappear naturally there).
                          actionItems = [
                            { key: "update", label: "Update", icon: RotateCcw, disabled: isBusy, onClick: () => handleUpdateRow(row) },
                          ];
                        } else if (rowStatus === "APPROVED") {
                          // Only Update — it reverts the row to Draft so it can be
                          // corrected and re-submitted; Submit isn't offered directly
                          // since there's nothing pending to (re-)submit until then.
                          actionItems = [
                            { key: "update", label: "Update", icon: RotateCcw, disabled: isBusy, onClick: () => handleUpdateRow(row) },
                          ];
                        }
                        const isOpen = openActionsRowId === row.rowId;
                        const hasItems = actionItems.length > 0;
                        const menuWidth = 144; // matches w-36
                        return (
                          <div
                            className="relative inline-block text-left"
                            ref={(el) => { actionsMenuRefs.current[row.rowId] = el; }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                if (!hasItems) return;
                                if (isOpen) {
                                  closeActionsMenu();
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const estMenuHeight = actionItems.length * 30 + 8;
                                const openUpward = window.innerHeight - rect.bottom < estMenuHeight + 8;
                                setActionsMenuPos({
                                  left: Math.max(8, rect.right - menuWidth),
                                  top: openUpward ? rect.top - estMenuHeight - 4 : rect.bottom + 4,
                                });
                                setOpenActionsRowId(row.rowId);
                              }}
                              disabled={!hasItems}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] hover:border-[#B33A2F]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Actions
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {isOpen && hasItems && actionsMenuPos && createPortal(
                              <div
                                ref={(el) => { actionsPortalRefs.current[row.rowId] = el; }}
                                style={{ position: "fixed", top: actionsMenuPos.top, left: actionsMenuPos.left, width: menuWidth }}
                                className="z-50 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1"
                              >
                                {actionItems.map((item) => (
                                  <button
                                    key={item.key}
                                    type="button"
                                    disabled={item.disabled}
                                    onClick={() => {
                                      closeActionsMenu();
                                      item.onClick();
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                      item.danger ? "text-red-600 hover:bg-red-50" : "text-[#1E293B] hover:bg-[#F8FAFC]"
                                    }`}
                                  >
                                    <item.icon className="w-3.5 h-3.5" />
                                    {item.label}
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )}
                          </div>
                        );
                      })()}
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

      {/* ===== SECTION 4: Buttons (moved to per-row in table) ===== */}

      {commentModalRowId && (() => {
        const cmRow = projectRows.find((r) => r.rowId === commentModalRowId);
        const cmReadOnly = cmRow
          ? deriveRowStatus(cmRow, managerActionsByRow) !== "DRAFT"
          : false;
        return (
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
            readOnly={cmReadOnly}
            onClose={() => {
              setCommentModalRowId(null);
              setCommentValue("");
            }}
          />
        );
      })()}

      {managerActionModal && (() => {
        const comment = managerActionModal.comment || "";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setManagerActionModal(null)}></div>
            <div className="relative w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1E293B]">Manager Response</h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  managerActionModal.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {managerActionModal.status === "APPROVED" ? "Approved" : "Rejected"}
                </span>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Manager</span>
                  <p className="mt-1.5 text-sm font-medium text-[#1E293B]">{managerActionModal.managerName}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Date</span>
                  <p className="mt-1.5 text-sm text-[#64748B]">
                    {managerActionModal.date ? format(new Date(managerActionModal.date), "dd-MMM-yyyy") : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Manager Comment</span>
                  {comment ? (
                    <div className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1E293B] leading-relaxed whitespace-pre-wrap break-words">
                      {comment}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-sm text-[#94A3B8]">-</p>
                  )}
                </div>
              </div>
              <div className="px-6 pb-5 flex justify-center">
                <button
                  onClick={() => setManagerActionModal(null)}
                  className="px-6 py-2 text-sm font-medium text-[#64748B] hover:text-[#1E293B] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
