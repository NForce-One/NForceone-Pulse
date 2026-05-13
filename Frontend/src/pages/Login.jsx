import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, Mail, ShieldAlert, Lock } from "lucide-react";

import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

const PARTICLE_COUNT = 60;

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef(null);
  const rootRef = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8,
      duration: Math.random() * 6 + 4,
      opacity: Math.random() * 0.5 + 0.1,
    })), []
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      if (cardRef.current) {
        cardRef.current.style.setProperty("--rx", `${(y - 0.5) * -4}deg`);
        cardRef.current.style.setProperty("--ry", `${(x - 0.5) * 4}deg`);
      }
      if (rootRef.current) {
        rootRef.current.style.setProperty("--mx", `${x * 100}%`);
        rootRef.current.style.setProperty("--my", `${y * 100}%`);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
    <div className="lx-root" ref={rootRef}>
      {/* Background */}
      <div className="lx-bg">
        <div className="lx-mesh m1" />
        <div className="lx-mesh m2" />
        <div className="lx-mesh m3" />
        <div className="lx-mesh m4" />
      </div>

      {/* Neon lines */}
      <div className="lx-neon n1" />
      <div className="lx-neon n2" />
      <div className="lx-neon n3" />

      {/* Particles */}
      <div className="lx-particles" aria-hidden="true">
        {particles.map((p) => (
          <div key={p.id} className="lx-particle"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Red ambient glow */}
      <div className="lx-ambient" />

      {/* Grid overlay */}
      <div className="lx-grid" />

      {/* Mouse glow */}
      <div className="lx-mglow" />

      {/* ===== BACKGROUND WATERMARK LOGO ===== */}
      <div className="lx-bglogo" aria-hidden="true">
        <span className="lx-bglogo-text">NFORCE</span>
        <span className="lx-bglogo-sub">ONE</span>
      </div>

      {/* Card */}
      <div className="lx-cwrap">
        <div className="lx-card" ref={cardRef}>
          <div className="lx-card-shine" />
          <div className="lx-card-border" />

          <div style={{textAlign:"center",marginBottom:4}}><span className="lx-logo-text">NforceOne</span></div>

          <div className="lx-header">
            <h1 className="lx-title">Welcome Back</h1>
            <p className="lx-sub">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="lx-form">
            {error && (
              <div className="lx-err">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="lx-fld" style={{ animationDelay: "0.15s" }}>
              <label className="lx-lbl">Email Address</label>
              <div className="lx-iwrap">
                <Mail size={16} className="lx-icn" />
                <input type="email" placeholder="you@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required className="lx-inp" />
              </div>
            </div>

            <div className="lx-fld" style={{ animationDelay: "0.25s" }}>
              <label className="lx-lbl">Password</label>
              <div className="lx-iwrap">
                <Lock size={16} className="lx-icn" />
                <input type={showPassword ? "text" : "password"} placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required className="lx-inp" />
                <button type="button" className="lx-eye"
                  onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="lx-meta" style={{ animationDelay: "0.35s" }}>
              <label className="lx-rem">
                <input type="checkbox" checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)} />
                <span className="lx-cbox" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="lx-forgot">Forgot password?</Link>
            </div>

            <button type="submit" disabled={isLoading}
              className="lx-btn" style={{ animationDelay: "0.45s" }}>
              {isLoading ? (
                <div className="lx-spin" />
              ) : (
                <><LogIn size={18} /><span>Sign In</span></>
              )}
            </button>
          </form>

          <div className="lx-divider" style={{ animationDelay: "0.5s" }}>
            <span>or continue with</span>
          </div>

          <div className="lx-social" style={{ animationDelay: "0.55s" }}>
            <button className="lx-social-btn" aria-label="Sign in with Google">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <button className="lx-social-btn" aria-label="Sign in with GitHub">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </button>
            <button className="lx-social-btn" aria-label="Sign in with LinkedIn">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>
          </div>

          <div className="lx-foot" style={{ animationDelay: "0.6s" }}>
            <span>Track</span><span className="lx-dot">•</span>
            <span>Analyze</span><span className="lx-dot">•</span>
            <span>Optimize</span>
          </div>
        </div>
      </div>

      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

.lx-root {
  min-height: 100vh;
  background: #0a0a0a;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* ===== BACKGROUND MESH ===== */
.lx-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.lx-mesh { position: absolute; border-radius: 50%; filter: blur(140px); animation: meshDrift 20s infinite alternate ease-in-out; }
.m1 { width: 700px; height: 700px; top: -25%; left: -15%; background: radial-gradient(circle, rgba(255,30,30,0.12), rgba(100,0,0,0.05) 40%, transparent 70%); }
.m2 { width: 600px; height: 600px; bottom: -20%; right: -15%; background: radial-gradient(circle, rgba(200,0,0,0.1), rgba(50,0,0,0.03) 40%, transparent 70%); animation-delay: -7s; }
.m3 { width: 500px; height: 500px; top: 40%; left: 50%; background: radial-gradient(circle, rgba(255,50,50,0.06), transparent 70%); animation-delay: -14s; }
.m4 { width: 400px; height: 400px; top: 10%; right: 20%; background: radial-gradient(circle, rgba(150,0,0,0.08), transparent 70%); animation-delay: -4s; }
@keyframes meshDrift { 0% { transform: scale(1) translate(0,0); } 100% { transform: scale(1.2) translate(60px,-40px); } }

/* ===== NEON LINES ===== */
.lx-neon { position: absolute; height: 1px; z-index: 1; pointer-events: none; opacity: 0.3; }
.lx-neon::before, .lx-neon::after {
  content: ''; position: absolute; top: -2px; width: 6px; height: 6px;
  border-radius: 50%; background: #ff1e1e; box-shadow: 0 0 12px #ff1e1e, 0 0 30px rgba(255,30,30,0.3);
}
.n1 { top: 15%; left: -10%; right: 60%; background: linear-gradient(90deg, transparent, #ff1e1e, transparent); animation: neonDrift1 8s infinite linear; }
.n2 { top: 70%; left: 40%; right: -10%; background: linear-gradient(90deg, transparent, #ff1e1e, transparent); animation: neonDrift2 10s infinite linear; animation-delay: -3s; }
.n3 { top: 45%; left: 50%; right: 20%; background: linear-gradient(90deg, transparent, rgba(255,30,30,0.4), transparent); animation: neonDrift1 12s infinite linear; animation-delay: -6s; opacity: 0.15; }
@keyframes neonDrift1 { 0% { transform: translateX(0); } 100% { transform: translateX(100vw); } }
@keyframes neonDrift2 { 0% { transform: translateX(0); } 100% { transform: translateX(-100vw); } }

/* ===== PARTICLES ===== */
.lx-particles { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.lx-particle { position: absolute; border-radius: 50%; background: #ff1e1e;
  box-shadow: 0 0 6px rgba(255,30,30,0.4), 0 0 20px rgba(255,30,30,0.1);
  animation: particleFloat 6s infinite ease-in-out; }
@keyframes particleFloat {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 0.5; }
  100% { transform: translateY(-120px) scale(0.3); opacity: 0; }
}

/* ===== AMBIENT GLOW ===== */
.lx-ambient { position: absolute; bottom: -200px; left: 50%; transform: translateX(-50%);
  width: 600px; height: 400px; z-index: 1; pointer-events: none;
  background: radial-gradient(ellipse, rgba(255,30,30,0.08), transparent 60%); }

/* ===== GRID ===== */
.lx-grid { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 60px 60px; }

/* ===== MOUSE GLOW ===== */
.lx-mglow { position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background: radial-gradient(800px circle at var(--mx,50%) var(--my,50%), rgba(255,30,30,0.04), transparent 50%); }

/* ===== CARD WRAPPER ===== */
.lx-cwrap { position: relative; z-index: 10; width: 100%; max-width: 420px; padding: 16px;
  animation: cardIn 1.2s cubic-bezier(0.16,1,0.3,1) forwards; }
@keyframes cardIn { 0% { opacity: 0; transform: translateY(60px) scale(0.95); filter: blur(10px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }

/* ===== CARD ===== */
.lx-card {
  position: relative;
  background: rgba(10, 10, 10, 0.7);
  backdrop-filter: blur(40px) saturate(150%);
  -webkit-backdrop-filter: blur(40px) saturate(150%);
  border-radius: 24px;
  padding: 44px 36px 36px;
  overflow: hidden;
  transform: perspective(1000px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));
  transition: transform 0.15s ease-out;
  display: flex; flex-direction: column; align-items: center; gap: 20px;
  box-shadow:
    0 0 0 1px rgba(255,30,30,0.15),
    0 30px 80px rgba(0,0,0,0.6),
    0 0 80px rgba(255,30,30,0.04),
    inset 0 1px 0 rgba(255,255,255,0.03);
}

.lx-card-shine {
  position: absolute; top: -50%; right: -50%; width: 100%; height: 100%;
  background: radial-gradient(circle at top right, rgba(255,255,255,0.03), transparent 60%);
  pointer-events: none; border-radius: 50%;
  animation: shineMove 8s infinite alternate ease-in-out;
}
@keyframes shineMove { 0% { transform: translate(0,0); } 100% { transform: translate(-30%,30%); } }

/* ===== CARD BORDER ===== */
.lx-card-border { position: absolute; inset: -1px; border-radius: 24px; pointer-events: none;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,30,30,0.4), rgba(255,30,30,0.05) 30%, rgba(255,30,30,0.02) 50%, rgba(255,30,30,0.08) 70%, rgba(255,30,30,0.3) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: borderPulse 4s infinite alternate ease-in-out;
}
@keyframes borderPulse { 0% { opacity: 0.5; } 100% { opacity: 1; } }

/* ===== LOGO ===== */
.lx-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.lx-logo-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(255,30,30,0.1);
  border: 1px solid rgba(255,30,30,0.2);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 20px rgba(255,30,30,0.05);
}
.lx-logo-text {
  font-size: 1.6rem; font-weight: 800; letter-spacing: 3px;
  background: linear-gradient(135deg, #fff, #ccc);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ===== HEADER ===== */
.lx-header { text-align: center; display: flex; flex-direction: column; gap: 4px; }
.lx-title { font-size: 1.6rem; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
.lx-sub { font-size: 0.85rem; color: rgba(255,255,255,0.35); font-weight: 400; }

/* ===== FORM ===== */
.lx-form { width: 100%; display: flex; flex-direction: column; gap: 16px; }

.lx-err { display: flex; align-items: center; gap: 8px;
  background: rgba(255,30,30,0.08); border: 1px solid rgba(255,30,30,0.2);
  border-radius: 10px; padding: 10px 14px; color: #ff4444;
  font-size: 0.82rem; font-weight: 500; animation: shake 0.4s ease; }
@keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }

.lx-fld { display: flex; flex-direction: column; gap: 6px;
  animation: fldIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
@keyframes fldIn { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }

.lx-lbl { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.5px;
  color: rgba(255,255,255,0.5); }

.lx-iwrap { position: relative; display: flex; align-items: center; }
.lx-icn { position: absolute; left: 14px; color: rgba(255,255,255,0.2); pointer-events: none; transition: color 0.3s; }

.lx-inp {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 14px 16px 14px 44px;
  color: #fff; font-size: 0.9rem; font-family: 'Inter', sans-serif;
  outline: none; transition: all 0.3s ease;
}
.lx-inp::placeholder { color: rgba(255,255,255,0.15); font-weight: 400; }
.lx-inp:focus {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,30,30,0.35);
  box-shadow: 0 0 0 1px rgba(255,30,30,0.1), 0 0 30px rgba(255,30,30,0.04);
}
.lx-inp:focus ~ .lx-icn { color: rgba(255,30,30,0.6); }

.lx-eye { position: absolute; right: 14px; background: none; border: none;
  color: rgba(255,255,255,0.2); cursor: pointer; padding: 4px;
  display: flex; align-items: center; transition: all 0.3s; }
.lx-eye:hover { color: rgba(255,255,255,0.5); }

/* ===== META ===== */
.lx-meta { display: flex; justify-content: space-between; align-items: center;
  font-size: 0.8rem; animation: fldIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
.lx-rem { display: flex; align-items: center; gap: 8px; cursor: pointer;
  color: rgba(255,255,255,0.35); user-select: none; transition: color 0.3s; }
.lx-rem:hover { color: rgba(255,255,255,0.55); }
.lx-rem input { display: none; }
.lx-cbox { width: 16px; height: 16px; border: 1.5px solid rgba(255,255,255,0.15);
  border-radius: 4px; position: relative; transition: all 0.3s; flex-shrink: 0; }
.lx-rem input:checked + .lx-cbox { background: #ff1e1e; border-color: #ff1e1e;
  box-shadow: 0 0 12px rgba(255,30,30,0.3); }
.lx-rem input:checked + .lx-cbox::after { content: ''; position: absolute; top: 2px; left: 4px;
  width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }

.lx-forgot { color: rgba(255,30,30,0.5); text-decoration: none; font-weight: 500;
  transition: all 0.3s; font-size: 0.8rem; }
.lx-forgot:hover { color: #ff1e1e; text-shadow: 0 0 12px rgba(255,30,30,0.2); }

/* ===== BUTTON ===== */
.lx-btn {
  width: 100%; display: flex; align-items: center; justify-content: center;
  gap: 8px; padding: 16px 24px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #cc0000, #ff1e1e, #ff3333, #ff1e1e, #cc0000);
  background-size: 300% 300%;
  color: #fff; font-family: 'Inter', sans-serif; font-size: 0.95rem;
  font-weight: 600; letter-spacing: 0.5px; cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 4px 24px rgba(255,30,30,0.2), 0 0 40px rgba(255,30,30,0.04);
  position: relative; overflow: hidden;
  animation: fldIn 0.7s cubic-bezier(0.16,1,0.3,1) both, btnGrad 3s infinite ease-in-out;
}
@keyframes btnGrad { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

.lx-btn::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%);
  background-size: 200% 200%;
  animation: btnShine 3s infinite ease-in-out;
  pointer-events: none;
}
@keyframes btnShine { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.lx-btn:hover { transform: translateY(-3px) scale(1.01);
  box-shadow: 0 8px 32px rgba(255,30,30,0.35), 0 0 80px rgba(255,30,30,0.1); }
.lx-btn:active { transform: translateY(0) scale(0.98); }
.lx-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

.lx-spin { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== DIVIDER ===== */
.lx-divider { width: 100%; display: flex; align-items: center; gap: 12px;
  animation: fldIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
.lx-divider::before, .lx-divider::after { content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); }
.lx-divider span { font-size: 0.72rem; color: rgba(255,255,255,0.2);
  white-space: nowrap; text-transform: uppercase; letter-spacing: 1px; }

/* ===== SOCIAL ===== */
.lx-social { display: flex; gap: 12px; animation: fldIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
.lx-social-btn {
  width: 42px; height: 42px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03); cursor: pointer; display: flex;
  align-items: center; justify-content: center; color: rgba(255,255,255,0.4);
  transition: all 0.3s ease;
}
.lx-social-btn:hover {
  background: rgba(255,30,30,0.08);
  border-color: rgba(255,30,30,0.25);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255,30,30,0.1);
}

/* ===== FOOTER ===== */
.lx-foot { display: flex; align-items: center; gap: 6px;
  font-size: 0.65rem; letter-spacing: 2px; color: rgba(255,255,255,0.15);
  font-weight: 300; text-transform: uppercase; padding-top: 2px; }
.lx-dot { color: rgba(255,30,30,0.3); font-weight: 700; }

/* ===== BACKGROUND WATERMARK LOGO ===== */
.lx-bglogo {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  user-select: none;
  z-index: 3;
  animation: bgLogoFade 2.5s ease-out forwards;
}
@keyframes bgLogoFade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
.lx-bglogo-text {
  font-size: clamp(5rem, 20vw, 14rem);
  font-weight: 800;
  letter-spacing: clamp(16px, 4vw, 40px);
  color: rgba(255,255,255,0.08);
  text-shadow:
    0 0 100px rgba(255,30,30,0.2),
    0 0 200px rgba(255,30,30,0.1),
    0 0 300px rgba(255,30,30,0.05);
  line-height: 1;
}
.lx-bglogo-sub {
  font-size: clamp(2rem, 6vw, 5rem);
  font-weight: 300;
  letter-spacing: clamp(24px, 8vw, 60px);
  color: rgba(255,30,30,0.08);
  text-shadow:
    0 0 80px rgba(255,30,30,0.15),
    0 0 150px rgba(255,30,30,0.08);
  margin-top: -8px;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 500px) {
  .lx-card { padding: 36px 24px 28px; border-radius: 20px; }
  .lx-title { font-size: 1.35rem; }
  .lx-sub { font-size: 0.8rem; }
  .lx-logo-text { font-size: 1.3rem; }
  .lx-btn { padding: 14px 20px; font-size: 0.9rem; }
  .lx-meta { flex-direction: column; gap: 10px; align-items: flex-start; }
  .lx-cwrap { padding: 12px; }
}
`}</style>
    </div>
  );
};
