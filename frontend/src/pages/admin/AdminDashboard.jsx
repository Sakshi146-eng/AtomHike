import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Target, Calendar, FileBarChart, Shield, Unlock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import toast from "react-hot-toast";
import { listUsers } from "../../api/users";
import { listCycles, getActiveCycle } from "../../api/cycles";
import { getAllGoals, unlockGoal } from "../../api/goals";
import { getAuditTrail } from "../../api/reports";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import StatusBadge from "../../components/common/StatusBadge";
import { fmtDateTime } from "../../utils/dateHelpers";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#0ea5e9", "#ef4444"];

export default function AdminDashboard() {
  const [users,  setUsers]  = useState([]);
  const [cycle,  setCycle]  = useState(null);
  const [goals,  setGoals]  = useState([]);
  const [audit,  setAudit]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState({});
  const [goalsFilter, setGoalsFilter] = useState("ALL");

  const load = () =>
    Promise.all([
      listUsers(),
      getActiveCycle().catch(() => ({ data: null })),
      getAllGoals().catch(() => ({ data: [] })),
      getAuditTrail({ limit: 8 }).catch(() => ({ data: [] })),
    ]).then(([ur, cr, gr, ar]) => {
      setUsers(ur.data);
      setCycle(cr.data);
      setGoals(Array.isArray(gr.data) ? gr.data : []);
      setAudit(Array.isArray(ar.data) ? ar.data : ar.data?.items || []);
    }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton />;

  const employees = users.filter(u => u.role === "EMPLOYEE").length;
  const managers  = users.filter(u => u.role === "MANAGER").length;

  const roleData = [
    { name: "Employees", value: employees },
    { name: "Managers",  value: managers  },
    { name: "Admins",    value: users.filter(u => u.role === "ADMIN").length },
  ];

  const STATUS_FILTERS = ["ALL", "DRAFT", "PENDING_APPROVAL", "LOCKED", "REJECTED"];
  const filteredGoals = goalsFilter === "ALL" ? goals : goals.filter(g => g.status === goalsFilter);

  const handleUnlock = async (goalId) => {
    setUnlocking(u => ({ ...u, [goalId]: true }));
    try {
      await unlockGoal(goalId);
      toast.success("Goal unlocked — employee can now edit");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Unlock failed");
    } finally {
      setUnlocking(u => ({ ...u, [goalId]: false }));
    }
  };

  const QUICK_LINKS = [
    { to: "/admin/users",        icon: Users,       label: "Users",        count: `${users.length} total`,  color: "bg-brand-50 text-brand-700 border-brand-200"  },
    { to: "/admin/cycles",       icon: Calendar,    label: "Cycles",       count: cycle?.name || "None",    color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { to: "/admin/thrust-areas", icon: Shield,      label: "Thrust Areas", count: "Manage",                color: "bg-violet-50 text-violet-700 border-violet-200" },
    { to: "/admin/reports",      icon: FileBarChart,label: "Reports",      count: "Export Data",           color: "bg-amber-50 text-amber-700 border-amber-200"  },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Admin Overview</h2>
        <p className="text-sm text-slate-500">
          {cycle ? `Active Cycle: ${cycle.name}` : "No active cycle"} · {users.length} total users · {goals.length} goals
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,    label: "Total Users",  value: users.length,  color: "bg-brand-600"   },
          { icon: Users,    label: "Employees",    value: employees,     color: "bg-sky-500"     },
          { icon: Target,   label: "Total Goals",  value: goals.length,  color: "bg-violet-500"  },
          { icon: Calendar, label: "Active Cycle", value: cycle ? "✓" : "None", color: cycle ? "bg-emerald-500" : "bg-slate-400" },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="card p-5">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts + Quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">User Roles</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={3}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-1">
            {roleData.map((d, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(({ to, icon: Icon, label, count, color }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-3 p-3 rounded-xl border ${color} hover:opacity-80 transition-opacity`}>
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-xs opacity-70 truncate">{count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── ALL GOALS WITH UNLOCK ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">All Goals — {filteredGoals.length} shown</h3>
          {/* Status filter tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setGoalsFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                  ${goalsFilter === s ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
                {s === "ALL" ? "All" : s === "PENDING_APPROVAL" ? "Pending" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        {filteredGoals.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No goals match this filter</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Employee", "Goal Title", "Thrust Area", "Weight", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGoals.slice(0, 30).map((goal, i) => (
                <motion.tr key={goal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-700">{goal.owner?.name || "—"}</p>
                    <p className="text-slate-400">{goal.owner?.department}</p>
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    <p className="font-medium text-slate-700 truncate">{goal.title}</p>
                    {goal.rejectionReason && <p className="text-red-400 truncate">↩ {goal.rejectionReason}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{goal.thrustArea?.name || "—"}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{goal.weightage}%</td>
                  <td className="px-4 py-2.5"><StatusBadge status={goal.status} /></td>
                  <td className="px-4 py-2.5">
                    {goal.status === "LOCKED" && (
                      <button onClick={() => handleUnlock(goal.id)} disabled={unlocking[goal.id]}
                        className="btn-ghost text-xs py-1 text-amber-600 hover:bg-amber-50">
                        {unlocking[goal.id] ? <Spinner size="sm" /> : <Unlock className="w-3 h-3" />} Unlock
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent audit */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
          <Link to="/admin/audit" className="text-xs text-brand-600 hover:underline font-medium">View all →</Link>
        </div>
        {audit.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {audit.slice(0, 6).map((a, i) => (
              <div key={a.id || i} className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                <span className="font-medium text-slate-700">{a.action}</span>
                <span className="text-slate-400">on</span>
                <span className="text-slate-600">{a.entityType}</span>
                <span className="ml-auto text-slate-400 shrink-0">{fmtDateTime(a.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
