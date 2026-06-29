import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { format } from "date-fns";

import { fetchTimeEntries, approveTimeEntry, rejectTimeEntry } from "../services/api";

import { useCachedData, clearPageCache } from "../hooks/useCachedData";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

import { Check, X, ChevronDown, MessageSquare, Eye } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getWeekStart = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return format(d, "yyyy-MM-dd");
};

const buildWeekTable = (entries) => {
  if (!entries || entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const ws = getWeekStart(sorted[0].entryDate);
  const start = new Date(ws + "T00:00:00");
  const weekDates = DAY_NAMES.map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: format(d, "yyyy-MM-dd"), dayName: DAY_NAMES[i], dateNum: d.getDate() };
  });
  const projectMap = {};
  sorted.forEach((entry) => {
    const pName = entry.project || "Unassigned";
    if (!projectMap[pName]) {
      projectMap[pName] = { project: pName, client: entry.client || "", days: {}, comment: entry.comment || "" };
    }
    projectMap[pName].days[entry.entryDate] = Number(entry.hours || 0);
    if (entry.comment) projectMap[pName].comment = entry.comment;
  });
  const projectRows = Object.values(projectMap).map((row) => ({
    ...row,
    total: weekDates.reduce((s, wd) => s + (row.days[wd.date] || 0), 0),
  }));
  const dailyTotals = {};
  weekDates.forEach((wd) => {
    dailyTotals[wd.date] = projectRows.reduce((s, r) => s + (r.days[wd.date] || 0), 0);
  });
  const weekTotal = projectRows.reduce((s, r) => s + r.total, 0);
  return {
    weekDates,
    projectRows,
    dailyTotals,
    weekTotal,
    weekLabel: `${format(start, "MMM dd")} \u2014 ${format(new Date(weekDates[6].date + "T00:00:00"), "MMM dd, yyyy")}`,
  };
};

const formatSubmissionDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return `${format(d, "dd-MMM-yyyy")} | ${format(d, "hh:mm a")}`;
};

const getSnackbarStyles = (type) => {
  if (type === "success") return "bg-green-600 text-white";
  if (type === "error") return "bg-red-600 text-white";
  return "bg-[#1E293B] text-white";
};

