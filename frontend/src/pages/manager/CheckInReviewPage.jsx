import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { getTeamGoals } from "../../api/goals";
import { getGoalCheckIns, addComment } from "../../api/checkIns";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import { achievementBg } from "../../utils/uom";
import { fmtDate } from "../../utils/dateHelpers";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export default function CheckInReviewPage() {
  const [goals,    setGoals]    = useState([]);
  const [checkIns, setCheckIns] = useState({});
  const [activeQ,  setActiveQ]  = useState("Q1");
  const [loading,  setLoading]  = useState(true);
  const [commentModal, setCommentModal] = useState(null);
  const [comment,  setComment]  = useState("");
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    getTeamGoals().then(async r => {
      const locked = r.data.filter(g => g.status === "LOCKED");
      setGoals(locked);
      const ciMap = {};
      await Promise.all(locked.map(async g => {
        try { ciMap[g.id] = (await getGoalCheckIns(g.id)).data; }
        catch { ciMap[g.id] = []; }
      }));
      setCheckIns(ciMap);
    }).finally(() => setLoading(false));
  }, []);

  const getCI = (goalId) => checkIns[goalId]?.find(ci => ci.quarterWindow?.quarter === activeQ);

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await addComment(commentModal.ciId, comment);
      toast.success("Comment added");
      setCommentModal(null); setComment("");
    } catch { toast.error("Failed to add comment"); }
    finally { setSaving(false); }
  };

  if (loading) return <PageSkeleton />;

  const rows = goals.map(g => ({ goal: g, ci: getCI(g.id) }));
  const withCI = rows.filter(r => r.ci);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Check-in Review</h2>
        <p className="text-sm text-slate-500">{withCI.length} of {rows.length} goals have submitted check-ins for {activeQ}</p>
      </div>

      {/* Quarter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {QUARTERS.map(q => (
          <button key={q} onClick={() => setActiveQ(q)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeQ === q ? "bg-white shadow text-brand-700" : "text-slate-500 hover:text-slate-700"}`}>
            {q}
          </button>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState title="No approved goals" desc="No team goals have been approved yet." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Employee", "Goal", "Target", "Actual", "Achievement", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ goal, ci }, i) => (
                <motion.tr key={goal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 text-xs">{goal.owner?.name}</p>
                    <p className="text-slate-400 text-xs">{goal.owner?.department}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 text-xs">{goal.title}</p>
                    <p className="text-slate-400 text-xs">{goal.thrustArea?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{goal.targetValue ?? fmtDate(goal.targetDate) ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">{ci?.actualValue ?? "—"}</td>
                  <td className="px-4 py-3">
                    {ci?.achievementPct != null ? (
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${achievementBg(ci.achievementPct)}`}>
                        {ci.achievementPct.toFixed(1)}%
                      </span>
                    ) : <span className="text-slate-300 text-xs">Not submitted</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{ci?.progressStatus?.replace("_", " ") || "—"}</td>
                  <td className="px-4 py-3">
                    {ci && (
                      <button onClick={() => setCommentModal({ ciId: ci.id, goalTitle: goal.title })}
                        className="btn-ghost text-xs py-1">
                        <MessageSquare className="w-3 h-3" /> Comment
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comment modal */}
      <Modal open={!!commentModal} onClose={() => { setCommentModal(null); setComment(""); }} title="Add Comment" size="sm">
        <p className="text-sm text-slate-500 mb-3">Goal: <strong>{commentModal?.goalTitle}</strong></p>
        <textarea className="input min-h-[100px] resize-none mb-4" placeholder="Great progress! Keep focusing on…"
          value={comment} onChange={e => setComment(e.target.value)} />
        <div className="flex gap-3">
          <button onClick={() => { setCommentModal(null); setComment(""); }} className="btn-secondary flex-1">Cancel</button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleComment} disabled={saving || !comment.trim()} className="btn-primary flex-1 justify-center">
            {saving ? <Spinner /> : "Add Comment"}
          </motion.button>
        </div>
      </Modal>
    </div>
  );
}
