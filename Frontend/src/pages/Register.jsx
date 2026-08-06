import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";
import { useEmailValidation } from "../utils/emailValidation";

import { Input } from "../components/ui/Input";

import bg from "../assets/register-bg.png";
import logo from "../assets/logo.png";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const email = useEmailValidation({ onError: setError });

  const [show, setShow] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setShow(true); // trigger animation
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.validate()) {
      return;
    }

    setLoading(true);

    try {
      await registerUser({ ...form, email: email.value.trim() });

      setSuccess("Registration successful! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 relative overflow-hidden transition-opacity duration-700 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 🔥 OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/50 to-purple-100/60"></div>

      {/* 🔥 ANIMATED GLOW */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse absolute top-[-100px] left-[-100px]"></div>
        <div className="w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse absolute bottom-[-80px] right-[-80px]"></div>
      </div>

      <div
        className={`relative w-full max-w-md z-10 transform transition-all duration-700 ${
          show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
      >

        {/* 🔥 LOGO */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-3 text-[#1E293B] drop-shadow-[0_0_30px_rgba(179,58,47,0.3)] animate-fade-in">

            <div className="w-12 h-12 rounded-full overflow-hidden border border-[#B33A2F] shadow-[0_0_15px_rgba(179,58,47,0.3)]">
              <img src={logo} alt="NForce Logo" className="w-full h-full object-cover" />
            </div>

            <span className="text-3xl font-bold tracking-wide">
              NForce Pulse
            </span>
          </div>
        </div>

        {/* 🔥 CARD */}
        <div className="bg-white backdrop-blur-xl border border-[#E2E8F0] rounded-2xl shadow-[0_0_80px_rgba(179,58,47,0.3)] p-8 transition-all duration-500 hover:shadow-[0_0_100px_rgba(179,58,47,0.3)]">

          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-[#1E293B]">
              Create Account
            </h2>
            <p className="text-[#64748B] text-sm mt-1">
              Register as Employee or Manager
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {error && (
              <div className="bg-purple-100 border border-[#B33A2F] text-[#B33A2F] px-4 py-2 rounded-md text-sm animate-pulse">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-md text-sm animate-pulse">
                {success}
              </div>
            )}

            <Input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
              className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#B33A2F] transition-all duration-300 focus:scale-[1.02]"
            />

            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={email.value}
              onChange={email.handleChange}
              onKeyDown={email.handleKeyDown}
              onBeforeInput={email.handleBeforeInput}
              onBlur={email.handleBlur}
              ref={email.inputRef}
              required
              className="bg-white border border-[#E2E8F0] text-[#1E293B] placeholder-[#64748B] focus:ring-2 focus:ring-[#B33A2F] transition-all duration-300 focus:scale-[1.02]"
            />

            <Input
              name="password"
              type="password"
              placeholder="Password (Ex: Test@123)"
              value={form.password}
              onChange={handleChange}
              required
              className="bg-white border border-[#E2E8F0] text-[#1E293B] focus:ring-2 focus:ring-[#B33A2F] transition-all duration-300 focus:scale-[1.02]"
            />

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full bg-white border border-[#E2E8F0] text-[#1E293B] p-2 rounded-md focus:ring-2 focus:ring-[#B33A2F] transition-all duration-300 focus:scale-[1.02]"
            >
              <option value="EMPLOYEE" className="bg-white text-[#1E293B]">
                Employee
              </option>
              <option value="MANAGER" className="bg-white text-[#1E293B]">
                Manager
              </option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg font-semibold text-white 
              bg-[#B33A2F] hover:bg-[#992E25]
              hover:scale-[1.05] active:scale-[0.98]
              hover:shadow-[0_0_30px_rgba(179,58,47,0.3)]
              transition-all duration-300"
            >
              {loading ? "Registering..." : "Register"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;