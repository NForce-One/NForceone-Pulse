import React, { useState, useEffect } from "react";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Plus, Pencil, Trash2, UserPlus, Power } from "lucide-react";

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: "",
  });

  const loadData = async () => {
    try {
      const usersRes = await fetchUsers();
      setUsers(usersRes?.data || []);
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
      if (editingId) {
        await updateUser(editingId, formData);
      } else {
        await createUser(formData);
      }
      setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", department: "" });
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
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-500">Manage system users and roles</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", department: "" }); }}>
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
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" required />
              <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Email" required />
              <Input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={editingId ? "Leave blank to keep current" : "Password"} />
              <select name="role" value={formData.role} onChange={handleInputChange} className="flex h-10 w-full rounded-lg border border-[#2a2a2a] bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ff2d2d] focus:border-transparent transition-all duration-200">
                <option value="EMPLOYEE" className="bg-white text-gray-900">Employee</option>
                <option value="MANAGER" className="bg-white text-gray-900">Manager</option>
                <option value="ADMIN" className="bg-white text-gray-900">Admin</option>
              </select>
              <Input name="department" value={formData.department} onChange={handleInputChange} placeholder="Department" />
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
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Role</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Department</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Manager</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-gray-700 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="text-center py-8">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "ADMIN" ? "danger" : user.role === "MANAGER" ? "warning" : "default"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{user.department || "-"}</td>
                    <td className="px-4 py-3">{user.Manager?.name || "-"}</td>
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
