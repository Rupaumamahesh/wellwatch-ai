import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  CheckSquare,
  TrendingUp,
  Sparkles,
  BarChart2,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Activity,
  AlertTriangle,
  FileText,
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
const burnoutTrend = [
  { week: "Week 1", risk: 78 },
  { week: "Week 2", risk: 45 },
  { week: "Week 3", risk: 52 },
  { week: "Week 4", risk: 62 },
];

const wellnessFactors = [
  { label: "Workload", value: 60, tone: "amber" },
  { label: "Sleep Quality", value: 75, tone: "green" },
  { label: "Stress Level", value: 80, tone: "red" },
  { label: "Mood", value: 70, tone: "green" },
  { label: "Focus", value: 55, tone: "amber" },
];

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, active: true, path: "/dashboard" },
  { label: "Daily Check-in", icon: CheckSquare, path: "/checkin" },
  { label: "Wellness Trends", icon: TrendingUp },
  { label: "AI Recommendations", icon: Sparkles },
  { label: "Reports", icon: BarChart2 },
  { label: "Team Insights", icon: Users },
  { label: "Resources", icon: BookOpen },
  { label: "Settings", icon: Settings },
];

const toneClasses = {
  green: { bar: "bg-emerald-500", text: "text-emerald-600" },
  amber: { bar: "bg-amber-500", text: "text-amber-600" },
  red: { bar: "bg-red-500", text: "text-red-600" },
};

function toneLabel(tone) {
  if (tone === "green") return "Good";
  if (tone === "amber") return "Moderate";
  return "High";
}

function MetricCard({ title, badge, badgeTone, value, unit, subtext, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        {badge && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              badgeTone === "amber"
                ? "bg-amber-50 text-amber-600"
                : badgeTone === "green"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {badge}
          </span>
        )}
        {Icon && <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-slate-800">{value}</span>
        {unit && <span className="text-slate-400 text-sm">{unit}</span>}
      </div>
      <p className="text-xs text-slate-400">{subtext}</p>
    </div>
  );
}

function WellnessBar({ label, value, tone }) {
  const classes = toneClasses[tone];
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className={`font-medium ${classes.text}`}>
          {toneLabel(tone)} ({value}%)
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${classes.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    api.dashboard().then((result) => {
      setData(result);
      setSharing(Boolean(result.user?.share_with_manager));
    }).catch((requestError) => setError(requestError.message));
  }, []);

  function handleLogout() {
    api.logout().catch(() => {});
    clearSession();
    navigate("/");
  }

  const risk = data?.risk_probability != null ? Math.round(data.risk_probability * 100) : 0;
  const factors = data?.factors || wellnessFactors.map((factor) => ({ ...factor }));

  async function toggleSharing() {
    try {
      const result = await api.share(!sharing);
      setSharing(result.share_with_manager);
      setData((current) => ({ ...current, user: { ...current.user, share_with_manager: result.share_with_manager } }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

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
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="text-violet-600 font-medium">Welcome back!</span>{" "}
            Here's your wellness overview for today.
          </p>
        </header>
        {error && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">{error} Start the Django API to load live data.</p>}

        {/* Top metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Burnout Risk"
            badge={data?.risk_level || "No data"}
            badgeTone={data?.risk_level === "high" ? "red" : "amber"}
            value={risk}
            unit="/ 100"
            subtext="Based on workload & stress factors"
          />
          <MetricCard
            title="Check-in Streak"
            value={data?.streak ?? 0}
            unit="Days"
            subtext="Great going! Keep it up"
            icon={Sparkles}
          />
          <MetricCard
            title="Wellness Score"
            badge="Good"
            badgeTone="green"
            value={data?.wellness_score ?? "—"}
            unit="/ 100"
            subtext="Increased by 4 points from last week"
          />
          <MetricCard
            title="Weekly Summary"
            value="Report Ready"
            subtext=""
            icon={FileText}
          />
        </div>

        {/* Trend + Factors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-slate-800">Burnout Risk Trend</h2>
              <span className="text-xs text-slate-400">Last 4 Weeks</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.risk_trend || burnoutTrend}>
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
                    dataKey="risk"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#7c3aed" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-medium text-slate-800 mb-4">Wellness Factors</h2>
            {factors.map((f) => (
              <WellnessBar key={f.label} {...f} />
            ))}
          </div>
        </div>

        {/* Insight + Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-red-50 border border-red-100 rounded-2xl p-5 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="font-medium text-slate-800 mb-1">AI Wellness Insight</h3>
              <p className="text-sm text-slate-600">{data?.insight || "Complete your first check-in to receive a personal wellness insight."}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-medium text-slate-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => navigate("/checkin")}
                className="flex flex-col items-center gap-2 rounded-xl bg-violet-50 text-violet-700 py-3 text-xs font-medium hover:bg-violet-100"
              >
                <CheckSquare className="w-4 h-4" aria-hidden="true" />
                Daily Check-in
              </button>
              <button className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 text-slate-600 py-3 text-xs font-medium hover:bg-slate-100">
                <BarChart2 className="w-4 h-4" aria-hidden="true" />
                View Reports
              </button>
              <button className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 text-slate-600 py-3 text-xs font-medium hover:bg-slate-100">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                Resources
              </button>
            </div>
            <button
              onClick={toggleSharing}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              {data?.user?.share_with_manager ? "Shared with manager (turn off)" : "Keep my details private"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}