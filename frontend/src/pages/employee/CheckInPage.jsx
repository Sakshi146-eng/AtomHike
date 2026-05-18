import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LockIcon, CalendarOff, CheckCircle2, Pencil, MessageSquare, AlertCircle } from "lucide-react";
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
  const [goals,    setGoals]    = useState([]);
  const [cycle,    setCycle]    = useState(null);
  const [windows,  setWindows]  = useState([]);
  const [checkIns, setCheckIns] = useState({});
  const [activeQ,  setActiveQ]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState({});
  const [justSaved, setJustSaved] = useState({});
  const [editing,  setEditing]  = useState({});

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

      const active = wr.data.find(w => w.isActive && isWindowOpen(w.windowOpen, w.windowClose));
      setActiveQ(active?.quarter || null);

      const ciMap = {};
      await Promise.all(lockedGoals.map(async g => {
        try { const r = await getGoalCheckIns(g.id); ciMap[g.id] = r.data; }
        catch { ciMap[g.id] = []; }
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
        goalId:         goal.id,
        actualValue:    f.actualValue !== "" && f.actualValue !== undefined ? parseFloat(f.actualValue) : null,
        actualDate:     f.actualDate  || null,
        progressStatus: f.progressStatus || null,
      });
      toast.success(`Check-in saved for "${goal.title}"`);
      setJustSaved(s => ({ ...s, [goal.id]: true }));
      setEditing(s => ({ ...s, [goal.id]: false }));
      load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg || JSON.stringify(d)).join("; ")
        : (detail || "Failed to save check-in");
      toast.error(msg);
    } finally { setSaving(s => ({ ...s, [goal.id]: false })); }
  };

  const startEditing = (goal) => {
    const existing = getExisting(goal.id);
    setForm(f => ({
      ...f,
      [goal.id]: {
        actualValue:    existing?.actualValue ?? "",
        actualDate:     existing?.actualDate?.slice(0, 10) ?? "",
        progressStatus: existing?.progressStatus ?? "",
      }
    }));
    setEditing(s => ({ ...s, [goal.id]: true }));
    setJustSaved(s => ({ ...s, [goal.id]: false }));
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-[900px] mx-auto pb-8">

      {/* ── Header ── */}
      <div className="mb-6">
        <h2 className="font-display text-[26px] text-primary">Quarterly Check-ins</h2>
        <p className="font-sans text-[13px] text-ink-secondary mt-1">
          {cycle?.name} — Enter your actual achievements per quarter
        </p>
      </div>

      {/* ── Quarter tabs ── */}
      <div className="flex gap-1.5 p-1 bg-[#F9F9FB] border border-surface-border rounded-xl w-fit mb-5">
        {QUARTERS.map(q => {
          const w = windows.find(ww => ww.quarter === q);
          const isOpen = w && isWindowOpen(w.windowOpen, w.windowClose);
          return (
            <button key={q} onClick={() => setActiveQ(q)}
              className={`px-4 py-1.5 rounded-lg font-sans text-xs font-bold transition-all duration-200 flex items-center gap-1.5
                ${activeQ === q
                  ? "bg-white text-accent shadow-sm border border-surface-border"
                  : "text-ink-secondary hover:text-primary border border-transparent"}`}>
              {q}
              {isOpen && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* ── Window status banner ── */}
      {activeWindow && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-sans border mb-6
          ${isWindowOpen(activeWindow.windowOpen, activeWindow.windowClose)
            ? "bg-emerald-50/60 border-green-200 text-green-800"
            : "bg-[#F9F9FB] border-surface-border text-ink-secondary"}`}>
          {isWindowOpen(activeWindow.windowOpen, activeWindow.windowClose) ? (
            <>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold">Window Open:</span>
              <span>{activeWindow.quarter} — {fmtDate(activeWindow.windowOpen)} to {fmtDate(activeWindow.windowClose)}</span>
            </>
          ) : (
            <>
              <CalendarOff className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">Window Closed:</span>
              <span>{activeWindow.quarter} ({fmtDate(activeWindow.windowOpen)} – {fmtDate(activeWindow.windowClose)}) is locked.</span>
            </>
          )}
        </div>
      )}

      {/* ── Goals list ── */}
      {goals.length === 0 ? (
        <div className="card p-12 text-center">
          <LockIcon className="w-10 h-10 text-ink-secondary/30 mx-auto mb-3" />
          <p className="font-display text-[18px] text-primary mb-1">No Approved Goals</p>
          <p className="font-sans text-[13px] text-ink-secondary max-w-sm mx-auto">
            Goals must be approved and locked by your manager before you can submit check-ins.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal, i) => {
            const existing   = getExisting(goal.id);
            const fActual    = getFormVal(goal.id, "actualValue");
            const fDate      = getFormVal(goal.id, "actualDate");
            const fStatus    = getFormVal(goal.id, "progressStatus");
            const uom        = UOM_LABELS[goal.uomType];
            const canEdit    = activeWindow && isWindowOpen(activeWindow.windowOpen, activeWindow.windowClose);
            const isEditing  = editing[goal.id];
            const wasSaved   = justSaved[goal.id];

            // Achievement preview — handle 0 correctly with parseFloat
            const previewActual = fActual !== "" ? parseFloat(fActual) : existing?.actualValue;
            const previewDate   = fDate   || existing?.actualDate;
            const preview       = computeAchievement(goal.uomType, goal.targetValue, previewActual, goal.targetDate, previewDate);

            // Display helpers that correctly show 0 (not falsy-coerced to "–")
            const displayActual = (val) =>
              val !== null && val !== undefined ? String(val) : "Not entered";

            const displayTarget = () => {
              if (goal.uomType === "ZERO_BASED") return "0 (Zero = success)";
              if (goal.uomType === "TIMELINE")   return fmtDate(goal.targetDate) || "—";
              return goal.targetValue !== null && goal.targetValue !== undefined
                ? String(goal.targetValue) : "—";
            };

            return (
              <motion.div key={goal.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white border border-surface-border rounded-2xl shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="px-6 py-4 border-b border-surface-border bg-[#FAFAFD] flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-primary leading-snug">{goal.title}</h3>
                    <p className="font-sans text-[12px] text-ink-secondary mt-0.5">
                      {goal.thrustArea?.name} · <span className="font-medium">{uom?.label}</span> · {goal.weightage}% weight
                    </p>
                  </div>
                  {preview !== null && (
                    <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold shrink-0 ${achievementBg(preview)}`}>
                      {preview.toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Target / Actual grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F9F9FB] border border-surface-border rounded-xl p-3">
                      <p className="font-sans text-[10px] font-bold uppercase text-ink-secondary tracking-wider mb-1">Target</p>
                      <p className="font-mono text-[14px] text-primary font-semibold">{displayTarget()}</p>
                    </div>
                    <div className="bg-accent-light/30 border border-accent/20 rounded-xl p-3">
                      <p className="font-sans text-[10px] font-bold uppercase text-accent tracking-wider mb-1">Actual ({activeQ})</p>
                      <p className="font-mono text-[14px] text-accent font-semibold">
                        {goal.uomType === "TIMELINE"
                          ? (existing?.actualDate ? fmtDate(existing.actualDate) : "Not entered")
                          : displayActual(existing?.actualValue)}
                      </p>
                    </div>
                  </div>

                  {/* Check-in form area */}
                  {canEdit && (
                    <AnimatePresence mode="wait">
                      {/* ── SAVED STATE ── */}
                      {!isEditing && existing && !wasSaved && (
                        <motion.div key="saved-bar"
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center justify-between pt-4 border-t border-surface-border">
                          <div className="flex items-center gap-2 font-sans text-[13px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Check-in submitted
                            {existing.progressStatus && (
                              <span className="text-[11px] px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
                                {existing.progressStatus.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          <button onClick={() => startEditing(goal)}
                            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </motion.div>
                      )}

                      {/* ── JUST SAVED flash ── */}
                      {wasSaved && (
                        <motion.div key="just-saved"
                          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="flex items-center justify-between pt-4 border-t border-emerald-100 bg-emerald-50 -mx-6 -mb-5 px-6 py-3 rounded-b-2xl">
                          <div className="flex items-center gap-2 font-sans text-[13px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> Saved successfully!
                          </div>
                          <button onClick={() => startEditing(goal)}
                            className="btn-secondary text-xs py-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </motion.div>
                      )}

                      {/* ── FORM ── */}
                      {(isEditing || !existing) && (
                        <motion.div key="form"
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="space-y-3 pt-4 border-t border-surface-border">

                          {/* Numeric input */}
                          {(goal.uomType === "MIN" || goal.uomType === "MAX" || goal.uomType === "ZERO_BASED") && (
                            <div>
                              <label className="label">
                                Actual Value
                                {goal.uomType === "ZERO_BASED" && (
                                  <span className="ml-2 text-[11px] font-normal text-ink-secondary">(enter 0 for success)</span>
                                )}
                              </label>
                              <input className="input max-w-xs font-mono" type="number" step="any" placeholder="Enter actual…"
                                value={fActual !== "" ? fActual : (existing?.actualValue ?? "")}
                                onChange={e => setFormVal(goal.id, "actualValue", e.target.value)} />
                            </div>
                          )}

                          {/* Date input */}
                          {goal.uomType === "TIMELINE" && (
                            <div>
                              <label className="label">Actual Completion Date</label>
                              <input className="input max-w-xs" type="date"
                                value={fDate || existing?.actualDate?.slice(0, 10) || ""}
                                onChange={e => setFormVal(goal.id, "actualDate", e.target.value)} />
                            </div>
                          )}

                          {/* Progress status */}
                          <div>
                            <label className="label">Progress Status</label>
                            <div className="flex flex-wrap gap-2">
                              {PROGRESS_OPTIONS.map(opt => (
                                <button key={opt} type="button"
                                  onClick={() => setFormVal(goal.id, "progressStatus", opt)}
                                  className={`px-3 py-1.5 rounded-lg font-sans text-[11px] font-bold border transition-all duration-200
                                    ${(fStatus || existing?.progressStatus) === opt
                                      ? "bg-accent text-white border-accent shadow-sm"
                                      : "bg-white text-ink-secondary border-surface-border hover:border-accent/40 hover:text-primary"}`}>
                                  {opt.replace("_", " ")}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            {isEditing && (
                              <button onClick={() => setEditing(s => ({ ...s, [goal.id]: false }))}
                                className="btn-secondary flex-1">Cancel</button>
                            )}
                            <motion.button whileTap={{ scale: 0.97 }}
                              onClick={() => handleSubmit(goal)}
                              disabled={saving[goal.id]}
                              className="btn-primary flex-1 justify-center">
                              {saving[goal.id] ? <Spinner /> : <CheckCircle2 className="w-4 h-4" />}
                              {saving[goal.id] ? "Saving…" : existing ? "Update Check-in" : "Save Check-in"}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}

                  {/* Window locked state */}
                  {!canEdit && (
                    <div className="pt-4 border-t border-surface-border flex items-center gap-2 font-sans text-[12px] text-ink-secondary">
                      <CalendarOff className="w-3.5 h-3.5 shrink-0" />
                      No active check-in window — submission is locked.
                    </div>
                  )}

                  {/* Manager comments */}
                  {existing?.comments?.length > 0 && (
                    <div className="pt-4 border-t border-surface-border space-y-2">
                      <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Manager Feedback
                      </p>
                      {existing.comments.map(c => (
                        <div key={c.id} className="bg-amber-50/50 border border-amber-200/60 rounded-xl px-4 py-3 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl" />
                          <div className="flex items-center gap-1.5 font-sans text-[10px] text-amber-700 font-bold uppercase tracking-wide mb-1">
                            <AlertCircle className="w-3 h-3" /> Feedback received
                          </div>
                          <p className="font-sans text-[12px] text-amber-900 italic leading-relaxed">"{c.content}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
