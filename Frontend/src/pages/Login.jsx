import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, Mail, Lock, ShieldAlert } from "lucide-react";

import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await loginUser({ email, password });
      const user = response?.user;
      const token = response?.token;
      if (!user || !token) { setError("Invalid response from server"); return; }
      login(token, user);
      switch (user.role) {
        case "ADMIN": navigate("/"); break;
        case "MANAGER": navigate("/approvals"); break;
        default: navigate("/timesheet");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to log in. Please check your credentials.");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-['Inter',sans-serif]">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#0F172A] to-[#111827] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #6366F1 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 text-center px-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-2xl shadow-[#6366F1]/30 mb-6">
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-white" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-3">NForce Pulse</h1>
          <p className="text-[#94A3B8] text-lg font-light max-w-md mx-auto leading-relaxed">
            Enterprise time tracking and workforce management platform.
          </p>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-[#64748B]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
              Time Tracking
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              Team Analytics
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              Reporting
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          {/* Logo (mobile) */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-lg shadow-[#6366F1]/25">
              <div className="relative">
                <div className="w-3.5 h-3.5 rounded-full bg-white" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold text-[#111827] tracking-tight">NForce Pulse</span>
              <span className="block text-[10px] font-medium text-[#94A3B8] tracking-wide">Enterprise Suite</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Welcome back</h2>
            <p className="text-sm text-[#6B7280] mt-1.5">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 font-medium">
                <ShieldAlert size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#D1D5DB] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-lg border border-[#D1D5DB] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#6366F1] focus:ring-[#6366F1] accent-[#6366F1]"
                />
                <span className="text-sm text-[#6B7280]">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-[#6366F1] text-white text-sm font-semibold hover:bg-[#4F46E5] active:scale-[0.98] transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={16} /><span>LOGIN</span></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
