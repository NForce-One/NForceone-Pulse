import React, { useState, useEffect } from "react";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getNextEmployeeId,
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
  const [nextEmployeeId, setNextEmployeeId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    department: "",
    employeeId: "",
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
      const payload = { ...formData };
      if (editingId) {
        const { employeeId, ...updatePayload } = payload;
        await updateUser(editingId, updatePayload);
      } else {
        await createUser(payload);
      }
      setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", department: "", employeeId: "" });
      setShowForm(false);
      setEditingId(null);
      setNextEmployeeId(null);
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
      employeeId: user.employeeId || "",
    });
    setNextEmployeeId(null);
    setEditingId(user.id);
    setShowForm(true);
  };

  const openCreateForm = async () => {
    setEditingId(null);
    setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", department: "", employeeId: "" });
    try {
      const res = await getNextEmployeeId();
      const empId = res?.data?.employeeId;
      setNextEmployeeId(empId);
      setFormData((prev) => ({ ...prev, employeeId: empId }));
    } catch {
      setNextEmployeeId(null);
    }
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
           <h1 className="text-2xl font-bold text-[#1E293B]">User Management</h1>
           <p className="text-[#64748B]">Manage system users and roles</p>
         </div>
        <Button onClick={openCreateForm}>
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
                 className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#5B3CC4] transition-all duration-200" />
               <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Email" required
                 className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#5B3CC4] transition-all duration-200" />
               <Input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder={editingId ? "Leave blank" : "Password"}
                 className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#5B3CC4] transition-all duration-200" />
               <select name="role" value={formData.role} onChange={handleInputChange}
                 className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#5B3CC4] transition-all duration-200">
                 <option value="EMPLOYEE" className="bg-white">Employee</option>
                 <option value="MANAGER" className="bg-white">Manager</option>
                 <option value="ADMIN" className="bg-white">Admin</option>
               </select>
               <Input name="department" value={formData.department} onChange={handleInputChange} placeholder="Department"
                 className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#5B3CC4] transition-all duration-200" />
               <div className="flex flex-col">
                 <span className="text-xs text-[#64748B] mb-1">Employee ID</span>
                 <div className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#64748B] flex items-center">
                   {formData.employeeId || (editingId ? "Assigned" : "Generating...")}
                 </div>
               </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setNextEmployeeId(null); }}>Cancel</Button>
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
                 <th className="px-4 py-3 text-left text-[#64748B] font-medium">Name</th>
                 <th className="px-4 py-3 text-left text-[#64748B] font-medium">Email</th>
                 <th className="px-4 py-3 text-left text-[#64748B] font-medium">Role</th>
                 <th className="px-4 py-3 text-left text-[#64748B] font-medium">Department</th>
                 <th className="px-4 py-3 text-left text-[#64748B] font-medium">Manager</th>
                 <th className="px-4 py-3 text-left text-[#64748B] font-medium">Status</th>
                 <th className="px-4 py-3 text-left text-[#64748B] font-medium">Actions</th>
               </tr>
             </thead>
             <tbody>
               {isLoading ? (
                 <tr><td colSpan="7" className="text-center py-8 text-[#64748B]">Loading...</td></tr>
               ) : users.length === 0 ? (
                 <tr><td colSpan="7" className="text-center py-8 text-[#64748B]">No users found</td></tr>
               ) : (
                 users.map((user) => (
                   <tr key={user.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                     <td className="px-4 py-3 text-[#1E293B] font-medium">{user.name}</td>
                     <td className="px-4 py-3 text-[#64748B]">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "ADMIN" ? "danger" : user.role === "MANAGER" ? "warning" : "default"}>
                        {user.role}
                      </Badge>
                    </td>
<td className="px-4 py-3 text-[#64748B]">{user.department || "-"}</td>
                     <td className="px-4 py-3 text-[#64748B]">{user.Manager?.name || "-"}</td>
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
