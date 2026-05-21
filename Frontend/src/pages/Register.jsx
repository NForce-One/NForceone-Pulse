import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";

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
    setLoading(true);

    try {
      await registerUser(form);

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
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-green-900/60"></div>

      {/* 🔥 ANIMATED GLOW */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-[500px] h-[500px] bg-green-600/20 rounded-full blur-[120px] animate-pulse absolute top-[-100px] left-[-100px]"></div>
        <div className="w-[400px] h-[400px] bg-green-500/20 rounded-full blur-[100px] animate-pulse absolute bottom-[-80px] right-[-80px]"></div>
      </div>

      <div
        className={`relative w-full max-w-md z-10 transform transition-all duration-700 ${
          show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
      >

        {/* 🔥 LOGO */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-3 text-white drop-shadow-[0_0_30px_rgba(34,197,94,1)] animate-fade-in">

            <div className="w-12 h-12 rounded-full overflow-hidden border border-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.7)]">
              <img src={logo} alt="NForce Logo" className="w-full h-full object-cover" />
            </div>

            <span className="text-3xl font-bold tracking-wide">
              NForce Pulse
            </span>
          </div>
        </div>

        {/* 🔥 CARD */}
        <div className="bg-black/60 backdrop-blur-xl border border-[#22c55e]/30 rounded-2xl shadow-[0_0_80px_rgba(34,197,94,0.35)] p-8 transition-all duration-500 hover:shadow-[0_0_100px_rgba(34,197,94,0.5)]">

          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Create Account
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Register as Employee or Manager
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {error && (
              <div className="bg-red-500/20 border border-red-400 text-red-300 px-4 py-2 rounded-md text-sm animate-pulse">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-400 text-green-300 px-4 py-2 rounded-md text-sm animate-pulse">
                {success}
              </div>
            )}

            <Input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
              className="bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#22c55e] transition-all duration-300 focus:scale-[1.02]"
            />

            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#22c55e] transition-all duration-300 focus:scale-[1.02]"
            />

            <Input
              name="password"
              type="password"
              placeholder="Password (Ex: Test@123)"
              value={form.password}
              onChange={handleChange}
              required
              className="bg-white/10 border border-white/10 text-white focus:ring-2 focus:ring-[#22c55e] transition-all duration-300 focus:scale-[1.02]"
            />

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full bg-white/10 border border-white/10 text-white p-2 rounded-md focus:ring-2 focus:ring-[#22c55e] transition-all duration-300 focus:scale-[1.02]"
            >
              <option value="EMPLOYEE" className="bg-black text-white">
                Employee
              </option>
              <option value="MANAGER" className="bg-black text-white">
                Manager
              </option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg font-semibold text-white 
              bg-gradient-to-r from-[#22c55e] via-[#16a34a] to-[#15803d] 
              hover:scale-[1.05] active:scale-[0.98]
              hover:shadow-[0_0_30px_rgba(34,197,94,1)]
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