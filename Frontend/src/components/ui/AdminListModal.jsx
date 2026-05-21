import React from "react";
import { X } from "lucide-react";

export const AdminListModal = ({ isOpen, onClose, title, columns, data, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white border border-[#e5e7eb] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-[#f9fafb] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
            <p className="text-sm text-[#6b7280]">
              {data.length} entr{data.length !== 1 ? "ies" : "y"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
              No entries found.
            </div>
          ) : (
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
                      className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors duration-150"
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-[#111827] whitespace-nowrap">
                          {col.render ? col.render(entry) : entry[col.key] ?? "-"}
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
