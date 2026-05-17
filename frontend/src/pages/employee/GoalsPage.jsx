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
    const [gr, tar, cr] = await Promise.all([
      getMyGoals(),
      listThrustAreas(),
      getActiveCycle().catch(() => ({ data: null })),
    ]);
    setGoals(gr.data);
    setThrustAreas(tar.data);
    if (cr.data) {
      const now = new Date();
      const start = new Date(cr.data.goalSettingStart);
      const end   = new Date(cr.data.goalSettingEnd);
      setWindowOpen(start <= now && now <= end);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const draftGoals  = goals.filter(g => g.status === "DRAFT");
  const rejectedGoals = goals.filter(g => g.status === "REJECTED");
  const totalWeight = draftGoals.reduce((s, g) => s + g.weightage, 0);
  const canSubmit   = draftGoals.length > 0;   // no 100% requirement on frontend
  const weightOk    = Math.round(totalWeight) === 100;

  const openCreate = () => { setEditGoal(null); setForm(EMPTY_FORM); setSlideOpen(true); };
  const openEdit   = (g)  => { setEditGoal(g);   setForm({ title: g.title, description: g.description || "", thrustAreaId: g.thrustAreaId, uomType: g.uomType, targetValue: g.targetValue || "", targetDate: g.targetDate || "", weightage: g.weightage }); setSlideOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, targetValue: form.targetValue ? parseFloat(form.targetValue) : null, weightage: parseFloat(form.weightage) };
      if (editGoal) { await updateGoal(editGoal.id, payload); toast.success("Goal updated"); }
      else           { await createGoal(payload);               toast.success("Goal created"); }
      setSlideOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save goal");
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
        <div className="flex gap-2">
          {windowOpen && goals.length < 8 && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={openCreate} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Goal
            </motion.button>
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
          {!weightOk && <p className="text-xs text-amber-500 mt-1.5">Tip: total weightage is {totalWeight}%. You can still submit — manager will review.</p>}
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
            <select className="input" value={form.uomType} onChange={e => setForm({...form, uomType: e.target.value})}>
              {Object.entries(UOM_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.hint}</option>)}
            </select>
          </div>
          {(form.uomType === "MIN" || form.uomType === "MAX") && (
            <div>
              <label className="label">Target Value *</label>
              <input className="input" type="number" placeholder="e.g., 100" required={form.uomType !== "ZERO_BASED"}
                value={form.targetValue} onChange={e => setForm({...form, targetValue: e.target.value})} />
            </div>
          )}
          {form.uomType === "TIMELINE" && (
            <div>
              <label className="label">Target Date *</label>
              <input className="input" type="date" required
                value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
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
