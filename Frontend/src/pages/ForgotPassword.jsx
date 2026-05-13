import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../services/api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

import bg from "../assets/register-bg.png";
import logo from "../assets/logo.png";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setMessage("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* 🔴 OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-red-900/40"></div>

      {/* ✨ FLOATING PARTICLES */}
      <div className="particles"></div>

      <div className="relative w-full max-w-md animate-fadeIn">

        {/* 🔥 LOGO */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="logo-glow w-12 h-12 rounded-full bg-red-600 flex items-center justify-center overflow-hidden">
            <img src={logo} alt="logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">
            NForce Pulse
          </h1>
        </div>

        {/* 🔥 CARD */}
        <Card className="glass-card relative rounded-2xl overflow-hidden shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              Forgot Password
            </CardTitle>
            <CardDescription className="text-center text-gray-200">
              Enter your email to receive a reset link
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ✅ SUCCESS MESSAGE WITH ANIMATION */}
              {message && (
                <div className="success-box text-center">
                  {message}
                </div>
              )}

              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button
                type="submit"
                className="btn-modern w-full"
              >
                Send Reset Link
              </Button>

              <div className="text-center text-sm mt-2">
                <span
                  className="text-red-300 cursor-pointer hover:underline hover:text-red-200 transition"
                  onClick={() => navigate("/login")}
                >
                  Back to Login
                </span>
              </div>

            </form>
          </CardContent>
        </Card>

      </div>

      {/* 🔥 ALL ANIMATIONS */}
      <style>
        {`
        /* FADE IN */
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* LOGO GLOW */
        .logo-glow {
          box-shadow: 0 0 20px rgba(255,0,0,0.7);
          animation: pulseGlow 2s infinite;
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 10px red; }
          50% { box-shadow: 0 0 25px red; }
          100% { box-shadow: 0 0 10px red; }
        }

        /* BUTTON */
        .btn-modern {
          background: linear-gradient(90deg, #ff0000, #cc0000);
          color: white;
          font-weight: 600;
          padding: 10px;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .btn-modern:hover {
          transform: scale(1.03);
          box-shadow: 0 0 15px rgba(255,0,0,0.6);
        }

        /* SUCCESS ANIMATION */
        .success-box {
          background: rgba(0,255,150,0.1);
          border: 1px solid rgba(0,255,150,0.4);
          color: #00ff9c;
          padding: 10px;
          border-radius: 8px;
          animation: successPop 0.5s ease;
        }

        @keyframes successPop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* ✨ PARTICLES */
        .particles::before {
          content: "";
          position: absolute;
          width: 200%;
          height: 200%;
          background-image: radial-gradient(rgba(255,0,0,0.4) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: moveParticles 20s linear infinite;
          opacity: 0.2;
        }

        @keyframes moveParticles {
          from { transform: translate(0,0); }
          to { transform: translate(-200px, -200px); }
        }
        `}
      </style>
    </div>
  );
};