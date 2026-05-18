import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Key, UserX, Search, ChevronLeft, ChevronRight, X, User
} from "lucide-react";
import toast from "react-hot-toast";
import { listUsers, createUser, updateUser, deactivateUser } from "../../api/users";
import { TableSkeleton, Spinner } from "../../components/loaders/Skeletons";
import Modal from "../../components/common/Modal";

const ROLES = ["EMPLOYEE", "MANAGER", "ADMIN"];
const EMPTY = { name: "", email: "", password: "", role: "EMPLOYEE", department: "", managerId: "" };
const PER_PAGE = 8;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "create" | "edit" | "resetPassword"
  const [deleteModal, setDeleteModal] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Searchable dropdown for managers
  const [managerSearch, setManagerSearch] = useState("");
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

  const load = async () => {
    try {
      const [ar, mr] = await Promise.all([
        listUsers(),
        listUsers("MANAGER").catch(() => ({ data: [] })),
      ]);
      setUsers(ar.data || []);
      setManagers(mr.data || []);
    } catch {
      toast.error("Failed to load user list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setEditUser(null);
    setManagerSearch("");
    setModal("create");
  };

  const openEdit = (u) => {
    setEditUser(u);
    const mgr = managers.find((m) => m.id === u.managerId);
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department || "",
      managerId: u.managerId || "",
      password: "",
    });
    setManagerSearch(mgr ? mgr.name : "");
    setModal("edit");
  };

  const openResetPassword = (u) => {
    setEditUser(u);
    setForm({ ...EMPTY, name: u.name, email: u.email, role: u.role });
    setModal("resetPassword");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.managerId) delete payload.managerId;

      if (modal === "edit") {
        await updateUser(editUser.id, payload);
        toast.success("User profile updated");
      } else if (modal === "resetPassword") {
        await updateUser(editUser.id, { password: form.password });
        toast.success("Password reset successfully");
      } else {
        await createUser(payload);
        toast.success("User created successfully");
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      toast.success(`${user.name} is now ${!user.isActive ? "Active" : "Inactive"}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
      );
    } catch {
      toast.error("Status toggle failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setSaving(true);
    try {
      await deactivateUser(deleteModal.id);
      toast.success("User deactivated and deleted");
      setDeleteModal(null);
      load();
    } catch {
      toast.error("Deactivation failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = users
    .filter((u) => roleFilter === "ALL" || u.role === roleFilter)
    .filter(
      (u) =>
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Manager filtering for the searchable dropdown
  const filteredManagers = managers.filter((m) =>
    m.name.toLowerCase().includes(managerSearch.toLowerCase())
  );

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {/* Header & Main title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary font-display">Users</h1>
          <p className="text-sm text-ink-secondary mt-0.5">{users.length} registered profiles in current directory</p>
        </div>
      </div>

      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={openCreate}
          className="btn-accent text-white flex items-center justify-center self-start"
        >
          <Plus className="w-4 h-4" /> Add User
        </motion.button>

        <div className="flex flex-1 max-w-lg items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              className="input pl-9 text-[14px]"
              placeholder="Search users by name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="input max-w-[160px] text-xs font-medium"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-ink-secondary">
          <p className="text-sm">No profiles found matching the current search parameters.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F4FA] border-b border-surface-border">
                  {["User", "Role", "Manager", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-[12px] font-sans font-semibold text-ink-secondary uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {paginated.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-[#F9F9FF] transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-tint text-primary-mid flex items-center justify-center text-[13px] font-sans font-bold shrink-0">
                          {u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-sans font-semibold text-ink-primary truncate">{u.name}</p>
                          <p className="text-[13px] font-body text-ink-secondary truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${u.role === "ADMIN"
                            ? "bg-primary text-white"
                            : u.role === "MANAGER"
                              ? "bg-accent text-white"
                              : "bg-primary-tint text-primary-mid"
                          }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[14px] font-sans text-ink-primary">
                      {managers.find((m) => m.id === u.managerId)?.name || <span className="text-ink-secondary/50">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={u.isActive}
                          onChange={() => handleToggleActive(u)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit User Profile"
                          className="p-1 rounded-md hover:bg-accent-light/30 transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-accent" />
                        </button>
                        <button
                          onClick={() => openResetPassword(u)}
                          title="Reset Password"
                          className="p-1 rounded-md hover:bg-accent-light/30 transition-colors"
                        >
                          <Key className="w-4 h-4 text-accent" />
                        </button>
                        <button
                          onClick={() => setDeleteModal(u)}
                          title="Deactivate and Delete"
                          className="p-1 rounded-md hover:bg-status-danger-light/30 transition-colors"
                        >
                          <UserX className="w-4 h-4 text-status-danger" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-surface-border bg-white">
              <p className="text-[13px] font-mono text-ink-secondary">
                Page {page} of {totalPages} ({filtered.length} total users)
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
      )}

      {/* Add / Edit User Form Modal (480px width) */}
      <AnimatePresence>
        {(modal === "create" || modal === "edit") && (
          <Modal
            open={true}
            onClose={() => setModal(null)}
            title={modal === "edit" ? "Edit User Details" : "Add New User"}
            size="md"
          >
            <div className="max-w-[480px] mx-auto">
              <h2 className="text-xl font-bold font-display text-ink-primary mb-5">
                {modal === "edit" ? "Modify User Information" : "Register a New User"}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    className="input text-[14px]"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input
                    className="input text-[14px]"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                {modal === "create" && (
                  <div>
                    <label className="label">Password *</label>
                    <input
                      className="input text-[14px]"
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Role *</label>
                    <select
                      className="input text-[14px]"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <input
                      className="input text-[14px]"
                      placeholder="e.g. Sales, Product"
                      value={form.department || ""}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    />
                  </div>
                </div>

                {form.role === "EMPLOYEE" && (
                  <div className="relative">
                    <label className="label">Assign Reporting Manager</label>
                    <div className="relative">
                      <input
                        className="input text-[14px] pr-8"
                        placeholder="Type to search managers…"
                        value={managerSearch}
                        onFocus={() => setManagerDropdownOpen(true)}
                        onChange={(e) => {
                          setManagerSearch(e.target.value);
                          setManagerDropdownOpen(true);
                        }}
                      />
                      {managerSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setManagerSearch("");
                            setForm({ ...form, managerId: "" });
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink-primary"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {managerDropdownOpen && (
                      <div className="absolute z-10 w-full bg-white border border-surface-border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                        <div
                          className="px-3 py-2 text-xs font-semibold text-ink-secondary bg-[#F4F4FA] cursor-default"
                        >
                          Select Reporting Manager
                        </div>
                        {filteredManagers.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-ink-secondary">No managers match search</div>
                        ) : (
                          filteredManagers.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setForm({ ...form, managerId: m.id });
                                setManagerSearch(m.name);
                                setManagerDropdownOpen(false);
                              }}
                              className="px-3 py-2 text-xs text-ink-primary hover:bg-[#F9F9FF] cursor-pointer"
                            >
                              {m.name} ({m.email})
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-outline flex-1 border-primary text-primary"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={saving}
                    className="btn-accent flex-1 justify-center text-white"
                  >
                    {saving ? <Spinner /> : modal === "edit" ? "Save Changes" : "Save"}
                  </motion.button>
                </div>
              </form>
            </div>
          </Modal>
        )}

        {modal === "resetPassword" && (
          <Modal open={true} onClose={() => setModal(null)} title="Reset Password" size="sm">
            <div className="max-w-[400px] mx-auto space-y-4">
              <h2 className="text-lg font-bold font-display text-ink-primary">
                Reset Password for {editUser?.name}
              </h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">New Secure Password</label>
                  <input
                    className="input text-[14px]"
                    type="password"
                    required
                    placeholder="Enter new password…"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-outline flex-1 border-primary text-primary"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={saving}
                    className="btn-accent flex-1 justify-center text-white"
                  >
                    {saving ? <Spinner /> : "Update Password"}
                  </motion.button>
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
                Are you sure you want to deactivate and remove <span className="font-semibold text-ink-primary">"{deleteModal.name}"</span>?
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
