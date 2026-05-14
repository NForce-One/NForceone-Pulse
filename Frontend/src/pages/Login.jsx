// 🔥 ONLY UI ENHANCEMENTS ADDED (NO LOGIC CHANGED)

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

import { Input } from "../components/ui/Input";

import bg from "../assets/now.png";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 🔥 OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-red-900/60"></div>

      {/* ✨ MOVING LIGHT EFFECT */}
      <div className="light-beam"></div>

      <div className="relative w-full max-w-md z-10 animate-fadeIn">

        {/* 🔥 UPDATED HEADER (NO LOGO) */}
        <div className="text-center mb-6 animate-fadeIn">
          <h1 className="text-3xl font-bold text-white tracking-wide drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]">
            NForce Pulse
          </h1>

          <p className="text-sm text-gray-300 mt-1 tracking-wide">
            Time tracking tool
          </p>
        </div>

        {/* 🔥 CARD */}
        <div className="card-modern p-8">

          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white animate-slideDown">
              Welcome back
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {error && (
              <div className="error-anim">
                {error}
              </div>
            )}

            {/* EMAIL */}
            <div className="field-anim">
              <label className="text-sm text-gray-300">Email</label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-modern"
              />
            </div>

            {/* PASSWORD */}
            <div className="field-anim delay-1">
              <label className="text-sm text-gray-300">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-modern"
              />
            </div>

            {/* FORGOT */}
            <div className="text-right delay-2 field-anim">
              <span
                className="text-sm text-red-400 cursor-pointer hover:text-red-300 transition"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot Password?
              </span>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-modern w-full"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>

          </form>
        </div>
      </div>

      {/* 🔥 ANIMATIONS */}
      <style>
        {`
        .animate-fadeIn {
          animation: fadeIn 0.8s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slideDown {
          animation: slideDown 0.6s ease;
        }

        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .field-anim {
          animation: fadeUp 0.6s ease forwards;
        }

        .delay-1 { animation-delay: 0.2s; }
        .delay-2 { animation-delay: 0.4s; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card-modern {
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255,0,0,0.2);
          box-shadow: 0 0 30px rgba(255,0,0,0.2);
          transition: transform 0.3s;
        }

        .card-modern:hover {
          transform: scale(1.02);
        }

        .input-modern {
          background: rgba(255,255,255,0.1);
          border: 1px solid #444;
          color: white;
        }

        .input-modern:focus {
          border-color: red;
          box-shadow: 0 0 10px rgba(255,0,0,0.5);
        }

        .btn-modern {
          background: linear-gradient(90deg, #ff0000, #cc0000);
          color: white;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-modern:hover {
          transform: scale(1.03);
          box-shadow: 0 0 20px red;
        }

        .error-anim {
          background: rgba(255,0,0,0.1);
          border: 1px solid red;
          color: #ff6b6b;
          padding: 10px;
          border-radius: 8px;
          animation: shake 0.3s;
        }

        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }

        .light-beam {
          position: absolute;
          width: 200%;
          height: 200%;
          background: linear-gradient(120deg, transparent, rgba(255,0,0,0.15), transparent);
          animation: beamMove 6s linear infinite;
        }

        @keyframes beamMove {
          from { transform: translateX(-50%) translateY(-50%); }
          to { transform: translateX(50%) translateY(50%); }
        }
        `}
      </style>
    </div>
  );
};