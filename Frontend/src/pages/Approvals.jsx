import React, { useState, useEffect } from "react";
import { format } from "date-fns";

// ✅ FIXED PATH
import { fetchTimeEntries, approveTimeEntry, rejectTimeEntry } from "../services/api";

// ✅ FIXED PATHS
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

import { Check, X } from "lucide-react";

export const Approvals = () => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = async () => {
    try {
      setIsLoading(true);

      const response = await fetchTimeEntries();

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

  const handleApprove = async (id) => {
    try {
      await approveTimeEntry(id);
      await loadEntries();
    } catch (error) {
      console.error("Failed to approve", error);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectTimeEntry(id);
      await loadEntries();
    } catch (error) {
      console.error("Failed to reject", error);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
          <Check className="w-6 h-6 text-[#6366F1]" />
          Approvals
        </h1>
        <p className="text-[#6B7280]">
          Review and approve submitted time entries.
        </p>
      </div>

      {/* TABLE */}
      <Card className="glass-table overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">

          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="px-3 py-3 text-left text-[#6B7280] font-medium">EmpID</th>
                <th className="px-3 py-3 text-left text-[#6B7280] font-medium">Name</th>
                <th className="px-3 py-3 text-left text-[#6B7280] font-medium">Client</th>
                <th className="px-3 py-3 text-left text-[#6B7280] font-medium">Project</th>
                <th className="px-3 py-3 text-left text-[#6B7280] font-medium">Task</th>
                <th className="px-3 py-3 text-left text-[#6B7280] font-medium">Description</th>
                <th className="px-3 py-3 text-center text-[#6B7280] font-medium">Status</th>
                <th className="px-3 py-3 text-right text-[#6B7280] font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-[#6B7280]">
                    Loading entries...
                  </td>
                </tr>

              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-[#6B7280]">
                    No pending approvals
                  </td>
                </tr>

              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>

                    <td className="px-3 py-3 text-[#111827] font-medium">
                      {entry.userId}
                    </td>

                    <td className="px-3 py-3 text-[#111827]">
                      {entry.User?.name || entry.user?.name || "Unknown"}
                    </td>

                    <td className="px-3 py-3 text-[#6B7280]">
                      {entry.client || "-"}
                    </td>

                    <td className="px-3 py-3 text-[#6B7280]">
                      {entry.project || "-"}
                    </td>

                    <td className="px-3 py-3 text-[#6B7280]">
                      {entry.task || "-"}
                    </td>

                    <td className="px-3 py-3 text-[#6B7280] max-w-[200px] truncate" title={entry.description || ""}>
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
                          onClick={() => handleApprove(entry.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          className="hover:scale-105 active:scale-95"
                          onClick={() => handleReject(entry.id)}
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

    </div>
  );
};