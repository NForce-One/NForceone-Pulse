import React, { useState, useEffect } from "react";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getManagers,
} from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Plus, Pencil, Trash2, UserPlus, Power } from "lucide-react";

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: "",
    managerId: "",
    defaultHours: 8,
  });

  const loadData = async () => {
    try {
      const [usersRes, managersRes] = await Promise.all([
        fetchUsers(),
        getManagers(),
      ]);
      setUsers(usersRes?.data || []);
      setManagers(managersRes?.data || []);
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
      const payload = { ...formData, managerId: formData.managerId ? Number(formData.managerId) : null };
      if (editingId) {
        await updateUser(editingId, payload);
      } else {
        await createUser(payload);
      }
      setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", department: "", managerId: "", defaultHours: 8 });
      setShowForm(false);
      setEditingId(null);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Operation failed");
    }
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      department: user.department || "",
      managerId: user.managerId || "",
      defaultHours: user.defaultHours || 8,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await deleteUser(id);
      await loadData();
    } catch (error) {
      alert("Delete failed");
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleUserStatus(id);
      await loadData();
    } catch (error) {
      alert("Status update failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-[#a1a1aa]">Manage system users and roles</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", department: "", managerId: "", defaultHours: 8 }); }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit User" : "Create User"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" required
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-[#a1a1aa] focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200" />
              <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Email" required
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-[#a1a1aa] focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200" />
              <Input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={editingId ? "Leave blank" : "Password"}
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-[#a1a1aa] focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200" />
              <select name="role" value={formData.role} onChange={handleInputChange}
                className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200">
                <option value="EMPLOYEE" className="bg-[#1a1a1a] text-white">Employee</option>
                <option value="MANAGER" className="bg-[#1a1a1a] text-white">Manager</option>
                <option value="ADMIN" className="bg-[#1a1a1a] text-white">Admin</option>
              </select>
              <Input name="department" value={formData.department} onChange={handleInputChange} placeholder="Department"
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-[#a1a1aa] focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200" />
              <Input name="defaultHours" type="number" value={formData.defaultHours} onChange={handleInputChange} placeholder="Default Hours"
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-[#a1a1aa] focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200" />
              <select name="managerId" value={formData.managerId} onChange={handleInputChange}
                className="h-10 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff2d2d] transition-all duration-200">
                <option value="" className="bg-[#1a1a1a] text-white">Select Manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#1a1a1a] text-white">{m.name}</option>
                ))}
              </select>
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
            <thead className="bg-[#0f0f0f] border-b border-[#2a2a2a]">
              <tr>
                <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Name</th>
                <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Email</th>
                <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Role</th>
                <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Department</th>
                <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Manager</th>
                <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Status</th>
                <th className="px-4 py-3 text-left text-[#a1a1aa] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="text-center py-8 text-[#a1a1aa]">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-[#a1a1aa]">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50 transition-colors duration-150">
                    <td className="px-4 py-3 text-white font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-[#a1a1aa]">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "ADMIN" ? "danger" : user.role === "MANAGER" ? "warning" : "default"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[#a1a1aa]">{user.department || "-"}</td>
                    <td className="px-4 py-3 text-[#a1a1aa]">{user.Manager?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? "success" : "danger"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggleStatus(user.id)}>
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
