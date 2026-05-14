import React, { useState, useEffect } from "react";
import { fetchTasks, createTask, updateTask, deleteTask, fetchProjects } from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    projectId: "",
    isBillableDefault: true,
    status: "PENDING",
  });

  const loadData = async () => {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetchTasks(),
        fetchProjects(),
      ]);
      setTasks(tasksRes?.data || []);
      setProjects(projectsRes?.data || []);
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
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        projectId: formData.projectId ? Number(formData.projectId) : null,
        isBillableDefault: formData.isBillableDefault === "true" || formData.isBillableDefault === true,
      };
      if (editingId) {
        await updateTask(editingId, payload);
      } else {
        await createTask(payload);
      }
      setFormData({ title: "", description: "", category: "", projectId: "", isBillableDefault: true, status: "PENDING" });
      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch (error) {
      alert("Operation failed");
    }
  };

  const handleEdit = (task) => {
    setFormData({
      title: task.title,
      description: task.description || "",
      category: task.category || "",
      projectId: task.projectId || "",
      isBillableDefault: task.isBillableDefault,
      status: task.status,
    });
    setEditingId(task.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteTask(id);
      await loadData();
    } catch (error) {
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-gray-500">Manage tasks and categories</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ title: "", description: "", category: "", projectId: "", isBillableDefault: true, status: "PENDING" }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Task" : "Create Task"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input name="title" value={formData.title} onChange={handleInputChange} placeholder="Task Title" required />
              <select name="projectId" value={formData.projectId} onChange={handleInputChange} className="border p-2 rounded">
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Input name="category" value={formData.category} onChange={handleInputChange} placeholder="Category" />
              <select name="isBillableDefault" value={formData.isBillableDefault} onChange={handleInputChange} className="border p-2 rounded">
                <option value="true">Billable</option>
                <option value="false">Non-Billable</option>
              </select>
              <select name="status" value={formData.status} onChange={handleInputChange} className="border p-2 rounded">
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
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
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Billable</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8">No tasks found</td></tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{task.title}</td>
                    <td className="px-4 py-3">{task.Project?.name || "-"}</td>
                    <td className="px-4 py-3">{task.category || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={task.isBillableDefault ? "success" : "warning"}>
                        {task.isBillableDefault ? "Billable" : "Non-Billable"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "IN_PROGRESS" ? "primary" : "default"}>
                        {task.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(task)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(task.id)}><Trash2 className="w-4 h-4" /></Button>
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
