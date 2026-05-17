import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Users, X, Check } from "lucide-react";
import toast from "react-hot-toast";
import { getTeamGoals, shareGoal } from "../../api/goals";
import { getTeam } from "../../api/users";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";

const STATUS_FILTERS = ["ALL", "DRAFT", "PENDING_APPROVAL", "LOCKED", "REJECTED"];

export default function TeamGoalsPage() {
  const [goals,   setGoals]   = useState([]);
  const [team,    setTeam]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("ALL");
  const [search,  setSearch]  = useState("");

  // Share modal state
  const [shareModal,   setShareModal]   = useState(null); // the master goal being shared
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [shareWeight,  setShareWeight]  = useState(20);
  const [sharing,      setSharing]      = useState(false);

  const load = () =>
    Promise.all([
      getTeamGoals(),
      getTeam().catch(() => ({ data: [] })),
    ]).then(([gr, tr]) => {
      setGoals(gr.data);
      setTeam(tr.data);
    }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  if (loading) return <PageSkeleton />;

  const filtered = goals
    .filter(g => filter === "ALL" || g.status === filter)
    .filter(g => !search || g.title.toLowerCase().includes(search.toLowerCase())
      || g.owner?.name.toLowerCase().includes(search.toLowerCase()));

  // Group by employee
  const grouped = filtered.reduce((acc, g) => {
    const key = g.owner?.name || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const openShare = (goal) => {
    setShareModal(goal);
    setSelectedEmps([]);
    setShareWeight(20);
  };

  const toggleEmp = (id) =>
    setSelectedEmps(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const handleShare = async () => {
    if (!shareModal || selectedEmps.length === 0) {
      toast.error("Select at least one employee to share with");
      return;
    }
    if (shareWeight < 10 || shareWeight > 100) {
      toast.error("Weightage must be between 10% and 100%");
      return;
    }
    setSharing(true);
    try {
      await shareGoal({
        masterGoalId: shareModal.id,
        employeeIds:  selectedEmps,
        weightage:    parseFloat(shareWeight),
      });
      toast.success(`Goal shared to ${selectedEmps.length} employee(s)!`);
      setShareModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to share goal");
    } finally { setSharing(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Team Goals</h2>
          <p className="text-sm text-slate-500">{goals.length} total goals · click Share on any LOCKED/DRAFT goal to push it to employees</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search goals or employees…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filter === s ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped by employee */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState title="No goals found" desc="Try adjusting your filters" />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([empName, empGoals], idx) => (
            <motion.div key={empName} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
              className="card overflow-hidden">
              {/* Employee header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {empName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{empName}</p>
                  <p className="text-xs text-slate-400">{empGoals[0]?.owner?.department}</p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  {["LOCKED", "PENDING_APPROVAL", "DRAFT", "REJECTED"].map(s => {
                    const cnt = empGoals.filter(g => g.status === s).length;
                    return cnt > 0 ? <StatusBadge key={s} status={s} className="text-xs" /> : null;
                  })}
                </div>
              </div>

              {/* Goals table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-2 text-left font-medium">Goal</th>
                    <th className="px-3 py-2 text-left font-medium">Thrust Area</th>
                    <th className="px-3 py-2 text-center font-medium">Weight</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                    <th className="px-3 py-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {empGoals.map(g => (
                    <tr key={g.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-slate-700">{g.title}</p>
                        {g.isShared && <span className="text-xs text-brand-500 font-medium">↗ Shared KPI</span>}
                        {g.rejectionReason && <p className="text-red-400 mt-0.5">↩ {g.rejectionReason}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{g.thrustArea?.name || "—"}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-700">{g.weightage}%</td>
                      <td className="px-3 py-2.5 text-center"><StatusBadge status={g.status} /></td>
                      <td className="px-3 py-2.5 text-center">
                        {/* Share button — only on LOCKED or DRAFT goals */}
                        {(g.status === "LOCKED" || g.status === "DRAFT") && (
                          <button onClick={() => openShare(g)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-medium hover:bg-brand-100 transition-colors">
                            <Share2 className="w-3 h-3" /> Share
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Share Goal Modal ─────────────────────────────────────────────────── */}
      <Modal open={!!shareModal} onClose={() => setShareModal(null)} title="Share Goal to Employees" size="md">
        {shareModal && (
          <div className="space-y-5">
            {/* Master goal info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-400 mb-0.5">Master Goal</p>
              <p className="text-sm font-semibold text-slate-800">{shareModal.title}</p>
              <p className="text-xs text-slate-500">{shareModal.thrustArea?.name} · {shareModal.weightage}% · <StatusBadge status={shareModal.status} /></p>
            </div>

            {/* Default weightage for copies */}
            <div>
              <label className="label">Default Weightage for Each Employee (%)</label>
              <input type="number" min={10} max={100} className="input"
                value={shareWeight} onChange={e => setShareWeight(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Each employee copy will start with this weightage. Employees can adjust it in their goals.</p>
            </div>

            {/* Employee selection */}
            <div>
              <label className="label">Select Employees to Share With</label>
              {team.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No team members found</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {team.map(emp => (
                    <button key={emp.id} onClick={() => toggleEmp(emp.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all
                        ${selectedEmps.includes(emp.id)
                          ? "bg-brand-50 border-brand-300 text-brand-800"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                      <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">
                          {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-slate-400 truncate">{emp.department || emp.email}</p>
                      </div>
                      <AnimatePresence>
                        {selectedEmps.includes(emp.id) && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Check className="w-4 h-4 text-brand-600" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  ))}
                </div>
              )}
              {selectedEmps.length > 0 && (
                <p className="text-xs text-brand-600 mt-2 font-medium">{selectedEmps.length} employee(s) selected</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShareModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleShare} disabled={sharing || selectedEmps.length === 0}
                className="btn-primary flex-1 justify-center">
                {sharing ? <Spinner size="sm" /> : <Share2 className="w-4 h-4" />}
                Share to {selectedEmps.length || "..."} Employee{selectedEmps.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
