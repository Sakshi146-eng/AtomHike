import { motion } from "framer-motion";
import { Lock, Pencil, Trash2, Tag, BarChart2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { UOM_LABELS } from "../../utils/uom";

export default function GoalCard({ goal, onEdit, onDelete, index = 0 }) {
  // DRAFT and PENDING_APPROVAL goals are editable; REJECTED and LOCKED are not
  const isEditable = goal.status === "DRAFT" || goal.status === "PENDING_APPROVAL";

  const isLocked   = goal.status === "LOCKED";
  const uom = UOM_LABELS[goal.uomType] || { label: goal.uomType };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      className={`card p-5 hover:shadow-md transition-shadow duration-200 relative group
        ${isLocked ? "bg-surface-bg border-surface-border" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-display text-base text-primary leading-snug truncate">{goal.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {isLocked && <Lock className="w-3.5 h-3.5 text-ink-secondary opacity-50" />}
          <StatusBadge status={goal.status} />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 mb-4">
        {goal.thrustArea && (
          <span className="flex items-center gap-1 font-sans text-xs text-ink-secondary">
            <Tag className="w-3 h-3 text-accent" />
            {goal.thrustArea.name}
          </span>
        )}
        <span className="flex items-center gap-1 font-sans text-xs text-ink-secondary">
          <BarChart2 className="w-3 h-3 text-accent" />
          {uom.label}
        </span>
      </div>

      {/* Target — use explicit null check so 0 displays correctly for ZERO_BASED goals */}
      {(goal.uomType === "ZERO_BASED"
        || goal.uomType === "TIMELINE"
        || (goal.targetValue !== null && goal.targetValue !== undefined && goal.targetValue !== "")) && (
        <p className="font-sans text-[13px] text-ink-secondary mb-3">
          Target:{" "}
          <span className="font-mono text-primary font-medium">
            {goal.uomType === "ZERO_BASED"
              ? "0 — Zero = success"
              : goal.uomType === "TIMELINE"
              ? (goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "—")
              : goal.targetValue}
          </span>
        </p>
      )}

      {/* Weightage bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-sans text-[11px] text-ink-secondary">Weightage</span>
          <span className="font-mono text-xs font-semibold text-primary">{goal.weightage}%</span>
        </div>
        <div className="w-full bg-surface-border rounded-full h-1.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goal.weightage}%` }}
            transition={{ delay: index * 0.06 + 0.2, duration: 0.5 }}
            className="h-1.5 rounded-full bg-accent"
          />
        </div>
      </div>

      {/* Rejection reason */}
      {goal.status === "REJECTED" && goal.rejectionReason && (
        <p className="font-sans text-xs text-red-600 bg-red-50/80 border border-red-100 px-3 py-2 rounded-md mb-4">
          <span className="font-semibold block mb-0.5">Manager Feedback:</span>
          {goal.rejectionReason}
        </p>
      )}

      {/* Actions */}
      {isEditable && (
        <div className="flex gap-2 pt-3 border-t border-surface-border opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit?.(goal)} className="btn-secondary text-[11px] py-1.5 flex-1 justify-center">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => onDelete?.(goal)} className="btn-secondary border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-[11px] py-1.5 flex-1 justify-center">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </motion.div>
  );
}
