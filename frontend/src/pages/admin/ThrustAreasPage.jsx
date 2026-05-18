import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Target, Key, TrendingUp, Award,
  Briefcase, Activity, Search, Zap, X
} from "lucide-react";
import toast from "react-hot-toast";
import {
  listThrustAreas, createThrustArea, updateThrustArea, deactivateThrustArea
} from "../../api/thrustAreas";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import Modal from "../../components/common/Modal";

const COLORS = [
  { hex: "#3B82F6", class: "border-t-4 border-[#3B82F6]", label: "Sky Blue", text: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10" },
  { hex: "#3D3D5C", class: "border-t-4 border-[#3D3D5C]", label: "Slate", text: "text-[#3D3D5C]", bg: "bg-[#3D3D5C]/10" },
  { hex: "#0D9488", class: "border-t-4 border-[#0D9488]", label: "Teal", text: "text-[#0D9488]", bg: "bg-[#0D9488]/10" },
  { hex: "#16A34A", class: "border-t-4 border-[#16A34A]", label: "Green", text: "text-[#16A34A]", bg: "bg-[#16A34A]/10" },
  { hex: "#D97706", class: "border-t-4 border-[#D97706]", label: "Amber", text: "text-[#D97706]", bg: "bg-[#D97706]/10" },
  { hex: "#EA580C", class: "border-t-4 border-[#EA580C]", label: "Coral", text: "text-[#EA580C]", bg: "bg-[#EA580C]/10" },
];

const ICONS = [
  { name: "Target", icon: Target },
  { name: "Key", icon: Key },
  { name: "TrendingUp", icon: TrendingUp },
  { name: "Award", icon: Award },
  { name: "Briefcase", icon: Briefcase },
  { name: "Activity", icon: Activity },
  { name: "Search", icon: Search },
  { name: "Zap", icon: Zap },
];

const IconMap = { Target, Key, TrendingUp, Award, Briefcase, Activity, Search, Zap };

function DynamicIcon({ name, className }) {
  const IconComponent = IconMap[name] || Target;
  return <IconComponent className={className} />;
}

// Robust helper to parse color & icon from description metadata JSON
const parseDescription = (desc) => {
  try {
    if (desc && desc.startsWith("{")) {
      const parsed = JSON.parse(desc);
      return {
        text: parsed.text || "",
        colorHex: parsed.color || null,
        iconName: parsed.icon || null,
      };
    }
  } catch (e) {
    // fallback
  }
  return { text: desc || "", colorHex: null, iconName: null };
};

const getThrustVisuals = (name, id, parsedMeta) => {
  // If custom visual exists in JSON metadata, use it
  if (parsedMeta.colorHex && parsedMeta.iconName) {
    const col = COLORS.find((c) => c.hex === parsedMeta.colorHex) || COLORS[0];
    return { color: col, iconName: parsedMeta.iconName };
  }
  // Otherwise, fallback to deterministic visual
  const hash = (name + (id || "")).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = COLORS[hash % COLORS.length];
  const iconName = ICONS[hash % ICONS.length].name;
  return { color, iconName };
};

export default function ThrustAreasPage() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editArea, setEditArea] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form properties
  const [name, setName] = useState("");
  const [descText, setDescText] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0].name);

  const load = async () => {
    try {
      const r = await listThrustAreas();
      setAreas(r.data || []);
    } catch {
      toast.error("Failed to load strategic thrust priorities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditArea(null);
    setName("");
    setDescText("");
    setSelectedColor(COLORS[0].hex);
    setSelectedIcon(ICONS[0].name);
    setModal("form");
  };

  const openEdit = (a) => {
    setEditArea(a);
    const parsed = parseDescription(a.description);
    setName(a.name);
    setDescText(parsed.text);

    // Get color & icon
    const visuals = getThrustVisuals(a.name, a.id, parsed);
    setSelectedColor(visuals.color.hex);
    setSelectedIcon(visuals.iconName);
    setModal("form");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const description = JSON.stringify({
      text: descText,
      color: selectedColor,
      icon: selectedIcon,
    });

    try {
      if (editArea) {
        await updateThrustArea(editArea.id, { name, description });
        toast.success("Thrust area priority updated successfully");
      } else {
        await createThrustArea({ name, description });
        toast.success("Strategic thrust area registered");
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save strategic priority");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setSaving(true);
    try {
      await deactivateThrustArea(deleteModal.id);
      toast.success("Strategic priority deactivated");
      setDeleteModal(null);
      load();
    } catch {
      toast.error("Deactivation process failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary font-display">Thrust Areas</h1>
          <p className="text-sm text-ink-secondary mt-0.5">{areas.length} active strategic priorities</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={openCreate}
          className="btn-accent text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Thrust Area
        </motion.button>
      </div>

      {/* Main Grid View */}
      {areas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center card bg-white">
          <div className="w-16 h-16 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-4">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-sans text-ink-primary">No thrust areas exist</h3>
          <p className="text-sm text-ink-secondary max-w-sm mt-1 leading-relaxed">
            Create organizational thrust categories to anchor employee goals and cycle weightages.
          </p>
          <button onClick={openCreate} className="btn-accent text-white mt-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add First Area
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((a, i) => {
            const parsed = parseDescription(a.description);
            const visuals = getThrustVisuals(a.name, a.id, parsed);
            // Live goal aligned calculation
            const goalCount = a.goalsCount != null ? a.goalsCount : (a.goals?.length || 0);

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`card bg-white p-5 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden ${visuals.color.class} ${!a.isActive ? "opacity-50" : ""
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${visuals.color.bg} ${visuals.color.text}`}>
                      <DynamicIcon name={visuals.iconName} className="w-5 h-5" />
                    </div>
                    {!a.isActive && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Inactive
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading text-[17px] font-bold text-ink-primary tracking-wide mb-1.5">
                    {a.name}
                  </h3>
                  {parsed.text && (
                    <p className="text-xs font-sans text-ink-secondary leading-relaxed line-clamp-3">
                      {parsed.text}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-surface-border flex items-center justify-between">
                  <span className="text-[12px] font-medium text-ink-secondary">
                    <span className={`font-semibold ${visuals.color.text}`}>{goalCount}</span> Goals Aligned
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1 rounded hover:bg-accent-light/35 transition-colors"
                      title="Edit Strategic Priority"
                    >
                      <Pencil className="w-3.5 h-3.5 text-accent" />
                    </button>
                    <button
                      onClick={() => setDeleteModal(a)}
                      className="p-1 rounded hover:bg-status-danger-light/35 transition-colors"
                      title="Deactivate Priority"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-status-danger" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* SlideOver/Modal for Adding / Editing */}
      <AnimatePresence>
        {modal === "form" && (
          <Modal open={true} onClose={() => setModal(null)} title={editArea ? "Edit Strategic Priority" : "Add Strategic Priority"} size="md">
            <div className="max-w-[480px] mx-auto space-y-4">
              <h2 className="text-xl font-bold font-display text-ink-primary">
                {editArea ? "Modify Strategic Thrust Area" : "Register a New Thrust Area"}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">Priority Name *</label>
                  <input
                    className="input text-[14px]"
                    required
                    placeholder="e.g. Customer Excellence"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input text-[14px] resize-none h-24 leading-relaxed"
                    placeholder="Provide a clear, strategic overview of what objectives this category focuses on..."
                    value={descText}
                    onChange={(e) => setDescText(e.target.value)}
                  />
                </div>

                {/* Accent Swatch Selection (6 custom choices) */}
                <div>
                  <label className="label mb-2">Top Accent Color Swatch</label>
                  <div className="flex gap-3">
                    {COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSelectedColor(c.hex)}
                        className={`w-7 h-7 rounded-full border-2 transition-all relative ${selectedColor === c.hex
                            ? "border-primary scale-110 shadow-md"
                            : "border-transparent hover:scale-105"
                          }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {selectedColor === c.hex && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Grid Selection */}
                <div>
                  <label className="label mb-2">Category Strategic Icon</label>
                  <div className="grid grid-cols-8 gap-2 bg-[#F9F9FB] border border-surface-border rounded-lg p-2.5">
                    {ICONS.map((i) => {
                      const IconComp = i.icon;
                      return (
                        <button
                          key={i.name}
                          type="button"
                          onClick={() => setSelectedIcon(i.name)}
                          className={`w-8 h-8 rounded flex items-center justify-center transition-all ${selectedIcon === i.name
                              ? "bg-accent text-white shadow-sm"
                              : "hover:bg-primary-tint text-ink-primary"
                            }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-outline flex-1 border-primary text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-accent flex-1 justify-center text-white"
                  >
                    {saving ? <Spinner /> : editArea ? "Save Changes" : "Save Priority"}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <Modal open={true} onClose={() => setDeleteModal(null)} title="Confirm Deletion" size="sm">
            <div className="p-6">
              <p className="font-sans text-sm text-ink-secondary mb-6 leading-relaxed">
                Are you sure you want to deactivate strategic priority <span className="font-semibold text-ink-primary">"{deleteModal.name}"</span>?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="btn-outline flex-1 border-surface-border text-ink-secondary hover:text-ink-primary"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDelete}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center bg-status-danger text-white border-transparent"
                >
                  {saving ? <Spinner /> : "Delete"}
                </motion.button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
