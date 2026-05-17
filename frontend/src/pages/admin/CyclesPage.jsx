import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, CheckCircle, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { listCycles, createCycle, activateCycle, addQuarterWindow, getQuarterWindows, toggleWindow } from "../../api/cycles";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import Modal from "../../components/common/Modal";
import { fmtDate } from "../../utils/dateHelpers";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

function QuarterWindowRow({ w, onToggle }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
      <span className="text-xs font-bold text-brand-700 w-6">{w.quarter}</span>
      <span className="text-xs text-slate-500 flex-1">{fmtDate(w.windowOpen)} – {fmtDate(w.windowClose)}</span>
      <button onClick={() => onToggle(w)}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors
          ${w.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-500 hover:bg-slate-300"}`}>
        {w.isActive ? "Open" : "Closed"}
      </button>
    </div>
  );
}

export default function CyclesPage() {
  const [cycles,  setCycles]  = useState([]);
  const [windows, setWindows] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [winModal, setWinModal] = useState(null); // cycle id
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({ name: "", year: new Date().getFullYear(), goalSettingStart: "", goalSettingEnd: "" });
  const [winForm, setWinForm] = useState({ quarter: "Q1", windowOpen: "", windowClose: "" });

  const load = async () => {
    const r = await listCycles();
    setCycles(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadWindows = async (cid) => {
    if (windows[cid]) return;
    const r = await getQuarterWindows(cid);
    setWindows(w => ({ ...w, [cid]: r.data }));
  };

  const toggleExpand = (cid) => {
    setExpanded(e => ({ ...e, [cid]: !e[cid] }));
    loadWindows(cid);
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await createCycle(form);
      toast.success("Cycle created");
      setCreateModal(false); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleActivate = async (id) => {
    try { await activateCycle(id); toast.success("Cycle activated"); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed to activate"); }
  };

  const handleAddWindow = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await addQuarterWindow(winModal, winForm);
      toast.success("Quarter window added");
      setWinModal(null);
      setWindows(w => ({ ...w, [winModal]: undefined }));
      loadWindows(winModal);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleToggle = async (w) => {
    try {
      await toggleWindow(w.id, !w.isActive);
      toast.success(`Window ${!w.isActive ? "opened" : "closed"}`);
      setWindows(ws => ({
        ...ws,
        [w.cycleId]: ws[w.cycleId]?.map(ww => ww.id === w.id ? { ...ww, isActive: !ww.isActive } : ww)
      }));
    } catch { toast.error("Failed to toggle window"); }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cycles & Windows</h2>
          <p className="text-sm text-slate-500">{cycles.length} performance cycles</p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Cycle
        </motion.button>
      </div>

      {cycles.map((c, i) => (
        <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
          className="card overflow-hidden">
          {/* Cycle header */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className={`w-2 h-2 rounded-full ${c.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">{c.name}</h3>
              <p className="text-xs text-slate-400">
                Goal setting: {fmtDate(c.goalSettingStart)} – {fmtDate(c.goalSettingEnd)}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {c.isActive
                ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                : <button onClick={() => handleActivate(c.id)} className="btn-secondary text-xs py-1"><CheckCircle className="w-3 h-3" /> Activate</button>
              }
              <button onClick={() => { setWinModal(c.id); loadWindows(c.id); }} className="btn-ghost text-xs py-1">
                <Calendar className="w-3 h-3" /> Add Window
              </button>
              <button onClick={() => toggleExpand(c.id)} className="btn-ghost py-1">
                {expanded[c.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quarter windows */}
          {expanded[c.id] && (
            <div className="px-5 pb-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mt-3 mb-2">Quarter Windows</p>
              {(windows[c.id] || []).length === 0
                ? <p className="text-xs text-slate-400">No windows configured</p>
                : <div className="space-y-2">
                    {(windows[c.id] || []).map(w => <QuarterWindowRow key={w.id} w={w} onToggle={handleToggle} />)}
                  </div>
              }
            </div>
          )}
        </motion.div>
      ))}

      {/* Create cycle modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Performance Cycle">
        <form onSubmit={handleCreateCycle} className="space-y-4">
          <div><label className="label">Cycle Name *</label><input className="input" required placeholder="FY 2025-26" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="label">Year *</label><input className="input" type="number" required value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Goal Setting Start *</label><input className="input" type="date" required value={form.goalSettingStart} onChange={e => setForm({...form, goalSettingStart: e.target.value})} /></div>
            <div><label className="label">Goal Setting End *</label><input className="input" type="date" required value={form.goalSettingEnd} onChange={e => setForm({...form, goalSettingEnd: e.target.value})} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spinner /> : "Create Cycle"}</button>
          </div>
        </form>
      </Modal>

      {/* Add quarter window modal */}
      <Modal open={!!winModal} onClose={() => setWinModal(null)} title="Add Quarter Window" size="sm">
        <form onSubmit={handleAddWindow} className="space-y-4">
          <div><label className="label">Quarter *</label><select className="input" value={winForm.quarter} onChange={e => setWinForm({...winForm, quarter: e.target.value})}>{QUARTERS.map(q => <option key={q}>{q}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Window Open *</label><input className="input" type="date" required value={winForm.windowOpen} onChange={e => setWinForm({...winForm, windowOpen: e.target.value})} /></div>
            <div><label className="label">Window Close *</label><input className="input" type="date" required value={winForm.windowClose} onChange={e => setWinForm({...winForm, windowClose: e.target.value})} /></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setWinModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spinner /> : "Add Window"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
