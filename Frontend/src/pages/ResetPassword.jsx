import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/api";
import { Lock, Eye, EyeOff } from "lucide-react";

import logo from "../assets/logo.png";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;
  const passwordRequirementsHint =
    "At least 6 characters, with 1 uppercase letter and 1 special character (!@#$%^&*)";

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!passwordRegex.test(password)) {
      setError(
        `Password does not meet requirements: ${passwordRequirementsHint}`
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ token, password });

      setMessage("Password updated successfully");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      setError(
        err.response?.data?.message || "Reset failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Subtle background patterns */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(179,58,47,0.035) 0%, transparent 50%),
            radial-gradient(circle at 85% 75%, rgba(179,58,47,0.025) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, #E2E8F0 0.5px, transparent 0.5px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 24px 24px",
        }}
      />

      {/* Subtle diagonal pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.012]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #1E293B 0px, #1E293B 1px, transparent 1px, transparent 32px)`,
        }}
      />

      <div className="relative w-full max-w-[680px] z-10">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden">
              <img src={logo} alt="NForce Pulse" className="w-full h-full object-cover" />
            </div>
            <span className="text-[26px] font-bold text-[#1E293B] tracking-tight">NForce Pulse</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-10 md:p-12">
          {/* Title */}
          <h2 className="text-[28px] md:text-[30px] font-bold text-[#1E293B] text-center mb-9">
            Reset Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl text-sm font-medium">
                {message}
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1.5">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 pl-10 pr-10 rounded-xl border border-[#E2E8F0] bg-white text-[#1E293B] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:ring-2 focus:ring-[#B33A2F]/20 focus:border-[#B33A2F] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[#94A3B8]">
                {passwordRequirementsHint}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-[#475569] mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-12 pl-10 pr-10 rounded-xl border border-[#E2E8F0] bg-white text-[#1E293B] placeholder:text-[#94A3B8] text-sm focus:outline-none focus:ring-2 focus:ring-[#B33A2F]/20 focus:border-[#B33A2F] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-[#B33A2F] to-[#D45A4F] text-white font-bold text-[15px] tracking-wide shadow-md hover:shadow-lg hover:shadow-[#B33A2F]/25 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        </div>

        {/* Bottom text */}
        <p className="text-center mt-8 text-base">
          <span className="text-[#1E293B] font-medium">Let's Do </span>
          <span className="text-[#B33A2F] font-bold">IT!</span>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
