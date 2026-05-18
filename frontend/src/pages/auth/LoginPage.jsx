import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Target, BarChart2, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/loaders/Skeletons";
import loginBg from "../../assets/login_bg.png";

const ROLE_REDIRECTS = {
  EMPLOYEE: "/employee/dashboard",
  MANAGER: "/manager/dashboard",
  ADMIN: "/admin/dashboard",
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(ROLE_REDIRECTS[user.role] || "/");
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid email or password";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-bg font-body">
      {/* ── Left panel (55%) ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col text-white p-12 relative overflow-hidden">
        {/* Blurred Theme-Matched Background Image Layer */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-[4px] scale-105 z-0"
          style={{ backgroundImage: `url(${loginBg})` }}
        />

        {/* Premium Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/85 z-0" />

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Logo */}
          <div>
            <span className="font-display font-bold text-[32px] tracking-tight text-white">AtomHike</span>
          </div>

          {/* Headline */}
          <div className="my-auto py-12">
            <h1 className="font-display font-bold text-[46px] leading-[1.15] mb-5 text-white drop-shadow-md">
              Track Goals.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                Drive Performance.
              </span>
            </h1>
            <p className="font-sans text-[16px] text-white/80 max-w-md leading-relaxed drop-shadow">
              The enterprise-grade goal management portal that keeps every employee, manager, and HR team perfectly in sync.
            </p>
          </div>

          {/* Feature Callouts */}
          <div className="flex gap-8 border-t border-white/10 pt-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="font-sans font-medium text-sm text-white/90">Goals</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="font-sans font-medium text-sm text-white/90">Check-ins</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="font-sans font-medium text-sm text-white/90">Reports</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel (45%) ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <span className="font-display font-bold text-[32px] tracking-tight text-primary">AtomHike</span>
          </div>

          <div className="card p-8">
            <h2 className="font-display font-bold text-[28px] text-primary mb-6 text-center">Welcome Back</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="label">Email address</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-primary transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-status-danger bg-status-danger-light border border-red-200 rounded-md px-3 py-2.5 font-sans">
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-[15px]"
              >
                {loading ? <><Spinner /> Signing in…</> : "Sign In"}
              </button>

              <div className="text-center mt-4">
                <a href="#" className="font-sans text-sm text-accent hover:text-blue-700 transition-colors">
                  Forgot password?
                </a>
              </div>
            </form>
          </div>

          {/* Demo hint */}
          <div className="mt-8 p-4 rounded-[10px] bg-primary-tint border border-surface-border">
            <p className="font-sans text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Demo Accounts</p>
            <div className="space-y-1.5 font-sans text-xs text-ink-primary">
              <p><span className="font-medium text-primary">Admin:</span> admin@atomquest.dev / Admin@123</p>
              <p><span className="font-medium text-primary">Manager:</span> manager1@atomquest.dev / Manager@123</p>
              <p><span className="font-medium text-primary">Employee:</span> alice@atomquest.dev / Employee@123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 font-sans text-[12px] text-ink-secondary">
          © 2026 AtomHike. All rights reserved.
        </div>
      </div>
    </div>
  );
}
