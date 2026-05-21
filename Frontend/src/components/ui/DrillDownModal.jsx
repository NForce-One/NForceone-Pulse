import React from "react";
import { X } from "lucide-react";

const BASE_COLUMNS = [
  { key: "entryDate", label: "Date" },
  { key: "day", label: "Day" },
  { key: "userName", label: "Employee Name" },
  { key: "extraWorkType", label: "Work Type" },
  { key: "displayName", label: "Holiday Name" },
  { key: "clientWorked", label: "Client" },
  { key: "projectWorked", label: "Project" },
  { key: "taskWorked", label: "Task" },
  { key: "description", label: "Description" },
  { key: "hoursWorked", label: "Hours Worked" },
  { key: "reportedTo", label: "Reported To" },
  { key: "managerComment", label: "Manager Comment" },
  { key: "approvalStatus", label: "Approval Status" },
];

const EMPLOYEE_COLUMNS = BASE_COLUMNS.filter((c) => c.key !== "userName");

const getRowStyle = (type, entryType) => {
  if (entryType === "holiday") return "bg-emerald-500/5 border-l-4 border-l-emerald-500";
  if (entryType === "weekend") return "bg-amber-500/5 border-l-4 border-l-amber-500";
  return "";
};

const getTypeBadge = (entryType) => {
  if (entryType === "holiday") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Holiday</span>;
  }
  if (entryType === "weekend") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">Weekend</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Regular</span>;
};

const getExtraWorkTypeBadge = (extraWorkType) => {
  if (extraWorkType === "HOLIDAY") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Holiday</span>;
  }
  if (extraWorkType === "WEEKEND") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">Weekend</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Normal</span>;
};

const EMPTY_MESSAGES = {
  working: "No approved normal working entries found.",
  weekend: "No approved weekend extra working entries found.",
  holiday: "No approved holiday extra working entries found.",
  total: "No approved entries found for this period.",
};

const getCellValue = (entry, column) => {
  if (!entry) return "-";
  if (column.key === "hoursWorked") {
    return `${Number(entry[column.key] || 0).toFixed(2)}h`;
  }
  if (column.key === "type") {
    return getTypeBadge(entry[column.key]);
  }
  if (column.key === "extraWorkType") {
    return getExtraWorkTypeBadge(entry[column.key]);
  }
  if (column.key === "displayName" && !entry[column.key]) {
    return "-";
  }
  if (column.key === "description" && (!entry[column.key] || entry[column.key] === "-")) {
    return <span className="text-[#6b7280]">-</span>;
  }
  if (column.key === "managerComment" && (!entry[column.key] || entry[column.key] === "-")) {
    return <span className="text-[#6b7280]">-</span>;
  }
  return entry[column.key] ?? "-";
};

export const DrillDownModal = ({ isOpen, onClose, title, type, data, totals, isLoading, userRole, date, onDateChange }) => {
  if (!isOpen) return null;

  const isManagerOrAdmin = userRole === "MANAGER" || userRole === "ADMIN";
  const isAdmin = userRole === "ADMIN";
  const columns = (isManagerOrAdmin ? BASE_COLUMNS : EMPLOYEE_COLUMNS).filter(
    (c) => !(type === "working" && c.key === "displayName")
  );
  const totalHours = data.reduce((sum, e) => sum + e.hoursWorked, 0);

  const normalHours = totals?.normalHours ?? 0;
  const weekendHours = totals?.weekendHours ?? 0;
  const holidayHours = totals?.holidayHours ?? 0;
  const totalExtraHours = totals?.totalExtraHours ?? 0;
  const computedTotalHours = Number(normalHours) + Number(weekendHours) + Number(holidayHours);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-6xl max-h-[85vh] bg-white border border-[#e5e7eb] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-[#f9fafb] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
            <p className="text-sm text-[#6b7280]">
              {data.length} entr{data.length !== 1 ? "ies" : "y"} &middot; Total: {totalHours.toFixed(2)}h
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#6b7280]">Filter by Date:</label>
                <input
                  type="date"
                  value={date || ""}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="bg-white border border-[#d1d5db] rounded-lg px-3 py-1.5 text-sm text-[#111827] focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center gap-2 text-[#6b7280]">
                <div className="w-5 h-5 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[#6b7280]">
              {date ? "No working entries found for selected date." : (EMPTY_MESSAGES[type] || "No entries found for this period.")}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-1 px-6 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                {type === "working" ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280]">Working Hours:</span>
                    <span className="text-blue-400 font-semibold">{Number(normalHours).toFixed(2)}h</span>
                  </div>
                ) : type === "weekend" ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280]">Weekend Working Hours:</span>
                    <span className="text-amber-400 font-semibold">{Number(weekendHours).toFixed(2)}h</span>
                  </div>
                ) : type === "holiday" ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#6b7280]">Holiday Working Hours:</span>
                    <span className="text-emerald-400 font-semibold">{Number(holidayHours).toFixed(2)}h</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280]">Weekday Working Hours:</span>
                      <span className="text-blue-400 font-semibold">{Number(normalHours).toFixed(2)}h</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280]">Weekend Working Hours:</span>
                      <span className="text-amber-400 font-semibold">{Number(weekendHours).toFixed(2)}h</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280]">Holiday Working Hours:</span>
                      <span className="text-emerald-400 font-semibold">{Number(holidayHours).toFixed(2)}h</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#6b7280]">Total Working Hours:</span>
                      <span className="text-purple-400 font-semibold">{Number(computedTotalHours).toFixed(2)}h</span>
                    </div>
                  </>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] sticky top-0">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left text-[#6b7280] font-medium whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((entry, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors duration-150 ${getRowStyle(type, entry.type)}`}
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-[#111827] whitespace-nowrap">
                            {getCellValue(entry, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
