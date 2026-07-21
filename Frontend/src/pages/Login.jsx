import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Mail, Lock, Eye, EyeOff, LogIn, BarChart3, FileText } from "lucide-react";

import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

import logo from "../assets/logo.png";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const EMAIL_CHAR_REGEX = /^[a-zA-Z0-9._%+-@]*$/;
  const EMAIL_FORMAT_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  useEffect(() => {
    document.documentElement.classList.remove("dark-theme");
    return () => {
      const mode = localStorage.getItem("displayMode") || "auto";
      if (mode === "dark") {
        document.documentElement.classList.add("dark-theme");
      } else if (!mode || mode === "auto") {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.documentElement.classList.add("dark-theme");
        }
      }
    };
  }, []);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    if (value && !EMAIL_CHAR_REGEX.test(value)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmail(value);
    if (emailError) setEmailError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setEmailError("");

    if (!email || !EMAIL_FORMAT_REGEX.test(email)) {
      setEmailError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await loginUser({ email, password });

      const user = response?.user;
      const token = response?.token;

      if (!user || !token) {
        setError("Invalid response from server");
        return;
      }

      login(token, user);

      switch (user.role) {
        case "ADMIN":
          navigate("/");
          break;
        case "MANAGER":
          navigate("/approvals");
          break;
        default:
          navigate("/timesheet");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to log in. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-['Inter']">
      {/* LEFT BRANDING PANEL */}
      <div className="hidden lg:flex w-1/2 items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #000000 0%, #080808 50%, #111111 100%)",
        }}
      >
        <div className="flex flex-col items-center text-center px-12 max-w-lg">
          <img src={logo} alt="NForce Pulse" className="w-20 h-20 mb-8 object-contain" />

          <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
            NForce Pulse
          </h1>

          <p className="text-gray-400 text-base leading-relaxed mb-12">
            Enterprise time tracking and workforce management platform.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-4 text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(220,38,38,0.15)" }}
              >
                <Clock size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Time Tracking</p>
                <p className="text-gray-500 text-xs">Track work hours with precision</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(220,38,38,0.15)" }}
              >
                <BarChart3 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Team Analytics</p>
                <p className="text-gray-500 text-xs">Data-driven workforce insights</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(220,38,38,0.15)" }}
              >
                <FileText size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Reporting</p>
                <p className="text-gray-500 text-xs">Comprehensive exportable reports</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6"
        style={{ background: "#f8f9fb" }}
      >
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="NForce Pulse" className="w-14 h-14 mb-4 object-contain" />
            <h1 className="text-[32px] font-bold text-gray-900 leading-tight">NForce Pulse</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl p-8 md:p-10"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)",
            }}
          >
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 leading-tight">Welcome Back</h2>
              <p className="text-gray-500 text-sm mt-1.5">
                Sign in to your account to continue
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
                <div className="w-1 h-8 rounded-full bg-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    className={`w-full h-11 pl-10 pr-4 rounded-xl border bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 outline-none ${
                      emailError ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="text-red-400 text-xs mt-1">{emailError}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex items-center justify-end">
                <span
                  className="text-sm text-red-600 cursor-pointer font-medium"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot Password?
                </span>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed border-0"
                style={{
                  background: "linear-gradient(135deg, #ff3b3b, #c40000)",
                }}
              >
                {isLoading ? "Signing in..." : <><LogIn size={18} /><span>Login</span></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
