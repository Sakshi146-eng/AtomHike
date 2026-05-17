import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { listThrustAreas, createThrustArea, updateThrustArea, deactivateThrustArea } from "../../api/thrustAreas";
import { PageSkeleton, Spinner } from "../../components/loaders/Skeletons";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";

export default function ThrustAreasPage() {
  const [areas,   setAreas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [editArea, setEditArea] = useState(null);
  const [form,    setForm]    = useState({ name: "", description: "" });
  const [saving,  setSaving]  = useState(false);

  const load = () => listThrustAreas().then(r => { setAreas(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditArea(null); setForm({ name: "", description: "" }); setModal("form"); };
  const openEdit   = (a)  => { setEditArea(a); setForm({ name: a.name, description: a.description || "" }); setModal("form"); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editArea) { await updateThrustArea(editArea.id, form); toast.success("Updated"); }
      else          { await createThrustArea(form);              toast.success("Created"); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Deactivate "${a.name}"?`)) return;
    try { await deactivateThrustArea(a.id); toast.success("Deactivated"); load(); }
    catch { toast.error("Failed"); }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Thrust Areas</h2>
          <p className="text-sm text-slate-500">{areas.length} areas configured</p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Area
        </motion.button>
      </div>

      {areas.length === 0 ? <EmptyState title="No thrust areas" desc="Add thrust areas used to categorize goals." action={<button onClick={openCreate} className="btn-primary mt-2"><Plus className="w-4 h-4" /> Add First Area</button>} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`card p-5 ${!a.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <span className="text-brand-700 font-bold text-sm">{a.name[0]}</span>
                </div>
                {!a.isActive && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
              <h3 className="font-semibold text-slate-800 text-sm mb-1">{a.name}</h3>
              {a.description && <p className="text-xs text-slate-400 leading-relaxed">{a.description}</p>}
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(a)} className="btn-ghost text-xs py-1"><Pencil className="w-3 h-3" /> Edit</button>
                <button onClick={() => handleDelete(a)} className="btn-ghost text-xs py-1 text-red-400 hover:bg-red-50"><Trash2 className="w-3 h-3" /> Remove</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modal === "form"} onClose={() => setModal(null)} title={editArea ? "Edit Thrust Area" : "Add Thrust Area"} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Name *</label><input className="input" required placeholder="e.g., Customer Excellence" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><label className="label">Description</label><textarea className="input resize-none min-h-[80px]" placeholder="Optional description…" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? <Spinner /> : editArea ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
