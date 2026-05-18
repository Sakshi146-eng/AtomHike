import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, CheckCircle, Calendar, ChevronDown, ChevronUp, Pencil, Archive, Clock, Play
} from "lucide-react";
import toast from "react-hot-toast";
import {
  listCycles, createCycle, activateCycle, updateCycle,
  addQuarterWindow, getQuarterWindows, toggleWindow
} from "../../api/cycles";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import Modal from "../../components/common/Modal";
import { fmtDate } from "../../utils/dateHelpers";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

function QuarterWindowRow({ w, onToggle }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-bg border border-surface-border">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-accent px-2 py-0.5 bg-accent-light/50 rounded">{w.quarter}</span>
        <span className="text-xs font-mono text-ink-secondary">
          {fmtDate(w.windowOpen)} – {fmtDate(w.windowClose)}
        </span>
      </div>
      <button
        onClick={() => onToggle(w)}
        className={`px-3 py-1 rounded text-xs font-sans font-medium transition-all duration-150 active:scale-95
          ${w.isActive
            ? "bg-status-success-light text-status-success border border-status-success/20 hover:bg-status-success-light/80"
            : "bg-primary-tint text-primary-mid border border-primary-tint hover:bg-primary-tint/80"
          }`}
      >
        {w.isActive ? "Open" : "Closed"}
      </button>
    </div>
  );
}

