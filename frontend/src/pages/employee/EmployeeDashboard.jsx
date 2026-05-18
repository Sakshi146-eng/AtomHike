import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  CheckSquare,
  Award,
  TrendingUp,
  Calendar,
  ArrowRight,
  Activity,
  Clock,
  Plus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Pencil,
  X
} from "lucide-react";
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

const COLORS = ["#4A3AFF", "#00C566", "#FFBB00", "#FF4C4C", "#00B4D8"];

function StatCard({ icon: Icon, label, value, sub, color, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="card border border-surface-border bg-white rounded-2xl p-5 shadow-sm">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="font-display text-[24px] font-bold text-primary">{value}</p>
      <p className="font-sans text-[13px] font-medium text-ink-secondary mt-0.5">{label}</p>
      {sub && <p className="font-sans text-[11px] text-ink-secondary/70 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const getGoalProgress = (goal) => {
    if (!goal.checkIns || goal.checkIns.length === 0) return 0;
    const sorted = [...goal.checkIns].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return Math.round(sorted[0].achievementPct || 0);
  };

  if (loading) return <PageSkeleton />;

  const activeGoals = goals.length;
  const approvedGoals = goals.filter(g => g.status === "LOCKED").length;
  const rejected = goals.filter(g => g.status === "REJECTED");

  const lockedGoals = goals.filter(g => g.status === "LOCKED");
  const totalWeight = lockedGoals.reduce((sum, g) => sum + (g.weightage || 0), 0);
  const weightedSum = lockedGoals.reduce((sum, g) => sum + (getGoalProgress(g) * (g.weightage || 0)), 0);
  const overallProgress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  const activeWindow = cycle?.quarterWindows?.find(w => w.isActive);
  const checkinsDue = goals.filter(g => {
    if (g.status !== "LOCKED") return false;
    if (!activeWindow) return false;
    const hasCheckin = g.checkIns?.some(c => c.quarterWindowId === activeWindow.id);
    return !hasCheckin;
  }).length;

  const getCycleCompletion = (c) => {
    if (!c) return 0;
    const start = new Date(c.goalSettingStart);
    const end = new Date(c.goalSettingEnd);
    const today = new Date();
    if (today > end) return 100;
    if (today < start) return 0;
    const total = end - start;
    const elapsed = today - start;
    return Math.round((elapsed / total) * 100);
  };
  const cycleCompletion = cycle ? getCycleCompletion(cycle) : 0;

  // Flatten and sort recent check-ins across all goals
  const allCheckIns = goals.flatMap(g =>
    (g.checkIns || []).map(c => ({
      ...c,
      goalTitle: g.title,
      thrustArea: g.thrustArea?.name
    }))
  ).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10">

      {/* ── REJECTED GOALS NOTIFICATIONS (dismissible) ── */}
      <AnimatePresence>
        {rejected.filter(g => !dismissed.includes(g.id)).map(goal => (
          <motion.div key={goal.id}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[14px] font-bold text-red-800">Goal Rejected: <span className="italic font-medium">{goal.title}</span></p>
                {goal.rejectionReason && (
                  <p className="font-sans text-[12px] text-red-600 mt-1 leading-relaxed">↩ {goal.rejectionReason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/employee/goals"
                  className="btn-secondary text-xs py-1.5 border-red-200 text-red-700 hover:bg-red-100/60 rounded-xl">
                  <Pencil className="w-3 h-3" /> Go to Goals
                </Link>
                <button onClick={() => handleDismiss(goal.id)}
                  title="Dismiss"
                  className="p-1.5 rounded-xl text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Welcome Banner Hero ── */}
      <div className="bg-white rounded-2xl border border-surface-border p-6 md:p-8 relative overflow-hidden shadow-sm">
        {/* Decorative backdrop gradients */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-accent/5 to-transparent pointer-events-none" />
        <div className="absolute right-12 top-[-20%] w-60 h-60 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />

    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
      <div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-accent-light text-accent text-xs font-semibold mb-3">
          Employee Portal
        </span>
        <h2 className="font-display text-3xl text-primary font-bold mb-2">
          Welcome Back, {user?.name?.split(" ")[0]}!
        </h2>
        <p className="font-sans text-sm text-ink-secondary max-w-xl leading-relaxed">
          Track your targets, log regular check-ins, and keep your professional goals perfectly aligned.
          {cycle && ` You are currently active in the standard ${cycle.name} performance cycle.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 shrink-0">
        <Link to="/employee/goals" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Goal
        </Link>
        <Link to="/employee/goals" className="btn-secondary">
          View All Goals <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </div>

  {/* ── Two Column Layout ── */ }
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

    {/* ── Left Main Column (8 cols) ── */}
    <div className="lg:col-span-8 space-y-6">

      {/* Active Goals Section */}
      <div className="bg-white rounded-xl border border-surface-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-lg font-bold text-primary">Active Goals</h3>
            <p className="font-sans text-xs text-ink-secondary">Review and update progress on your current cycle goals</p>
          </div>
          <Link to="/employee/goals" className="text-sm font-semibold text-accent hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {goals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary-tint/50 flex items-center justify-center text-ink-secondary/70 mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h4 className="font-display text-base font-bold text-primary mb-1">No Active Goals</h4>
            <p className="font-sans text-sm text-ink-secondary max-w-sm mb-5">
              You haven't added any goals for this cycle yet. Create one now to begin tracking progress.
            </p>
            <Link to="/employee/goals" className="btn-accent">
              Create Goal
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.slice(0, 4).map((goal, idx) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className="p-4 rounded-xl border border-surface-border hover:border-accent/40 bg-[#F9F9FB]/40 hover:bg-white hover:shadow-md transition-all duration-200 group flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-accent/10 text-accent font-sans text-[10px] font-semibold uppercase tracking-wider">
                      {goal.thrustArea?.name || "General"}
                    </span>
                    <span className="font-sans text-xs text-ink-secondary">Weight: {goal.weightage}%</span>
                  </div>
                  <h4 className="font-display text-[15px] font-bold text-primary group-hover:text-accent transition-colors truncate">
                    {goal.title}
                  </h4>
                </div>

                {/* Progress Bar */}
                <div className="w-full md:w-44 shrink-0">
                  <div className="flex justify-between font-sans text-[11px] text-ink-secondary mb-1">
                    <span>Progress</span>
                    <span className="font-mono font-bold text-primary">{getGoalProgress(goal)}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${getGoalProgress(goal)}%` }}
                    />
                  </div>
                </div>

                {/* Status Badge & Checkin Actions */}
                <div className="flex items-center justify-between md:w-32 md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t border-surface-border md:border-t-0">
                  <StatusBadge status={goal.status} />
                  <Link
                    to="/employee/goals"
                    className="font-sans text-xs font-semibold text-accent flex items-center gap-0.5 hover:underline"
                  >
                    Update
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Performance Activity Feed */}
      <div className="bg-white rounded-xl border border-surface-border p-6 shadow-sm">
        <div>
          <h3 className="font-display text-lg font-bold text-primary mb-1">Activity Log</h3>
          <p className="font-sans text-xs text-ink-secondary mb-5">Your latest check-in submissions and target updates</p>
        </div>

        {allCheckIns.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center border border-dashed border-surface-border rounded-xl">
            <Activity className="w-8 h-8 text-ink-secondary/30 mb-2" />
            <p className="font-sans text-xs text-ink-secondary max-w-xs">
              No check-ins logged yet. Keeping a frequent log of achievements is highly recommended for official review.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-surface-border ml-3 pl-6 space-y-6 py-1">
            {allCheckIns.slice(0, 3).map((checkIn, idx) => (
              <motion.div
                key={checkIn.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className="relative"
              >
                {/* Event bullet pin */}
                <div className="absolute left-[-31px] top-1 w-4 h-4 rounded-full bg-accent border-4 border-white shadow-sm flex items-center justify-center" />

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-ink-secondary">
                      {new Date(checkIn.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-ink-secondary font-sans text-xs">•</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-status-success font-sans text-[10px] font-bold">
                      Progress Update
                    </span>
                  </div>

                  <p className="font-sans text-sm text-primary mb-1.5">
                    Logged <span className="font-mono font-bold text-accent">{checkIn.achievementPct}%</span> target achievement for <span className="font-sans font-semibold text-primary">"{checkIn.goalTitle}"</span>
                  </p>

                  {checkIn.comment && (
                    <div className="bg-[#F9F9FB] rounded-lg p-2.5 text-xs text-ink-secondary border border-surface-border italic max-w-xl">
                      "{checkIn.comment}"
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

    </div>

    {/* ── Right Sidebar Column (4 cols) ── */}
    <div className="lg:col-span-4 space-y-6">

      {/* Key Metrics Dashboard Card */}
      <div className="bg-white rounded-xl border border-surface-border p-5 shadow-sm">
        <h3 className="font-display text-base font-bold text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" /> Key Metrics
        </h3>

        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-[#F9F9FB] rounded-xl p-4 border border-surface-border hover:border-accent/30 transition-colors">
            <span className="font-mono text-2xl font-bold text-primary leading-none mb-1 block">{activeGoals}</span>
            <span className="font-sans text-xs font-medium text-ink-secondary">Active Goals</span>
          </div>
          <div className="bg-[#F9F9FB] rounded-xl p-4 border border-surface-border hover:border-accent/30 transition-colors">
            <span className={`font-mono text-2xl font-bold leading-none mb-1 block ${checkinsDue > 0 ? "text-amber-500" : "text-primary"}`}>{checkinsDue}</span>
            <span className="font-sans text-xs font-medium text-ink-secondary">Check-ins Due</span>
          </div>
          <div className="bg-[#F9F9FB] rounded-xl p-4 border border-surface-border hover:border-accent/30 transition-colors">
            <span className="font-mono text-2xl font-bold text-primary leading-none mb-1 block">{approvedGoals}</span>
            <span className="font-sans text-xs font-medium text-ink-secondary">Goals Approved</span>
          </div>
          <div className="bg-[#F9F9FB] rounded-xl p-4 border border-surface-border hover:border-accent/30 transition-colors">
            <span className="font-mono text-2xl font-bold text-accent leading-none mb-1 block">{overallProgress}%</span>
            <span className="font-sans text-xs font-medium text-ink-secondary">Overall Progress</span>
          </div>
        </div>
      </div>

      {/* Active Performance Cycle Card */}
      {cycle && (
        <div className="bg-white rounded-xl border border-surface-border p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-display text-base font-bold text-primary mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" /> Active Cycle
            </h3>
            <p className="font-sans text-xs font-semibold text-accent uppercase tracking-wider mt-1">{cycle.name}</p>
          </div>

          <div className="border-t border-surface-border pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-ink-secondary">
              <Clock className="w-4.5 h-4.5 text-ink-secondary/70" />
              <span>
                Deadline: {new Date(cycle.goalSettingEnd || cycle.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div>
              <div className="flex justify-between font-sans text-xs text-ink-secondary mb-1.5">
                <span>Timeline Completion</span>
                <span className="font-medium text-primary">{cycleCompletion}%</span>
              </div>
              <div className="w-full h-2 bg-surface-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${cycleCompletion}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Checklist / Action items to do */}
      <div className="bg-white rounded-xl border border-surface-border p-5 shadow-sm">
        <h3 className="font-display text-base font-bold text-primary mb-4 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-accent" /> Action Items
        </h3>

        <div className="space-y-3 font-sans text-xs text-ink-secondary">
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-green-50/50 border border-green-100/50">
            <CheckCircle className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-primary">Active Goal Setup</p>
              <p className="text-[10px] text-ink-secondary">Goals configured for {cycle?.name || "current cycle"}</p>
            </div>
          </div>

          <div className={`flex items-start gap-2.5 p-2 rounded-lg border ${checkinsDue === 0 && activeGoals > 0 ? "bg-green-50/50 border-green-100/50" : "bg-[#F9F9FB] border-surface-border"}`}>
            {checkinsDue === 0 && activeGoals > 0 ? (
              <CheckCircle className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-primary">Cycle Check-ins</p>
              <p className="text-[10px] text-ink-secondary">
                {checkinsDue > 0 ? `${checkinsDue} Goal check-ins are currently due` : "All current cycle check-ins logged"}
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-2.5 p-2 rounded-lg border ${approvedGoals === activeGoals && activeGoals > 0 ? "bg-green-50/50 border-green-100/50" : "bg-[#F9F9FB] border-surface-border"}`}>
            {approvedGoals === activeGoals && activeGoals > 0 ? (
              <CheckCircle className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-4 h-4 text-ink-secondary/70 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-primary">Manager Alignment</p>
              <p className="text-[10px] text-ink-secondary">
                {approvedGoals === activeGoals && activeGoals > 0 ? "All goals approved and locked" : `${activeGoals - approvedGoals} goals awaiting review`}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>

    </div >
  );
}
