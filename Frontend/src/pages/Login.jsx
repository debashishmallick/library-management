import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../context/ThemeContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-topbar">
        <Link to="/login" className="brand">
          <span className="brand-mark"><BookOpen size={20} strokeWidth={2.2} /></span>
          <span className="brand-copy">
            <span className="brand-name">Page &amp; Pine</span>
            <span className="brand-caption">Library workspace</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
      <div className="auth-layout">
        <aside className="auth-story">
          <div className="auth-story-content">
            <span className="auth-story-kicker"><Sparkles size={14} /> A little more room to read</span>
            <h1>Every great story starts here.</h1>
            <p>Your library, thoughtfully organized. Pick up where you left off and find your next favorite.</p>
            <div className="auth-feature">
              <span className="auth-feature-icon"><BookOpen size={17} /></span>
              <span>One calm place for books, loans, and members.</span>
            </div>
          </div>
          <span className="auth-story-footer">A better day at the library starts with a good page.</span>
        </aside>
        <form onSubmit={handleSubmit} className="auth-card">
          <h2>Welcome back</h2>
          <p className="auth-card-description">Sign in to continue to your library workspace.</p>

          <div className="auth-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" disabled={submitting} className="auth-submit">
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="auth-switch">
            New to the library? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </main>
  );
}