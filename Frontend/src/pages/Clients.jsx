import React, { useState, useEffect } from "react";
import { fetchClients, createClient, updateClient, deleteClient } from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Clients = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    status: "ACTIVE",
  });
  const [formErrors, setFormErrors] = useState({});

  const loadClients = async () => {
    try {
      const response = await fetchClients();
      setClients(response?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      const sanitized = value.replace(/[^A-Za-z\s]/g, "");
      setFormData((prev) => ({ ...prev, name: sanitized }));
      setFormErrors((prev) => ({
        ...prev,
        name: sanitized.length !== value.length ? "Only alphabetic characters (A-Z) and spaces are allowed." : "",
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormErrors((prev) => ({ ...prev, name: "Client name is required." }));
      return;
    }
    try {
      if (editingId) {
        await updateClient(editingId, formData);
      } else {
        await createClient(formData);
      }
      setFormData({ name: "", status: "ACTIVE" });
      setFormErrors({});
      setShowForm(false);
      setEditingId(null);
      await loadClients();
    } catch (error) {
      const message = error.response?.data?.message || "Operation failed";
      setFormErrors((prev) => ({ ...prev, name: message }));
    }
  };

  const handleEdit = (client) => {
    setFormData({
      name: client.name,
      status: client.status,
    });
    setFormErrors({});
    setEditingId(client.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    try {
      await deleteClient(id);
      await loadClients();
    } catch (error) {
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#1E293B] leading-tight">Client Management</h1>
          <p className="text-base text-[#64748B]">Manage clients and billing types</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: "", status: "ACTIVE" }); setFormErrors({}); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Client" : "Create Client"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Client Name" maxLength={100} required />
                 {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
               </div>
               <select name="status" value={formData.status} onChange={handleInputChange} className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200">
                 <option value="ACTIVE" className="bg-white">Active</option>
                 <option value="INACTIVE" className="bg-white">Inactive</option>
               </select>
                <div className="flex gap-2 md:col-span-2">
                <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setFormErrors({}); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">Client Name</th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">Status</th>
                <th className="px-4 py-3 text-left text-[#64748B] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="3" className="text-center py-8 text-[#64748B]">Loading...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-8 text-[#64748B]">No clients found</td></tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                    <td className="px-4 py-3 font-medium text-[#1E293B]">{client.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={client.status === "ACTIVE" ? "success" : "danger"}>{client.status}</Badge>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(client)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(client.id)}><Trash2 className="w-4 h-4" /></Button>
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
