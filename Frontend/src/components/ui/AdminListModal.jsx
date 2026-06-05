import React from "react";
import { X } from "lucide-react";

export const AdminListModal = ({ isOpen, onClose, title, columns, data, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#1E293B]">{title}</h2>
            <p className="text-sm text-[#64748B]">
              {data.length} entr{data.length !== 1 ? "ies" : "y"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center gap-2 text-[#64748B]">
                <div className="w-5 h-5 border-2 border-[#B33A2F] border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[#64748B]">
              No entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap"
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
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150"
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-[#1E293B] whitespace-nowrap">
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
