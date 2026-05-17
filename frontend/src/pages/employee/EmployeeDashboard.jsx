import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Target, CheckSquare, Award, ArrowRight, AlertTriangle, XCircle, Pencil, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "../../context/AuthContext";
import { getMyGoals } from "../../api/goals";
import { getActiveCycle } from "../../api/cycles";
import { PageSkeleton } from "../../components/loaders/Skeletons";
import StatusBadge from "../../components/common/StatusBadge";

const DISMISSED_KEY = "pms_dismissed_rejections";
const getDismissed  = () => JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
const dismissGoal   = (id) => {
  const list = getDismissed();
  if (!list.includes(id)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...list, id]));
  }
};

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9"];

function StatCard({ icon: Icon, label, value, sub, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="card p-5">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [goals,     setGoals]     = useState([]);
  const [cycle,     setCycle]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [dismissed, setDismissed] = useState(getDismissed);

  const handleDismiss = (id) => {
    dismissGoal(id);
    setDismissed(getDismissed());
  };

  useEffect(() => {
    Promise.all([getMyGoals(), getActiveCycle().catch(() => ({ data: null }))])
      .then(([gr, cr]) => { setGoals(gr.data); setCycle(cr.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  const total   = goals.length;
  const locked  = goals.filter(g => g.status === "LOCKED").length;
  const pending = goals.filter(g => g.status === "PENDING_APPROVAL").length;
  const draft   = goals.filter(g => g.status === "DRAFT").length;
  const rejected = goals.filter(g => g.status === "REJECTED");

  const pieData = [
    { name: "Approved",  value: locked   },
    { name: "Pending",   value: pending  },
    { name: "Draft",     value: draft    },
    { name: "Rejected",  value: rejected.length },
  ].filter(d => d.value > 0);

  const barData = goals.map(g => ({
    name: g.title.slice(0, 16) + (g.title.length > 16 ? "…" : ""),
    weight: g.weightage,
  }));

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Good day, {user?.name?.split(" ")[0]} 👋</h2>
          <p className="text-slate-500 text-sm mt-0.5">{cycle ? `${cycle.name} — Active Cycle` : "No active cycle"}</p>
        </div>
        <Link to="/employee/goals" className="btn-primary text-sm">
          Manage Goals <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ── REJECTED GOALS NOTIFICATIONS (dismissible) ── */}
      <AnimatePresence>
        {rejected.filter(g => !dismissed.includes(g.id)).map(goal => (
          <motion.div key={goal.id}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">⚠ Goal Rejected: <span className="italic">{goal.title}</span></p>
                {goal.rejectionReason && (
                  <p className="text-xs text-red-600 mt-0.5 leading-relaxed">↩ {goal.rejectionReason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/employee/goals"
                  className="btn-secondary text-xs py-1.5 border-red-200 text-red-700 hover:bg-red-100">
                  <Pencil className="w-3 h-3" /> Go to Goals
                </Link>
                <button onClick={() => handleDismiss(goal.id)}
                  title="Dismiss"
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Draft weightage warning */}
      {draft > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{draft} draft goal{draft > 1 ? "s" : ""} not submitted</p>
            <p className="text-xs text-amber-600">Submit them for manager approval when ready.</p>
          </div>
          <Link to="/employee/goals" className="ml-auto btn-secondary text-xs py-1.5">Go to Goals</Link>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target}        label="Total Goals" value={total}            sub="This cycle"       color="bg-brand-600"   delay={0.05} />
        <StatCard icon={Award}         label="Approved"    value={locked}           sub="Locked & active"  color="bg-emerald-500" delay={0.1}  />
        <StatCard icon={AlertTriangle} label="Pending"     value={pending}          sub="Awaiting manager" color="bg-amber-500"   delay={0.15} />
        <StatCard icon={XCircle}       label="Rejected"    value={rejected.length}  sub="Need your action" color={rejected.length ? "bg-red-500" : "bg-slate-400"} delay={0.2} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Goal Status Distribution</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-1">
                {pieData.map((d, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No goals yet</div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Goal Weightage Breakdown</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [`${v}%`, "Weightage"]} />
                <Bar dataKey="weight" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No goals yet</div>
          )}
        </div>
      </div>

      {/* Recent goals */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700 text-sm">All Goals This Cycle</h3>
          <Link to="/employee/goals" className="text-xs text-brand-600 hover:underline font-medium">Manage →</Link>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No goals yet. <Link to="/employee/goals" className="text-brand-600">Create your first goal →</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {goals.map(goal => (
              <div key={goal.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{goal.title}</p>
                  <p className="text-xs text-slate-400">{goal.thrustArea?.name} · {goal.weightage}% weight</p>
                </div>
                <StatusBadge status={goal.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
