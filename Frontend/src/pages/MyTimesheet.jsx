import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  fetchTimeEntries,
  createTimeEntry,
  submitTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getDashboardStats,
  fetchClients,
  fetchProjects,
  getManagers,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";

import { Plus, Send, Pencil, Trash2, Save, X } from "lucide-react";

export const MyTimesheet = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState("");
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  const [workingHours, setWorkingHours] = useState({
    normalHours: 0,
    weekendHours: 0,
    holidayHours: 0,
    totalHours: 0,
    totalEntries: 0,
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const [formData, setFormData] = useState({
    client: "",
    project: "",
    task: "",
    date: format(new Date(), "yyyy-MM-dd"),
    hours: "",
    description: "",
    clientId: null,
    projectId: null,
    taskId: null,
  });

  // LOAD ENTRIES
  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const response = await fetchTimeEntries();
      setEntries(response?.data || response || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // LOAD MANAGERS
  const loadManagers = async () => {
    try {
      const res = await getManagers();
      const data = res?.data || res || [];
      setManagers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadClientsAndProjects = async () => {
    try {
      const [clientsRes, projectsRes] = await Promise.all([
        fetchClients(),
        fetchProjects(),
      ]);
      setClients(clientsRes?.data || []);
      setProjects(projectsRes?.data || []);
    } catch (err) {
      console.error("Failed to load clients/projects", err);
    }
  };

  useEffect(() => {
    loadEntries();
    loadManagers();
    loadWorkingHours();
    loadClientsAndProjects();

    const client = searchParams.get("client") || "";
    const project = searchParams.get("project") || "";
    const task = searchParams.get("task") || "";
    const description = searchParams.get("description") || "";
    const hours = searchParams.get("hours") || "";
    const date = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const clientId = searchParams.get("clientId") || null;
    const projectId = searchParams.get("projectId") || null;
    const taskId = searchParams.get("taskId") || null;

    if (project || task || hours) {
      setFormData({
        client,
        project,
        task,
        date,
        hours: hours ? Number(hours).toFixed(2) : "",
        description,
        clientId: clientId ? Number(clientId) : null,
        projectId: projectId ? Number(projectId) : null,
        taskId: taskId ? Number(taskId) : null,
      });
    }
  }, []);

  const loadWorkingHours = async () => {
    try {
      const response = await getDashboardStats();
      if (response) {
        setWorkingHours({
          normalHours: response.normalHours || 0,
          weekendHours: response.weekendHours || 0,
          holidayHours: response.holidayHours || 0,
          totalHours: response.totalWeekHours || 0,
          totalEntries: 0,
        });
      }
    } catch {
      // silent
    }
  };

  const filteredProjects = useMemo(() => {
    if (!formData.clientId) return [];
    return projects.filter(
      (p) => Number(p.clientId) === Number(formData.clientId) && p.status === "ACTIVE"
    );
  }, [formData.clientId, projects]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "client") {
      const selected = clients.find((c) => String(c.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        clientId: selected ? selected.id : null,
        client: selected ? selected.name : "",
        projectId: null,
        project: "",
      }));
    } else if (name === "project") {
      const selected = projects.find((p) => String(p.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        projectId: selected ? selected.id : null,
        project: selected ? selected.name : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // CREATE
  const handleCreate = async (e) => {
    e.preventDefault();

    if (
      !formData.client ||
      !formData.project ||
      !formData.task ||
      !formData.hours ||
      !selectedManager
    ) {
      alert("Please fill all required fields and select a manager");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        ...formData,
        managerId: selectedManager ? Number(selectedManager) : null,
      };

      console.log("FINAL PAYLOAD:", payload);

      const result = await createTimeEntry(payload);
      console.log("CREATE RESULT:", result);

      setFormData({
        client: "",
        project: "",
        task: "",
        date: format(new Date(), "yyyy-MM-dd"),
        hours: "",
        description: "",
        clientId: null,
        projectId: null,
        taskId: null,
      });
      setSelectedManager("");
      await loadEntries();

      if (result.workingHours) {
        setWorkingHours((prev) => ({ ...prev, ...result.workingHours }));
      }

      alert("Entry created successfully!");
    } catch (error) {
      console.error("CREATE ERROR:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create entry";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ACTIONS
  const handleSubmitEntry = async (id) => {
    const result = await submitTimeEntry(id);
    await loadEntries();
    if (result.workingHours) {
      setWorkingHours((prev) => ({ ...prev, ...result.workingHours }));
    }
  };
/*
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;

    await deleteTimeEntry(id);
    await loadEntries();
  };
*/
const handleDelete = async (id) => {
  try {
    if (!window.confirm("Delete this entry?")) return;

    const result = await deleteTimeEntry(id);

    // 🔥 remove from UI immediately
    setEntries((prev) => prev.filter((e) => e.id !== id));

    if (result.workingHours) {
      setWorkingHours((prev) => ({ ...prev, ...result.workingHours }));
    }

  } catch (error) {
    console.error("DELETE ERROR:", error);
    alert("Delete failed");
  }
};
  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const handleSave = async (id) => {
    const result = await updateTimeEntry(id, editData);
    setEditingId(null);
    await loadEntries();
    if (result.workingHours) {
      setWorkingHours((prev) => ({ ...prev, ...result.workingHours }));
    }
  };

  const getEmployeeStatus = (status) => {
    return status === "DRAFT" ? "Draft" : "Sent";
  };

  const getStatusBadgeVariant = (displayStatus) => {
    return {
      Draft: "default",
      Sent: "warning",
    }[displayStatus] || "default";
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1E293B]">My Timesheet</h1>

      {/* FORM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1E293B] flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#5B3CC4]" />
            Log Time
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-3">
          <form className="grid grid-cols-1 md:grid-cols-7 gap-4" onSubmit={handleCreate}>
            <select name="client" value={formData.clientId || ""} onChange={handleInputChange} className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#5B3CC4] focus:border-transparent transition-all duration-200">
              <option value="">-- Select Client --</option>
              {clients.filter((c) => c.status === "ACTIVE").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select name="project" value={formData.projectId || ""} onChange={handleInputChange} disabled={!formData.clientId} className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#5B3CC4] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="">
                {!formData.clientId ? "-- Select a client first --" : filteredProjects.length === 0 ? "No projects available" : "-- Select Project --"}
              </option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Input name="task" value={formData.task} onChange={handleInputChange} placeholder="Task" />
            <Input type="date" name="date" value={formData.date} onChange={handleInputChange} />
            <Input type="number" step="0.01" name="hours" value={formData.hours} onChange={handleInputChange} placeholder="Hours" />
            <Input name="description" value={formData.description} onChange={handleInputChange} placeholder="Description" />
            <select
              value={selectedManager || ""}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#5B3CC4] focus:border-transparent transition-all duration-200"
            >
              <option value="" className="bg-white">{user?.role === "MANAGER" ? "Select Admin" : "Select Manager"}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id} className="bg-white">
                  {m.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={isSubmitting} className="md:col-span-7 w-full">
              <Plus className="w-4 h-4" /> {isSubmitting ? "Adding..." : "Add Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="p-3 text-left text-[#64748B] font-medium">Client</th>
                <th className="p-3 text-left text-[#64748B] font-medium">Date</th>
                <th className="p-3 text-left text-[#64748B] font-medium">Project</th>
                <th className="p-3 text-left text-[#64748B] font-medium">Task</th>
                <th className="p-3 text-left text-[#64748B] font-medium">Description</th>
                <th className="p-3 text-left text-[#64748B] font-medium">Hour</th>
                <th className="p-3 text-left text-[#64748B] font-medium">{user?.role === "MANAGER" ? "Report Status" : "Employee Status"}</th>
                <th className="p-3 text-left text-[#64748B] font-medium">Reported To</th>
                <th className="p-3 text-left text-[#64748B] font-medium">{user?.role === "MANAGER" ? "Admin Action" : "Manager Action"}</th>
                <th className="p-3 text-left text-[#64748B] font-medium">{user?.role === "MANAGER" ? "Admin Comment" : "Manager Comment"}</th>
                <th className="p-3 text-left text-[#64748B] font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                return (
                  <tr key={entry.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                    <td className="p-3 text-[#1E293B]">{entry.client || "-"}</td>
                    <td className="p-3 text-[#64748B]">
                      {format(new Date(entry.entryDate), "MMM dd, yyyy")}
                    </td>

                    <td className="p-3 text-[#1E293B]">
                      {editingId === entry.id ? (
                        <Input
                          value={editData.project}
                          onChange={(e) =>
                            setEditData({ ...editData, project: e.target.value })
                          }
                        />
                      ) : (
                        entry.project
                      )}
                    </td>

                    <td className="p-3 text-[#1E293B]">{entry.task}</td>

                    <td className="p-3 text-[#64748B]">
                      {editingId === entry.id ? (
                        <Input
                          value={editData.description}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              description: e.target.value,
                            })
                          }
                        />
                      ) : (
                        entry.description
                      )}
                    </td>

                    <td className="p-3 text-[#1E293B] font-medium">{entry.hours} h</td>

                    <td className="p-3">
                      <Badge variant={getStatusBadgeVariant(getEmployeeStatus(entry.status))}>
                        {getEmployeeStatus(entry.status)}
                      </Badge>
                    </td>

                    <td className="p-3 text-[#64748B]">
                      {entry.Manager?.name || "-"}
                    </td>

                    <td className="p-3">
                      {entry.status === "APPROVED" && (
                        <Badge variant="success">Approved</Badge>
                      )}
                      {entry.status === "REJECTED" && (
                        <Badge variant="danger">Rejected</Badge>
                      )}
                      {(entry.status === "DRAFT" ||
                        entry.status === "SUBMITTED") && "-"}
                    </td>

                    <td className="p-3 text-[#64748B] max-w-[200px]">
                      {entry.managerComment || "-"}
                    </td>

                    <td className="p-3">
                      {entry.status === "DRAFT" && (
                        <div className="flex items-center gap-2">
                          {editingId === entry.id ? (
                            <>
                              <Button size="sm" onClick={() => handleSave(entry.id)} className="hover:scale-105">
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="hover:scale-105">
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)} className="hover:scale-105">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSubmitEntry(entry.id)}
                                className="hover:scale-105"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDelete(entry.id)}
                                className="hover:scale-105"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-[#64748B]">
                    No time entries found. Start by adding your first entry above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};