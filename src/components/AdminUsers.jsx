import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, KeyRound, ToggleLeft, ToggleRight } from "lucide-react";
import { api, clearSession } from "../api";
import { AdminSidebar } from "./AdminDashboard";

const ROLES = ["employee", "manager", "admin"];

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", first_name: "", last_name: "", role: "employee" });
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  useEffect(() => { load(); }, []);
  function load() {
    api.adminUsers().then(setUsers).catch((e) => setError(e.message));
  }

  async function handleCreate(e) {
    e.preventDefault(); setError(""); setCreating(true);
    try {
      const user = await api.adminCreateUser(createForm);
      setUsers((u) => [...u, user]);
      setCreateForm({ username: "", email: "", password: "", first_name: "", last_name: "", role: "employee" });
      setShowCreate(false);
      flash("User created successfully.");
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  }

  async function handleRoleChange(id, role) {
    setError("");
    try {
      const updated = await api.adminUpdateUser(id, { role });
      setUsers((u) => u.map((x) => x.id === id ? updated : x));
      flash("Role updated.");
    } catch (err) { setError(err.message); }
  }

  async function handleToggleActive(id, is_active) {
    setError("");
    try {
      const updated = await api.adminUpdateUser(id, { is_active });
      setUsers((u) => u.map((x) => x.id === id ? updated : x));
      flash(is_active ? "Account activated." : "Account deactivated.");
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(id, username) {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setError("");
    try {
      await api.adminDeleteUser(id);
      setUsers((u) => u.filter((x) => x.id !== id));
      flash("User deleted.");
    } catch (err) { setError(err.message); }
  }

  async function handleResetPassword(e) {
    e.preventDefault(); setError(""); setResetting(true);
    try {
      await api.adminResetPassword(resetTarget.id, resetPwd);
      setResetTarget(null); setResetPwd("");
      flash("Password reset successfully.");
    } catch (err) { setError(err.message); }
    finally { setResetting(false); }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      <AdminSidebar activePath="/admin-users" />
      <main className="min-w-0 flex-1 p-4 sm:p-8 overflow-y-auto">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">User Management</h1>
            <p className="text-sm text-slate-500 mt-1">{users.length} accounts on the platform</p>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> New User
          </button>
        </header>

        {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-medium mb-4">Create new user</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              <input required placeholder="Username" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input required type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input required type="password" placeholder="Password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input placeholder="First name (optional)" value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input placeholder="Last name (optional)" value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm capitalize">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-60">{creating ? "Creating…" : "Create user"}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">Cancel</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500">User</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Role</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Joined</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{u.username}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs capitalize bg-white"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(u.id, !u.is_active)}
                        className={`flex items-center gap-1.5 text-xs font-medium ${u.is_active ? "text-emerald-600" : "text-slate-400"}`}
                        title={u.is_active ? "Click to deactivate" : "Click to activate"}
                      >
                        {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{u.date_joined}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setResetTarget(u); setResetPwd(""); setError(""); }}
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                          title="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Reset pwd
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          className="text-xs text-red-500 hover:underline flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && <p className="text-sm text-slate-400 px-4 py-6">No users found.</p>}
          </div>
        </div>

        {resetTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              <h2 className="font-semibold text-slate-800 mb-1">Reset password</h2>
              <p className="text-sm text-slate-500 mb-4">Setting new password for <strong>{resetTarget.username}</strong></p>
              <form onSubmit={handleResetPassword} className="space-y-3">
                <input
                  required type="password" placeholder="New password"
                  value={resetPwd} onChange={(e) => setResetPwd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={resetting} className="bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-60">{resetting ? "Saving…" : "Save"}</button>
                  <button type="button" onClick={() => setResetTarget(null)} className="text-sm text-slate-500 px-4 py-2">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
