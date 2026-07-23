import React, { useEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";

export const CommentModal = ({
  isOpen,
  rowId,
  date,
  value,
  onChange,
  onSave,
  onDelete,
  onClose,
}) => {
  const textareaRef = useRef(null);
  const [deleteError, setDeleteError] = useState(false);

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

  useEffect(() => {
    setDeleteError(false);
  }, [isOpen, date]);

  const handleInput = (e) => {
    onChange(e.target.value);
    if (deleteError) setDeleteError(false);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 280) + "px";
  };

  const handleSave = () => {
    onSave(rowId, date, (value || "").trim());
  };

  const handleDelete = () => {
    if (!(value || "").trim()) {
      setDeleteError(true);
      return;
    }
    setDeleteError(false);
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

        <div className="px-5 py-4">
          <textarea
            ref={textareaRef}
            value={value || ""}
            onChange={handleInput}
            placeholder="Describe work completed for this day..."
            rows={7}
            maxLength={200}
            aria-invalid={deleteError}
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:border-transparent resize-none ${
              deleteError
                ? "border-red-300 focus:ring-red-400"
                : "border-[#E2E8F0] focus:ring-[#B33A2F]"
            }`}
          />
          {deleteError ? (
            <p className="text-[11px] text-red-500 font-semibold mt-1.5">
              Nothing to delete. Please enter a comment before attempting to delete.
            </p>
          ) : (
            <p className="text-[11px] text-[#94A3B8] mt-1.5">Maximum 200 characters allowed</p>
          )}
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
              className="h-8 px-4 text-xs font-semibold rounded-lg bg-[#B33A2F] text-white hover:bg-[#992E25] transition-colors"
            >
              Save Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
