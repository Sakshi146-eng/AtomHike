import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Target, Calendar, FileBarChart, Shield, Unlock,
  Activity, ArrowRight, CheckCircle, Clock
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import toast from "react-hot-toast";
import { listUsers, updateUser } from "../../api/users";
import { listCycles } from "../../api/cycles";
import { getAllGoals, unlockGoal } from "../../api/goals";
import { getAuditTrail } from "../../api/reports";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import StatusBadge from "../../components/common/StatusBadge";
import { fmtDateTime, fmtDate } from "../../utils/dateHelpers";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [goals, setGoals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState({});

  const load = () =>
    Promise.all([
      listUsers(),
      listCycles().catch(() => ({ data: [] })),
      getAllGoals().catch(() => ({ data: [] })),
      getAuditTrail({ take: 8 }).catch(() => ({ data: [] })),
    ])
      .then(([ur, cr, gr, ar]) => {
        setUsers(ur.data || []);
        setCycles(cr.data || []);
        setGoals(Array.isArray(gr.data) ? gr.data : []);
        setAudit(Array.isArray(ar.data) ? ar.data : ar.data?.items || []);
      })
      .catch(() => toast.error("Failed to sync system data"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  if (loading) return <PageSkeleton />;

  // Metric computations
  const totalUsers = users.length;
  const activeEmployees = users.filter((u) => u.role === "EMPLOYEE" && u.isActive).length;
  const goalsThisCycle = goals.length;
  const pendingApprovals = goals.filter((g) => g.status === "PENDING_APPROVAL").length;
  const systemStatus = "Operational";

  const activeCycle = cycles.find((c) => c.isActive) || cycles[0];

  // 1. Chart: Goals Created Over Time (Calculated dynamically from live backend goals)
  const getGoalsCreatedOverTime = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        monthLabel: months[d.getMonth()],
        Count: 0
      });
    }
    goals.forEach(g => {
      if (!g.createdAt) return;
      const created = new Date(g.createdAt);
      last6Months.forEach(m => {
        if (created.getFullYear() === m.year && created.getMonth() === m.monthIndex) {
          m.Count++;
        }
      });
    });
    let cumulative = 0;
    return last6Months.map(m => {
      cumulative += m.Count;
      return {
        month: m.monthLabel,
        Count: cumulative
      };
    });
  };
  const lineData = getGoalsCreatedOverTime();

  // 2. Chart: Goal Status Distribution (Completely live values)
  const approvedCount = goals.filter((g) => g.status === "APPROVED").length;
  const pendingCount = pendingApprovals;
  const draftCount = goals.filter((g) => g.status === "DRAFT").length;
  const rejectedCount = goals.filter((g) => g.status === "REJECTED").length;
  const lockedCount = goals.filter((g) => g.status === "LOCKED").length;

  const donutData = [
    { name: "Approved", value: approvedCount, color: "#16A34A" },
    { name: "Pending Approval", value: pendingCount, color: "#3B82F6" },
    { name: "Draft", value: draftCount, color: "#3D3D5C" },
    { name: "Rejected", value: rejectedCount, color: "#DC2626" },
    { name: "Locked", value: lockedCount, color: "#1C1C2E" },
  ].filter((d) => d.value > 0);

  // 3. User toggle status handler
  const handleToggleActive = async (user) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      toast.success(`${user.name} is now ${!user.isActive ? "Active" : "Inactive"}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
      );
    } catch {
      toast.error("Failed to update status");
    }
  };

  // 4. Upcoming cycles with countdown helper
  const getDaysRemaining = (endDateStr) => {
    const end = new Date(endDateStr);
    const today = new Date();
    const diff = end - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getCountdownBadge = (days) => {
    if (days < 0) return { label: "Expired", class: "bg-slate-100 text-slate-500" };
    if (days <= 7) return { label: `${days}d left`, class: "bg-status-danger-light text-status-danger" };
    if (days <= 30) return { label: `${days}d left`, class: "bg-status-warning-light text-status-warning" };
    return { label: `${days}d left`, class: "bg-status-success-light text-status-success" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary font-display">System Overview</h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            AtomQuest administration metrics, real-time activity indicators, and global configs.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-primary-tint/30 border border-primary-tint px-3 py-1.5 rounded-lg text-xs font-sans text-primary">
          <span className="font-semibold">Active Cycle:</span>
          <span>{activeCycle ? activeCycle.name : "None configured"}</span>
        </div>
      </div>

      {/* 5 Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, accent: "text-accent" },
          { label: "Active Employees", value: activeEmployees, icon: Users, accent: "text-accent" },
          { label: "Goals This Cycle", value: goalsThisCycle, icon: Target, accent: "text-accent" },
          { label: "Pending Approvals", value: pendingApprovals, icon: Clock, accent: "text-status-warning" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-sans font-medium text-ink-secondary uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.accent}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${stat.accent}`}>{stat.value}</div>
          </motion.div>
        ))}

        {/* 5th stat: System Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-sans font-medium text-ink-secondary uppercase tracking-wider">System Status</span>
            <Activity className="w-4 h-4 text-status-success animate-pulse" />
          </div>
          <div className="flex items-center mt-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-status-success-light text-status-success border border-status-success/10">
              {systemStatus}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Line chart "Goals Created Over Time" */}
        <div className="card p-5">
          <h3 className="text-[15px] font-bold text-ink-primary font-sans mb-4 flex items-center justify-between">
            <span>Goals Created Over Time</span>
            <span className="text-[11px] font-normal text-ink-secondary font-mono">Last 6 Months</span>
          </h3>
          <div className="bg-[#F9F9FB] rounded-lg p-2 border border-surface-border">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4EF" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "Roboto Mono", fill: "#5A5A7A" }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Roboto Mono", fill: "#5A5A7A" }} />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E4E4EF",
                    fontFamily: "Outfit",
                    fontSize: "12px",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Count"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ fill: "#3B82F6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Donut chart "Goal Status Distribution" */}
        <div className="card p-5 flex flex-col justify-between">
          <h3 className="text-[15px] font-bold text-ink-primary font-sans mb-2">Goal Status Distribution</h3>
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
            {donutData.length === 0 ? (
              <div className="w-full text-center py-10 text-ink-secondary text-sm font-sans">
                No active goals to display.
              </div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Goals`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold font-mono text-ink-primary">{goals.length}</span>
                    <span className="text-[10px] uppercase font-sans tracking-wide text-ink-secondary">Goals</span>
                  </div>
                </div>
                {/* Legend with Outfit 13px */}
                <div className="w-full sm:w-1/2 space-y-2">
                  {donutData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-sans text-ink-primary">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="font-medium text-[13px]">{d.name}</span>
                      </div>
                      <span className="font-mono text-ink-secondary">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lower split panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Recently Active Users table */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-ink-primary font-sans">Recently Active Users</h3>
            <Link to="/admin/users" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1">
              Manage Users <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-border bg-[#F4F4FA]">
                  {["Name", "Role", "Last Active", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-[11px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {users.slice(0, 5).map((user) => (
                  <tr key={user.id} className="hover:bg-primary-tint/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-tint text-primary-mid flex items-center justify-center text-xs font-bold shrink-0">
                          {user.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink-primary truncate">{user.name}</p>
                          <p className="text-[10px] text-ink-secondary truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.role === "ADMIN"
                          ? "bg-primary text-white"
                          : user.role === "MANAGER"
                            ? "bg-accent-light text-accent"
                            : "bg-primary-tint text-primary-mid"
                          }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink-secondary">
                      {fmtDateTime(user.updatedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={user.isActive}
                          onChange={() => handleToggleActive(user)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Upcoming Cycle Deadlines list */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-ink-primary font-sans">Upcoming Cycle Deadlines</h3>
              <Link to="/admin/cycles" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1">
                Configure Cycles <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {cycles.length === 0 ? (
                <div className="text-center py-6 text-xs text-ink-secondary">No cycles defined yet.</div>
              ) : (
                cycles.map((c) => {
                  const daysLeft = getDaysRemaining(c.goalSettingEnd);
                  const pill = getCountdownBadge(daysLeft);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-surface-border hover:bg-primary-tint/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[14px] font-sans font-semibold text-ink-primary truncate">{c.name}</p>
                        <p className="text-[11px] font-mono text-ink-secondary mt-0.5">
                          Goal Deadline: {fmtDate(c.goalSettingEnd)}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pill.class}`}>
                        {pill.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
