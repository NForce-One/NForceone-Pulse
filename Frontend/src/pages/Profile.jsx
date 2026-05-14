import React, { useState, useEffect } from "react";
import { getMe, updateProfile, changePassword } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { User, Key, Save, Loader2 } from "lucide-react";

export const Profile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", department: "", defaultHours: 8 });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await getMe();
      const data = response?.data;
      setProfile(data);
      setProfileForm({
        name: data.name || "",
        department: data.department || "",
        defaultHours: data.defaultHours || 8,
      });
    } catch (error) {
      console.error(error);
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileForm.name.trim()) errors.name = "Name is required";
    if (!profileForm.department.trim()) errors.department = "Department is required";
    if (!profileForm.defaultHours || profileForm.defaultHours <= 0) {
      errors.defaultHours = "Hours must be greater than 0";
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordForm.currentPassword) errors.currentPassword = "Current password is required";
    if (!passwordForm.newPassword) errors.newPassword = "New password is required";
    if (!passwordForm.confirmPassword) errors.confirmPassword = "Please confirm your new password";
    if (passwordForm.newPassword && passwordForm.newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters";
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setProfileErrors({});

    if (!validateProfile()) return;

    setIsSaving(true);
    try {
      await updateProfile({
        name: profileForm.name,
        department: profileForm.department,
        defaultHours: Number(profileForm.defaultHours),
      });
      setMessage("Profile updated successfully");
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setPasswordErrors({});

    if (!validatePassword()) return;

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessage("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-[#ff2d2d]" />
          Profile
        </h1>
        <p className="text-[#a1a1aa]">Manage your account settings</p>
      </div>

      {message && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg backdrop-blur-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="w-5 h-5 text-[#ff2d2d]" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-[#a1a1aa]">Name *</label>
                <Input
                  name="name"
                  value={profileForm.name}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, name: e.target.value });
                    if (profileErrors.name) setProfileErrors({ ...profileErrors, name: "" });
                  }}
                  required
                />
                {profileErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{profileErrors.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-[#a1a1aa]">Email</label>
                <Input value={profile?.email || ""} disabled className="bg-[#0f0f0f] cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm text-[#a1a1aa]">Role</label>
                <Input value={profile?.role || ""} disabled className="bg-[#0f0f0f] cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm text-[#a1a1aa]">Department *</label>
                <Input
                  name="department"
                  value={profileForm.department}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, department: e.target.value });
                    if (profileErrors.department) setProfileErrors({ ...profileErrors, department: "" });
                  }}
                />
                {profileErrors.department && (
                  <p className="text-red-400 text-xs mt-1">{profileErrors.department}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-[#a1a1aa]">Default Hours *</label>
                <Input
                  type="number"
                  name="defaultHours"
                  value={profileForm.defaultHours}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, defaultHours: e.target.value });
                    if (profileErrors.defaultHours) setProfileErrors({ ...profileErrors, defaultHours: "" });
                  }}
                  min="1"
                  step="0.5"
                />
                {profileErrors.defaultHours && (
                  <p className="text-red-400 text-xs mt-1">{profileErrors.defaultHours}</p>
                )}
              </div>
              <Button type="submit" disabled={isSaving} className="hover:scale-105 active:scale-95">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Key className="w-5 h-5 text-[#ff2d2d]" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-[#a1a1aa]">Current Password *</label>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                    if (passwordErrors.currentPassword) setPasswordErrors({ ...passwordErrors, currentPassword: "" });
                  }}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-red-400 text-xs mt-1">{passwordErrors.currentPassword}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-[#a1a1aa]">New Password * (min 6 chars)</label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                    if (passwordErrors.newPassword) setPasswordErrors({ ...passwordErrors, newPassword: "" });
                  }}
                />
                {passwordErrors.newPassword && (
                  <p className="text-red-400 text-xs mt-1">{passwordErrors.newPassword}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-[#a1a1aa]">Confirm New Password *</label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                    if (passwordErrors.confirmPassword) setPasswordErrors({ ...passwordErrors, confirmPassword: "" });
                  }}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                )}
              </div>
              <Button type="submit" disabled={isChangingPassword} className="hover:scale-105 active:scale-95">
                {isChangingPassword ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
