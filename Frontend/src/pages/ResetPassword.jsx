import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

import bg from "../assets/register-bg.png";
import logo from "../assets/logo.png";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

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
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 🔥 OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-green-900/60"></div>

      {/* ✨ LIGHT EFFECT */}
      <div className="light-beam"></div>

      <div className="relative w-full max-w-md z-10 animate-fadeIn">

        {/* 🔥 LOGO */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 text-white">

            <div className="w-12 h-12 rounded-full overflow-hidden border border-[#22c55e] logo-glow">
              <img src={logo} alt="logo" className="w-full h-full object-cover" />
            </div>

            <span className="text-3xl font-bold">NForce Pulse</span>
          </div>
        </div>

        {/* CARD */}
        <div className="card-modern p-8">

          <div className="text-center mb-6">
            <h2 className="text-2xl text-white animate-slideDown">
              Reset Password
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {error && <div className="error-anim">{error}</div>}
            {message && <div className="success-anim">{message}</div>}

            <div className="field-anim">
              <Input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-modern"
              />
            </div>

            <div className="field-anim delay-1">
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input-modern"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="btn-modern w-full"
            >
              {loading ? "Updating..." : "Reset Password"}
            </Button>

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

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card-modern {
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(34,197,94,0.2);
          box-shadow: 0 0 30px rgba(34,197,94,0.2);
          transition: transform 0.3s;
        }

        .card-modern:hover {
          transform: scale(1.02);
        }

        .logo-glow {
          box-shadow: 0 0 20px #22c55e;
          animation: pulseGlow 2s infinite;
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 10px #22c55e; }
          50% { box-shadow: 0 0 25px #22c55e; }
          100% { box-shadow: 0 0 10px #22c55e; }
        }

        .input-modern {
          background: rgba(255,255,255,0.1);
          border: 1px solid #444;
          color: white;
        }

        .input-modern:focus {
          border-color: #22c55e;
          box-shadow: 0 0 10px rgba(34,197,94,0.5);
        }

        .btn-modern {
          background: linear-gradient(90deg, #22c55e, #16a34a);
          color: white;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-modern:hover {
          transform: scale(1.03);
          box-shadow: 0 0 20px #22c55e;
        }

        .error-anim {
          background: rgba(255,0,0,0.1);
          border: 1px solid red;
          color: #ff6b6b;
          padding: 10px;
          border-radius: 8px;
          animation: shake 0.3s;
        }

        .success-anim {
          background: rgba(0,255,0,0.1);
          border: 1px solid #00ff88;
          color: #00ff88;
          padding: 10px;
          border-radius: 8px;
          animation: fadeIn 0.5s;
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
          background: linear-gradient(120deg, transparent, rgba(34,197,94,0.15), transparent);
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

export default ResetPassword;