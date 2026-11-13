import { useEffect, useState } from "react";
import { Plus, Trash2, Users, X } from "lucide-react";
import { api } from "../api";
import { AdminSidebar } from "./AdminDashboard";

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", manager_id: "" });
  const [creating, setCreating] = useState(false);
  const [memberModal, setMemberModal] = useState(null); // team object
  const [addUserId, setAddUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [modalError, setModalError] = useState("");

  function flash(msg) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  useEffect(() => {
    api.adminTeams().then(setTeams).catch((e) => setError(e.message));
    api.adminUsers()
      .then((users) => {
        setAllUsers(users);
        setManagers(users.filter((u) => u.role === "manager"));
      })
      .catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault(); setError(""); setCreating(true);
    try {
      const team = await api.adminCreateTeam({ name: createForm.name, manager_id: parseInt(createForm.manager_id) });
      team.members = [];
      setTeams((t) => [...t, team]);
      setCreateForm({ name: "", manager_id: "" });
      setShowCreate(false);
      flash("Team created successfully.");
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete team "${name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await api.adminDeleteTeam(id);
      setTeams((t) => t.filter((x) => x.id !== id));
      flash("Team deleted.");
    } catch (err) { setError(err.message); }
  }

  function openMemberModal(team) {
    setMemberModal(team);
    setAddUserId("");
    setModalError("");
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!addUserId) return;
    setModalError(""); setAddingMember(true);
    try {
      const added = await api.adminAddTeamMember(memberModal.id, parseInt(addUserId));
      const newMember = { id: added.id, username: added.username };
      setTeams((ts) => ts.map((t) =>
        t.id === memberModal.id
          ? { ...t, members: [...t.members, newMember], member_count: t.member_count + 1 }
          : t
      ));
      setMemberModal((m) => ({ ...m, members: [...m.members, newMember] }));
      setAddUserId("");
      flash("Member added.");
    } catch (err) { setModalError(err.message); }
    finally { setAddingMember(false); }
  }

  async function handleRemoveMember(teamId, userId, username) {
    setModalError("");
    try {
      await api.adminRemoveTeamMember(teamId, userId);
      setTeams((ts) => ts.map((t) =>
        t.id === teamId
          ? { ...t, members: t.members.filter((m) => m.id !== userId), member_count: t.member_count - 1 }
          : t
      ));
      setMemberModal((m) => ({ ...m, members: m.members.filter((x) => x.id !== userId) }));
      flash(`Removed ${username}.`);
    } catch (err) { setModalError(err.message); }
  }

  // Users not already in the modal's team
  const eligibleUsers = memberModal
    ? allUsers.filter((u) => !memberModal.members.some((m) => m.id === u.id))
    : [];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      <AdminSidebar activePath="/admin-teams" />
      <main className="min-w-0 flex-1 p-4 sm:p-8 overflow-y-auto">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Team Management</h1>
            <p className="text-sm text-slate-500 mt-1">{teams.length} teams on the platform</p>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Team
          </button>
        </header>

        {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-medium mb-4">Create new team</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <input
                required placeholder="Team name"
                value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                required value={createForm.manager_id} onChange={(e) => setCreateForm({ ...createForm, manager_id: e.target.value })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select a manager…</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.username} ({m.email})</option>
                ))}
              </select>
            </div>
            {managers.length === 0 && (
              <p className="text-xs text-amber-600 mb-3">No managers found. Create a user with the Manager role first.</p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-60">{creating ? "Creating…" : "Create team"}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">Cancel</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500">Team</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Manager</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Members</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.manager.username}</td>
                    <td className="px-4 py-3 text-slate-600">{t.member_count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openMemberModal(t)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                        >
                          <Users className="w-3.5 h-3.5" /> Manage Members
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!teams.length && <p className="text-sm text-slate-400 px-4 py-6">No teams found.</p>}
          </div>
        </div>
      </main>

      {/* Manage Members Modal */}
      {memberModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-800">{memberModal.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Managed by {memberModal.manager.username}</p>
              </div>
              <button onClick={() => setMemberModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{modalError}</p>}

            {/* Add existing user */}
            <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select user to add…</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.username} — {u.role}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!addUserId || addingMember}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50 shrink-0"
              >
                {addingMember ? "Adding…" : "Add"}
              </button>
            </form>
            {eligibleUsers.length === 0 && (
              <p className="text-xs text-slate-400 mb-4">All users are already in this team.</p>
            )}

            {/* Current members */}
            <div className="overflow-y-auto flex-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Current members ({memberModal.members.length})
              </p>
              {memberModal.members.length === 0 ? (
                <p className="text-sm text-slate-400">No members yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {memberModal.members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-medium text-slate-700">{m.username}</span>
                      <button
                        onClick={() => handleRemoveMember(memberModal.id, m.id, m.username)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
