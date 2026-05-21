import React, { useState, useEffect } from "react";
import { format } from "date-fns";

// ✅ FIXED PATH
import { fetchTimeEntries, approveTimeEntry, rejectTimeEntry, commentTimeEntry } from "../services/api";

// ✅ FIXED PATHS
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

import { Check, X, MessageSquare } from "lucide-react";

export const Approvals = () => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Comment modal state
  const [modal, setModal] = useState({
    isOpen: false,
    entryId: null,
    action: null, // "approve" | "reject"
    comment: "",
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

  const openModal = (entryId, action) => {
    setModal({ isOpen: true, entryId, action, comment: "" });
  };

  const closeModal = () => {
    setModal({ isOpen: false, entryId: null, action: null, comment: "" });
  };

  const handleConfirm = async () => {
    const { entryId, action, comment } = modal;
    try {
      if (action === "approve") {
        await approveTimeEntry(entryId, comment);
      } else if (action === "reject") {
        await rejectTimeEntry(entryId, comment);
      } else {
        await commentTimeEntry(entryId, comment);
      }
      closeModal();
      await loadEntries();
    } catch (error) {
      console.error(`Failed to ${action}`, error);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
          <Check className="w-6 h-6 text-[#22c55e]" />
          Approvals
        </h1>
        <p className="text-[#6b7280]">
          Review and approve submitted time entries.
        </p>
      </div>

      {/* TABLE */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">

          <table className="w-full text-sm whitespace-nowrap">

            <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
              <tr>
                <th className="px-3 py-3 text-left text-[#6b7280] font-medium">EmpID</th>
                <th className="px-3 py-3 text-left text-[#6b7280] font-medium">Name</th>
                <th className="px-3 py-3 text-left text-[#6b7280] font-medium">Client</th>
                <th className="px-3 py-3 text-left text-[#6b7280] font-medium">Project</th>
                <th className="px-3 py-3 text-left text-[#6b7280] font-medium">Task</th>
                <th className="px-3 py-3 text-left text-[#6b7280] font-medium">Description</th>
                <th className="px-3 py-3 text-center text-[#6b7280] font-medium">Status</th>
                <th className="px-3 py-3 text-right text-[#6b7280] font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-[#6b7280]">
                    Loading entries...
                  </td>
                </tr>

              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-[#6b7280]">
                    No pending approvals
                  </td>
                </tr>

              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#e5e7eb] hover:bg-[#f3f4f6] transition-colors duration-150">

                    <td className="px-3 py-3 text-[#111827] font-medium">
                      {entry.userId}
                    </td>

                    <td className="px-3 py-3 text-[#111827]">
                      {entry.User?.name || entry.user?.name || "Unknown"}
                    </td>

                    <td className="px-3 py-3 text-[#6b7280]">
                      {entry.client || "-"}
                    </td>

                    <td className="px-3 py-3 text-[#6b7280]">
                      {entry.project || "-"}
                    </td>

                    <td className="px-3 py-3 text-[#6b7280]">
                      {entry.task || "-"}
                    </td>

                    <td className="px-3 py-3 text-[#6b7280] max-w-[200px] truncate" title={entry.description || ""}>
                      {entry.description || "-"}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <Badge variant="warning">
                        {entry.status}
                      </Badge>
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 px-3 py-1 hover:scale-105 active:scale-95"
                          onClick={() => openModal(entry.id, "approve")}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 px-3 py-1 hover:scale-105 active:scale-95"
                          onClick={() => openModal(entry.id, "comment")}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Comment
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          className="hover:scale-105 active:scale-95"
                          onClick={() => openModal(entry.id, "reject")}
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </Card>

      {/* COMMENT MODAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg bg-white border border-[#e5e7eb] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e5e7eb] bg-[#f9fafb]">
              <h2 className="text-lg font-semibold text-[#111827] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#22c55e]" />
                {modal.action === "approve" ? "Approve Entry" : modal.action === "reject" ? "Reject Entry" : "Comment on Entry"}
              </h2>
              <p className="text-sm text-[#6b7280] mt-1">
                {modal.action === "approve"
                  ? "Add an optional note to the employee."
                  : modal.action === "reject"
                  ? "Add an optional note to the employee."
                  : "Add feedback or ask a question for the employee."}
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-[#6b7280] mb-2">
                Manager Comment / Note
              </label>
              <textarea
                value={modal.comment}
                onChange={(e) => setModal((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder={modal.action === "approve" ? "e.g. Good work on login module (optional)" : modal.action === "reject" ? "e.g. Please improve API validation (optional)" : "e.g. Please update the description."}
                rows={4}
                className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-2 text-[#111827] placeholder-[#6b7280] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]/30 transition-colors resize-none"
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                {modal.action === "approve" ? (
                  <Button
                    onClick={handleConfirm}
                    className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                ) : modal.action === "reject" ? (
                  <Button
                    onClick={handleConfirm}
                    variant="danger"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                ) : (
                  <Button
                    onClick={handleConfirm}
                    className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Comment
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