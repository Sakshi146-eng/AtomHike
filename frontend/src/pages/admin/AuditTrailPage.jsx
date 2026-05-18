import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Search, RefreshCw, ChevronLeft, ChevronRight, ShieldAlert, User } from "lucide-react";
import toast from "react-hot-toast";
import { getAuditTrail, exportAudit } from "../../api/reports";
import { TableSkeleton, Spinner } from "../../components/loaders/Skeletons";
import { fmtDateTime, downloadBlob } from "../../utils/dateHelpers";

const ENTITY_TYPES = ["ALL", "Goal", "CheckIn", "User", "Cycle"];

const getActionVisuals = (action) => {
  const act = action?.toUpperCase() || "";
  if (act.includes("CREATED") || act.includes("SUBMITTED")) {
    return {
      class: "bg-accent-light text-accent border border-accent/15",
      isCritical: false,
    };
  }
  if (act.includes("APPROVED")) {
    return {
      class: "bg-status-success-light text-status-success border border-status-success/15",
      isCritical: false,
    };
  }
  if (act.includes("REJECTED") || act.includes("DELETED")) {
    return {
      class: "bg-status-danger-light text-status-danger border border-status-danger/15",
      isCritical: true,
    };
  }
  return {
    class: "bg-primary-tint text-primary border border-primary-tint",
    isCritical: false,
  };
};

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAuditTrail({ take: 200 });
      const data = Array.isArray(r.data) ? r.data : r.data?.items || [];
      setLogs(data);
    } catch (err) {
      toast.error("Failed to load security log trail");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = logs
    .filter((l) => entityFilter === "ALL" || l.entityType === entityFilter)
    .filter(
      (l) =>
        !search ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.entityType?.toLowerCase().includes(search.toLowerCase()) ||
        l.actor?.name?.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await exportAudit("csv");
      downloadBlob(r.data, "audit_trail.csv");
      toast.success("Security log exported as CSV");
    } catch {
      toast.error("Export process failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary font-display">Audit Trail</h1>
          <p className="text-sm text-ink-secondary mt-0.5">
            Security logs, user actions, system modifications, and access traces.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={load}
            title="Refresh Log Feed"
            className="p-2 rounded-lg border border-surface-border bg-white text-ink-secondary hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            disabled={exporting || logs.length === 0}
            onClick={handleExport}
            className="btn-outline border-surface-border text-xs py-2 px-3.5 flex items-center gap-1.5 hover:bg-slate-50"
          >
            {exporting ? <Spinner /> : <Download className="w-4 h-4 text-ink-secondary" />} Export CSV
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            className="input pl-9 text-[14px]"
            placeholder="Search logs by action or actor…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Tab-styled Entity filters */}
        <div className="flex gap-1 p-1 bg-primary-tint/35 border border-primary-tint/20 rounded-xl w-fit self-start md:self-center">
          {ENTITY_TYPES.map((e) => (
            <button
              key={e}
              onClick={() => {
                setEntityFilter(e);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${entityFilter === e
                ? "bg-white shadow text-ink-primary"
                : "text-ink-secondary hover:text-ink-primary"
                }`}
            >
              {e === "ALL" ? "All Logs" : e}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          <div className="card overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F4F4FA] border-b border-surface-border">
                    {["Timestamp", "Action Logged", "Entity Type", "Identifier", "Actor Details", "IP Address"].map((h) => (
                      <th key={h} className="px-5 py-3 text-[11px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-ink-secondary text-xs">
                        No security audit logs match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((log, i) => {
                      const visuals = getActionVisuals(log.action);
                      const rowStyle = visuals.isCritical
                        ? "bg-status-danger-light/20 hover:bg-status-danger-light/35 border-l-2 border-status-danger"
                        : "hover:bg-[#F0F2FF] transition-colors";

                      const actorName = log.actor?.name || log.actorId?.slice(0, 8) || "System Machine";
                      const ipStr = log.ipAddress || "127.0.0.1";

                      return (
                        <motion.tr
                          key={log.id || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.015 }}
                          className={rowStyle}
                        >
                          <td className="px-5 py-3.5 text-[11px] font-mono text-ink-secondary whitespace-nowrap">
                            {fmtDateTime(log.timestamp)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${visuals.class}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-ink-primary font-medium">{log.entityType}</td>
                          <td className="px-5 py-3.5 text-xs font-mono text-ink-secondary" title={log.entityId}>
                            {log.entityId ? `${log.entityId.slice(0, 10)}…` : "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs text-ink-primary font-medium truncate max-w-[150px]" title={actorName}>
                                {actorName}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[11px] font-mono text-ink-secondary">{ipStr}</td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-surface-border bg-white">
                <p className="text-[13px] font-mono text-ink-secondary">
                  Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} logs
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-outline border-primary hover:bg-primary-tint/30 text-xs py-1.5 px-3 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-outline border-primary hover:bg-primary-tint/30 text-xs py-1.5 px-3 disabled:opacity-40"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