export const Approvals = () => {
  const [entries, setEntries] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [projectsPopover, setProjectsPopover] = useState({ groupKey: null, x: 0, y: 0, upward: false });
  const popoverRef = useRef(null);
  const [detailsKey, setDetailsKey] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  const {
    data: fetchedEntries,
    isLoading,
    refresh: refreshEntries,
  } = useCachedData("approvals", () => fetchTimeEntries({ for: "approvals" }));

  useEffect(() => {
    if (fetchedEntries) {
      setEntries(fetchedEntries);
    }
  }, [fetchedEntries]);

  const weeklyCounts = useMemo(() => {
    const weekKeys = {};
    entries.forEach((entry) => {
      const weekStart = getWeekStart(entry.entryDate);
      const key = `${entry.userId}_${weekStart}`;
      if (!weekKeys[key]) {
        weekKeys[key] = { key, status: entry.status };
      }
    });
    const groups = Object.values(weekKeys);
    return {
      pending: groups.filter((g) => g.status === "SUBMITTED").length,
      approved: groups.filter((g) => g.status === "APPROVED").length,
      rejected: groups.filter((g) => g.status === "REJECTED").length,
      all: groups.length,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "pending") return entries.filter((e) => e.status === "SUBMITTED");
    if (statusFilter === "approved") return entries.filter((e) => e.status === "APPROVED");
    if (statusFilter === "rejected") return entries.filter((e) => e.status === "REJECTED");
    return entries;
  }, [entries, statusFilter]);

  // Group entries by employee + week
  const grouped = useMemo(() => {
    const map = {};
    filteredEntries.forEach((entry) => {
      const weekStart = getWeekStart(entry.entryDate);
      const key = `${entry.userId}_${weekStart}`;
      if (!map[key]) {
        map[key] = { userId: entry.userId, employeeId: entry.User?.employeeId || null, name: entry.User?.name || entry.user?.name || "Unknown", weekStart, entries: [] };
      }
      map[key].entries.push(entry);
    });
    return Object.values(map)
      .map((group) => {
        group.entries.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
        const totalHours = group.entries.reduce((s, e) => s + Number(e.hours || 0), 0);
        const latestEntry = group.entries.reduce((latest, e) =>
          new Date(e.entryDate) > new Date(latest.entryDate) ? e : latest
        , group.entries[0]);
        const ws = new Date(group.weekStart + "T00:00:00");
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        const weekLabel = `${format(ws, "MMM dd")} \u2014 ${format(we, "MMM dd, yyyy")}`;
        const projectSet = new Set();
        const projectList = [];
        group.entries.forEach((e) => {
          const key = `${e.client || ""}_${e.project || ""}`;
          if (!projectSet.has(key)) {
            projectSet.add(key);
            projectList.push({ client: e.client || "-", project: e.project || "-" });
          }
        });
        const submissionDate = latestEntry.createdAt || latestEntry.updatedAt || latestEntry.entryDate;
        return {
          key: `${group.userId}_${group.weekStart}`,
          userId: group.userId,
          name: group.name,
          entries: group.entries,
          totalHours: totalHours.toFixed(2),
          weekLabel,
          weekStart: group.weekStart,
          projectCount: projectList.length,
          projectList,
          submissionDate,
          latestEntry,
          status: group.entries[0]?.status || "SUBMITTED",
        };
      })
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.name.localeCompare(b.name));
  }, [filteredEntries]);

  // Comment modal state
  const [modal, setModal] = useState({
    isOpen: false,
    entryIds: [],
    action: null,
    comment: "",
    error: "",
  });
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);
  const [snackbar, setSnackbar] = useState(null);

  const showSnackbar = useCallback((message, type = "info", duration = 3000) => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), duration);
  }, []);

  useLayoutEffect(() => {
    if (!projectsPopover.groupKey || !popoverRef.current) return;
    const el = popoverRef.current;
    const r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight) {
      el.style.top = Math.max(4, window.innerHeight - r.height - 8) + "px";
    }
    if (r.top < 0) {
      el.style.top = "8px";
    }
    if (r.left < 0) {
      el.style.left = "8px";
    }
    if (r.right > window.innerWidth) {
      el.style.left = Math.max(8, window.innerWidth - r.width - 8) + "px";
    }
  }, [projectsPopover.groupKey]);

  const openModal = (entryIds, action, e) => {
    e.stopPropagation();
    setModal({ isOpen: true, entryIds, action, comment: "", error: "" });
  };

  const closeModal = () => {
    setModal({ isOpen: false, entryIds: [], action: null, comment: "", error: "" });
  };

  const handleConfirm = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    const { entryIds, action, comment } = modal;
    let failed = false;
    const results = await Promise.allSettled(
      entryIds.map((id) =>
        action === "approve" ? approveTimeEntry(id, comment) : rejectTimeEntry(id, comment)
      )
    );
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        failed = true;
        const id = entryIds[i];
        setModal((prev) => ({
          ...prev,
          error: result.reason?.response?.data?.message || result.reason?.message || `Failed to ${action} entry ${id}`,
        }));
      }
    });
    if (!failed) {
      const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
      setEntries((prev) => {
        const updated = prev.map((entry) =>
          entryIds.includes(entry.id) ? { ...entry, status: newStatus } : entry
        );
        return updated;
      });
      closeModal();
      showSnackbar(
        action === "approve"
          ? "Timesheet approved successfully."
          : "Timesheet rejected successfully.",
        "success"
      );
      clearPageCache("approvals");
      refreshEntries();
    }
    processingRef.current = false;
    setProcessing(false);
  };

  const openDetails = (group) => {
    const wt = buildWeekTable(group.entries);
    setDetailsData({ group, weekTable: wt });
    setDetailsKey(group.key);
  };

  const closeDetails = () => {
    setDetailsKey(null);
    setDetailsData(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-[32px] font-bold text-[#1E293B] leading-tight flex items-center gap-2">
          <Check className="w-6 h-6 text-[#B33A2F]" />
          Approvals
        </h1>
        <p className="text-[#64748B]">
          Review and approve submitted time entries.
        </p>
      </div>

      {/* STATUS FILTER TABS */}
      <div className="flex items-center gap-1 bg-[#F8FAFC] rounded-xl p-1 border border-[#E2E8F0] w-fit">
        {[
          { key: "pending", label: "Pending", count: weeklyCounts.pending },
          { key: "approved", label: "Approved", count: weeklyCounts.approved },
          { key: "rejected", label: "Rejected", count: weeklyCounts.rejected },
          { key: "all", label: "All", count: weeklyCounts.all },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              statusFilter === tab.key
                ? "bg-white text-[#1E293B] shadow-sm border border-[#E2E8F0]"
                : "text-[#64748B] hover:text-[#1E293B] hover:bg-white/50"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              statusFilter === tab.key
                ? "bg-[#B33A2F]/10 text-[#B33A2F]"
                : "bg-[#E2E8F0] text-[#64748B]"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TABLE */}
      <Card>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Week</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Projects</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#64748B] whitespace-nowrap">Hours</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#64748B] whitespace-nowrap">Submitted</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#64748B] whitespace-nowrap">View</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[#64748B]">
                    Loading entries...
                  </td>
                </tr>
              ) : grouped.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[#64748B]">
                    {statusFilter === "pending" ? "No pending approvals" : statusFilter === "approved" ? "No approved submissions found" : statusFilter === "rejected" ? "No rejected submissions" : "No submissions found"}
                  </td>
                </tr>
              ) : (
                grouped.map((group) => {
                  const subDateTime = formatSubmissionDateTime(group.submissionDate);
                  return (
                    <tr
                      key={group.key}
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150"
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-[#1E293B]">{group.name}</div>
                        <div className="text-[11px] text-[#94A3B8]">Emp ID: {group.employeeId || group.userId}</div>
                      </td>

                      {/* Week */}
                      <td className="px-4 py-3 text-sm text-[#1E293B] whitespace-nowrap">
                        {group.weekLabel}
                      </td>

                      {/* Projects */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setProjectsPopover((prev) => {
                              if (prev.groupKey === group.key) return { groupKey: null, x: 0, y: 0, upward: false };
                              const estHeight = 80 + group.projectList.length * 55;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const upward = spaceBelow < estHeight;
                              return {
                                groupKey: group.key,
                                x: Math.min(rect.left, window.innerWidth - 360),
                                y: upward ? rect.top - 12 : rect.bottom + 4,
                                upward
                              };
                            });
                          }}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#B33A2F] hover:text-[#992E25] transition-colors"
                        >
                          {group.projectCount} {group.projectCount === 1 ? "Project" : "Projects"}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${projectsPopover.groupKey === group.key ? "rotate-180" : ""}`} />
                        </button>
                      </td>

                      {/* Hours */}
                      <td className="px-4 py-3 text-right text-sm font-semibold text-[#1E293B] whitespace-nowrap">
                        {group.totalHours}h
                      </td>

                      {/* Submitted */}
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-[#1E293B]">
                        {subDateTime}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {group.status === "SUBMITTED" && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => openModal(group.entries.map((entry) => entry.id), "approve", e)}
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 transition-all duration-150"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => openModal(group.entries.map((entry) => entry.id), "reject", e)}
                                className="p-2 rounded-lg bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 transition-all duration-150"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => openDetails(group)}
                              className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#64748B] transition-all duration-150"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PROJECTS POPOVER */}
      {projectsPopover.groupKey && (() => {
        const group = grouped.find((g) => g.key === projectsPopover.groupKey);
        if (!group) return null;
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProjectsPopover({ groupKey: null, x: 0, y: 0, upward: false })} />
            <div
              ref={popoverRef}
              className="fixed z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-xl min-w-[280px] max-w-[360px]"
              style={{ left: projectsPopover.x, top: projectsPopover.y }}
            >
              <div className="p-4 pb-0">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                  Projects ({group.projectCount})
                </div>
              </div>
              <div className="px-4 pb-4 max-h-[300px] overflow-y-auto">
                {group.projectList.map((item, idx) => (
                  <div key={idx} className="pb-2 border-b border-[#E2E8F0] last:border-b-0 last:pb-0">
                    <div className="text-[11px] text-[#64748B]">
                      Client: <span className="text-[#1E293B] font-medium">{item.client}</span>
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Project: <span className="text-[#1E293B] font-medium">{item.project}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}

      {/* DETAILS DRAWER */}
      {detailsKey && detailsData && (() => {
        const { group, weekTable } = detailsData;
        const subDateTime = formatSubmissionDateTime(group.submissionDate);
        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={closeDetails} />
            <div className="fixed top-0 right-0 z-50 h-full w-full max-w-4xl bg-white border-l border-[#E2E8F0] shadow-2xl overflow-y-auto">
              {/* Drawer Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1E293B]">Timesheet Details</h2>
                  <p className="text-sm text-[#64748B]">{group.name} &middot; {group.weekLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={closeDetails}
                  className="p-2 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <div>
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Employee</div>
                    <div className="text-sm font-semibold text-[#1E293B] mt-0.5">{group.name}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Week</div>
                    <div className="text-sm text-[#1E293B] mt-0.5">{group.weekLabel}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Submitted</div>
                    <div className="text-sm text-[#1E293B] mt-0.5">{subDateTime}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Hours</div>
                    <div className="text-lg font-bold text-[#B33A2F] mt-0.5">{group.totalHours}h</div>
                  </div>
                </div>

                {/* Employee Weekly Comment */}
                {(() => {
                  const comments = [...new Set(group.entries.filter((e) => e.comment).map((e) => e.comment))];
                  if (comments.length === 0) return null;
                  return (
                    <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/60">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Employee Weekly Comment</div>
                      </div>
                      {comments.map((c, idx) => (
                        <div key={idx} className="text-sm text-amber-900 leading-relaxed">
                          {c}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Timesheet Grid */}
                {weekTable && (
                  <div>
                    <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                      Daily Timesheet
                    </div>
                    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-x-auto">
                      <table className="w-full text-xs min-w-[700px]">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                            <th className="px-3 py-2.5 text-left font-semibold text-[#64748B] uppercase tracking-wider min-w-[140px]">Project</th>
                            {weekTable.weekDates.map((wd) => (
                              <th key={wd.date} className="px-2 py-2.5 text-center border-l border-[#E2E8F0]">
                                <div className="font-semibold text-[#64748B] uppercase tracking-wider">{wd.dayName}</div>
                                <div className="font-bold text-[#1E293B] text-xs">{wd.dateNum}</div>
                              </th>
                            ))}
                            <th className="px-2 py-2.5 text-center border-l border-[#E2E8F0] min-w-[70px]">
                              <div className="font-semibold text-[#64748B] uppercase tracking-wider">Week</div>
                              <div className="font-semibold text-[#64748B] uppercase tracking-wider">Total</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {weekTable.projectRows.map((row) => (
                            <tr key={row.project} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/50">
                              <td className="px-3 py-2.5 border-r border-[#E2E8F0]">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="text-sm font-semibold text-[#1E293B]">{row.project}</div>
                                    <div className="text-[10px] text-[#64748B]">{row.client}</div>
                                  </div>
                                  {row.comment && (
                                    <span title={row.comment} className="text-[#B33A2F] flex-shrink-0">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              {weekTable.weekDates.map((wd) => (
                                <td key={wd.date} className="px-2 py-2.5 text-center border-l border-[#E2E8F0] text-sm font-medium text-[#1E293B]">
                              {row.days[wd.date] != null ? Number(row.days[wd.date]).toFixed(1) : "0.0"}
                                </td>
                              ))}
                              <td className="px-2 py-2.5 text-center border-l border-[#E2E8F0] text-sm font-bold text-[#1E293B]">
                                {row.total.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0]">
                            <td className="px-3 py-2.5 border-r border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                              Daily Totals
                            </td>
                            {weekTable.weekDates.map((wd) => (
                              <td key={wd.date} className="px-2 py-2.5 text-center border-l border-[#E2E8F0] text-xs font-bold text-[#1E293B]">
                                {(weekTable.dailyTotals[wd.date] || 0).toFixed(1)}
                              </td>
                            ))}
                            <td className="px-2 py-2.5 text-center border-l border-[#E2E8F0] text-xs font-bold text-[#B33A2F]">
                              {weekTable.weekTotal.toFixed(1)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Drawer Actions */}
                {group.status === "SUBMITTED" && (
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                    <Button
                      className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200"
                      onClick={(e) => {
                        const entryIds = group.entries.map((entry) => entry.id);
                        openModal(entryIds, "approve", { stopPropagation: () => {} });
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve Timesheet
                    </Button>
                    <Button
                      variant="danger"
                      onClick={(e) => {
                        const entryIds = group.entries.map((entry) => entry.id);
                        openModal(entryIds, "reject", { stopPropagation: () => {} });
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject Timesheet
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* SNACKBAR */}
      {snackbar && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg animate-in slide-in-from-right-2 ${getSnackbarStyles(snackbar.type)}`}>
          {snackbar.message}
        </div>
      )}

      {/* APPROVE/REJECT MODAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={processing ? undefined : closeModal}></div>
          <div className="relative w-full max-w-lg bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <h2 className="text-lg font-semibold text-[#1E293B] flex items-center gap-2">
                {modal.action === "approve" ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
                {modal.action === "approve" ? `Approve ${modal.entryIds.length} ${modal.entryIds.length === 1 ? "Entry" : "Entries"}` : `Reject ${modal.entryIds.length} ${modal.entryIds.length === 1 ? "Entry" : "Entries"}`}
              </h2>
              <p className="text-sm text-[#64748B] mt-1">
                {modal.action === "approve"
                  ? "This will approve all pending entries for this employee."
                  : "This will reject all pending entries for this employee."}
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-[#64748B] mb-2">
                Manager Comment / Note <span className="text-[#94A3B8] font-normal">(optional)</span>
              </label>
              <textarea
                value={modal.comment}
                onChange={(e) => setModal((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder={modal.action === "approve" ? "e.g. Good work (optional)" : "e.g. Please improve (optional)"}
                rows={4}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#B33A2F] focus:ring-1 focus:ring-[#B33A2F]/30 transition-colors resize-none"
              />
              {modal.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {modal.error}
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={closeModal} disabled={processing}>
                  Cancel
                </Button>
                {modal.action === "approve" ? (
                  <Button
                    onClick={handleConfirm}
                    disabled={processing}
                    className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {processing ? "Processing..." : "Approve All"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirm}
                    disabled={processing}
                    variant="danger"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {processing ? "Processing..." : "Reject All"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
