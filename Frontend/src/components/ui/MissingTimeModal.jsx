import React from "react";
import { X } from "lucide-react";

export const MissingTimeModal = ({ isOpen, onClose, employee, dateRange }) => {
  if (!isOpen || !employee) return null;

  const { name, totalLoggedHours, missingDays, missingHours, dailyBreakdown } = employee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white border border-[#E2E8F0] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#1E293B]">Missing Time Details</h2>
            <p className="text-sm text-[#64748B]">{name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#FAFBFC]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[#64748B] mb-1">Week Range</p>
              <p className="text-sm font-semibold text-[#1E293B]">{dateRange}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-1">Total Logged Hours</p>
              <p className="text-sm font-semibold text-[#1E293B]">{totalLoggedHours}h</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-1">Missing Days</p>
              <p className="text-sm font-semibold text-red-500">{missingDays} Day{missingDays !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-1">Missing Hours</p>
              <p className="text-sm font-semibold text-red-500">{missingHours}h</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Hours Logged</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Expected Hours</th>
                  <th className="px-4 py-3 text-left text-[#64748B] font-medium whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown && dailyBreakdown.length > 0 ? (
                  dailyBreakdown.map((day, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150 ${
                        day.status === "Missing" ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{day.date}</td>
                      <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{day.hoursLogged}h</td>
                      <td className="px-4 py-3 text-[#1E293B] whitespace-nowrap">{day.expectedHours}h</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {day.status === "Missing" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            Missing
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[#64748B]">
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
