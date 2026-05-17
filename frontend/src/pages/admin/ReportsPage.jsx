import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Filter } from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";
import { getAchievementReport, exportAchievement, getCompletionReport, exportCompletion } from "../../api/reports";
import { listCycles } from "../../api/cycles";
import { TableSkeleton, Spinner } from "../../components/loaders/Skeletons";
import { achievementBg } from "../../utils/uom";
import { downloadBlob } from "../../utils/dateHelpers";

const TABS = ["Achievement", "Completion"];

export default function ReportsPage() {
  const [tab,        setTab]       = useState("Achievement");
  const [cycles,     setCycles]    = useState([]);
  const [cycleId,    setCycleId]   = useState("");
  const [achData,    setAchData]   = useState([]);
  const [compData,   setCompData]  = useState([]);
  const [loading,    setLoading]   = useState(false);
  const [exporting,  setExporting] = useState(false);

  useEffect(() => {
    listCycles().then(r => {
      setCycles(r.data);
      // Prefer the active cycle; fall back to newest
      const active = r.data.find(c => c.isActive);
      setCycleId(active?.id || r.data[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    if (!cycleId) return;
    setLoading(true);
    Promise.all([
      getAchievementReport(cycleId),
      getCompletionReport(cycleId),
    ]).then(([ar, cr]) => {
      setAchData(Array.isArray(ar.data) ? ar.data : ar.data?.items || []);
      setCompData(Array.isArray(cr.data) ? cr.data : cr.data?.items || []);
    }).catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, [cycleId]);


  const handleExport = async (type, format) => {
    setExporting(true);
    try {
      const fn = type === "achievement" ? exportAchievement : exportCompletion;
      const r = await fn(format);
      downloadBlob(r.data, `${type}_report.${format}`);
      toast.success(`${format.toUpperCase()} exported`);
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  // Build chart data from achievement rows
  const chartData = achData.slice(0, 10).map(row => ({
    name: (row.employeeName || row.goalTitle || "").slice(0, 14),
    achievement: row.achievementPct ? parseFloat(row.achievementPct.toFixed(1)) : 0,
    target: 100,
  }));

  // QoQ trend from completion data
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const trendData = quarters.map(q => ({
    quarter: q,
    completion: compData.length ? Math.round((compData.filter(r => r[q.toLowerCase()] > 0).length / compData.length) * 100) : 0,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Reports</h2>
          <p className="text-sm text-slate-500">Performance analytics and export</p>
        </div>
        <div className="flex gap-2">
          <select className="input max-w-[200px] text-sm" value={cycleId} onChange={e => setCycleId(e.target.value)}>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <TableSkeleton rows={6} /> : tab === "Achievement" ? (
        <div className="space-y-5">
          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Achievement vs Target</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 120]} />
                  <Tooltip formatter={v => [`${v}%`]} />
                  <Legend />
                  <Bar dataKey="target"      name="Target"      fill="#e0e7ff" radius={[4,4,0,0]} />
                  <Bar dataKey="achievement" name="Achievement" fill="#4f46e5" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Achievement Report ({achData.length} rows)</p>
              <div className="flex gap-2">
                <button disabled={exporting} onClick={() => handleExport("achievement", "csv")} className="btn-secondary text-xs py-1.5">
                  {exporting ? <Spinner size="sm" /> : <Download className="w-3 h-3" />} CSV
                </button>
                <button disabled={exporting} onClick={() => handleExport("achievement", "xlsx")} className="btn-secondary text-xs py-1.5">
                  {exporting ? <Spinner size="sm" /> : <Download className="w-3 h-3" />} Excel
                </button>
              </div>
            </div>
            {achData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No data for this cycle</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Employee", "Goal", "Thrust Area", "UoM", "Target", "Actual", "Achievement"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {achData.map((row, i) => (
                      <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{row.employeeName || "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate">{row.goalTitle || "—"}</td>
                        <td className="px-4 py-2.5 text-slate-500">{row.thrustArea || "—"}</td>
                        <td className="px-4 py-2.5 text-slate-500">{row.uomType || "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.targetValue ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.actualValue ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          {row.achievementPct != null ? (
                            <span className={`px-2 py-0.5 rounded font-bold ${achievementBg(row.achievementPct)}`}>
                              {parseFloat(row.achievementPct).toFixed(1)}%
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* QoQ trend */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Quarterly Check-in Completion Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip formatter={v => [`${v}%`, "Completion"]} />
                <Line type="monotone" dataKey="completion" stroke="#4f46e5" strokeWidth={2.5}
                  dot={{ fill: "#4f46e5", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Completion table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Completion Dashboard ({compData.length} employees)</p>
              <button disabled={exporting} onClick={() => handleExport("completion", "csv")} className="btn-secondary text-xs py-1.5">
                {exporting ? <Spinner size="sm" /> : <Download className="w-3 h-3" />} Export CSV
              </button>
            </div>
            {compData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No check-in data yet</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Employee", "Dept", "Total Goals", "Q1", "Q2", "Q3", "Q4", "Overall %"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{row.employeeName || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500">{row.department || "—"}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{row.totalGoals ?? "—"}</td>
                      {["q1", "q2", "q3", "q4"].map(q => (
                        <td key={q} className="px-4 py-2.5 text-center">
                          {row[q] != null ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${achievementBg(row[q])}`}>{row[q]}%</span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        {row.overallPct != null ? (
                          <span className={`px-2 py-0.5 rounded font-bold ${achievementBg(row.overallPct)}`}>{row.overallPct}%</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
