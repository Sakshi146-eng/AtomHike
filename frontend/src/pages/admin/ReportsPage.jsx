import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Filter, FileBarChart, PieChart, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import {
  getAchievementReport, exportAchievement, getCompletionReport, exportCompletion
} from "../../api/reports";
import { listCycles } from "../../api/cycles";
import { TableSkeleton, Spinner } from "../../components/loaders/Skeletons";
import { downloadBlob } from "../../utils/dateHelpers";

const TABS = ["Achievement", "Completion"];

export default function ReportsPage() {
  const [tab, setTab] = useState("Achievement");
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState("");
  const [achData, setAchData] = useState([]);
  const [compData, setCompData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters state
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    listCycles().then((r) => {
      const data = r.data || [];
      setCycles(data);
      // Prefer the active cycle; fall back to newest
      const active = data.find((c) => c.isActive);
      setCycleId(active?.id || data[0]?.id || "");
    });
  }, []);

  const loadData = () => {
    if (!cycleId) return;
    setLoading(true);
    Promise.all([
      getAchievementReport(cycleId),
      getCompletionReport(cycleId),
    ])
      .then(([ar, cr]) => {
        setAchData(Array.isArray(ar.data) ? ar.data : ar.data?.items || []);
        setCompData(Array.isArray(cr.data) ? cr.data : cr.data?.items || []);
        toast.success("Reports synced successfully");
      })
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [cycleId]);


  const handleExport = async (type, format) => {
    setExporting(true);
    try {
      const fn = type === "achievement" ? exportAchievement : exportCompletion;
      const r = await fn(format);
      downloadBlob(r.data, `${type}_report.${format}`);
      toast.success(`${format.toUpperCase()} exported`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Extract unique departments from completion data dynamically
  const uniqueDepts = Array.from(
    new Set(compData.map((d) => d.department).filter(Boolean))
  );

  // Filter datasets
  const activeAch = achData.filter((row) => {
    // If deptFilter is ALL, let it pass. Otherwise, match employee dept in users if available,
    // or fallback. In achData, department is not always present directly, let's filter if available on row.
    const deptMatch = deptFilter === "ALL" || row.department === deptFilter;
    if (statusFilter === "ALL") return deptMatch;
    if (statusFilter === "EXCELLENT") return deptMatch && (row.achievementPct >= 85);
    if (statusFilter === "ON_TRACK") return deptMatch && (row.achievementPct >= 50 && row.achievementPct < 85);
    return deptMatch && (row.achievementPct < 50);
  });

  const activeComp = compData.filter((row) => {
    const deptMatch = deptFilter === "ALL" || row.department === deptFilter;
    if (statusFilter === "ALL") return deptMatch;
    if (statusFilter === "EXCELLENT") return deptMatch && (row.overallPct >= 85);
    if (statusFilter === "ON_TRACK") return deptMatch && (row.overallPct >= 50 && row.overallPct < 85);
    return deptMatch && (row.overallPct < 50);
  });

  // Recharts target data formatting
  const chartData = activeAch.slice(0, 10).map((row) => ({
    name: (row.employeeName || row.goalTitle || "").slice(0, 14),
    achievement: row.achievementPct ? parseFloat(row.achievementPct.toFixed(1)) : 0,
    target: 100,
  }));

  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const trendData = quarters.map((q) => ({
    quarter: q,
    completion: activeComp.length
      ? Math.round(
        (activeComp.filter((r) => r[q.toLowerCase()] > 0).length / activeComp.length) * 100
      )
      : 0,
  }));

  // Summary Metrics calculations
  const totalRecords = tab === "Achievement" ? activeAch.length : activeComp.length;

  const averagePct = Math.round(
    tab === "Achievement"
      ? activeAch.reduce((acc, r) => acc + (r.achievementPct || 0), 0) / (activeAch.length || 1)
      : activeComp.reduce((acc, r) => acc + (r.overallPct || 0), 0) / (activeComp.length || 1)
  );

  const highAchievementCount =
    tab === "Achievement"
      ? activeAch.filter((r) => r.achievementPct >= 85).length
      : activeComp.filter((r) => r.overallPct >= 85).length;

  const getAchColor = (pct) => {
    if (pct >= 85) return "bg-status-success-light text-status-success border border-status-success/15";
    if (pct >= 50) return "bg-status-warning-light text-status-warning border border-status-warning/15";
    return "bg-status-danger-light text-status-danger border border-status-danger/15";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-primary font-display">Reports & Analytics</h1>
        <p className="text-sm text-ink-secondary mt-0.5">
          Enterprise performance matrix generation, department audits, and file exports.
        </p>
      </div>

      {/* 2-Panel Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Side Filters Panel (Fixed 280px width) */}
        <div className="card w-full lg:w-[280px] shrink-0 p-5 bg-white space-y-5">
          <div className="flex items-center gap-2 text-primary font-sans font-bold text-sm border-b border-surface-border pb-3">
            <Filter className="w-4 h-4" /> Filters Configuration
          </div>

          {/* Report Type selector tabs */}
          <div className="space-y-1">
            <label className="label">Report Scope</label>
            <div className="flex flex-col gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold font-sans transition-all flex items-center justify-between border ${tab === t
                      ? "bg-accent-light/50 border-accent/20 text-accent"
                      : "bg-transparent border-transparent text-ink-secondary hover:bg-slate-50"
                    }`}
                >
                  <span>{t} Matrix</span>
                  {t === "Achievement" ? <FileBarChart className="w-3.5 h-3.5" /> : <PieChart className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Cycle Selector */}
          <div>
            <label className="label">Performance Cycle</label>
            <select
              className="input text-xs font-semibold"
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="label">Department</label>
            <select
              className="input text-xs"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {uniqueDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Range Selector */}
          <div>
            <label className="label">Achievement Level</label>
            <select
              className="input text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Levels</option>
              <option value="EXCELLENT">Excellent (≥ 85%)</option>
              <option value="ON_TRACK">On Track (50% - 84%)</option>
              <option value="DELAYED">Delayed (&lt; 50%)</option>
            </select>
          </div>

          {/* Generate Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={loadData}
            className="btn-primary w-full text-xs font-semibold py-2.5 justify-center flex items-center bg-primary text-white"
          >
            Generate & Sync Report
          </motion.button>
        </div>

        {/* Right Side Main Preview Panel */}
        <div className="flex-1 w-full space-y-6">
          {loading ? (
            <TableSkeleton rows={8} />
          ) : (
            <>
              {/* Summary Stats Bar */}
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4 bg-white flex flex-col justify-between">
                  <span className="text-[11px] font-sans font-medium text-ink-secondary uppercase tracking-wider">Total Records</span>
                  <div className="text-xl font-bold font-mono text-ink-primary mt-2">{totalRecords}</div>
                </div>
                <div className="card p-4 bg-white flex flex-col justify-between">
                  <span className="text-[11px] font-sans font-medium text-ink-secondary uppercase tracking-wider">Avg Progress</span>
                  <div className="text-xl font-bold font-mono text-accent mt-2">{averagePct}%</div>
                </div>
                <div className="card p-4 bg-white flex flex-col justify-between">
                  <span className="text-[11px] font-sans font-medium text-ink-secondary uppercase tracking-wider">Excellent Rating</span>
                  <div className="text-xl font-bold font-mono text-status-success mt-2">{highAchievementCount}</div>
                </div>
              </div>

              {/* Chart Visualization */}
              {tab === "Achievement" ? (
                chartData.length > 0 && (
                  <div className="card p-5 bg-white">
                    <h3 className="text-xs font-bold font-sans text-ink-primary mb-4">Top 10 Employees: Target vs Achievement</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4EF" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Outfit" }} />
                        <YAxis tick={{ fontSize: 10, fontFamily: "Roboto Mono" }} unit="%" domain={[0, 120]} />
                        <Tooltip formatter={(v) => [`${v}%`]} />
                        <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "Outfit" }} />
                        <Bar dataKey="target" name="Target" fill="#DBEAFE" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="achievement" name="Achievement" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : (
                trendData.length > 0 && (
                  <div className="card p-5 bg-white">
                    <h3 className="text-xs font-bold font-sans text-ink-primary mb-4 font-sans">Check-in Completion Trend (QoQ)</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={trendData} margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4E4EF" />
                        <XAxis dataKey="quarter" tick={{ fontSize: 11, fontFamily: "Roboto Mono" }} />
                        <YAxis unit="%" tick={{ fontSize: 11, fontFamily: "Roboto Mono" }} domain={[0, 100]} />
                        <Tooltip formatter={(v) => [`${v}%`, "Completion"]} />
                        <Line
                          type="monotone"
                          dataKey="completion"
                          stroke="#3B82F6"
                          strokeWidth={2.5}
                          dot={{ fill: "#3B82F6", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              )}

              {/* Data Table Preview */}
              <div className="card overflow-hidden bg-white">
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
                  <h3 className="text-[14px] font-bold font-sans text-ink-primary">
                    {tab} Matrix Preview
                  </h3>
                  <div className="flex gap-2">
                    <button
                      disabled={exporting || totalRecords === 0}
                      onClick={() => handleExport(tab.toLowerCase(), "csv")}
                      className="btn-outline border-surface-border text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-slate-50"
                    >
                      {exporting ? <Spinner /> : <Download className="w-3.5 h-3.5 text-ink-secondary" />} CSV
                    </button>
                    <button
                      disabled={exporting || totalRecords === 0}
                      onClick={() => handleExport(tab.toLowerCase(), "xlsx")}
                      className="btn-outline border-surface-border text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-slate-50"
                    >
                      {exporting ? <Spinner /> : <Download className="w-3.5 h-3.5 text-ink-secondary" />} Excel
                    </button>
                  </div>
                </div>

                {totalRecords === 0 ? (
                  <div className="text-center py-12 text-ink-secondary">
                    <AlertCircle className="w-8 h-8 text-ink-secondary/60 mx-auto mb-2" />
                    <p className="text-xs">No records matching the filter settings are present.</p>
                  </div>
                ) : tab === "Achievement" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[#F4F4FA] border-b border-surface-border">
                          {["Employee", "Goal Title", "Thrust Area", "UoM", "Target", "Actual", "Achievement"].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-[11px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {activeAch.map((row, i) => (
                          <tr key={i} className="hover:bg-[#F9F9FB] odd:bg-white even:bg-[#F9F9FB] transition-colors">
                            <td className="px-4 py-3 font-sans font-semibold text-ink-primary">{row.employeeName || "—"}</td>
                            <td className="px-4 py-3 text-ink-primary max-w-[200px] truncate" title={row.goalTitle}>{row.goalTitle || "—"}</td>
                            <td className="px-4 py-3 text-ink-secondary font-sans text-xs">{row.thrustArea || "—"}</td>
                            <td className="px-4 py-3 text-ink-secondary font-mono text-[11px]">{row.uomType || "—"}</td>
                            <td className="px-4 py-3 text-ink-primary font-mono text-xs">{row.targetValue ?? "—"}</td>
                            <td className="px-4 py-3 text-ink-primary font-mono text-xs">{row.actualValue ?? "—"}</td>
                            <td className="px-4 py-3">
                              {row.achievementPct != null ? (
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getAchColor(row.achievementPct)}`}>
                                  {parseFloat(row.achievementPct).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[#F4F4FA] border-b border-surface-border">
                          {["Employee", "Dept", "Goals Aligned", "Q1", "Q2", "Q3", "Q4", "Overall"].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-[11px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {activeComp.map((row, i) => (
                          <tr key={i} className="hover:bg-[#F9F9FB] odd:bg-white even:bg-[#F9F9FB] transition-colors">
                            <td className="px-4 py-3 font-sans font-semibold text-ink-primary">{row.employeeName || "—"}</td>
                            <td className="px-4 py-3 text-ink-secondary font-sans text-xs">{row.department || "—"}</td>
                            <td className="px-4 py-3 text-ink-primary font-mono text-xs text-center">{row.totalGoals ?? 0}</td>
                            {["q1", "q2", "q3", "q4"].map((q) => (
                              <td key={q} className="px-4 py-3 text-xs">
                                {row[q] != null ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${getAchColor(row[q])}`}>
                                    {row[q]}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              {row.overallPct != null ? (
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getAchColor(row.overallPct)}`}>
                                  {row.overallPct}%
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
