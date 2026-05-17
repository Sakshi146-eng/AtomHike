import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Filter } from "lucide-react";
import { getTeamGoals } from "../../api/goals";
import { PageSkeleton } from "../../components/loaders/Skeletons";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";

const STATUS_FILTERS = ["ALL", "DRAFT", "PENDING_APPROVAL", "LOCKED", "REJECTED"];

export default function TeamGoalsPage() {
  const [goals,   setGoals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("ALL");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    getTeamGoals().then(r => setGoals(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  const filtered = goals
    .filter(g => filter === "ALL" || g.status === filter)
    .filter(g => !search || g.title.toLowerCase().includes(search.toLowerCase()) || g.owner?.name.toLowerCase().includes(search.toLowerCase()));

  // Group by employee
  const grouped = filtered.reduce((acc, g) => {
    const key = g.owner?.name || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Team Goals</h2>
          <p className="text-sm text-slate-500">{goals.length} total goals across your team</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search goals or employees…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filter === s ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped by employee */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState title="No goals found" desc="Try adjusting your filters" />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([empName, empGoals], idx) => (
            <motion.div key={empName} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
              className="card overflow-hidden">
              {/* Employee header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {empName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{empName}</p>
                  <p className="text-xs text-slate-400">{empGoals[0]?.owner?.department}</p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  {["LOCKED", "PENDING_APPROVAL", "DRAFT", "REJECTED"].map(s => {
                    const cnt = empGoals.filter(g => g.status === s).length;
                    return cnt > 0 ? <StatusBadge key={s} status={s} className="text-xs" /> : null;
                  })}
                </div>
              </div>

              {/* Goals table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-2 text-left font-medium">Goal</th>
                    <th className="px-3 py-2 text-left font-medium">Thrust Area</th>
                    <th className="px-3 py-2 text-center font-medium">Weight</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {empGoals.map(g => (
                    <tr key={g.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-slate-700">{g.title}</p>
                        {g.rejectionReason && <p className="text-red-400 mt-0.5">↩ {g.rejectionReason}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{g.thrustArea?.name || "—"}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-700">{g.weightage}%</td>
                      <td className="px-3 py-2.5 text-center"><StatusBadge status={g.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
