import React from "react";
import { X } from "lucide-react";

const COLUMN_CONFIG = {
  working: [
    { key: "userName", label: "Employee" },
    { key: "entryDate", label: "Date" },
    { key: "day", label: "Day" },
    { key: "projectWorked", label: "Project Worked" },
    { key: "hoursWorked", label: "Hours Worked" },
  ],
  extra: [
    { key: "userName", label: "Employee" },
    { key: "entryDate", label: "Date" },
    { key: "day", label: "Day" },
    { key: "displayName", label: "Holiday/Weekend Name" },
    { key: "projectWorked", label: "Project Worked" },
    { key: "hoursWorked", label: "Hours Worked" },
    { key: "type", label: "Type" },
  ],
  total: [
    { key: "userName", label: "Employee" },
    { key: "entryDate", label: "Date" },
    { key: "day", label: "Day" },
    { key: "displayName", label: "Holiday/Weekend Name" },
    { key: "projectWorked", label: "Project Worked" },
    { key: "hoursWorked", label: "Hours Worked" },
    { key: "type", label: "Type" },
  ],
};

const getRowStyle = (type, entryType) => {
  if (type !== "total") return "";
  if (entryType === "holiday") return "bg-purple-500/10 border-l-4 border-l-purple-500";
  if (entryType === "weekend") return "bg-amber-500/10 border-l-4 border-l-amber-500";
  return "";
};

const getTypeBadge = (entryType) => {
  if (entryType === "holiday") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">Holiday</span>;
  }
  if (entryType === "weekend") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">Weekend</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Regular</span>;
};

const getCellValue = (entry, column) => {
  if (column.key === "hoursWorked") {
    return `${entry[column.key]}h`;
  }
  if (column.key === "type") {
    return getTypeBadge(entry[column.key]);
  }
  if (column.key === "displayName" && !entry[column.key]) {
    return "-";
  }
  return entry[column.key];
};

export const DrillDownModal = ({ isOpen, onClose, title, type, data, isLoading }) => {
  if (!isOpen) return null;

  const columns = COLUMN_CONFIG[type] || COLUMN_CONFIG.total;
  const totalHours = data.reduce((sum, e) => sum + e.hoursWorked, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl max-h-[85vh] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#0f0f0f] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-[#a1a1aa]">
              {data.length} entr{data.length !== 1 ? "ies" : "y"} &middot; Total: {totalHours}h
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center gap-2 text-[#a1a1aa]">
                <div className="w-5 h-5 border-2 border-[#ff2d2d] border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[#a1a1aa]">
              No entries found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a] sticky top-0">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-[#a1a1aa] font-medium whitespace-nowrap"
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
                      className={`border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150 ${getRowStyle(type, entry.type)}`}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-white whitespace-nowrap">
                          {getCellValue(entry, col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
