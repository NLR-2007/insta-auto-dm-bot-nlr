import React, { useState } from "react";
import { Lock, User, AtSign, ArrowRight, ArrowLeft, Loader, Eye, EyeOff, Send, BarChart3, Shield, MessageSquare, Mail, Sparkles, CheckCircle2 } from "lucide-react";
import { apiLogin, apiRegister } from "../api";

export default function AuthPage({ onAuthSuccess, onBackToHome }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (mode === "login") {
        const data = await apiLogin(form.username, form.password);
        onAuthSuccess(data);
      } else {
        if (!form.email.includes("@")) {
          setError("Please enter a valid email address.");
          return;
        }
        if (form.password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        await apiRegister(form.username, form.email, form.password);
        setSuccess("Account created! Please sign in.");
        setMode("login");
        setForm({ username: form.username, email: "", password: "" });
      }
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setSuccess("");
    setForm({ username: "", email: "", password: "" });
  };

  const features = [
    { icon: Send, title: "Instagram DM Engine", desc: "Comment-triggered keyword DMs with cascading delivery" },
    { icon: MessageSquare, title: "Telegram Suite", desc: "Scheduled posts, multi-bot management & auto-moderation" },
    { icon: BarChart3, title: "Real-Time Dashboard", desc: "Live logs, send/fail tracking, and unified analytics" },
    { icon: Shield, title: "Safe & Compliant", desc: "Passwordless auth, opt-out blocklists, rate limiting" },
  ];

  return (
    <div className="auth-page">
      <div className="auth-shell">
      {/* Left: Hero branding panel */}
      <section className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-logo">
            <div className="auth-hero-icon">
              <Mail size={24} />
            </div>
            <div><h1 className="auth-hero-title">Lyvora</h1><span className="auth-logo-caption">Growth workspace</span></div>
          </div>

          <div className="auth-hero-kicker"><Sparkles size={13}/> One workspace. Two powerful channels.</div>
          <h2 className="auth-hero-heading">Turn conversations into <em>meaningful growth.</em></h2>
          <p className="auth-hero-subtitle">Manage Instagram outreach and Telegram communities from one focused, reliable workspace.</p>

          <div className="auth-features">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="auth-feature-item">
                <div className="auth-feature-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="auth-feature-title">{title}</p>
                  <p className="auth-feature-desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-trust-row"><span><CheckCircle2 size={13}/> Secure workspace</span><span><CheckCircle2 size={13}/> Real-time visibility</span></div>

          <div className="auth-hero-footer">
            <p>Developed by</p>
            <p className="auth-hero-company">NLR GROUP OF COMPANIES</p>
          </div>
        </div>
      </section>

      {/* Right: Auth form */}
      <aside className="auth-form-side">
        <div className="auth-card">
          <div className="auth-card-header">
            {onBackToHome && (
              <button 
                type="button" 
                className="auth-back-home-link"
                onClick={onBackToHome}
                style={{
                  background: "none", border: "none", color: "var(--text-secondary)",
                  fontSize: "13px", cursor: "pointer", display: "inline-flex",
                  alignItems: "center", gap: "6px", marginBottom: "16px", padding: 0,
                  fontFamily: "inherit", fontWeight: 500, transition: "color 0.2s"
                }}
              >
                <ArrowLeft size={15} /> Back to Home
              </button>
            )}
            <h2 className="auth-card-title">
              {mode === "login" ? "Welcome back" : "Get started"}
            </h2>
            <p className="auth-card-subtitle">
              {mode === "login"
                ? "Sign in to your dashboard"
                : "Create your account to begin"}
            </p>
            <div className="auth-mobile-brand"><div className="auth-mobile-mark"><Mail size={18}/></div><span>Lyvora</span></div>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => switchMode("register")}
              type="button"
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <span>!</span> {error}
            </div>
          )}
          {success && (
            <div className="auth-alert auth-alert-success">
              <span>&#10003;</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-username">Username</label>
              <div className="auth-input-wrap">
                <User size={15} className="auth-input-icon" />
                <input
                  id="auth-username"
                  name="username"
                  type="text"
                  className="auth-input"
                  placeholder="yourname"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-email">Email</label>
                <div className="auth-input-wrap">
                  <AtSign size={15} className="auth-input-icon" />
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={15} className="auth-input-icon" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  className="auth-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="auth-footer-note">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Register here" : "Sign in"}
            </button>
          </p>

          {/* Mobile-only developer credit */}
          <p className="auth-mobile-credit">
            Developed by <strong>NLR GROUP OF COMPANIES</strong>
          </p>
        </div>
      </aside>
      </div>
    </div>
  );
}
