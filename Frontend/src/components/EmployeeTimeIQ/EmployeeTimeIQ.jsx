import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Button } from "../ui/Button";
import {
  fetchETWeeklyTimesheet,
  saveETDraft,
  submitETTimesheet,
  updateETTimesheet,
  deleteETProjectEntries,
  fetchETManagerAction,
} from "../../services/employeeTimeIQApi";
import { fetchClients, fetchProjects, getManagers } from "../../services/api";
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
  FileText,
} from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getWeekStart = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return format(d, "yyyy-MM-dd");
};

const getWeekEnd = (date) => {
  const d = new Date(date);
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

const formatHoursToHHMM = (hours) => {
  if (!hours && hours !== 0) return "0:00";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
};

const getSnackbarStyles = (type) => {
  if (type === "success") return "bg-green-600 text-white";
  if (type === "error") return "bg-red-600 text-white";
  return "bg-[#1E293B] text-white";
};

export const EmployeeTimeIQ = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const saved = sessionStorage.getItem("timeiq_weekStart");
    return saved || getWeekStart(new Date());
  });
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

  const [projectRows, setProjectRows] = useState([]);
  const [timesheetStatus, setTimesheetStatus] = useState(null);
  const [timesheetId, setTimesheetId] = useState(null);
  const [managerAction, setManagerAction] = useState(null);
  const [managerActionModal, setManagerActionModal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const totalHours = useMemo(() => {
    return projectRows.reduce((sum, row) => {
      return sum + Object.values(row.days).reduce((daySum, d) => daySum + (Math.max(0, parseFloat(d.hours) || 0)), 0);
    }, 0);
  }, [projectRows]);

  const isSubmitted = timesheetStatus === "SUBMITTED";
  const isApproved = timesheetStatus === "APPROVED";
  const isReadOnly = isSubmitted || isApproved;

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
    (async () => {
      try {
        const [clientsRes, projectsRes, managersRes] = await Promise.all([
          fetchClients(),
          fetchProjects(),
          getManagers(),
        ]);
        setClients(clientsRes?.data || []);
        setAllProjects(projectsRes?.data || []);
        const mgrData = managersRes?.data || managersRes || [];
        setAllManagers(Array.isArray(mgrData) ? mgrData : []);
      } catch (err) {
        console.error("Failed to load dropdown data", err);
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
  }, []);

  const handleProjectChange = useCallback((projectId) => {
    const id = projectId ? Number(projectId) : "";
    setSelectedProject(id);
    setSelectedManager("");
  }, []);

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
          if (!hasHours && !entry.description) return;

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
            hours: entry.hours ?? "",
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
    setManagerAction(null);
    loadWeekData(currentWeekStart);
  }, [currentWeekStart, loadWeekData]);

  useEffect(() => {
    if (!timesheetId) {
      setManagerAction(null);
      return;
    }
    fetchETManagerAction(timesheetId).then((res) => {
      setManagerAction(res?.data || null);
    }).catch(() => setManagerAction(null));
  }, [timesheetId]);

  const dataRef = useRef({ projectRows: [], isReadOnly: false, currentWeekStart: "", weekDates: [] });
  dataRef.current = { projectRows, isReadOnly, currentWeekStart, weekDates };
  const unmountDataRef = useRef({ rows: [], isReadOnly: false, weekStart: "" });
  unmountDataRef.current = { rows: projectRows, isReadOnly, weekStart: currentWeekStart };

  const handleCellChange = useCallback((rowId, date, value) => {
    if (value !== "" && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) return;
    if (parseFloat(value) > 24) return;
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
    const { projectRows: curRows, isReadOnly: ro, currentWeekStart: ws, weekDates: wd } = dataRef.current;
    if (ro || curRows.length === 0) return;
    const row = curRows.find((r) => r.rowId === rowId);
    if (!row || row.isPending) return;
    const dayData = row.days[date] || { hours: "", description: "" };
    const updatedHours = value;
    const data = {
      weekStartDate: ws,
      dailyEntries: wd.map((w) => ({
        entryDate: w.date,
        hours: w.date === date ? (parseFloat(updatedHours) || 0) : (parseFloat(row.days[w.date]?.hours) || 0),
        description: (w.date === date ? (dayData.description || "") : (row.days[w.date]?.description || "")),
        clientId: row.clientId,
        projectId: row.projectId,
        managerId: row.managerId,
        clientName: row.clientName,
        projectName: row.projectName,
      })),
    };
    saveETDraft(data).catch(() => {});
  }, []);





  const handleAddProject = useCallback(() => {
    if (selectedClient && selectedProject) {
      if (projectRows.some((r) => Number(r.projectId) === Number(selectedProject))) {
        showSnackbar("This project is already added for this week", "error");
        return;
      }
      const selectedProjectData = allProjects.find((p) => Number(p.id) === Number(selectedProject));
      const selectedClientData = clients.find((c) => Number(c.id) === Number(selectedClient));
      const rowId = `proj-${selectedProject}`;
      const newRow = {
        rowId,
        clientId: Number(selectedClient),
        clientName: selectedClientData?.name || "",
        projectId: Number(selectedProject),
        projectName: selectedProjectData?.name || "",
        managerId: null,
        days: {},
      };
      weekDates.forEach((wd) => {
        newRow.days[wd.date] = { hours: "", description: "" };
      });
      setProjectRows((prev) => [...prev, newRow]);
      setSelectedClient("");
      setSelectedProject("");
      return;
    }

    const rowId = `pending-${Date.now()}`;
    const newRow = {
      rowId,
      isPending: true,
      clientId: null,
      clientName: "",
      projectId: null,
      projectName: "",
      managerId: null,
      days: {},
    };
    weekDates.forEach((wd) => {
      newRow.days[wd.date] = { hours: "", description: "" };
    });
    setProjectRows((prev) => [...prev, newRow]);
  }, [selectedClient, selectedProject, allProjects, clients, weekDates, projectRows, showSnackbar]);

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
    const hasHours = Object.values(row.days).some((d) => parseFloat(d.hours) > 0);
    if (hasHours && !window.confirm(`Remove "${row.projectName}" and its hours?`)) return;
    try {
      const pId = row.projectId || "null";
      await deleteETProjectEntries(pId, currentWeekStart, row.clientName, row.projectName);
    } catch (err) {
      console.error("Failed to delete project entries:", err);
    }
    setProjectRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }, [projectRows, currentWeekStart]);

  const handleCommentSave = useCallback((rowId, date, text) => {
    setProjectRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId ? { ...row, comment: text } : row
      )
    );
    setCommentModalRowId(null);
    setCommentValue("");
    showSnackbar("Comment saved", "success");
  }, [showSnackbar]);

  const handleCommentDelete = useCallback((rowId, date) => {
    setProjectRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId ? { ...row, comment: "" } : row
      )
    );
    setCommentModalRowId(null);
    setCommentValue("");
    showSnackbar("Comment deleted", "info");
  }, [showSnackbar]);

  const prepareSaveData = useCallback(() => ({
    weekStartDate: currentWeekStart,
    dailyEntries: projectRows.filter((r) => !r.isPending).flatMap((row) =>
      weekDates.map((wd, idx) => {
        const dayData = row.days[wd.date] || { hours: "", description: "" };
        return {
          entryDate: wd.date,
          hours: parseFloat(dayData.hours) || 0,
          description: dayData.description || "",
          comment: idx === 0 ? (row.comment || "") : undefined,
          clientId: row.clientId,
          projectId: row.projectId,
          managerId: selectedManager ? Number(selectedManager) : null,
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
  }, [projectRows, prepareSaveData, showSnackbar]);

  const handleSubmit = useCallback(async () => {
    if (projectRows.length === 0) {
      showSnackbar("Please add at least one project", "error");
      return;
    }
    if (!selectedManager) {
      showSnackbar("Please select a manager for timesheet submission", "error");
      return;
    }
    if (totalHours <= 0) {
      showSnackbar("Cannot submit empty timesheet. Add hours first.", "error");
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
      } else {
        showSnackbar(res?.message || "Failed to submit", "error");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.message || "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  }, [projectRows, totalHours, selectedManager, prepareSaveData, showSnackbar]);

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

  const handleCancel = useCallback(() => {
    loadWeekData(currentWeekStart);
    showSnackbar("Changes reverted", "info");
  }, [currentWeekStart, loadWeekData, showSnackbar]);

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
        <Loader2 className="w-8 h-8 text-[#5B3CC4] animate-spin" />
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
          <button onClick={() => navigateWeek("prev")} className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#5B3CC4]/30 transition-all" title="Previous week">
            <ChevronLeft className="w-4 h-4 text-[#64748B]" />
          </button>
          <div className="text-center min-w-[180px]">
            <p className="text-sm font-semibold text-[#1E293B]">
              {format(new Date(currentWeekStart + "T00:00:00"), "MMM dd")} — {format(new Date(weekEnd + "T00:00:00"), "MMM dd, yyyy")}
            </p>
            <p className="text-[11px] font-medium text-[#5B3CC4] mt-0.5">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
            {timesheetStatus && (
              <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                timesheetStatus === "DRAFT" ? "bg-yellow-100 text-yellow-700"
                : timesheetStatus === "SUBMITTED" ? "bg-blue-100 text-blue-700"
                : timesheetStatus === "APPROVED" ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
              }`}>{timesheetStatus}</span>
            )}
          </div>
          <button onClick={() => navigateWeek("next")} className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#5B3CC4]/30 transition-all" title="Next week">
            <ChevronRight className="w-4 h-4 text-[#64748B]" />
          </button>
          <button onClick={goToCurrentWeek} className="ml-1 px-2.5 py-1.5 text-[11px] font-medium text-[#5B3CC4] border border-[#5B3CC4]/30 rounded-lg hover:bg-[#5B3CC4]/5 transition-all">
            Today
          </button>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#5B3CC4]/10 to-[#8B6EF3]/5 px-4 py-2 rounded-lg border border-[#5B3CC4]/20">
          <Clock className="w-4 h-4 text-[#5B3CC4]" />
          <div>
            <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider leading-tight">Total</p>
            <p className="text-lg font-bold text-[#1E293B] leading-tight">{totalHours.toFixed(2)}</p>
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
            className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#5B3CC4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{clients.length === 0 ? "Loading..." : "Select Client"}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5 uppercase tracking-wider">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={!selectedClient || isReadOnly}
            className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#5B3CC4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{!selectedClient ? "Select client first" : filteredProjects.length === 0 ? "No projects" : "Select Project"}</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5 uppercase tracking-wider">Manager</label>
          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value ? Number(e.target.value) : "")}
            disabled={isReadOnly}
            className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#5B3CC4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{allManagers.length === 0 ? "Loading..." : "Select Admin"}</option>
            {allManagers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!isReadOnly && (
        <button
          onClick={handleAddProject}
          className="mb-3 h-9 rounded-lg border-2 border-dashed border-[#E2E8F0] text-sm font-medium text-[#5B3CC4] hover:border-[#5B3CC4] hover:bg-[#5B3CC4]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed px-4"
        >
          + Add New Project
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
                <th key={wd.date} className={`px-1.5 py-2 text-center border-l border-[#E2E8F0] ${wd.isToday ? "bg-[#5B3CC4]/5" : ""}`}>
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{wd.dayName}</p>
                  <p className={`text-xs font-bold ${wd.isToday ? "text-[#5B3CC4]" : "text-[#1E293B]"}`}>{wd.dateNum}</p>
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
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">ADMIN</p>
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">STATUS</p>
              </th>
              <th className="px-2 py-2 text-center border-l border-[#E2E8F0] w-10"></th>
            </tr>
          </thead>
          <tbody>
            {projectRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                  No projects added yet. Select a client/project above and click "+ Add New Project".
                </td>
              </tr>
            ) : (
              projectRows.map((row) => {
                const rowTotal = Object.values(row.days).reduce(
                  (s, d) => s + (Math.max(0, parseFloat(d.hours) || 0)), 0
                );
                return (
                  <tr key={row.rowId} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="px-3 py-2 border-r border-[#E2E8F0]">
                      {row.isPending ? (
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                          <select
                            value={row.clientId || ""}
                            onChange={(e) => handlePendingClientChange(row.rowId, e.target.value)}
                            className="h-7 rounded-lg border border-[#E2E8F0] bg-white px-1.5 py-1 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#5B3CC4] focus:border-transparent"
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
                            className="h-7 rounded-lg border border-[#E2E8F0] bg-white px-1.5 py-1 text-xs text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#5B3CC4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">{!row.clientId ? "Select client first" : "Select Project"}</option>
                            {row.clientId && getProjectsForClient(row.clientId).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-[#1E293B] truncate max-w-[160px]">{row.projectName}</span>
                          <span className="text-[10px] text-[#64748B] truncate max-w-[160px]">{row.clientName}</span>
                        </div>
                      )}
                    </td>
                    {weekDates.map((wd) => {
                      const dayData = row.days[wd.date] || { hours: "", description: "" };
                      return (
                        <td key={wd.date} className={`px-1.5 py-1.5 border-l border-[#E2E8F0] ${wd.isToday ? "bg-[#5B3CC4]/[0.02]" : ""}`}>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={dayData.hours}
                            onChange={(e) => handleCellChange(row.rowId, wd.date, e.target.value)}
                            disabled={isReadOnly || row.isPending}
                            className="w-full h-7 rounded-md border border-[#E2E8F0] bg-white text-xs text-[#1E293B] font-medium text-center focus:outline-none focus:ring-1 focus:ring-[#5B3CC4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="0"
                          />
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
                          <FileText className="w-4 h-4 text-[#5B3CC4]" />
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
                        if (managerAction) {
                          const isApproved = managerAction.status === "APPROVED";
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                isApproved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {isApproved ? "Approved" : "Rejected"}
                              </span>
                              {managerAction.comment && (
                                <button
                                  onClick={() => setManagerActionModal(managerAction)}
                                  className="p-0.5 rounded hover:bg-[#F1F5F9] text-[#5B3CC4]"
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
                      {!isReadOnly && (
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
                    (s, row) => s + (Math.max(0, parseFloat(row.days[wd.date]?.hours) || 0)), 0
                  );
                  return (
                    <td key={wd.date} className="px-2 py-2 text-center border-l border-[#E2E8F0]">
                      <span className="text-xs font-bold text-[#1E293B]">{formatHoursToHHMM(dayTotal)}</span>
                    </td>
                  );
                })}
                <td className="px-2 py-2 border-l border-[#E2E8F0]"></td>
                <td className="px-2 py-2 text-center border-l border-[#E2E8F0]">
                  <span className="text-xs font-bold text-[#5B3CC4]">{formatHoursToHHMM(totalHours)}</span>
                </td>
                <td className="px-2 py-2 border-l border-[#E2E8F0]"></td>
                <td className="px-2 py-2 border-l border-[#E2E8F0]"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ===== SECTION 4: Buttons ===== */}
      <div className="flex items-center justify-end gap-2 mt-3">
        {!isApproved && (
          <Button variant="ghost" onClick={handleCancel} disabled={isBusy} className="h-8 text-xs px-3 text-[#64748B]">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
        )}
        {isApproved ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-xs font-semibold text-green-700">Approved</span>
          </div>
        ) : isSubmitted ? (
          <Button variant="outline" onClick={handleUpdate} disabled={isBusy} className="h-8 text-xs px-3">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> {saving ? "Reverting..." : "Update"}
          </Button>
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
                <MessageSquare className="w-5 h-5 text-[#5B3CC4]" />
                Manager Response
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Manager Status</span>
                <div className="mt-1">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                    managerActionModal.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {managerActionModal.status === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Manager</span>
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
