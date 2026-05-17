import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Zap, TrendingUp, Target, Award } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/loaders/Skeletons";

const ROLE_REDIRECTS = {
  EMPLOYEE: "/employee/dashboard",
  MANAGER:  "/manager/dashboard",
  ADMIN:    "/admin/dashboard",
};

const FLOATING_STATS = [
  { icon: TrendingUp, label: "Goals Achieved",  value: "87%",  color: "text-emerald-400" },
  { icon: Target,     label: "Active Goals",     value: "2,341",color: "text-sky-400"     },
  { icon: Award,      label: "Top Performers",   value: "124",  color: "text-amber-400"   },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

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
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-5/12 flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)" }}>

        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <motion.div key={i}
              className="absolute rounded-full opacity-10 bg-white"
              style={{
                width: [400, 300, 200][i], height: [400, 300, 200][i],
                top: ["-10%", "40%", "70%"][i], left: ["-5%", "60%", "20%"][i],
              }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.15, 0.08] }}
              transition={{ duration: 4 + i * 2, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col p-10">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">AtomQuest</p>
              <p className="text-indigo-300 text-xs">Performance Management</p>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            className="mb-10">
            <h2 className="text-4xl font-bold text-white leading-tight mb-3">
              Align.<br />Track.<br />Achieve.
            </h2>
            <p className="text-indigo-200 text-sm leading-relaxed">
              The enterprise-grade goal management portal that keeps every employee, manager, and HR team perfectly in sync.
            </p>
          </motion.div>

          {/* Floating stats cards */}
          <div className="space-y-3 mb-10">
            {FLOATING_STATS.map(({ icon: Icon, label, value, color }, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-none">{value}</p>
                  <p className="text-indigo-200 text-xs">{label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-center text-indigo-400 text-xs pb-5">
          © 2025 AtomQuest. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">AtomQuest PMS</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-8">Sign in to access your performance portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full justify-center py-2.5 text-sm"
            >
              {loading ? <><Spinner /> Signing in…</> : "Sign in"}
            </motion.button>
          </form>

          {/* Demo hint */}
          <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Demo Accounts</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p><span className="font-medium">Admin:</span> admin@atomquest.dev / Admin@123</p>
              <p><span className="font-medium">Manager:</span> manager1@atomquest.dev / Manager@123</p>
              <p><span className="font-medium">Employee:</span> alice@atomquest.dev / Employee@123</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
