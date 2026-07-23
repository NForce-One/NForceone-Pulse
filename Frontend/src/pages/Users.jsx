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
import { Plus, Pencil, Trash2, UserPlus, Power, Eye, EyeOff } from "lucide-react";

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nextEmployeeId, setNextEmployeeId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [nameError, setNameError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
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
    if (name === "name") {
      if (value.length > 26) {
        setNameError("Name cannot exceed 26 characters.");
        return;
      }
      const hasInvalid = /[^A-Za-z ]/.test(value);
      const filtered = value.replace(/[^A-Za-z ]/g, "");
      setFormData((prev) => ({ ...prev, name: filtered }));
      if (hasInvalid) {
        setNameError("Only alphabetic characters (A-Z) and spaces are allowed.");
      } else if (filtered.trim() === "" && filtered.length > 0) {
        setNameError("Name is required");
      } else {
        setNameError("");
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || /[^A-Za-z ]/.test(formData.name) || formData.name.length > 26) {
      setNameError("Only alphabetic characters (A-Z) and spaces are allowed.");
      return;
    }
    try {
      const payload = { ...formData };
      if (editingId) {
        // name is immutable after creation; the backend rejects changes to it
        const { employeeId, name, ...updatePayload } = payload;
        await updateUser(editingId, updatePayload);
      } else {
        await createUser(payload);
      }
      setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", employeeId: "" });
      setShowForm(false);
      setEditingId(null);
      setNextEmployeeId(null);
      setShowPassword(false);
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
      employeeId: user.employeeId || "",
    });
    setNextEmployeeId(null);
    setEditingId(user.id);
    setShowPassword(false);
    setShowForm(true);
  };

  const openCreateForm = async () => {
    setEditingId(null);
    setShowPassword(false);
    setFormData({ name: "", email: "", password: "", role: "EMPLOYEE", employeeId: "" });
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
           <h1 className="text-[32px] font-bold text-[#1E293B] leading-tight">User Management</h1>
           <p className="text-base text-[#64748B]">Manage system users and roles</p>
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
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div>
                 <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" required maxLength={26}
                   className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200" />
                 {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
               </div>
               <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Email" required
                 className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200" />
               <div className="relative">
                  <Input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} placeholder="Password"
                    className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-[#64748B] hover:text-[#1E293B] transition-colors duration-200">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
               <select name="role" value={formData.role} onChange={handleInputChange}
                 className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#B33A2F] transition-all duration-200">
                 <option value="EMPLOYEE" className="bg-white">Employee</option>
                 <option value="MANAGER" className="bg-white">Manager</option>
                 <option value="ADMIN" className="bg-white">Admin</option>
               </select>
               <div className="relative group">
                   <input
                     name="employeeId"
                     value={editingId ? `Employee ID: ${formData.employeeId}` : formData.employeeId ? `Employee ID: ${formData.employeeId}` : "Generating..."}
                     readOnly
                     title="Employee ID is generated automatically."
                     className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-gray-50 px-3 py-2 text-sm text-[#1E293B] cursor-not-allowed"
                   />
                   <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                     Employee ID is generated automatically.
                   </div>
                 </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setNextEmployeeId(null); setShowPassword(false); }}>Cancel</Button>
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
                   <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle whitespace-nowrap">Employee ID</th>
                   <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle">Name</th>
                   <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle">Email</th>
                   <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle">Role</th>
                   <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle">Status</th>
                   <th className="px-4 py-3.5 text-left text-[#64748B] font-medium align-middle w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                   <tr><td colSpan="6" className="text-center py-8 text-[#64748B]">Loading...</td></tr>
                 ) : users.length === 0 ? (
                   <tr><td colSpan="6" className="text-center py-8 text-[#64748B]">No users found</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors duration-150">
                       <td className="px-4 py-3.5 text-[#1E293B] font-medium align-middle whitespace-nowrap">{user.employeeId ?? ""}</td>
                       <td className="px-4 py-3.5 text-[#1E293B] font-medium align-middle">{user.name}</td>
                       <td className="px-4 py-3.5 text-[#64748B] align-middle">{user.email}</td>
                      <td className="px-4 py-3.5 align-middle">
                        <Badge variant={user.role === "ADMIN" ? "danger" : user.role === "MANAGER" ? "warning" : "default"}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <Badge variant={user.isActive ? "success" : "danger"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 align-middle flex items-center gap-2 whitespace-nowrap">
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
