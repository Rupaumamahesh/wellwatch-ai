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

// ---- Sample data (swap for real API data later) ----
const teamStressTrend = [
  { week: "Week 1", stress: 40 },
  { week: "Week 2", stress: 48 },
  { week: "Week 3", stress: 55 },
  { week: "Week 4", stress: 68 },
];

const riskCounts = [
  { label: "Low risk", value: 15, tone: "green" },
  { label: "Medium risk", value: 6, tone: "amber" },
  { label: "High risk", value: 2, tone: "red" },
];

const navItems = [
  { label: "Team Overview", icon: LayoutGrid, active: true, path: "/manager-dashboard" },
  { label: "Team Insights", icon: Users },
  { label: "Reports", icon: BarChart2 },
  { label: "Settings", icon: Settings },
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
  useEffect(() => {
    api.teamStats().then(setData).catch((error) => setMessage(error.message));
  }, []);

  function handleLogout() {
    api.logout().catch(() => {});
    clearSession();
    navigate("/");
  }

  async function handleNotifyHR() {
    try {
      const result = await api.notifyHr();
      setMessage(result.detail || "HR wellness team has been notified.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  const counts = data?.risk_counts || {};

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1B1533] text-slate-300 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-white font-semibold">WellWatch AI</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ label, icon: Icon, active, path }) => (
            <button
              key={label}
              onClick={() => path && navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-violet-600 text-white font-medium"
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

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              Engineering team
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Aggregated wellness overview
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            No individual data shown
          </div>
        </header>
        {message && <p className="mb-4 rounded-lg bg-violet-50 px-4 py-3 text-sm text-violet-700">{message}</p>}

        {/* Risk count cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {riskCounts.map((r) => (
            <div
              key={r.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
            >
              <p className="text-sm text-slate-500 mb-2">{r.label}</p>
              <p className={`text-3xl font-semibold ${toneClasses[r.tone]}`}>
                {counts[r.label.replace(" risk", "").toLowerCase()] ?? 0}
              </p>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-slate-800">
              Median team stress trend
            </h2>
            <span className="text-xs text-slate-400">Last 4 Weeks</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.stress_trend || teamStressTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                <XAxis
                  dataKey="week"
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
              </LineChart>
            </ResponsiveContainer>
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
                Team stress has trended upward over the past two weeks.
                Consider reviewing current workload distribution.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
            <p className="text-sm text-slate-500 mb-3">
              {counts.high ?? 0} members at high risk this week
            </p>
            <button
              onClick={handleNotifyHR}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              Notify HR wellness team
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}