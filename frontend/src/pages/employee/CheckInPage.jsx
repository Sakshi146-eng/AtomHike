import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LockIcon, CalendarOff } from "lucide-react";
import toast from "react-hot-toast";
import { getMyGoals } from "../../api/goals";
import { submitCheckIn, getGoalCheckIns } from "../../api/checkIns";
import { getActiveCycle, getQuarterWindows } from "../../api/cycles";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import { UOM_LABELS, computeAchievement, achievementBg } from "../../utils/uom";
import { isWindowOpen, fmtDate } from "../../utils/dateHelpers";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const PROGRESS_OPTIONS = ["NOT_STARTED", "ON_TRACK", "COMPLETED", "DELAYED"];

export default function CheckInPage() {
  const [goals, setGoals]     = useState([]);
  const [cycle, setCycle]     = useState(null);
  const [windows, setWindows] = useState([]);
  const [checkIns, setCheckIns] = useState({});
  const [activeQ, setActiveQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState({});

  const load = async () => {
    try {
      const cr = await getActiveCycle();
      setCycle(cr.data);
      const [gr, wr] = await Promise.all([
        getMyGoals(),
        getQuarterWindows(cr.data.id),
      ]);
      const lockedGoals = gr.data.filter(g => g.status === "LOCKED");
      setGoals(lockedGoals);
      setWindows(wr.data);

      // Find active window
      const active = wr.data.find(w => w.isActive && isWindowOpen(w.windowOpen, w.windowClose));
      setActiveQ(active?.quarter || null);

      // Load check-ins for each locked goal
      const ciMap = {};
      await Promise.all(lockedGoals.map(async g => {
        try {
          const r = await getGoalCheckIns(g.id);
          ciMap[g.id] = r.data;
        } catch { ciMap[g.id] = []; }
      }));
      setCheckIns(ciMap);
    } catch { toast.error("Could not load check-in data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const activeWindow = windows.find(w => w.quarter === activeQ);

  const getFormVal  = (gid, field) => form[gid]?.[field] ?? "";
  const setFormVal  = (gid, field, val) => setForm(f => ({ ...f, [gid]: { ...f[gid], [field]: val } }));
  const getExisting = (gid) => checkIns[gid]?.find(ci => ci.quarterWindow?.quarter === activeQ);

  const handleSubmit = async (goal) => {
    const f = form[goal.id] || {};
    setSaving(s => ({ ...s, [goal.id]: true }));
    try {
      await submitCheckIn({
        goalId: goal.id,
        actualValue: f.actualValue ? parseFloat(f.actualValue) : null,
        actualDate: f.actualDate || null,
        progressStatus: f.progressStatus || null,
      });
      toast.success(`Check-in saved for "${goal.title}"`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save check-in");
    } finally { setSaving(s => ({ ...s, [goal.id]: false })); }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Quarterly Check-ins</h2>
        <p className="text-sm text-slate-500">{cycle?.name} — Enter your actual achievements per quarter</p>
      </div>

      {/* Quarter tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        {QUARTERS.map(q => {
          const w = windows.find(ww => ww.quarter === q);
          const isOpen = w && isWindowOpen(w.windowOpen, w.windowClose);
          return (
            <button key={q}
              onClick={() => setActiveQ(q)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${activeQ === q ? "bg-white shadow text-brand-700" : "text-slate-500 hover:text-slate-700"}
                ${isOpen ? "ring-2 ring-emerald-300" : ""}`}
            >
              {q}
              {isOpen && <span className="ml-1 text-xs text-emerald-500">●</span>}
            </button>
          );
        })}
      </div>

      {/* Window status */}
      {activeWindow && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm
          ${isWindowOpen(activeWindow.windowOpen, activeWindow.windowClose)
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
            : "bg-slate-50 border border-slate-200 text-slate-500"}`}>
          {isWindowOpen(activeWindow.windowOpen, activeWindow.windowClose)
            ? <><span className="text-emerald-500">●</span> Window open: {fmtDate(activeWindow.windowOpen)} – {fmtDate(activeWindow.windowClose)}</>
            : <><CalendarOff className="w-4 h-4" /> Window closed · {fmtDate(activeWindow.windowOpen)} – {fmtDate(activeWindow.windowClose)}</>
          }
        </div>
      )}

      {/* Goals for check-in */}
      {goals.length === 0 ? (
        <div className="card p-12 text-center">
          <LockIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No approved goals</p>
          <p className="text-slate-400 text-sm mt-1">Goals must be approved by your manager before you can submit check-ins.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal, i) => {
            const existing = getExisting(goal.id);
            const fActual  = getFormVal(goal.id, "actualValue");
            const fDate    = getFormVal(goal.id, "actualDate");
            const fStatus  = getFormVal(goal.id, "progressStatus");
            const preview  = computeAchievement(goal.uomType, goal.targetValue, parseFloat(fActual) || existing?.actualValue, goal.targetDate, fDate || existing?.actualDate);
            const uom      = UOM_LABELS[goal.uomType];
            const canEdit  = activeWindow && isWindowOpen(activeWindow.windowOpen, activeWindow.windowClose);

            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{goal.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{goal.thrustArea?.name} · {uom?.label}</p>
                  </div>
                  {preview !== null && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${achievementBg(preview)}`}>
                      {preview.toFixed(1)}%
                    </span>
                  )}
                </div>

                {/* Target */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-400 mb-0.5">Target</p>
                    <p className="font-semibold text-slate-700">{goal.targetValue || fmtDate(goal.targetDate) || "—"}</p>
                  </div>
                  <div className="bg-brand-50 rounded-lg p-3">
                    <p className="text-brand-400 mb-0.5">Actual ({activeQ})</p>
                    <p className="font-semibold text-brand-700">{(existing?.actualValue ?? fActual) || "Not entered"}</p>
                  </div>
                </div>

                {canEdit && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    {(goal.uomType === "MIN" || goal.uomType === "MAX" || goal.uomType === "ZERO_BASED") && (
                      <div>
                        <label className="label">Actual Value</label>
                        <input className="input" type="number" placeholder="Enter actual..."
                          value={fActual || existing?.actualValue || ""}
                          onChange={e => setFormVal(goal.id, "actualValue", e.target.value)} />
                      </div>
                    )}
                    {goal.uomType === "TIMELINE" && (
                      <div>
                        <label className="label">Actual Completion Date</label>
                        <input className="input" type="date"
                          value={fDate || existing?.actualDate?.slice(0, 10) || ""}
                          onChange={e => setFormVal(goal.id, "actualDate", e.target.value)} />
                      </div>
                    )}
                    <div>
                      <label className="label">Progress Status</label>
                      <div className="flex flex-wrap gap-2">
                        {PROGRESS_OPTIONS.map(opt => (
                          <button key={opt} type="button"
                            onClick={() => setFormVal(goal.id, "progressStatus", opt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                              ${(fStatus || existing?.progressStatus) === opt
                                ? "bg-brand-600 text-white border-brand-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"}`}>
                            {opt.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => handleSubmit(goal)}
                      disabled={saving[goal.id]}
                      className="btn-primary w-full justify-center">
                      {saving[goal.id] ? <Spinner /> : existing ? "Update Check-in" : "Save Check-in"}
                    </motion.button>
                  </div>
                )}

                {/* Manager comments */}
                {existing?.comments?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-medium text-slate-500">Manager Comments</p>
                    {existing.comments.map(c => (
                      <div key={c.id} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-800">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
