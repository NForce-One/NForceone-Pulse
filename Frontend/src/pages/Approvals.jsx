import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";

import { fetchTimeEntries, approveTimeEntry, rejectTimeEntry } from "../services/api";

import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

import { Check, X, ChevronDown, MessageSquare } from "lucide-react";

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
    weekLabel: `${format(start, "MMM dd")} — ${format(new Date(weekDates[6].date + "T00:00:00"), "MMM dd, yyyy")}`,
  };
};

export const Approvals = () => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedIds, setExpandedIds] = useState([]);

  // Group entries by employee
  const grouped = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      const uid = entry.userId;
      if (!map[uid]) map[uid] = [];
      map[uid].push(entry);
    });
    return Object.values(map)
      .map((group) => {
        group.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
        return {
          userId: group[0].userId,
          name: group[0].User?.name || group[0].user?.name || "Unknown",
          entries: group,
          totalHours: group.reduce((s, e) => s + Number(e.hours || 0), 0).toFixed(2),
          latest: group[0],
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const toggleExpand = (userId, e) => {
    e.stopPropagation();
    setExpandedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Comment modal state
  const [modal, setModal] = useState({
    isOpen: false,
    entryIds: [],
    action: null, // "approve" | "reject"
    comment: "",
    error: "",
  });

  const loadEntries = async () => {
    try {
      setIsLoading(true);

      const response = await fetchTimeEntries({ for: "approvals" });

      // ✅ FIX: correct backend response handling
      const data = response?.data || [];

      // ✅ FIX: status should match backend (UPPERCASE)
      const submittedEntries = data.filter(
        (e) => e.status === "SUBMITTED"
      );

      setEntries(submittedEntries);

    } catch (error) {
      console.error("Failed to fetch approvals", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const openModal = (entryIds, action, e) => {
    e.stopPropagation();
    setModal({ isOpen: true, entryIds, action, comment: "", error: "" });
  };

  const closeModal = () => {
    setModal({ isOpen: false, entryIds: [], action: null, comment: "", error: "" });
  };

  const handleConfirm = async () => {
    const { entryIds, action, comment } = modal;
    let failed = false;
    for (const id of entryIds) {
      try {
        if (action === "approve") {
          await approveTimeEntry(id, comment);
        } else if (action === "reject") {
          await rejectTimeEntry(id, comment);
        }
      } catch (error) {
        failed = true;
        setModal((prev) => ({
          ...prev,
          error: error?.response?.data?.message || error?.message || `Failed to ${action} entry ${id}`,
        }));
      }
    }
    if (!failed) {
      closeModal();
      await loadEntries();
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] flex items-center gap-2">
          <Check className="w-6 h-6 text-[#5B3CC4]" />
          Approvals
        </h1>
        <p className="text-[#64748B]">
          Review and approve submitted time entries.
        </p>
      </div>

      {/* TABLE */}
      <Card>
        <div className="overflow-x-auto min-h-[300px]">

          <table className="w-full text-sm min-w-[1000px]">

            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-3 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">EmpID</th>
                <th className="px-3 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Name</th>
                <th className="px-3 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Date</th>
                <th className="px-3 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Client</th>
                <th className="px-3 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Project</th>
                <th className="px-3 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Task</th>
                <th className="px-3 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Description</th>
                <th className="px-3 py-3 text-right text-[#64748B] font-medium whitespace-nowrap">Hours</th>
                <th className="px-3 py-3 text-center text-[#64748B] font-medium whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-right text-[#64748B] font-medium whitespace-nowrap">Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="text-center py-8 text-[#64748B]">
                    Loading entries...
                  </td>
                </tr>

              ) : grouped.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-8 text-[#64748B]">
                    No pending approvals
                  </td>
                </tr>

              ) : (
                grouped.map((group) => (
                  <React.Fragment key={group.userId}>

                    {/* Parent row - employee summary */}
                    <tr className="border-b border-[#E2E8F0] bg-[#FAFAFE] hover:bg-[#F1F0FE] transition-colors duration-150">
                      <td className="px-3 py-3 text-[#1E293B] font-medium">{group.userId}</td>
                      <td className="px-3 py-3 text-[#1E293B] font-semibold">
                        <button
                          type="button"
                          onClick={(e) => toggleExpand(group.userId, e)}
                          className="inline-flex items-center gap-1.5 hover:text-[#5B3CC4] transition-colors duration-150"
                        >
                          {group.name}
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              expandedIds.includes(group.userId) ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-3 text-[#1E293B]">{format(new Date(group.latest.entryDate), "dd-MMM-yyyy")}</td>
                      <td className="px-3 py-3 text-[#64748B]">{group.latest.client || "-"}</td>
                      <td className="px-3 py-3 text-[#64748B]">{group.latest.project || "-"}</td>
                      <td className="px-3 py-3 text-[#94A3B8] italic">{group.entries.length} entr{group.entries.length === 1 ? "y" : "ies"}</td>
                      <td className="px-3 py-3 text-[#94A3B8] text-xs">{group.entries.length} pending</td>
                      <td className="px-3 py-3 text-right text-[#1E293B] font-medium">{group.totalHours}h</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="warning">SUBMITTED</Badge>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            type="button"
                            className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 px-3 py-1 hover:scale-105 active:scale-95"
                            onClick={(e) => openModal(group.entries.map((entry) => entry.id), "approve", e)}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant="danger"
                            className="hover:scale-105 active:scale-95"
                            onClick={(e) => openModal(group.entries.map((entry) => entry.id), "reject", e)}
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Child rows - individual entries (expanded) */}
                    {expandedIds.includes(group.userId) && (() => {
                      const wt = buildWeekTable(group.entries);
                      if (!wt) return null;
                      return (
                        <tr key={`exp-${group.userId}`}>
                          <td colSpan={10} className="px-4 py-4 bg-[#FAFBFC]">
                            <div className="text-[10px] font-semibold text-[#64748B] mb-2 uppercase tracking-wider">
                              Week: {wt.weekLabel}
                            </div>
                            <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                    <th className="px-3 py-2 text-left font-semibold text-[#64748B] uppercase tracking-wider min-w-[140px]">Project</th>
                                    {wt.weekDates.map((wd) => (
                                      <th key={wd.date} className="px-2 py-2 text-center border-l border-[#E2E8F0]">
                                        <div className="font-semibold text-[#64748B] uppercase tracking-wider">{wd.dayName}</div>
                                        <div className="font-bold text-[#1E293B]">{wd.dateNum}</div>
                                      </th>
                                    ))}
                                    <th className="px-2 py-2 text-center border-l border-[#E2E8F0] min-w-[70px]">
                                      <div className="font-semibold text-[#64748B] uppercase tracking-wider">Week</div>
                                      <div className="font-semibold text-[#64748B] uppercase tracking-wider">Total</div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {wt.projectRows.map((row) => (
                                    <tr key={row.project} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/50">
                                      <td className="px-3 py-2 border-r border-[#E2E8F0]">
                                        <div className="flex items-center gap-2">
                                          <div>
                                            <div className="text-sm font-semibold text-[#1E293B]">{row.project}</div>
                                            <div className="text-[10px] text-[#64748B]">{row.client}</div>
                                          </div>
                                          {row.comment && (
                                            <span title={row.comment} className="text-[#5B3CC4] flex-shrink-0">
                                              <MessageSquare className="w-3.5 h-3.5" />
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      {wt.weekDates.map((wd) => (
                                        <td key={wd.date} className="px-2 py-2 text-center border-l border-[#E2E8F0] text-sm font-medium text-[#1E293B]">
                                          {row.days[wd.date] != null ? Number(row.days[wd.date]).toFixed(1) : ""}
                                        </td>
                                      ))}
                                      <td className="px-2 py-2 text-center border-l border-[#E2E8F0] text-sm font-bold text-[#1E293B]">
                                        {row.total.toFixed(1)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0]">
                                    <td className="px-3 py-2 border-r border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                                      Daily Totals
                                    </td>
                                    {wt.weekDates.map((wd) => (
                                      <td key={wd.date} className="px-2 py-2 text-center border-l border-[#E2E8F0] text-xs font-bold text-[#1E293B]">
                                        {(wt.dailyTotals[wd.date] || 0).toFixed(1)}
                                      </td>
                                    ))}
                                    <td className="px-2 py-2 text-center border-l border-[#E2E8F0] text-xs font-bold text-[#5B3CC4]">
                                      {wt.weekTotal.toFixed(1)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}

                  </React.Fragment>
                ))
              )}
            </tbody>

          </table>
        </div>
      </Card>

{/* APPROVE/REJECT MODAL */}
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
            <div className="relative w-full max-w-lg bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h2 className="text-lg font-semibold text-[#1E293B] flex items-center gap-2">
                  {modal.action === "approve" ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  {modal.action === "approve" ? `Approve ${modal.entryIds.length} Entry` : `Reject ${modal.entryIds.length} Entry`}{modal.entryIds.length !== 1 ? "ies" : ""}
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
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#5B3CC4] focus:ring-1 focus:ring-[#5B3CC4]/30 transition-colors resize-none"
                />
                {modal.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {modal.error}
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={closeModal}>
                    Cancel
                  </Button>
                  {modal.action === "approve" ? (
                    <Button
                      onClick={handleConfirm}
                      className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve All
                    </Button>
                  ) : (
                    <Button
                      onClick={handleConfirm}
                      variant="danger"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject All
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