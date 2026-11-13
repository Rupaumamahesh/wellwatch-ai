import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  BarChart2,
  Settings,
  LogOut,
  Activity,
  Lock,
  TrendingUp,
  Bell,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, clearSession } from "../api";

const riskCounts = [{ label: "Low risk", tone: "green" }, { label: "Medium risk", tone: "amber" }, { label: "High risk", tone: "red" }];

const navItems = [
  { label: "Team Overview", icon: LayoutGrid, active: true, path: "/manager-dashboard" },
  { label: "Team Insights", icon: Users, path: "/manager-insights" },
  { label: "Reports", icon: BarChart2, path: "/manager-reports" },
  { label: "Settings", icon: Settings, path: "/manager-settings" },
];

const toneClasses = {
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-red-600",
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [members, setMembers] = useState([]);
  const [memberError, setMemberError] = useState("");
  const [memberForm, setMemberForm] = useState({ username: "", email: "", password: "" });
  const [savingMember, setSavingMember] = useState(false);
  const [team, setTeam] = useState(null);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [existingUserId, setExistingUserId] = useState("");
  const [addingExisting, setAddingExisting] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  useEffect(() => {
    api.teamStats().then(setData).catch((error) => setMessage(error.message));
    api.teamMembers().then((result) => setMembers(result.members || result)).catch((error) => setMemberError(error.message));
    api.team().then(setTeam).catch((error) => setMessage(error.message));
  }, []);

  function handleLogout() {
    api.logout().catch(() => {});
    clearSession();
    navigate("/");
  }

  async function addMember(e) {
    e.preventDefault(); setMemberError(""); setSavingMember(true);
    try { await api.addTeamMember(memberForm); setMemberForm({ username: "", email: "", password: "" }); setMembers(await api.teamMembers().then((result) => result.members || result)); }
    catch (error) { setMemberError(error.message); }
    finally { setSavingMember(false); }
  }

  async function handleShowAddExisting() {
    setShowAddExisting((v) => !v);
    if (!showAddExisting) {
      try { setEligibleUsers(await api.eligibleTeamMembers()); }
      catch (error) { setMemberError(error.message); }
    }
  }

  async function addExistingMember(e) {
    e.preventDefault();
    if (!existingUserId) return;
    setMemberError(""); setAddingExisting(true);
    try {
      await api.addExistingTeamMember(parseInt(existingUserId));
      setMembers(await api.teamMembers().then((result) => result.members || result));
      setEligibleUsers((u) => u.filter((x) => x.id !== parseInt(existingUserId)));
      setExistingUserId("");
      setShowAddExisting(false);
    }
    catch (error) { setMemberError(error.message); }
    finally { setAddingExisting(false); }
  }

  async function removeMember(id) {
    setMemberError("");
    try { await api.removeTeamMember(id); setMembers((current) => current.filter((member) => member.id !== id)); }
    catch (error) { setMemberError(error.message); }
  }

  const counts = data?.risk_counts || {};

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#1B1533] text-slate-300 flex-col shrink-0">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-white font-semibold">WellWatch AI</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              onClick={() => path && navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                path === "/manager-dashboard"
                  ? "bg-violet-600 text-white font-medium"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-4 sm:p-8 overflow-y-auto">
        <nav className="md:hidden flex gap-2 overflow-x-auto mb-6 pb-1">{navItems.map(({label,path}) => <button key={path} onClick={() => navigate(path)} className="shrink-0 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">{label}</button>)}<button onClick={handleLogout} className="shrink-0 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">Logout</button></nav>
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {team?.name || "Your team"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Aggregated wellness overview
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Anonymous summaries only
          </div>
        </header>
        {message && <p role="status" className="mb-4 rounded-lg bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</p>}

        {/* Risk count cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {riskCounts.map((r) => (
            <div
              key={r.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
            >
              <p className="text-sm text-slate-500 mb-2">{r.label}</p>
              <p className={`text-3xl font-semibold ${toneClasses[r.tone]}`}>{data?.count ? counts[r.label.replace(" risk", "").toLowerCase()] ?? 0 : "—"}</p>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-slate-800">
              Median team stress trend
            </h2>
            <span className="text-xs text-slate-400">Last 4 Weeks</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {data?.stress_trend?.length ? <LineChart data={data.stress_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="stress"
                  stroke="#378ADD"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#378ADD" }}
                />
              </LineChart> : null}
            </ResponsiveContainer>
          {!data?.stress_trend?.length && <div className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-slate-500">{data?.count === 0 ? "No shared check-ins available. Zero counts do not indicate zero risk." : data ? "No shared trend data available." : "Loading team trends…"}</div>}
          </div>
        </div>

        {/* Alert + action */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-3">
            <TrendingUp className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="font-medium text-slate-800 mb-1">
                Team-wide trend alert
              </h3>
              <p className="text-sm text-slate-600">
                Team level trends include only check-ins shared by employees.
                Use the aggregate risk counts to guide a supportive workload review.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
            <p className="text-sm text-slate-500 mb-3">
              {data?.count ? `${counts.high ?? 0} members in the high risk group` : "No shared check-in data available"}
            </p>
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2 bg-slate-200 text-slate-500 text-sm font-medium rounded-lg py-2.5 cursor-not-allowed"
              aria-describedby="notify-hr-status"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              Notify HR wellness team
            </button>
            <p id="notify-hr-status" className="mt-2 text-xs text-slate-500">Email notifications are a future feature.</p>
          </div>
        </div>
        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-medium mb-1">Team members</h2>
          <p className="text-sm text-slate-500 mb-4">Manage team login accounts. Wellness data is shared only with each employee’s consent.</p>
          {memberError && <p role="alert" className="mb-3 text-sm text-red-600">{memberError}</p>}

          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Create new account</p>
          <form onSubmit={addMember} className="grid gap-3 sm:grid-cols-4 mb-4">
            <input required value={memberForm.username} onChange={(e) => setMemberForm({...memberForm, username:e.target.value})} placeholder="Username" aria-label="Username" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input required type="email" value={memberForm.email} onChange={(e) => setMemberForm({...memberForm, email:e.target.value})} placeholder="Email" aria-label="Email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input required type="password" minLength="8" value={memberForm.password} onChange={(e) => setMemberForm({...memberForm, password:e.target.value})} placeholder="Temporary password" aria-label="Temporary password" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button disabled={savingMember} className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{savingMember ? "Adding…" : "Add member"}</button>
          </form>

          <button
            type="button"
            onClick={handleShowAddExisting}
            className="text-sm text-violet-600 hover:underline mb-4"
          >
            {showAddExisting ? "Cancel" : "+ Add existing user to this team"}
          </button>

          {showAddExisting && (
            <form onSubmit={addExistingMember} className="flex gap-2 mb-5">
              <select
                value={existingUserId}
                onChange={(e) => setExistingUserId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select existing user…</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!existingUserId || addingExisting}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 shrink-0"
              >
                {addingExisting ? "Adding…" : "Add"}
              </button>
            </form>
          )}
          {showAddExisting && eligibleUsers.length === 0 && (
            <p className="text-xs text-slate-400 mb-4">No other users available to add.</p>
          )}

          {members.length ? (
            <ul className="divide-y divide-slate-100">
              {members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    <strong className="font-medium">{member.username}</strong>
                    <span className="ml-2 text-slate-500">{member.email}</span>
                    <span className="ml-2 text-xs text-slate-500">{member.share_with_manager ? "Sharing enabled" : "Private"}</span>
                  </span>
                  <button onClick={() => removeMember(member.id)} className="text-red-600 hover:underline">Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No team members found.</p>
          )}
        </section>
      </main>
    </div>
  );
}
