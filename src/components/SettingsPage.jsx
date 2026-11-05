import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, LogOut } from "lucide-react";
import { api, clearSession } from "../api";

export default function SettingsPage({ role }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState({ current_password: "", new_password: "", confirm: "" });
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [member, setMember] = useState({ username: "", email: "", password: "" });
  const [teamBusy, setTeamBusy] = useState(false);
  useEffect(() => {
    api.profile().then(setProfile).catch((e) => setError(e.message));
    if (role === "manager") {
      api.team().then(setTeam).catch((e) => setError(e.message));
      api.teamMembers().then((result) => setMembers(result.members || result)).catch((e) => setError(e.message));
    }
  }, [role]);
  const root = role === "manager" ? "/manager-dashboard" : "/dashboard";
  function logout() { api.logout().catch(() => {}); clearSession(); navigate("/"); }
  async function saveProfile(e) {
    e.preventDefault(); setError(""); setStatus("");
    try { setProfile(await api.updateProfile({ username: profile.username, email: profile.email, first_name: profile.first_name })); setStatus("Profile saved."); }
    catch (e) { setError(e.message); }
  }
  async function changePassword(e) {
    e.preventDefault(); setError(""); setStatus("");
    if (password.new_password !== password.confirm) { setError("New passwords do not match."); return; }
    try { await api.changePassword(password.current_password, password.new_password); clearSession(); navigate("/", { state: { notice: "Password updated. Sign in with your new password." } }); }
    catch (e) { setError(e.message); }
  }
  async function setSharing(value) {
    setError(""); setStatus("");
    try { const result = await api.share(value); setProfile({ ...profile, share_with_manager: result.share_with_manager }); setStatus("Sharing preference saved."); }
    catch (e) { setError(e.message); }
  }
  async function saveTeam(e) { e.preventDefault(); try { setTeam(await api.updateTeam(team.name)); setStatus("Team name saved."); setError(""); } catch (e) { setError(e.message); } }
  async function addMember(e) { e.preventDefault(); setTeamBusy(true); setError(""); try { await api.addTeamMember(member); setMember({ username: "", email: "", password: "" }); setMembers(await api.teamMembers().then((result) => result.members || result)); setStatus("Team member added."); } catch (e) { setError(e.message); } finally { setTeamBusy(false); } }
  async function removeMember(id) { try { await api.removeTeamMember(id); setMembers((current) => current.filter((item) => item.id !== id)); setStatus("Team member removed."); } catch (e) { setError(e.message); } }
  return <div className="min-h-screen flex bg-slate-50 text-slate-800">
    <aside className="hidden md:flex w-64 bg-[#1B1533] text-slate-300 flex-col shrink-0"><div className="flex items-center gap-2 px-6 py-6"><div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div><span className="text-white font-semibold">WellWatch AI</span></div><nav className="flex-1 px-3 space-y-1">{[[role === "manager" ? "Team Overview" : "Dashboard", root], ["Settings", role === "manager" ? "/manager-settings" : "/settings"]].map(([label, path]) => <button key={path} onClick={() => navigate(path)} className={`w-full text-left rounded-lg px-3 py-2.5 text-sm ${path.includes("settings") ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-white/5"}`}>{label}</button>)}</nav><button onClick={logout} className="m-3 mb-6 flex gap-3 px-3 py-2.5 text-sm text-slate-400"><LogOut className="w-4 h-4" />Logout</button></aside>
    <main className="min-w-0 flex-1 p-4 sm:p-8"><header className="mb-6"><h1 className="text-2xl font-semibold">Settings</h1><p className="mt-1 text-sm text-slate-500">Manage your account and privacy preferences</p></header>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{status && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}
      {!profile ? <p className="text-sm text-slate-500">Loading profile…</p> : <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Profile</h2>{[["First name", "first_name", "text"], ["Username", "username", "text"], ["Email", "email", "email"]].map(([label, key, type]) => <label key={key} className="block text-sm text-slate-600">{label}<input required type={type} value={profile[key] || ""} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>)}<button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">Save profile</button></form>
        <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Change password</h2>{[["Current password", "current_password"], ["New password", "new_password"], ["Confirm new password", "confirm"]].map(([label, key]) => <label key={key} className="block text-sm text-slate-600">{label}<input required minLength={key === "current_password" ? undefined : 8} type="password" value={password[key]} onChange={(e) => setPassword({ ...password, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>)}<button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">Update password</button></form>
        {role === "employee" && <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Team privacy</h2><p className="mt-2 text-sm text-slate-500">Choose whether your check-ins can contribute to anonymous team summaries. Individual check-ins stay private.</p><label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(profile.share_with_manager)} onChange={(e) => setSharing(e.target.checked)} className="h-4 w-4 accent-violet-600" />Include my check-ins in anonymous team summaries</label></section>}
        {role === "manager" && <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2"><form onSubmit={saveTeam} className="flex flex-wrap items-end gap-3"><label className="min-w-52 flex-1 text-sm text-slate-600">Team name<input required value={team?.name || ""} onChange={(e) => setTeam({ ...team, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><button disabled={!team} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">Save team name</button></form><div className="border-t border-slate-100 pt-4"><h2 className="font-medium">Team members</h2><p className="mt-1 mb-4 text-sm text-slate-500">Manage employee login accounts. Check-in sharing remains each employee’s choice.</p><form onSubmit={addMember} className="grid gap-3 sm:grid-cols-4"><input required aria-label="Username" placeholder="Username" value={member.username} onChange={(e) => setMember({ ...member, username: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/><input required type="email" aria-label="Email" placeholder="Email" value={member.email} onChange={(e) => setMember({ ...member, email: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/><input required type="password" minLength="8" aria-label="Temporary password" placeholder="Temporary password" value={member.password} onChange={(e) => setMember({ ...member, password: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/><button disabled={teamBusy} className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-60">{teamBusy ? "Adding…" : "Add member"}</button></form>{members.length ? <ul className="mt-3 divide-y divide-slate-100">{members.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span><strong>{item.username}</strong><span className="ml-2 text-slate-500">{item.email}</span></span><button onClick={() => removeMember(item.id)} className="text-red-600 hover:underline">Remove</button></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No team members found.</p>}</div></section>}
      </div>}
    </main>
  </div>;
}
