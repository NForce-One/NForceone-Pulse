import React, { useEffect, useRef } from "react";
import { X, Trash2 } from "lucide-react";

const formatHours = (hours) => {
  if (!hours && hours !== 0) return "0:00";
  const h = Math.floor(parseFloat(hours));
  const m = Math.round((parseFloat(hours) - h) * 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
};

export const CommentModal = ({
  isOpen,
  rowId,
  date,
  dayName,
  fullDate,
  hoursLogged,
  value,
  onChange,
  onSave,
  onDelete,
  onClose,
}) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 280) + "px";
      });
    }
  }, [isOpen, date]);

  const handleInput = (e) => {
    onChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 280) + "px";
  };

  const handleSave = () => {
    onSave(rowId, date, (value || "").trim());
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      onDelete(rowId, date);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-bold text-[#1E293B]">
            {value ? "Edit Comment" : "Add Comment"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F8FAFC] transition-colors">
            <X className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>

        <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <p className="text-xs font-semibold text-[#1E293B]">{dayName}, {fullDate}</p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Hours Logged: <span className="font-semibold text-[#1E293B]">{formatHours(hoursLogged)}</span>
          </p>
        </div>

        <div className="px-5 py-4">
          <textarea
            ref={textareaRef}
            value={value || ""}
            onChange={handleInput}
            placeholder="Describe work completed for this day..."
            rows={7}
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#5B3CC4] focus:border-transparent resize-none"
          />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Comment
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-8 px-4 text-xs font-semibold rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="h-8 px-4 text-xs font-semibold rounded-lg bg-[#5B3CC4] text-white hover:bg-[#4A2FA0] transition-colors"
            >
              Save Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
