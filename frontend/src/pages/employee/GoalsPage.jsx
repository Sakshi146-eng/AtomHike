import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Send, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [goals, setGoals]         = useState([]);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slideOpen, setSlideOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editGoal, setEditGoal]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);

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
        const now = new Date();
        setWindowOpen(new Date(cr.data.goalSettingStart) <= now && now <= new Date(cr.data.goalSettingEnd));
      }
    } catch (err) {
      toast.error("Failed to load goals page");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const draftGoals    = goals.filter(g => g.status === "DRAFT");
  const rejectedGoals = goals.filter(g => g.status === "REJECTED");
  const totalWeight   = draftGoals.reduce((s, g) => s + g.weightage, 0);
  const weightOk      = Math.round(totalWeight) === 100;
  const canSubmit     = draftGoals.length > 0 && weightOk; // BRD: must be exactly 100%

  const openCreate = () => { setEditGoal(null); setForm(EMPTY_FORM); setSlideOpen(true); };
  const openEdit   = (g)  => { setEditGoal(g);   setForm({ title: g.title, description: g.description || "", thrustAreaId: g.thrustAreaId, uomType: g.uomType, targetValue: g.targetValue || "", targetDate: g.targetDate || "", weightage: g.weightage }); setSlideOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        thrustAreaId: form.thrustAreaId,
        title:        form.title.trim(),
        uomType:      form.uomType,
        weightage:    parseFloat(form.weightage),
      };
      // Only include optional fields if they have a value
      if (form.description?.trim()) payload.description = form.description.trim();
      if (form.targetValue)         payload.targetValue  = parseFloat(form.targetValue);
      if (form.targetDate)          payload.targetDate   = form.targetDate;

      if (editGoal) { await updateGoal(editGoal.id, payload); toast.success("Goal updated"); }
      else           { await createGoal(payload);               toast.success("Goal created"); }
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

  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Goals</h2>
          <p className="text-sm text-slate-500">{goals.length} goal{goals.length !== 1 ? "s" : ""} this cycle</p>
        </div>
        <div className="flex gap-2 items-center">
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
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5
                  bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0
                  group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Goal-setting window is currently closed
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4
                    border-transparent border-t-slate-800" />
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Max 8 goals reached</span>
          )}
          {draftGoals.length > 0 && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
              {submitting ? <Spinner /> : <Send className="w-4 h-4" />}
              Submit for Approval
            </motion.button>
          )}
        </div>

      </div>

      {/* Weightage tracker */}
      {draftGoals.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {weightOk
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : <AlertCircle  className="w-4 h-4 text-amber-500" />}
              <span className="text-sm font-medium text-slate-700">Draft Weightage</span>
            </div>
            <span className={`text-sm font-bold ${weightOk ? "text-emerald-600" : totalWeight > 100 ? "text-red-500" : "text-amber-600"}`}>
              {totalWeight}% / 100%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <motion.div
              animate={{ width: `${Math.min(totalWeight, 100)}%` }}
              className={`h-2 rounded-full transition-colors ${weightOk ? "bg-emerald-500" : totalWeight > 100 ? "bg-red-500" : "bg-amber-500"}`}
            />
          </div>
          {!weightOk && <p className="text-xs mt-1.5 font-medium"
            style={{color: totalWeight > 100 ? '#ef4444' : '#f59e0b'}}>
            {totalWeight > 100
              ? `⚠ Over by ${totalWeight - 100}% — reduce goal weightages before submitting`
              : `${100 - totalWeight}% remaining — reach exactly 100% to submit for approval`}
          </p>}
        </div>
      )}

      {/* Goal cards */}
      {goals.length === 0 ? (
        <EmptyState title="No goals yet" desc="Create your first goal to get started."
          action={windowOpen ? <button onClick={openCreate} className="btn-primary mt-2"><Plus className="w-4 h-4" /> Create Goal</button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g, i) => (
            <GoalCard key={g.id} goal={g} index={i} onEdit={openEdit} onDelete={setDeleteModal} />
          ))}
        </div>
      )}

      {/* Goal Form Slide-over */}
      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)}
        title={editGoal ? "Edit Goal" : "Create New Goal"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Goal Title *</label>
            <input className="input" placeholder="e.g., Increase sales revenue by 20%" required
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Optional details..."
              value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div>
            <label className="label">Thrust Area *</label>
            <select className="input" required value={form.thrustAreaId}
              onChange={e => setForm({...form, thrustAreaId: e.target.value})}>
              <option value="">Select thrust area…</option>
              {thrustAreas.map(ta => <option key={ta.id} value={ta.id}>{ta.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">UoM Type *</label>
            <select className="input" value={form.uomType} onChange={e => setForm({...form, uomType: e.target.value, targetValue: "", targetDate: ""})}>
              {Object.entries(UOM_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.hint}</option>)}
            </select>
            {/* Context hint based on selection */}
            <p className="text-xs mt-1.5 px-2.5 py-1.5 rounded-lg inline-block
              bg-brand-50 text-brand-700 font-medium">
              {form.uomType === "MIN"        && "📈 Enter a numeric target to exceed (e.g. revenue ₹50L)"}
              {form.uomType === "MAX"        && "📉 Enter a numeric target to stay below (e.g. TAT < 5 days)"}
              {form.uomType === "TIMELINE"   && "📅 Enter the completion date for this goal"}
              {form.uomType === "ZERO_BASED" && "✅ No target needed — goal is achieved when value = 0"}
            </p>
          </div>

          {/* Target Value — shown for MIN / MAX */}
          {(form.uomType === "MIN" || form.uomType === "MAX") && (
            <div>
              <label className="label">
                Target Value *
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({form.uomType === "MIN" ? "achieve ≥ this number" : "achieve ≤ this number"})
                </span>
              </label>
              <input className="input" type="number" step="any" placeholder="e.g., 100"
                required value={form.targetValue}
                onChange={e => setForm({...form, targetValue: e.target.value})} />
            </div>
          )}

          {/* Target Date — shown for TIMELINE */}
          {form.uomType === "TIMELINE" && (
            <div>
              <label className="label">
                Target Date *
                <span className="ml-2 text-xs font-normal text-slate-400">(deadline for completion)</span>
              </label>
              <input className="input" type="date" required
                value={form.targetDate}
                onChange={e => setForm({...form, targetDate: e.target.value})} />
            </div>
          )}

          <div>
            <label className="label">Weightage (%) *</label>
            <input className="input" type="number" min="10" max="100" placeholder="Min 10%" required
              value={form.weightage} onChange={e => setForm({...form, weightage: e.target.value})} />
            <p className="text-xs text-slate-400 mt-1">Remaining: {100 - totalWeight + (editGoal?.weightage || 0) - (parseFloat(form.weightage)||0)}%</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setSlideOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Spinner /> : editGoal ? "Save Changes" : "Create Goal"}
            </motion.button>
          </div>
        </form>
      </SlideOver>

      {/* Delete confirm modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Goal" size="sm">
        <p className="text-sm text-slate-600 mb-4">Are you sure you want to delete <strong>"{deleteModal?.title}"</strong>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteModal(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
