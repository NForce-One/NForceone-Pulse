import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Eye, EyeOff, LogIn, Mail, ShieldAlert } from "lucide-react";

import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

const EMBER_COUNT = 80;
const SPARK_COUNT = 50;

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

  const embers = useMemo(() =>
    Array.from({ length: EMBER_COUNT }, (_, i) => ({
      id: i,
      size: Math.random() * 6 + 2,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: Math.random() * 4 + 4,
      opacity: Math.random() * 0.8 + 0.2,
      hue: Math.floor(Math.random() * 40) + 10,
      drift: (Math.random() - 0.5) * 80,
    })), []
  );

  const sparks = useMemo(() =>
    Array.from({ length: SPARK_COUNT }, (_, i) => ({
      id: i,
      size: Math.random() * 2.5 + 0.5,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8,
      duration: Math.random() * 2 + 1.5,
    })), []
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      if (cardRef.current) {
        cardRef.current.style.setProperty("--rx", `${(y - 0.5) * -5}deg`);
        cardRef.current.style.setProperty("--ry", `${(x - 0.5) * 5}deg`);
        cardRef.current.style.setProperty("--gx", `${x * 100}%`);
        cardRef.current.style.setProperty("--gy", `${y * 100}%`);
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

  const handleRipple = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "nfo-ripple";
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 800);
  };

  return (
    <div className="nfo-root" ref={rootRef}>
      {/* Background gradient mesh */}
      <div className="nfo-bg">
        <div className="nfo-mesh m1" />
        <div className="nfo-mesh m2" />
        <div className="nfo-mesh m3" />
        <div className="nfo-mesh m4" />
        <div className="nfo-mesh m5" />
        <div className="nfo-mesh m6" />
      </div>

      {/* Floating glass orbs */}
      <div className="nfo-orb o1" />
      <div className="nfo-orb o2" />
      <div className="nfo-orb o3" />
      <div className="nfo-orb o4" />
      <div className="nfo-orb o5" />

      {/* Stars */}
      <div className="nfo-stars" aria-hidden="true">
        {sparks.map((s) => (
          <div key={s.id} className="nfo-star"
            style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: s.size, height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Shooting stars */}
      <div className="nfo-shooting s1" />
      <div className="nfo-shooting s2" />
      <div className="nfo-shooting s3" />

      {/* Subtle grid overlay */}
      <div className="nfo-grid-overlay" />

      {/* Mouse glow */}
      <div className="nfo-mglow" />

      {/* Card */}
      <div className="nfo-cwrap">
        <div className="nfo-card" ref={cardRef}>
          <div className="nfo-card-gloss" />
          <div className="nfo-card-border" />
          <div className="nfo-card-border-inner" />

          {/* Small flame accent at top of card */}
          <div className="nfo-flame-acc" />

          <h1 className="nfo-title">
            NFORCE<span className="nfo-title-one">ONE</span>
          </h1>
          <p className="nfo-sub">TIME TRACKING TOOL</p>

          <form onSubmit={handleSubmit} className="nfo-form">
            {error && (
              <div className="nfo-err">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="nfo-fld" style={{ animationDelay: "0.2s" }}>
              <label className="nfo-lbl"><Mail size={12} /> EMAIL ADDRESS</label>
              <div className="nfo-iwrap">
                <Mail size={18} className="nfo-icn" />
                <input type="email" placeholder="Enter your email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required className="nfo-inp" />
              </div>
            </div>

            <div className="nfo-fld" style={{ animationDelay: "0.35s" }}>
              <label className="nfo-lbl"><Lock size={12} /> PASSWORD</label>
              <div className="nfo-iwrap">
                <Lock size={18} className="nfo-icn" />
                <input type={showPassword ? "text" : "password"} placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required className="nfo-inp" />
                <button type="button" className="nfo-eye"
                  onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="nfo-meta" style={{ animationDelay: "0.5s" }}>
              <label className="nfo-rem">
                <input type="checkbox" checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)} />
                <span className="nfo-cbox"><span className="nfo-cbox-check" /></span>
                <span>Remember Me</span>
              </label>
              <Link to="/forgot-password" className="nfo-forgot">Forgot Password?</Link>
            </div>

            <button type="submit" disabled={isLoading}
              className="nfo-btn" style={{ animationDelay: "0.65s" }}
              onClick={handleRipple}>
              {isLoading ? (
                <div className="nfo-spin" />
              ) : (
                <><LogIn size={20} /><span>Sign In</span></>
              )}
            </button>
          </form>

          <div className="nfo-foot">
            <span>Track</span><span className="nfo-dot">•</span>
            <span>Analyze</span><span className="nfo-dot">•</span>
            <span>Optimize</span>
          </div>
        </div>
      </div>

      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Orbitron:wght@400;700;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

.nfo-root {
  min-height: 100vh;
  background: #050508;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* ===== GRADIENT MESH ===== */
.nfo-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.nfo-mesh { position: absolute; border-radius: 50%; filter: blur(130px); animation: meshDrift 25s infinite alternate ease-in-out; }
.m1 { width: 800px; height: 800px; top: -20%; left: -10%; background: radial-gradient(circle, rgba(100,20,60,0.35), rgba(60,10,30,0.1) 40%, transparent 70%); }
.m2 { width: 700px; height: 700px; bottom: -15%; right: -10%; background: radial-gradient(circle, rgba(200,30,50,0.3), rgba(100,10,20,0.08) 40%, transparent 70%); animation-delay: -6s; }
.m3 { width: 600px; height: 600px; top: 30%; left: 40%; background: radial-gradient(circle, rgba(80,20,80,0.15), transparent 70%); animation-delay: -12s; }
.m4 { width: 500px; height: 500px; top: 60%; right: 20%; background: radial-gradient(circle, rgba(180,20,40,0.12), transparent 70%); animation-delay: -3s; }
.m5 { width: 400px; height: 400px; top: 10%; right: 25%; background: radial-gradient(circle, rgba(120,10,50,0.18), transparent 70%); animation-delay: -9s; }
.m6 { width: 550px; height: 550px; top: 45%; left: 15%; background: radial-gradient(circle, rgba(220,40,60,0.08), transparent 70%); animation-delay: -15s; }
@keyframes meshDrift { 0% { transform: scale(1) translate(0,0); } 100% { transform: scale(1.3) translate(80px,-50px); } }

/* ===== FLOATING GLASS ORBS ===== */
.nfo-orb { position: absolute; border-radius: 50%; pointer-events: none; animation: orbFloat 12s infinite alternate ease-in-out; }
.o1 { width: 300px; height: 300px; top: 5%; right: 8%;
  background: radial-gradient(circle at 30% 30%, rgba(255,50,80,0.08), rgba(200,20,50,0.03) 40%, transparent 70%);
  filter: blur(50px); animation-duration: 14s; }
.o2 { width: 200px; height: 200px; bottom: 10%; left: 5%;
  background: radial-gradient(circle at 70% 40%, rgba(150,30,80,0.06), rgba(80,10,40,0.02) 40%, transparent 70%);
  filter: blur(40px); animation-duration: 10s; animation-delay: -3s; animation-direction: reverse; }
.o3 { width: 150px; height: 150px; top: 55%; right: 15%;
  background: radial-gradient(circle at 50% 50%, rgba(255,60,100,0.05), transparent 60%);
  filter: blur(30px); animation-duration: 8s; animation-delay: -6s; }
.o4 { width: 250px; height: 250px; top: 35%; left: 60%;
  background: radial-gradient(circle at 60% 60%, rgba(180,30,70,0.06), transparent 60%);
  filter: blur(45px); animation-duration: 11s; animation-delay: -2s; }
.o5 { width: 180px; height: 180px; bottom: 25%; right: 35%;
  background: radial-gradient(circle at 40% 30%, rgba(220,40,90,0.04), transparent 60%);
  filter: blur(35px); animation-duration: 9s; animation-delay: -8s; animation-direction: reverse; }
@keyframes orbFloat { 0% { transform: translateY(0) scale(1); opacity: 0.3; } 100% { transform: translateY(-30px) scale(1.15); opacity: 0.8; } }

/* ===== STARS ===== */
.nfo-stars { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.nfo-star { position: absolute; border-radius: 50%; background: #fff;
  box-shadow: 0 0 4px rgba(255,255,255,0.6), 0 0 12px rgba(255,200,200,0.2);
  animation: starTwinkle 3s infinite ease-in-out; }
@keyframes starTwinkle {
  0%, 100% { opacity: 0.1; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* ===== SHOOTING STARS ===== */
.nfo-shooting { position: absolute; width: 150px; height: 1px; z-index: 2;
  background: linear-gradient(90deg, transparent, rgba(255,100,150,0.5));
  transform: rotate(-30deg); animation: shootStar 8s infinite linear; pointer-events: none; }
.nfo-shooting::after { content: ''; position: absolute; right: 0; top: -2px;
  width: 4px; height: 4px; border-radius: 50%;
  background: rgba(255,200,220,0.8);
  box-shadow: 0 0 10px rgba(255,100,150,0.5), 0 0 30px rgba(255,100,150,0.2); }
.s1 { top: 15%; right: -20%; animation-delay: 0s; }
.s2 { top: 45%; right: -20%; animation-delay: -2.7s; animation-duration: 10s; }
.s3 { top: 75%; right: -20%; animation-delay: -5.3s; animation-duration: 9s; }
@keyframes shootStar { 0% { transform: rotate(-30deg) translateX(0); opacity: 0; } 5% { opacity: 1; } 95% { opacity: 1; } 100% { transform: rotate(-30deg) translateX(-2500px); opacity: 0; } }

/* ===== SUBTLE GRID ===== */
.nfo-grid-overlay { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.008) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.008) 1px, transparent 1px);
  background-size: 80px 80px; }

/* ===== MOUSE GLOW ===== */
.nfo-mglow { position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background: radial-gradient(1000px circle at var(--mx,50%) var(--my,50%), rgba(255,50,80,0.06), transparent 50%); }

/* ===== CARD WRAPPER ===== */
.nfo-cwrap { position: relative; z-index: 10; width: 100%; max-width: 440px; padding: 20px;
  animation: cardIn 1.5s cubic-bezier(0.16,1,0.3,1) forwards; }
@keyframes cardIn { 0% { opacity: 0; transform: translateY(80px) scale(0.92); filter: blur(20px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }

/* ===== CARD ===== */
.nfo-card {
  position: relative;
  background: rgba(8, 5, 14, 0.85);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border-radius: 32px;
  padding: 50px 40px 42px;
  overflow: hidden;
  transform: perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));
  transition: transform 0.12s ease-out;
  display: flex; flex-direction: column; align-items: center; gap: 24px;
  animation: cardFloat 5s infinite alternate ease-in-out;
  box-shadow: 0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(255,40,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05);
}
@keyframes cardFloat {
  0% { transform: perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(0); }
  100% { transform: perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(-5px); }
}

/* ===== CARD GLOSS ===== */
.nfo-card-gloss { position: absolute; top: -1px; right: -1px; width: 220px; height: 220px;
  background: radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 70%);
  pointer-events: none; border-radius: 0 32px 0 0;
  animation: glossFlicker 4s infinite alternate ease-in-out; }
@keyframes glossFlicker { 0% { opacity: 0.2; } 100% { opacity: 0.7; } }

/* ===== FIRE BORDER ===== */
.nfo-card-border, .nfo-card-border-inner { position: absolute; inset: -1px; border-radius: 32px; pointer-events: none; }
.nfo-card-border {
  padding: 1px;
  background: linear-gradient(135deg, rgba(200,30,60,0.5), rgba(150,20,50,0.15) 25%, rgba(100,20,60,0.05) 50%, rgba(180,30,50,0.2) 75%, rgba(220,40,60,0.4) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: borderFire 3s infinite alternate ease-in-out;
}
.nfo-card-border-inner {
  background: linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.02) 40%, transparent 60%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: borderDrift 5s infinite linear;
}
@keyframes borderFire { 0% { opacity: 0.4; } 100% { opacity: 1; } }
@keyframes borderDrift { 0% { background-position: 0% 0%; } 100% { background-position: 200% 200%; } }

/* ===== TOP GLOW ACCENT ===== */
.nfo-flame-acc {
  position: absolute; top: -2px; left: 50%; transform: translateX(-50%);
  width: 140px; height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255,50,80,0.5), rgba(200,30,100,0.3), rgba(255,50,80,0.5), transparent);
  border-radius: 2px; filter: blur(3px);
  animation: topAccent 3s infinite alternate ease-in-out;
}
@keyframes topAccent { 0% { opacity: 0.2; width: 100px; } 100% { opacity: 0.7; width: 160px; } }

/* ===== TITLE ===== */
.nfo-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 2.6rem; font-weight: 900;
  letter-spacing: 4px; text-align: center;
  text-transform: uppercase; line-height: 1;
  background: linear-gradient(135deg, #ff3355 0%, #cc3377 30%, #ff5588 50%, #dd3366 70%, #ff3355 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 300% 300%;
  animation: titleFire 4s infinite ease-in-out;
}
@keyframes titleFire { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

.nfo-title-one {
  font-family: 'Orbitron', sans-serif;
  color: #ff3366;
  -webkit-text-fill-color: #ff3366;
  text-shadow: 0 0 15px rgba(255,50,100,0.6), 0 0 50px rgba(200,30,80,0.3), 0 0 80px rgba(255,50,100,0.15);
  animation: onePulse 3s infinite;
  display: inline-block;
}
@keyframes onePulse {
  0%, 100% { text-shadow: 0 0 15px rgba(255,50,100,0.6), 0 0 50px rgba(200,30,80,0.3); }
  50% { text-shadow: 0 0 25px rgba(255,80,120,0.8), 0 0 70px rgba(200,50,100,0.5); }
}

.nfo-sub {
  font-size: 0.65rem; letter-spacing: 7px; text-transform: uppercase;
  color: rgba(220,180,200,0.5); font-weight: 400;
  margin-top: -10px; text-align: center;
  animation: subFade 3s infinite alternate ease-in-out;
}
@keyframes subFade { 0% { opacity: 0.3; letter-spacing: 7px; } 100% { opacity: 0.7; letter-spacing: 9px; } }

/* ===== FORM ===== */
.nfo-form { width: 100%; display: flex; flex-direction: column; gap: 20px; }
.nfo-fld { display: flex; flex-direction: column; gap: 8px; animation: fldIn 0.8s cubic-bezier(0.16,1,0.3,1) both; }
@keyframes fldIn { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }

.nfo-err { display: flex; align-items: center; gap: 10px;
  background: rgba(255,40,0,0.1); border: 1px solid rgba(255,60,0,0.3);
  border-radius: 12px; padding: 12px 16px; color: #ff6633;
  font-size: 0.85rem; font-weight: 500; animation: shake 0.4s ease, fldIn 0.4s ease both; }
@keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }

.nfo-lbl { font-size: 0.68rem; font-weight: 700; letter-spacing: 1.8px;
  color: rgba(220,180,200,0.7); display: flex; align-items: center; gap: 6px; text-transform: uppercase; }

.nfo-iwrap { position: relative; display: flex; align-items: center; }
.nfo-icn { position: absolute; left: 16px; color: rgba(220,180,200,0.5); pointer-events: none; transition: color 0.3s; }

.nfo-inp {
  width: 100%;
  background: rgba(220,180,200,0.08);
  border: 1.5px solid rgba(220,180,200,0.2);
  border-radius: 14px;
  padding: 16px 20px 16px 48px;
  color: #fff; font-size: 0.95rem; font-family: 'Inter', sans-serif;
  outline: none; transition: all 0.35s ease;
}
.nfo-inp::placeholder { color: rgba(220,180,200,0.35); font-weight: 400; transition: all 0.3s; }
.nfo-inp:focus::placeholder { color: rgba(220,180,200,0.12); transform: translateX(5px); }
.nfo-inp:focus {
  background: rgba(220,180,200,0.12);
  border-color: rgba(255,50,100,0.5);
  box-shadow: 0 0 0 1px rgba(255,50,100,0.15), 0 0 40px rgba(255,50,100,0.1);
}
.nfo-inp:focus ~ .nfo-icn { color: rgba(255,80,120,0.7); }

.nfo-eye { position: absolute; right: 16px; background: none; border: none;
  color: rgba(200,150,180,0.3); cursor: pointer; padding: 4px;
  display: flex; align-items: center; transition: all 0.3s; }
.nfo-eye:hover { color: rgba(200,150,180,0.6); transform: scale(1.1); }

/* ===== META ===== */
.nfo-meta { display: flex; justify-content: space-between; align-items: center;
  font-size: 0.82rem; animation: fldIn 0.8s cubic-bezier(0.16,1,0.3,1) both; }
.nfo-rem { display: flex; align-items: center; gap: 10px; cursor: pointer;
  color: rgba(220,180,200,0.6); user-select: none; transition: color 0.3s; }
.nfo-rem:hover { color: rgba(220,180,200,0.85); }
.nfo-rem input { display: none; }
.nfo-cbox { width: 18px; height: 18px; border: 1.5px solid rgba(220,180,200,0.3);
  border-radius: 5px; position: relative; transition: all 0.3s; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; }
.nfo-rem input:checked + .nfo-cbox { background: #ff3366; border-color: #ff3366;
  box-shadow: 0 0 15px rgba(255,50,100,0.3); animation: cboxPop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes cboxPop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
.nfo-cbox-check { display: none; }
.nfo-rem input:checked + .nfo-cbox .nfo-cbox-check { display: block; width: 5px; height: 9px;
  border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg) translateY(-1px); }

.nfo-forgot { color: rgba(255,100,150,0.65); text-decoration: none; font-weight: 600;
  transition: all 0.3s; font-size: 0.82rem; position: relative; }
.nfo-forgot::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 1px;
  background: #ff3366; transition: width 0.3s; }
.nfo-forgot:hover { color: #ff3366; text-shadow: 0 0 12px rgba(255,50,100,0.3); }
.nfo-forgot:hover::after { width: 100%; }

/* ===== BUTTON ===== */
.nfo-btn {
  width: 100%; display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 18px 24px; border-radius: 16px; border: none;
  background: linear-gradient(135deg, #cc2255, #ff3366, #ff5588, #ff3366, #cc2255);
  background-size: 400% 400%;
  color: #fff; font-family: 'Inter', sans-serif; font-size: 1rem;
  font-weight: 700; letter-spacing: 2px; cursor: pointer; text-transform: uppercase;
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 8px 32px rgba(255,50,100,0.25), 0 0 60px rgba(255,50,100,0.06);
  position: relative; overflow: hidden;
  animation: fldIn 0.8s cubic-bezier(0.16,1,0.3,1) both, btnFire 3s infinite ease-in-out;
}
@keyframes btnFire { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

.nfo-btn::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.06) 40%, rgba(255,200,220,0.03) 50%, transparent 70%);
  background-size: 300% 300%;
  animation: btnShine 4s infinite ease-in-out;
  pointer-events: none;
}
@keyframes btnShine { 0% { background-position: 300% 0; } 50% { background-position: -300% 0; } 100% { background-position: -300% 0; } }

.nfo-btn::after {
  content: ''; position: absolute; inset: -1px; border-radius: 16px;
  background: linear-gradient(135deg, rgba(255,255,255,0.06), transparent 50%, rgba(255,200,220,0.03));
  opacity: 0; transition: opacity 0.4s;
}
.nfo-btn:hover { transform: translateY(-4px) scale(1.01);
  box-shadow: 0 16px 48px rgba(255,50,100,0.35), 0 0 100px rgba(255,50,100,0.12); }
.nfo-btn:hover::after { opacity: 1; }
.nfo-btn:active { transform: translateY(0) scale(0.98); }
.nfo-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

.nfo-ripple { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.15);
  transform: scale(0); animation: rippleOut 0.8s ease-out forwards; pointer-events: none; }
@keyframes rippleOut { to { transform: scale(6); opacity: 0; } }

.nfo-spin { width: 22px; height: 22px; border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== FOOTER ===== */
.nfo-foot { display: flex; align-items: center; gap: 8px;
  font-size: 0.7rem; letter-spacing: 3px; color: rgba(220,180,200,0.45);
  font-weight: 300; text-transform: uppercase; padding-top: 2px;
  animation: footFade 3s infinite alternate ease-in-out; }
@keyframes footFade { 0% { opacity: 0.3; } 100% { opacity: 0.7; } }
.nfo-dot { color: rgba(255,100,150,0.4); font-weight: 700; }

/* ===== RESPONSIVE ===== */
@media (max-width: 500px) {
  .nfo-card { padding: 38px 24px 32px; border-radius: 24px; }
  .nfo-title { font-size: 2rem; letter-spacing: 2px; }
  .nfo-sub { font-size: 0.55rem; letter-spacing: 5px; }
  .nfo-btn { padding: 16px 20px; font-size: 0.9rem; }
  .nfo-meta { flex-direction: column; gap: 12px; align-items: flex-start; }
  .nfo-cwrap { padding: 12px; }
}
`}</style>
    </div>
  );
};
