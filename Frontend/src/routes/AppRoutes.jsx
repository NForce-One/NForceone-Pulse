import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Layout
import { DashboardLayout } from "../components/layout/DashboardLayout";

// Pages
import { Login } from "../pages/Login";
import Register from "../pages/Register";
import { ForgotPassword } from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import { Dashboard } from "../pages/Dashboard";
import { MyTimesheet } from "../pages/MyTimesheet";
import { TimerPage } from "../pages/Timer";
import { Approvals } from "../pages/Approvals";
import { Reports } from "../pages/Reports";
import { Notifications } from "../pages/Notifications";
import { Profile } from "../pages/Profile";
import { Users } from "../pages/Users";
import { Clients } from "../pages/Clients";
import { Projects } from "../pages/Projects";
import { Tasks } from "../pages/Tasks";
import { TeamTimesheets } from "../pages/TeamTimesheets";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  const { token } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
        <Route path="/forgot-password" element={token ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* ADMIN REGISTER */}
        <Route
          path="/register"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Register />
            </ProtectedRoute>
          }
        />

        {/* PROTECTED ROUTES */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="timesheet" element={<ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER"]}><MyTimesheet /></ProtectedRoute>} />
          <Route path="my-timesheet" element={<ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER"]}><MyTimesheet /></ProtectedRoute>} />
          <Route path="timer" element={<ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER"]}><TimerPage /></ProtectedRoute>} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="approvals"
            element={
              <ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]}>
                <Approvals />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/clients"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/projects"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/tasks"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="manager/team-timesheets"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <TeamTimesheets />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
