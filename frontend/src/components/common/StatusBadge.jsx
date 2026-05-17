const STATUS_MAP = {
  DRAFT:            { label: "Draft",           cls: "bg-slate-100 text-slate-600 border-slate-200" },
  PENDING_APPROVAL: { label: "Pending",         cls: "bg-amber-50 text-amber-700 border-amber-200"  },
  LOCKED:           { label: "Approved",        cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  REJECTED:         { label: "Rejected",        cls: "bg-red-50 text-red-600 border-red-200"        },
  NOT_STARTED:      { label: "Not Started",     cls: "bg-slate-100 text-slate-500 border-slate-200" },
  ON_TRACK:         { label: "On Track",        cls: "bg-sky-50 text-sky-700 border-sky-200"         },
  COMPLETED:        { label: "Completed",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DELAYED:          { label: "Delayed",         cls: "bg-red-50 text-red-600 border-red-200"        },
  EMPLOYEE:         { label: "Employee",        cls: "bg-sky-50 text-sky-700 border-sky-200"         },
  MANAGER:          { label: "Manager",         cls: "bg-violet-50 text-violet-700 border-violet-200" },
  ADMIN:            { label: "Admin / HR",      cls: "bg-amber-50 text-amber-700 border-amber-200"  },
};

export default function StatusBadge({ status, className = "" }) {
  const cfg = STATUS_MAP[status] || { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls} ${className}`}>
      {cfg.label}
    </span>
  );
}
