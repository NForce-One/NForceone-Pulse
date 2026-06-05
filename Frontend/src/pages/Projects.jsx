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
    code: "",
    description: "",
    clientId: "",
    startDate: "",
    endDate: "",
    budgetHours: "",
    budgetAmount: "",
    status: "ACTIVE",
  });

  const loadData = async () => {
    try {
      const [projectsRes, clientsRes] = await Promise.all([
        fetchProjects(),
        fetchClients(),
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        clientId: formData.clientId ? Number(formData.clientId) : null,
        budgetHours: formData.budgetHours ? Number(formData.budgetHours) : null,
        budgetAmount: formData.budgetAmount ? Number(formData.budgetAmount) : null,
      };
      if (editingId) {
        await updateProject(editingId, payload);
      } else {
        await createProject(payload);
      }
      setFormData({ name: "", code: "", description: "", clientId: "", startDate: "", endDate: "", budgetHours: "", budgetAmount: "", status: "ACTIVE" });
      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch (error) {
      alert("Operation failed");
    }
  };

  const handleEdit = (project) => {
    setFormData({
      name: project.name,
      code: project.code || "",
      description: project.description || "",
      clientId: project.clientId || "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      budgetHours: project.budgetHours || "",
      budgetAmount: project.budgetAmount || "",
      status: project.status,
    });
    setEditingId(project.id);
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
        <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: "", code: "", description: "", clientId: "", startDate: "", endDate: "", budgetHours: "", budgetAmount: "", status: "ACTIVE" }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Project" : "Create Project"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Project Name" required />
              <Input name="code" value={formData.code} onChange={handleInputChange} placeholder="Project Code" />
              <select name="clientId" value={formData.clientId} onChange={handleInputChange} className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200">
                <option value="" className="bg-white">Select Client</option>
                {clients.map((c) => <option key={c.id} value={c.id} className="bg-white">{c.name}</option>)}
              </select>

              <Input name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} className="bg-white border border-[#E2E8F0] text-[#1E293B] focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200" />
              <Input name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} className="bg-white border border-[#E2E8F0] text-[#1E293B] focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200" />
              <Input name="budgetHours" type="number" value={formData.budgetHours} onChange={handleInputChange} placeholder="Budget Hours" />
              <Input name="budgetAmount" type="number" value={formData.budgetAmount} onChange={handleInputChange} placeholder="Budget Amount" />
              <select name="status" value={formData.status} onChange={handleInputChange} className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200">
                <option value="ACTIVE" className="bg-white">Active</option>
                <option value="INACTIVE" className="bg-white">Inactive</option>
                <option value="COMPLETED" className="bg-white">Completed</option>
              </select>
              <div className="md:col-span-3">
                <Input name="description" value={formData.description} onChange={handleInputChange} placeholder="Description" />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Client</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Project</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Code</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Assigned Manager</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Budget Hours</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Budget Amount</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-[#64748B] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="8" className="text-center py-8 text-[#64748B]">Loading...</td></tr>
                  ) : projects.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-8 text-[#64748B]">No projects found</td></tr>
                  ) : (
                    projects.map((project) => (
                      <tr key={project.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                        <td className="px-4 py-3 font-medium text-[#1E293B]">{project.Client?.name || "-"}</td>
                        <td className="px-4 py-3 text-[#64748B]">{project.name}</td>
                        <td className="px-4 py-3 text-[#64748B]">{project.code || "-"}</td>
                        <td className="px-4 py-3 text-[#64748B]">{project.Manager?.name || "-"}</td>
                        <td className="px-4 py-3 text-[#64748B]">{project.budgetHours || "-"}</td>
                        <td className="px-4 py-3 text-[#64748B]">
                          {project.budgetAmount != null ? `$${Number(project.budgetAmount).toLocaleString()}` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={project.status === "ACTIVE" ? "success" : project.status === "COMPLETED" ? "primary" : "danger"}>
                            {project.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 space-x-2">
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
