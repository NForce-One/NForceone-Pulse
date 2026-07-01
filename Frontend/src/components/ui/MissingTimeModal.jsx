import React from "react";
import { X } from "lucide-react";

export const MissingTimeModal = ({ isOpen, onClose, employee }) => {
  if (!isOpen || !employee) return null;

  const { name, week, days } = employee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#1E293B]">Missing Time Details</h2>
            <p className="text-sm text-[#64748B]">{name} &middot; {week}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Day</th>
                </tr>
              </thead>
              <tbody>
                {days && days.length > 0 ? (
                  days.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150"
                    >
                      <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{item.date}</td>
                      <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{item.day}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-[#64748B]">
                      No daily data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
