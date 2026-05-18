import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Target, ClipboardList, TrendingUp, ArrowRight, CheckCircle2, XCircle, Bell, X, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { getTeamGoals, approveGoal, rejectGoal } from "../../api/goals";
import { getActiveCycle } from "../../api/cycles";
import { getTeam } from "../../api/users";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";

const COLORS = ["#4f46e5", "#f59e0b", "#10b981", "#ef4444", "#0ea5e9"];

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [goals,   setGoals]   = useState([]);
  const [team,    setTeam]    = useState([]);
  const [cycle,   setCycle]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState({});
  const [rejectModal, setRejectModal] = useState(null);
  const [reason,  setReason]  = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  const load = () =>
    Promise.all([
      getTeamGoals(),
      getTeam().catch(() => ({ data: [] })),
      getActiveCycle().catch(() => ({ data: null })),
    ]).then(([gr, tr, cr]) => {
      setGoals(gr.data); setTeam(tr.data); setCycle(cr.data);
    }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton />;

  const pending  = goals.filter(g => g.status === "PENDING_APPROVAL");
  const locked   = goals.filter(g => g.status === "LOCKED").length;
  const draft    = goals.filter(g => g.status === "DRAFT").length;

  const pieData = [
    { name: "Approved", value: locked          },
    { name: "Pending",  value: pending.length  },
    { name: "Draft",    value: draft           },
  ].filter(d => d.value > 0);

  const empMap = {};
  goals.forEach(g => {
    const n = g.owner?.name || "Unknown";
    if (!empMap[n]) empMap[n] = { name: n.split(" ")[0], total: 0, locked: 0 };
    empMap[n].total++;
    if (g.status === "LOCKED") empMap[n].locked++;
  });
  const barData = Object.values(empMap);

  const handleApprove = async (id) => {
    setSaving(s => ({ ...s, [id]: "approving" }));
    try {
      await approveGoal(id);
      toast.success("Goal approved!");
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Approval failed"); }
    finally { setSaving(s => ({ ...s, [id]: null })); }
  };

  const handleReject = async () => {
    if (!rejectModal || !reason.trim()) return;
    setSaving(s => ({ ...s, [rejectModal.id]: "rejecting" }));
    try {
      await rejectGoal(rejectModal.id, reason);
      toast.success("Goal returned to employee");
      setRejectModal(null); setReason("");
      load();
    } catch { toast.error("Rejection failed"); }
    finally { setSaving(s => ({ ...s, [rejectModal?.id]: null })); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Team Dashboard</h2>
          <p className="text-sm text-slate-500">{cycle?.name} · {team.length} direct reports</p>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          {/* Notification Bell — shows pending count */}
          <div className="relative">
            <button onClick={() => setNotifOpen(o => !o)}
              className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {pending.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {pending.length}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            <AnimatePresence>
              {notifOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">Pending Approvals</p>
                    <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  {pending.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">All caught up!</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                      {pending.map(g => (
                        <div key={g.id} className="px-4 py-3">
                          <p className="text-xs font-medium text-slate-700 mb-0.5 truncate">{g.title}</p>
                          <p className="text-xs text-slate-400 mb-2">{g.owner?.name} · {g.weightage}%</p>
                          <div className="flex gap-2">
                            <button onClick={() => { handleApprove(g.id); setNotifOpen(false); }}
                              disabled={saving[g.id]} className="flex-1 btn-primary text-xs py-1.5 justify-center bg-emerald-600 hover:bg-emerald-700">
                              {saving[g.id] === "approving" ? <Spinner size="sm" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                            </button>
                            <button onClick={() => { setRejectModal(g); setNotifOpen(false); }}
                              className="flex-1 btn-danger text-xs py-1.5 justify-center">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-2.5 border-t border-slate-100">
                    <Link to="/manager/approvals" onClick={() => setNotifOpen(false)} className="text-xs text-brand-600 hover:underline font-medium">
                      View full approval page →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {pending.length > 0 && (
            <Link to="/manager/approvals" className="btn-primary text-sm">
              <ClipboardList className="w-4 h-4" />
              {pending.length} Pending
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,        label: "Team Size",   value: team.length,     color: "bg-brand-600"   },
          { icon: ClipboardList,label: "Pending",     value: pending.length,  color: "bg-amber-500"   },
          { icon: Target,       label: "Approved",    value: locked,          color: "bg-emerald-500" },
          { icon: TrendingUp,   label: "Total Goals", value: goals.length,    color: "bg-slate-600"   },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Goal Status Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
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
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Goals per Team Member</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total"  name="Total"    fill="#e0e7ff" radius={[4,4,0,0]} />
              <Bar dataKey="locked" name="Approved" fill="#4f46e5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inline Pending Approvals with actions */}
      {pending.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Pending Approvals — Quick Actions</h3>
            <Link to="/manager/approvals" className="text-xs text-brand-600 hover:underline font-medium">Full review →</Link>
          </div>
          <div className="space-y-3">
            {pending.slice(0, 5).map(g => (
              <div key={g.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{g.title}</p>
                  <p className="text-xs text-slate-500">{g.owner?.name} · {g.thrustArea?.name} · {g.weightage}%</p>
                </div>
                <StatusBadge status={g.status} />
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => handleApprove(g.id)} disabled={saving[g.id]}
                    className="btn-primary text-xs py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700">
                    {saving[g.id] === "approving" ? <Spinner size="sm" /> : <CheckCircle2 className="w-3 h-3" />}
                    Approve
                  </button>
                  <button onClick={() => setRejectModal(g)}
                    className="btn-secondary text-xs py-1.5 px-2.5 text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                  <Link to="/manager/approvals" className="btn-ghost text-xs py-1.5 px-2">
                    <Pencil className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
            {pending.length > 5 && (
              <p className="text-xs text-center text-slate-400">
                +{pending.length - 5} more · <Link to="/manager/approvals" className="text-brand-600">View all</Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setReason(""); }} title="Reject Goal" size="sm">
        <p className="text-sm text-slate-500 mb-3">Goal: <strong>{rejectModal?.title}</strong></p>
        <textarea className="input min-h-[90px] resize-none mb-4" placeholder="Reason for rejection (employee will see this)…"
          value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-3">
          <button onClick={() => { setRejectModal(null); setReason(""); }} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleReject} disabled={!reason.trim()} className="btn-danger flex-1 justify-center">Reject Goal</button>
        </div>
      </Modal>
    </div>
  );
}
