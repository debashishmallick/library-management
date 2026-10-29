import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../context/ThemeContext";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
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
            <span className="auth-story-kicker"><Sparkles size={14} /> Make room for a new chapter</span>
            <h1>Find your next favorite.</h1>
            <p>Join your library community and keep every borrowed book, return date, and discovery in one place.</p>
            <div className="auth-feature">
              <span className="auth-feature-icon"><BookOpen size={17} /></span>
              <span>Browse the collection and follow your reading.</span>
            </div>
          </div>
          <span className="auth-story-footer">A better day at the library starts with a good page.</span>
        </aside>
        <form onSubmit={handleSubmit} className="auth-card">
          <h2>Create your account</h2>
          <p className="auth-card-description">A few details and you’re ready to explore the collection.</p>

          {[
            ["name", "Full name", "text", "name", "Your name"],
            ["email", "Email address", "email", "email", "you@example.com"],
            ["password", "Password (at least 6 characters)", "password", "new-password", "Create a password"],
          ].map(([name, label, type, autoComplete, placeholder]) => (
            <div key={name} className="auth-field">
              <label htmlFor={`register-${name}`}>{label}</label>
              <input
                id={`register-${name}`}
                type={type}
                name={name}
                autoComplete={autoComplete}
                minLength={name === "password" ? 6 : undefined}
                required
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
              />
            </div>
          ))}

          <button type="submit" disabled={submitting} className="auth-submit">
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}