import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, Users, Network, Settings, LogOut, Activity, ShieldCheck } from "lucide-react";
import { api, clearSession } from "../api";

const navItems = [
  { label: "Overview", icon: LayoutGrid, path: "/admin-dashboard" },
  { label: "Users", icon: Users, path: "/admin-users" },
  { label: "Teams", icon: Network, path: "/admin-teams" },
  { label: "Settings", icon: Settings, path: "/admin-settings" },
];

export function AdminSidebar({ activePath }) {
  const navigate = useNavigate();
  function handleLogout() {
    api.logout().catch(() => {});
    clearSession();
    navigate("/");
  }
  return (
    <aside className="hidden md:flex w-64 bg-[#0F172A] text-slate-300 flex-col shrink-0">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-white font-semibold">WellWatch AI</span>
      </div>
      <div className="px-4 mb-4">
        <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium bg-indigo-950 rounded px-2 py-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Admin Panel
        </span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ label, icon: Icon, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activePath === path
                ? "bg-indigo-600 text-white font-medium"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
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
  );
}

function StatCard({ label, value, sub, tone }) {
  const tones = { indigo: "text-indigo-600", emerald: "text-emerald-600", amber: "text-amber-600", red: "text-red-600", slate: "text-slate-700" };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${tones[tone] || tones.slate}`}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.adminStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      <AdminSidebar activePath="/admin-dashboard" />
      <main className="min-w-0 flex-1 p-4 sm:p-8 overflow-y-auto">
        <nav className="md:hidden flex gap-2 overflow-x-auto mb-6 pb-1">
          {navItems.map(({ label, path }) => (
            <button key={path} onClick={() => navigate(path)} className="shrink-0 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">{label}</button>
          ))}
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Live snapshot of the WellWatch AI platform</p>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Users" value={stats?.total_users} tone="indigo" />
          <StatCard label="Active (7 days)" value={stats?.active_users_7d} sub="users who checked in" tone="emerald" />
          <StatCard label="Check-ins (30 days)" value={stats?.total_checkins_30d} tone="slate" />
          <StatCard label="Teams" value={stats?.total_teams} tone="slate" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-medium mb-4">Users by role</h2>
            <div className="space-y-3">
              {stats?.by_role ? Object.entries(stats.by_role).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-slate-600">{role}</span>
                  <span className="text-sm font-medium text-slate-800">{count}</span>
                </div>
              )) : <p className="text-sm text-slate-400">Loading…</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-medium mb-4">Risk distribution (30 days)</h2>
            <div className="space-y-3">
              {stats?.risk_counts_30d ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-600">Low risk</span>
                    <span className="text-sm font-medium">{stats.risk_counts_30d.low ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-600">Medium risk</span>
                    <span className="text-sm font-medium">{stats.risk_counts_30d.medium ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600">High risk</span>
                    <span className="text-sm font-medium">{stats.risk_counts_30d.high ?? 0}</span>
                  </div>
                </>
              ) : <p className="text-sm text-slate-400">Loading…</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/admin-users")}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:border-indigo-200 transition-colors group"
          >
            <Users className="w-5 h-5 text-indigo-500 mb-3" />
            <h3 className="font-medium text-slate-800 group-hover:text-indigo-600">Manage Users</h3>
            <p className="text-sm text-slate-500 mt-1">Create, edit roles, reset passwords, deactivate accounts</p>
          </button>
          <button
            onClick={() => navigate("/admin-teams")}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:border-indigo-200 transition-colors group"
          >
            <Network className="w-5 h-5 text-indigo-500 mb-3" />
            <h3 className="font-medium text-slate-800 group-hover:text-indigo-600">Manage Teams</h3>
            <p className="text-sm text-slate-500 mt-1">Create teams, assign managers, view team structure</p>
          </button>
        </div>
      </main>
    </div>
  );
}
