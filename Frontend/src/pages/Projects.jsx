import React, { useState, useEffect } from "react";
import { fetchProjects, createProject, updateProject, deleteProject, fetchClients } from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: "",
    status: "ACTIVE",
  });
  const [clientError, setClientError] = useState("");

  const loadData = async () => {
    try {
      const [projectsRes, clientsRes] = await Promise.all([
        fetchProjects(),
        fetchClients({ status: "ACTIVE" }),
      ]);
      setProjects(projectsRes?.data || []);
      setClients(clientsRes?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "clientId") {
      setClientError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingId) {
      const selectedClient = clients.find(
        (c) => String(c.id) === String(formData.clientId)
      );
      if (selectedClient && selectedClient.status === "INACTIVE") {
        setClientError(
          "The selected client is inactive. You cannot proceed with creating a project for this client."
        );
        return;
      }
    }
    setClientError("");

    try {
      const payload = {
        ...formData,
        clientId: formData.clientId ? Number(formData.clientId) : null,
      };
      if (editingId) {
        await updateProject(editingId, payload);
      } else {
        await createProject(payload);
      }
      setFormData({ name: "", description: "", clientId: "", status: "ACTIVE" });
      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch (error) {
      const message = error.response?.data?.message || "Operation failed";
      if (message.toLowerCase().includes("inactive")) {
        setClientError(message);
      } else {
        alert(message);
      }
    }
  };

  const handleEdit = (project) => {
    setFormData({
      name: project.name,
      description: project.description || "",
      clientId: project.clientId || "",
      status: project.status,
    });
    setEditingId(project.id);
    setClientError("");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await deleteProject(id);
      await loadData();
    } catch (error) {
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#1E293B] leading-tight">Project Management</h1>
          <p className="text-base text-[#64748B]">Manage projects and budgets</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: "", description: "", clientId: "", status: "ACTIVE" }); setClientError(""); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Project" : "Create Project"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Project Name" required />
              <div>
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleInputChange}
                  className={`h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 transition-all duration-200 ${
                    clientError
                      ? "border-red-400 focus:ring-red-200"
                      : "border-[#E2E8F0] focus:ring-[#B33A2F]"
                  }`}
                >
                  <option value="" className="bg-white">Select Client</option>
                  {clients.map((c) => <option key={c.id} value={c.id} className="bg-white">{c.name}</option>)}
                </select>
                {clientError && (
                  <p className="mt-1.5 text-xs text-red-600">{clientError}</p>
                )}
              </div>
              <select name="status" value={formData.status} onChange={handleInputChange} className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200">
                <option value="ACTIVE" className="bg-white">Active</option>
                <option value="INACTIVE" className="bg-white">Inactive</option>
                <option value="COMPLETED" className="bg-white">Completed</option>
              </select>
              <div className="md:col-span-3">
                <Input name="description" value={formData.description} onChange={handleInputChange} placeholder="Description" />
              </div>
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setClientError(""); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto p-6">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle">Client</th>
                    <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle">Project</th>
                    <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle">Description</th>
                    <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle">Status</th>
                    <th className="px-4 py-3.5 text-right text-[#64748B] font-medium align-middle">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="5" className="text-center py-8 text-[#64748B]">Loading...</td></tr>
                  ) : projects.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-8 text-[#64748B]">No projects found</td></tr>
                  ) : (
                    projects.map((project) => (
                      <tr key={project.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                        <td className="px-4 py-3.5 font-medium text-[#1E293B] align-middle">{project.Client?.name || "-"}</td>
                        <td className="px-4 py-3.5 text-[#64748B] align-middle">{project.name}</td>
                        <td className="px-4 py-3.5 text-[#64748B] align-middle max-w-xs truncate">{project.description || "-"}</td>
                        <td className="px-4 py-3.5 text-left align-middle">
                          <Badge variant={project.status === "ACTIVE" ? "success" : project.status === "COMPLETED" ? "primary" : "danger"}>
                            {project.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right align-middle space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(project)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(project.id)}><Trash2 className="w-4 h-4" /></Button>
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
