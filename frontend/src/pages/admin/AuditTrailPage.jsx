import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Search, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getAuditTrail, exportAudit } from "../../api/reports";
import { TableSkeleton, Spinner } from "../../components/loaders/Skeletons";
import { fmtDateTime } from "../../utils/dateHelpers";
import { downloadBlob } from "../../utils/dateHelpers";

const ACTION_COLORS = {
  GOAL_CREATED:   "bg-emerald-50 text-emerald-700",
  GOAL_APPROVED:  "bg-indigo-50 text-indigo-700",
  GOAL_REJECTED:  "bg-red-50 text-red-600",
  GOAL_SUBMITTED: "bg-amber-50 text-amber-700",
  GOAL_UPDATED:   "bg-sky-50 text-sky-700",
  GOAL_DELETED:   "bg-red-50 text-red-600",
  GOAL_UNLOCKED:  "bg-violet-50 text-violet-700",
  CHECKIN_SUBMITTED: "bg-teal-50 text-teal-700",
  CHECKIN_UPDATED:   "bg-sky-50 text-sky-700",
  USER_UPDATED:   "bg-slate-100 text-slate-700",
};

const ENTITY_TYPES = ["ALL", "Goal", "CheckIn", "User", "Cycle"];

export default function AuditTrailPage() {
  const [logs,       setLogs]      = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [exporting,  setExporting] = useState(false);
  const [search,     setSearch]    = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [page,       setPage]      = useState(1);
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAuditTrail({ take: 200 });
      const data = Array.isArray(r.data) ? r.data : r.data?.items || [];
      setLogs(data);
    } catch { toast.error("Failed to load audit trail"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = logs
    .filter(l => entityFilter === "ALL" || l.entityType === entityFilter)
    .filter(l => !search || l.action?.toLowerCase().includes(search.toLowerCase())
      || l.entityType?.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await exportAudit("csv");
      downloadBlob(r.data, "audit_trail.csv");
      toast.success("Audit trail exported");
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Audit Trail</h2>
          <p className="text-sm text-slate-500">{logs.length} total actions logged</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost py-2"><RefreshCw className="w-4 h-4" /></button>
          <button disabled={exporting} onClick={handleExport} className="btn-secondary text-sm">
            {exporting ? <Spinner size="sm" /> : <Download className="w-4 h-4" />} Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 max-w-xs" placeholder="Search actions…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {ENTITY_TYPES.map(e => (
            <button key={e} onClick={() => { setEntityFilter(e); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${entityFilter === e ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={8} /> : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Timestamp", "Action", "Entity", "Entity ID", "Actor"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">No matching audit records</td></tr>
                ) : paginated.map((log, i) => (
                  <motion.tr key={log.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{log.entityType}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{log.entityId?.slice(0, 12)}…</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{log.actor?.name || log.actorId?.slice(0, 8) || "—"}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">← Prev</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
