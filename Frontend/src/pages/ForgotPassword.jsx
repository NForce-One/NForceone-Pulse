import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../services/api";
import { Mail, Loader2 } from "lucide-react";

import logo from "../assets/logo.png";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#F8FAFC" }}
    >
      <div className="w-full flex flex-col items-center px-4"
        style={{ maxWidth: "560px" }}
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-0">
          <div
            className="flex items-center justify-center"
            style={{
              width: "170px",
              height: "68px",
              background: "#000000",
              borderRadius: "12px",
              padding: "6px",
            }}
          >
            <img
              src={logo}
              alt="NForce"
              className="w-full h-full object-contain"
            />
          </div>
          <h1
            className="text-center"
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.5px",
              marginTop: "18px",
              marginBottom: "26px",
            }}
          >
            NForce Pulse
          </h1>
        </div>

        {/* Form Card */}
        <div
          className="w-full bg-white"
          style={{
            maxWidth: "520px",
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
          }}
        >
          {/* Heading */}
          <h2
            className="text-center"
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
              lineHeight: "34px",
              marginBottom: "12px",
            }}
          >
            Forgot your password?
          </h2>

          {/* Subtitle */}
          <p
            className="text-center"
            style={{
              fontSize: "15px",
              fontWeight: 400,
              color: "#6B7280",
              lineHeight: "24px",
              marginBottom: "26px",
            }}
          >
            Enter your email and we'll send you a reset link
          </p>

          {/* Error Message */}
          {error && (
            <div
              className="flex items-center gap-2.5 rounded-xl px-4 py-3"
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#DC2626",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "4px",
                  height: "32px",
                  borderRadius: "999px",
                  background: "#DC2626",
                  flexShrink: 0,
                }}
              />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div
              className="flex items-center gap-2.5 rounded-xl px-4 py-3"
              style={{
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                color: "#16A34A",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "4px",
                  height: "32px",
                  borderRadius: "999px",
                  background: "#16A34A",
                  flexShrink: 0,
                }}
              />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Label */}
            <label
              className="block"
              style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "8px",
              }}
            >
              Email
            </label>

            {/* Email Input */}
            <div className="relative" style={{ marginBottom: "24px" }}>
              <Mail
                size={18}
                className="absolute pointer-events-none"
                style={{
                  color: "#9CA3AF",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                style={{
                  width: "100%",
                  height: "50px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "10px",
                  background: "#FFFFFF",
                  paddingLeft: "44px",
                  paddingRight: "16px",
                  fontSize: "15px",
                  color: "#111827",
                  outline: "none",
                }}
                className="placeholder:text-[#9CA3AF] focus:border-[#EF4444] focus:ring-[3px] focus:ring-[rgba(239,68,68,0.12)] transition-all duration-200"
              />
            </div>

            {/* Send Reset Link Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                height: "50px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #FF2D2D, #E30613)",
                fontSize: "16px",
                fontWeight: 600,
                color: "#FFFFFF",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                boxShadow: "0 8px 18px rgba(255,0,0,0.25)",
              }}
              className="transition-all duration-200 hover:brightness-105 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        </div>

        {/* Bottom Link */}
        <div
          className="text-center"
          style={{
            marginTop: "22px",
            fontSize: "15px",
            color: "#6B7280",
          }}
        >
          Remembered it?{" "}
          <span
            style={{
              color: "#DC2626",
              fontWeight: 600,
              cursor: "pointer",
            }}
            className="hover:underline"
            onClick={() => navigate("/login")}
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
};
