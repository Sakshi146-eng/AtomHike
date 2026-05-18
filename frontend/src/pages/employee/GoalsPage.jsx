import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Send, AlertCircle, CheckCircle2, Target, Calendar, Award, Trash2, Pencil, Info } from "lucide-react";
import toast from "react-hot-toast";
import { getMyGoals, createGoal, updateGoal, deleteGoal, submitGoals } from "../../api/goals";
import { listThrustAreas } from "../../api/thrustAreas";
import { getActiveCycle } from "../../api/cycles";
import GoalCard from "../../components/common/GoalCard";
import SlideOver from "../../components/common/SlideOver";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { CardSkeleton, Spinner } from "../../components/loaders/Skeletons";
import { UOM_LABELS } from "../../utils/uom";

const EMPTY_FORM = { title: "", description: "", thrustAreaId: "", uomType: "MIN", targetValue: "", targetDate: "", weightage: "" };

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slideOpen, setSlideOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [cycle, setCycle] = useState(null);

  const load = async () => {
    try {
      const [gr, tar, cr] = await Promise.all([
        getMyGoals(),
        listThrustAreas(),
        getActiveCycle().catch(() => ({ data: null })),
      ]);
      setGoals(gr.data);
      setThrustAreas(tar.data);
      if (cr.data) {
        setCycle(cr.data);
        const now = new Date();
        let isOpen = false;
        
        // 1. Check Goal Setting Window dates
        const startRaw = cr.data.goalSettingStart || cr.data.goal_setting_start;
        const endRaw = cr.data.goalSettingEnd || cr.data.goal_setting_end;
        if (startRaw && endRaw) {
          // API returns "2026-05-18T00:00:00Z" — Z = UTC midnight = 05:30 IST.
          // Extract calendar date only and build local midnight so the window
          // opens at 00:00 IST (not 05:30 IST).
          const toLocalDate = (isoStr) => {
            const [y, mo, d] = isoStr.split("T")[0].split("-").map(Number);
            return new Date(y, mo - 1, d); // local midnight ✓
          };
          const startDate = toLocalDate(startRaw);
          const endDate   = toLocalDate(endRaw);
          endDate.setHours(23, 59, 59, 999); // include the full end day
          if (startDate <= now && now <= endDate) {
            isOpen = true;
          }
        }
        
        // 2. Check if there's any active Quarter Window
        const activeQuarter = cr.data.quarterWindows?.find(w => w.isActive);
        if (activeQuarter) {
          isOpen = true;
        }

        setWindowOpen(isOpen);
      }
    } catch (err) {
      toast.error("Failed to load goals page");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const draftGoals = goals.filter(g => g.status === "DRAFT");
  const approvedGoals = goals.filter(g => g.status === "LOCKED");
  const rejectedGoals = goals.filter(g => g.status === "REJECTED");
  const pendingGoals = goals.filter(g => g.status === "PENDING_APPROVAL");
  const totalWeight = draftGoals.reduce((s, g) => s + g.weightage, 0);
  const weightOk = Math.round(totalWeight) === 100;
  const canSubmit = draftGoals.length > 0 && weightOk; // BRD: must be exactly 100%

  const openCreate = () => { setEditGoal(null); setForm(EMPTY_FORM); setSlideOpen(true); };
  const openEdit = (g) => { setEditGoal(g); setForm({ title: g.title, description: g.description || "", thrustAreaId: g.thrustAreaId, uomType: g.uomType, targetValue: g.targetValue || "", targetDate: g.targetDate || "", weightage: g.weightage }); setSlideOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        thrustAreaId: form.thrustAreaId,
        title: form.title.trim(),
        uomType: form.uomType,
        weightage: parseFloat(form.weightage),
      };
      // Only include optional fields if they have a value
      if (form.description?.trim()) payload.description = form.description.trim();
      if (form.targetValue) payload.targetValue = parseFloat(form.targetValue);
      if (form.targetDate) payload.targetDate = form.targetDate;

      if (editGoal) { await updateGoal(editGoal.id, payload); toast.success("Goal updated"); }
      else { await createGoal(payload); toast.success("Goal created"); }
      setSlideOpen(false);
      load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg || d.message || JSON.stringify(d)).join("; ")
        : (typeof detail === "string" ? detail : "Failed to save goal");
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await deleteGoal(deleteModal.id);
      toast.success("Goal deleted");
      setDeleteModal(null);
      load();
    } catch { toast.error("Could not delete goal"); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitGoals();
      toast.success("Goals submitted for manager approval!");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{[1, 2, 3].map(i => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10">

      {/* ── Header Hero Card ── */}
      <div className="bg-white rounded-2xl border border-surface-border p-6 md:p-8 relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-accent/5 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-accent-light text-accent text-xs font-semibold mb-3">
              Performance Targets
            </span>
            <h2 className="font-display text-3xl text-primary font-bold mb-2">
              My Goal Portfolio
            </h2>
            <p className="font-sans text-sm text-ink-secondary max-w-xl leading-relaxed">
              Design and balance your performance goals. Total weightage for draft items must compile to exactly 100% before submitting for manager approval.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0 items-center">
            {goals.length < 8 ? (
              <div className="relative group">
                <motion.button
                  whileTap={windowOpen ? { scale: 0.96 } : {}}
                  onClick={windowOpen ? openCreate : undefined}
                  disabled={!windowOpen}
                  className={`btn-primary ${!windowOpen ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Plus className="w-4 h-4" /> Add Goal
                </motion.button>
                {!windowOpen && (
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5
                    bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0
                    group-hover:opacity-100 transition-opacity pointer-events-none z-20 font-sans shadow-lg">
                    Goal-setting window is currently closed
                    <div className="absolute top-full right-8 border-4
                      border-transparent border-t-slate-800" />
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Max 8 goals reached</span>
            )}

            {draftGoals.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? <Spinner /> : <Send className="w-4 h-4" />}
                Submit for Approval
              </motion.button>
            )}
          </div>
        </div>
      </div>

            {/* ── Status Metrics & Weight Allocation Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Side: Dynamic Weight Allocation Widget (8 cols) */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-surface-border p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      {weightOk ? (
                        <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center text-status-success">
                          <CheckCircle2 className="w-4.5 h-4.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                          <AlertCircle className="w-4.5 h-4.5" />
                        </div>
                      )}
                      <span className="font-sans text-sm font-semibold text-primary">Draft Weightage Allocation</span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${weightOk ? "text-emerald-600" : totalWeight > 100 ? "text-red-500" : "text-amber-600"}`}>
                      {totalWeight}% / 100%
                    </span>
                  </div>

                  <p className="font-sans text-xs text-ink-secondary mb-4 leading-relaxed">
                    Each draft goal contributes to your overall score. You must distribute precisely 100% across all drafted elements to submit.
                  </p>
                </div>
  <div className="space-y-3">
    <div className="w-full bg-surface-border rounded-full h-2.5 overflow-hidden">
      <motion.div
        animate={{ width: `${Math.min(totalWeight, 100)}%` }}
        className={`h-full rounded-full transition-all duration-500 ${weightOk ? "bg-emerald-500" : totalWeight > 100 ? "bg-red-500" : "bg-amber-500"}`}
      />
    </div>
    {!weightOk && (
      <div className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border font-sans ${totalWeight > 100 ? "text-red-600 bg-red-50/50 border-red-100/50" : "text-amber-600 bg-amber-50/50 border-amber-100/50"}`}>
        {totalWeight > 100 ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Over by {totalWeight - 100}% — reduce goal weightages before submitting.</span>
          </>
        ) : (
          <>
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{100 - totalWeight}% remaining — adjust draft values to reach exactly 100% to submit.</span>
          </>
        )}
      </div>
    )}
    {weightOk && (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-green-50/50 px-3 py-1.5 rounded-lg border border-green-100/50 font-sans">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Perfect! Your draft weight allocation is exactly 100%. Ready for submission.</span>
      </div>
    )}
  </div>
        </div >

    {/* Right Side: Status Distribution Count (4 cols) */ }
    < div className = "lg:col-span-4 bg-white rounded-xl border border-surface-border p-5 shadow-sm" >
          <h3 className="font-display text-sm font-bold text-primary mb-4">Goal Breakdown</h3>
          <div className="grid grid-cols-3 gap-3 font-sans text-center">
            <div className="bg-[#F9F9FB] rounded-lg p-3 border border-surface-border">
              <span className="font-mono text-xl font-bold text-primary block leading-none mb-1">{draftGoals.length}</span>
              <span className="text-[10px] text-ink-secondary font-medium">Drafts</span>
            </div>
            <div className="bg-[#F9F9FB] rounded-lg p-3 border border-surface-border">
              <span className="font-mono text-xl font-bold text-accent block leading-none mb-1">{approvedGoals.length}</span>
              <span className="text-[10px] text-ink-secondary font-medium">Approved</span>
            </div>
            <div className="bg-[#F9F9FB] rounded-lg p-3 border border-surface-border">
              <span className="font-mono text-xl font-bold text-red-500 block leading-none mb-1">{rejectedGoals.length}</span>
              <span className="text-[10px] text-ink-secondary font-medium">Rejected</span>
            </div>
          </div>
        </div >

      </div >

    {/* ── Goal Cards Grid Workspace ── */ }
  {
    goals.length === 0 ? (
      <div className="bg-white rounded-2xl border border-surface-border p-12 text-center shadow-sm max-w-lg mx-auto flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
          <Target className="w-7 h-7" />
        </div>
        <h3 className="font-display text-lg font-bold text-primary mb-1.5">No Goals Active</h3>
        <p className="font-sans text-sm text-ink-secondary max-w-sm mb-6 leading-relaxed">
          You haven't established any performance metrics for this cycle. Build a robust set of goals to track progress.
        </p>
        {windowOpen && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" /> Create First Goal
          </button>
        )}
      </div>
    ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.map((g, i) => (
        <GoalCard key={g.id} goal={g} index={i} onEdit={openEdit} onDelete={setDeleteModal} />
      ))}
    </div>
  )
  }

  {/* ── Create / Edit Goal Slide-over ── */ }
  <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editGoal ? "Edit Goal Details" : "Create New Performance Goal"}>
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <label className="label">Goal Title *</label>
        <input className="input font-sans text-sm" placeholder="e.g., Increase sales revenue by 20%" required
          value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>

      <div>
        <label className="label">Description / Scope</label>
        <textarea className="input font-sans text-sm min-h-[85px] resize-none" placeholder="Add custom targets, bounds, or execution steps..."
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div>
        <label className="label">Thrust Area *</label>
        <select className="input font-sans text-sm" required value={form.thrustAreaId}
          onChange={e => setForm({ ...form, thrustAreaId: e.target.value })}>
          <option value="">Select thrust area…</option>
          {thrustAreas.map(ta => <option key={ta.id} value={ta.id}>{ta.name}</option>)}
        </select>
      </div>

      <div>
        <label className="label">UoM Type *</label>
        <select className="input font-sans text-sm" value={form.uomType} onChange={e => setForm({ ...form, uomType: e.target.value, targetValue: "", targetDate: "" })}>
          {Object.entries(UOM_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.hint}</option>)}
        </select>
        {/* Context hint based on selection */}
        <p className="text-xs mt-1.5 px-2.5 py-1.5 rounded-lg inline-block bg-accent/5 text-accent font-medium font-sans">
          {form.uomType === "MIN" && "📈 Enter a numeric target to exceed (e.g. revenue ₹50L)"}
          {form.uomType === "MAX" && "📉 Enter a numeric target to stay below (e.g. TAT < 5 days)"}
          {form.uomType === "TIMELINE" && "📅 Enter the completion date for this goal"}
          {form.uomType === "ZERO_BASED" && "✅ No target needed — goal is achieved when value = 0"}
        </p>
      </div>

      {/* Target Value — shown for MIN / MAX */}
      {(form.uomType === "MIN" || form.uomType === "MAX") && (
        <div>
          <label className="label">
            Target Value *
            <span className="ml-2 text-xs font-normal text-slate-400 font-sans">
              ({form.uomType === "MIN" ? "achieve ≥ this number" : "achieve ≤ this number"})
            </span>
          </label>
          <input className="input font-mono text-sm" type="number" step="any" placeholder="e.g., 100"
            required value={form.targetValue}
            onChange={e => setForm({ ...form, targetValue: e.target.value })} />
        </div>
      )}

      {/* Target Date — shown for TIMELINE */}
        {form.uomType === "TIMELINE" && (
          <div>
            <label className="label">
              Target Date *
              <span className="ml-2 text-xs font-normal text-slate-400 font-sans">(deadline for completion)</span>
            </label>
            <input className="input font-sans text-sm" type="date" required
              value={form.targetDate}
              onChange={e => setForm({ ...form, targetDate: e.target.value })} />
          </div>
        )}
          <div>
            <label className="label">Weightage (%) *</label>
            <input className="input font-mono text-sm" type="number" min="10" max="100" placeholder="Min 10%" required
              value={form.weightage} onChange={e => setForm({...form, weightage: e.target.value})} />
            <p className="font-sans text-[11px] text-ink-secondary mt-1.5">
              Available weightage remaining: <span className="font-semibold text-primary">{100 - totalWeight + (editGoal?.weightage || 0) - (parseFloat(form.weightage)||0)}%</span>
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-border">
            <button type="button" onClick={() => setSlideOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Spinner /> : editGoal ? "Save Changes" : "Create Goal"}
            </motion.button>
          </div>
        </form >
      </SlideOver >

    {/* ── Delete Confirmation Modal ── */ }
    < Modal open = {!!deleteModal
} onClose = {() => setDeleteModal(null)} title = "Delete Goal" size = "sm" >
        <p className="font-sans text-sm text-ink-secondary mb-5 leading-relaxed">
          Are you sure you want to delete <strong className="text-primary font-medium">"{deleteModal?.title}"</strong>? This will permanently remove all linked records.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleDelete} className="btn-secondary border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex-1 justify-center">Delete</button>
        </div>
      </Modal >

    </div >
  );
}
