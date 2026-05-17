import { motion } from "framer-motion";
import { Lock, Pencil, Trash2, Tag, BarChart2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { UOM_LABELS } from "../../utils/uom";

export default function GoalCard({ goal, onEdit, onDelete, index = 0 }) {
  const isEditable = goal.status === "DRAFT";
  const isLocked   = goal.status === "LOCKED";
  const uom = UOM_LABELS[goal.uomType] || { label: goal.uomType };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      className={`card p-5 hover:shadow-md transition-shadow duration-200 relative
        ${isLocked ? "border-indigo-100 bg-indigo-50/30" : ""}`}
    >
      {isLocked && (
        <div className="absolute top-3 right-3">
          <Lock className="w-4 h-4 text-indigo-400" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug pr-6">{goal.title}</h3>
        <StatusBadge status={goal.status} className="shrink-0" />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 mb-3">
        {goal.thrustArea && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Tag className="w-3 h-3" />
            {goal.thrustArea.name}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <BarChart2 className="w-3 h-3" />
          {uom.label}
        </span>
      </div>

      {/* Target */}
      {goal.targetValue && (
        <p className="text-xs text-slate-500 mb-3">
          Target: <span className="font-medium text-slate-700">{goal.targetValue}</span>
        </p>
      )}

      {/* Weightage bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Weightage</span>
          <span className="text-xs font-semibold text-slate-700">{goal.weightage}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goal.weightage}%` }}
            transition={{ delay: index * 0.06 + 0.2, duration: 0.5 }}
            className="h-1.5 rounded-full bg-brand-500"
          />
        </div>
      </div>

      {/* Rejection reason */}
      {goal.status === "REJECTED" && goal.rejectionReason && (
        <p className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-md mb-3">
          ↩ {goal.rejectionReason}
        </p>
      )}

      {/* Actions */}
      {isEditable && (
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button onClick={() => onEdit?.(goal)} className="btn-ghost text-xs py-1">
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button onClick={() => onDelete?.(goal)} className="btn-ghost text-xs py-1 text-red-500 hover:bg-red-50">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
    </motion.div>
  );
}
