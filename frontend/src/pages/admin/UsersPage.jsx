import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { listUsers, createUser, updateUser, deactivateUser } from "../../api/users";
import { TableSkeleton, Spinner } from "../../components/loaders/Skeletons";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";

const ROLES = ["EMPLOYEE", "MANAGER", "ADMIN"];
const EMPTY = { name: "", email: "", password: "", role: "EMPLOYEE", department: "", managerId: "" };

export default function UsersPage() {
  const [users,    setUsers]    = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | "create" | "edit"
  const [editUser, setEditUser] = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search,   setSearch]   = useState("");

  const load = async () => {
    const [ar, mr] = await Promise.all([listUsers(), listUsers("MANAGER").catch(() => ({ data: [] }))]);
    setUsers(ar.data); setManagers(mr.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditUser(null); setModal("create"); };
  const openEdit   = (u) => { setEditUser(u); setForm({ name: u.name, email: u.email, role: u.role, department: u.department || "", managerId: u.managerId || "", password: "" }); setModal("edit"); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.managerId) delete payload.managerId;
      if (modal === "edit") { await updateUser(editUser.id, payload); toast.success("User updated"); }
      else                  { await createUser(payload);              toast.success("User created"); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to save user"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Permanently delete user "${u.name}"? This cannot be undone.`)) return;
    try { await deactivateUser(u.id); toast.success("User deleted"); load(); }
    catch { toast.error("Delete failed"); }
  };

  const filtered = users
    .filter(u => roleFilter === "ALL" || u.role === roleFilter)
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500">{users.length} total users</p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Add User
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {["ALL", ...ROLES].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${roleFilter === r ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
              {r === "ALL" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? <EmptyState title="No users found" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Name", "Email", "Role", "Department", "Emp Code", "Manager", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.department || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{u.employeeCode || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{managers.find(m => m.id === u.managerId)?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(u)} className="btn-ghost py-1 text-xs"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(u)} className="btn-ghost py-1 text-xs text-red-400 hover:bg-red-50"><UserX className="w-3 h-3" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User form modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "edit" ? "Edit User" : "Create User"} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Password {modal === "edit" ? "(leave blank to keep)" : "*"}</label>
              <input className="input" type="password" required={modal === "create"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {/* In edit mode only — show employee code (read-only, was auto-generated) */}
          {modal === "edit" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Department</label>
                <input className="input" value={form.department || ""} onChange={e => setForm({...form, department: e.target.value})} />
              </div>
              <div>
                <label className="label">Employee Code (auto-generated)</label>
                <input className="input bg-slate-50 text-slate-400 cursor-not-allowed" readOnly value={form.employeeCode || "—"} />
              </div>
            </div>
          )}
          {modal === "create" && (
            <div>
              <label className="label">Department</label>
              <input className="input" placeholder="e.g., Sales, Engineering" value={form.department || ""} onChange={e => setForm({...form, department: e.target.value})} />
            </div>
          )}
          {form.role === "EMPLOYEE" && (
            <div>
              <label className="label">Reporting Manager</label>
              <select className="input" value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})}>
                <option value="">No manager</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Spinner /> : modal === "edit" ? "Save Changes" : "Create User"}
            </motion.button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
