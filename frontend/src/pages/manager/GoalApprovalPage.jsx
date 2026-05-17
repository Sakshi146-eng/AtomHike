import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Pencil, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { getTeamGoals, approveGoal, rejectGoal, managerEditGoal } from "../../api/goals";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { UOM_LABELS } from "../../utils/uom";

export default function GoalApprovalPage() {
  const [goals,    setGoals]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState({});
  const [rejectModal, setRejectModal] = useState(null);
  const [editModal,   setEditModal]   = useState(null);
  const [reason,   setReason]   = useState("");
  const [editForm, setEditForm] = useState({ targetValue: "", weightage: "" });

  const load = () => {
    getTeamGoals()
      .then(r => setGoals(r.data.filter(g => g.status === "PENDING_APPROVAL")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setSaving(s => ({ ...s, [id]: "approving" }));
    try {
      await approveGoal(id);
      toast.success("Goal approved and locked!");
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Approval failed"); }
    finally { setSaving(s => ({ ...s, [id]: null })); }
  };

  const handleReject = async () => {
    setSaving(s => ({ ...s, [rejectModal.id]: "rejecting" }));
    try {
      await rejectGoal(rejectModal.id, reason);
      toast.success("Goal returned to employee");
      setRejectModal(null); setReason("");
      load();
    } catch { toast.error("Rejection failed"); }
    finally { setSaving(s => ({ ...s, [rejectModal?.id]: null })); }
  };

  const handleEdit = async () => {
    try {
      await managerEditGoal(editModal.id, {
        targetValue: editForm.targetValue ? parseFloat(editForm.targetValue) : undefined,
        weightage:   editForm.weightage   ? parseFloat(editForm.weightage)   : undefined,
      });
      toast.success("Goal updated");
      setEditModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Edit failed"); }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Goal Approvals</h2>
        <p className="text-sm text-slate-500">{goals.length} goal{goals.length !== 1 ? "s" : ""} awaiting your review</p>
      </div>

      {goals.length === 0 ? (
        <EmptyState title="All caught up!" desc="No goals waiting for approval." />
      ) : (
        <div className="space-y-3">
          {goals.map((goal, i) => (
            <motion.div key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-slate-800 text-sm">{goal.title}</h3>
                    <StatusBadge status={goal.status} />
                  </div>
                  <p className="text-xs text-slate-500">{goal.owner?.name} · {goal.owner?.department}</p>
                </div>
              </div>

              {/* Goal details grid */}
              <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-slate-400 mb-0.5">Thrust Area</p>
                  <p className="font-medium text-slate-700">{goal.thrustArea?.name || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-slate-400 mb-0.5">UoM</p>
                  <p className="font-medium text-slate-700">{UOM_LABELS[goal.uomType]?.label}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-slate-400 mb-0.5">Weightage</p>
                  <p className="font-bold text-brand-700">{goal.weightage}%</p>
                </div>
              </div>

              {goal.description && (
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{goal.description}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => handleApprove(goal.id)}
                  disabled={saving[goal.id]}
                  className="btn-primary flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-xs">
                  {saving[goal.id] === "approving" ? <Spinner /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => { setEditModal(goal); setEditForm({ targetValue: goal.targetValue || "", weightage: goal.weightage }); }}
                  className="btn-secondary flex-1 justify-center text-xs">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => setRejectModal(goal)}
                  className="btn-danger flex-1 justify-center text-xs">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setReason(""); }} title="Reject Goal" size="sm">
        <p className="text-sm text-slate-600 mb-3">Provide a reason for rejection. The employee will see this and can revise.</p>
        <textarea className="input min-h-[100px] resize-none mb-4" placeholder="e.g., Target is unclear, please specify a measurable metric…"
          value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-3">
          <button onClick={() => { setRejectModal(null); setReason(""); }} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleReject} disabled={!reason.trim()} className="btn-danger flex-1 justify-center">Reject Goal</button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Goal (Manager)" size="sm">
        <p className="text-sm text-slate-500 mb-4">Adjust target or weightage before approving.</p>
        <div className="space-y-3">
          <div>
            <label className="label">Target Value</label>
            <input className="input" type="number" value={editForm.targetValue}
              onChange={e => setEditForm({...editForm, targetValue: e.target.value})} />
          </div>
          <div>
            <label className="label">Weightage (%)</label>
            <input className="input" type="number" min="10" max="100" value={editForm.weightage}
              onChange={e => setEditForm({...editForm, weightage: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setEditModal(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleEdit} className="btn-primary flex-1 justify-center">Save Changes</button>
        </div>
      </Modal>
    </div>
  );
}