export default function CyclesPage() {
  const [cycles, setCycles] = useState([]);
  const [windows, setWindows] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null); // cycle
  const [winModal, setWinModal] = useState(null); // cycle id
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    goalSettingStart: "",
    goalSettingEnd: "",
    description: "",
  });

  const [winForm, setWinForm] = useState({ quarter: "Q1", windowOpen: "", windowClose: "" });

  const load = async () => {
    try {
      const r = await listCycles();
      setCycles(r.data || []);
    } catch {
      toast.error("Failed to load cycles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadWindows = async (cid) => {
    if (windows[cid]) return;
    try {
      const r = await getQuarterWindows(cid);
      setWindows((w) => ({ ...w, [cid]: r.data || [] }));
    } catch {
      toast.error("Failed to load quarters");
    }
  };

  const toggleExpand = (cid) => {
    setExpanded((e) => ({ ...e, [cid]: !e[cid] }));
    loadWindows(cid);
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createCycle(form);
      toast.success("Performance cycle created");
      setCreateModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create cycle");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCycle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCycle(editModal.id, form);
      toast.success("Performance cycle updated");
      setEditModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update cycle");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateCycle(id);
      toast.success("Cycle activated successfully");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to activate cycle");
    }
  };

  const handleAddWindow = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addQuarterWindow(winModal, winForm);
      toast.success("Quarter check-in window added");
      setWinModal(null);
      setWindows((w) => ({ ...w, [winModal]: undefined }));
      loadWindows(winModal);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add window");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (w) => {
    try {
      await toggleWindow(w.id, !w.isActive);
      toast.success(`Window ${!w.isActive ? "opened" : "closed"}`);
      setWindows((ws) => ({
        ...ws,
        [w.cycleId]: ws[w.cycleId]?.map((ww) => (ww.id === w.id ? { ...ww, isActive: !ww.isActive } : ww)),
      }));
    } catch {
      toast.error("Failed to toggle window status");
    }
  };

  const openCreate = () => {
    setForm({
      name: "",
      year: new Date().getFullYear(),
      goalSettingStart: "",
      goalSettingEnd: "",
      description: "",
    });
    setCreateModal(true);
  };

  const openEdit = (c) => {
    setEditModal(c);
    setForm({
      name: c.name,
      year: c.year,
      goalSettingStart: c.goalSettingStart ? c.goalSettingStart.split("T")[0] : "",
      goalSettingEnd: c.goalSettingEnd ? c.goalSettingEnd.split("T")[0] : "",
      description: c.description || `Performance evaluation cycle for year ${c.year}`,
    });
  };

  const getCycleStatus = (c) => {
    if (c.isActive) return "ACTIVE";
    const end = new Date(c.goalSettingEnd);
    const today = new Date();
    if (end > today) return "UPCOMING";
    return "CLOSED";
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary font-display">Performance Cycles</h1>
          <p className="text-sm text-ink-secondary mt-0.5">{cycles.length} total cycles configured</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={openCreate}
          className="btn-accent text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create New Cycle
        </motion.button>
      </div>

      {/* Main Timeline Card List */}
      <div className="space-y-4">
        {cycles.map((c, i) => {
          const status = getCycleStatus(c);
          const isExpanded = !!expanded[c.id];

          let borderClass = "border-l-4 border-slate-400";
          let badgeClass = "bg-slate-100 text-slate-500 border-slate-200/50";
          let badgeLabel = "Closed";

          if (status === "ACTIVE") {
            borderClass = "border-l-4 border-accent";
            badgeClass = "bg-accent-light text-accent border-accent/10";
            badgeLabel = "Active";
          } else if (status === "UPCOMING") {
            borderClass = "border-l-4 border-primary";
            badgeClass = "bg-primary-tint text-primary border-primary/10";
            badgeLabel = "Upcoming";
          }

          const desc = c.description || `Performance objectives and goal setting roadmap for employees during ${c.name}.`;
          const goalCount = c.goalsCount != null ? c.goalsCount : (c.goals?.length || 0);

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`card overflow-hidden bg-white ${borderClass} transition-shadow duration-200 hover:shadow-md`}
            >
              {/* Header inside Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-ink-primary font-heading tracking-wide">
                      {c.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-ink-secondary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ink-secondary" />
                    Goal Setting: {fmtDate(c.goalSettingStart)} – {fmtDate(c.goalSettingEnd)}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {status !== "ACTIVE" && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleActivate(c.id)}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 bg-white hover:bg-slate-50 border-surface-border text-ink-primary"
                    >
                      <Play className="w-3 h-3 text-status-success" /> Activate
                    </motion.button>
                  )}
                  <button
                    onClick={() => {
                      setWinModal(c.id);
                      loadWindows(c.id);
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3" /> Add Window
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="btn-ghost p-1.5 rounded-md hover:bg-accent-light/30 transition-colors"
                    title="Edit Cycle"
                  >
                    <Pencil className="w-4 h-4 text-accent" />
                  </button>
                  <button
                    onClick={() => toggleExpand(c.id)}
                    className="btn-ghost p-1.5 rounded-md hover:bg-primary-tint/30 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Contents inside Card */}
              <div className="px-6 pb-5 space-y-4">
                <p className="text-sm font-body text-ink-secondary max-w-2xl leading-relaxed">
                  {desc}
                </p>
                <div className="flex items-center justify-between text-xs font-sans text-ink-primary pt-1.5 border-t border-surface-border">
                  <span className="font-semibold text-accent">{goalCount} Goals Aligned</span>
                </div>
              </div>

              {/* Timeline Quarter Windows (Collapsible) */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-4 bg-[#F9F9FB] border-t border-surface-border space-y-3">
                  <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                    Quarterly Check-In Windows
                  </p>
                  {(windows[c.id] || []).length === 0 ? (
                    <p className="text-xs text-ink-secondary/70">No quarter windows have been configured for this cycle.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(windows[c.id] || []).map((w) => (
                        <QuarterWindowRow key={w.id} w={w} onToggle={handleToggle} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Create Cycle Modal */}
      <AnimatePresence>
        {createModal && (
          <Modal open={true} onClose={() => setCreateModal(false)} title="Create Performance Cycle" size="md">
            <div className="max-w-[480px] mx-auto space-y-4">
              <h2 className="text-xl font-bold font-display text-ink-primary">Add Performance Cycle</h2>
              <form onSubmit={handleCreateCycle} className="space-y-4">
                <div>
                  <label className="label">Cycle Name *</label>
                  <input
                    className="input text-[14px]"
                    required
                    placeholder="e.g. FY 2026-27"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Year *</label>
                  <input
                    className="input text-[14px]"
                    type="number"
                    required
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Goal Setting Start *</label>
                    <input
                      className="input text-[14px]"
                      type="date"
                      required
                      value={form.goalSettingStart}
                      onChange={(e) => setForm({ ...form, goalSettingStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Goal Setting End *</label>
                    <input
                      className="input text-[14px]"
                      type="date"
                      required
                      value={form.goalSettingEnd}
                      onChange={(e) => setForm({ ...form, goalSettingEnd: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input text-[14px] resize-none h-20"
                    placeholder="Optional cycle description roadmap..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModal(false)}
                    className="btn-outline flex-1 border-primary text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 justify-center bg-primary text-white"
                  >
                    {saving ? <Spinner /> : "Create Cycle"}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Edit Cycle Modal */}
      <AnimatePresence>
        {editModal && (
          <Modal open={true} onClose={() => setEditModal(null)} title="Edit Performance Cycle" size="md">
            <div className="max-w-[480px] mx-auto space-y-4">
              <h2 className="text-xl font-bold font-display text-ink-primary">Modify Cycle Details</h2>
              <form onSubmit={handleUpdateCycle} className="space-y-4">
                <div>
                  <label className="label">Cycle Name *</label>
                  <input
                    className="input text-[14px]"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Year *</label>
                  <input
                    className="input text-[14px]"
                    type="number"
                    required
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Goal Setting Start *</label>
                    <input
                      className="input text-[14px]"
                      type="date"
                      required
                      value={form.goalSettingStart}
                      onChange={(e) => setForm({ ...form, goalSettingStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Goal Setting End *</label>
                    <input
                      className="input text-[14px]"
                      type="date"
                      required
                      value={form.goalSettingEnd}
                      onChange={(e) => setForm({ ...form, goalSettingEnd: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input text-[14px] resize-none h-20"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditModal(null)}
                    className="btn-outline flex-1 border-primary text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 justify-center bg-primary text-white"
                  >
                    {saving ? <Spinner /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add Quarter Window Modal */}
      <AnimatePresence>
        {winModal && (
          <Modal open={true} onClose={() => setWinModal(null)} title="Add Quarter Window" size="sm">
            <form onSubmit={handleAddWindow} className="space-y-4">
              <div>
                <label className="label">Quarter *</label>
                <select
                  className="input text-[14px]"
                  value={winForm.quarter}
                  onChange={(e) => setWinForm({ ...winForm, quarter: e.target.value })}
                >
                  {QUARTERS.map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Window Open *</label>
                  <input
                    className="input text-[14px]"
                    type="date"
                    required
                    value={winForm.windowOpen}
                    onChange={(e) => setWinForm({ ...winForm, windowOpen: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Window Close *</label>
                  <input
                    className="input text-[14px]"
                    type="date"
                    required
                    value={winForm.windowClose}
                    onChange={(e) => setWinForm({ ...winForm, windowClose: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWinModal(null)}
                  className="btn-outline flex-1 border-primary text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-accent flex-1 justify-center text-white"
                >
                  {saving ? <Spinner /> : "Add Window"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
