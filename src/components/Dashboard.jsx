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

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, active: true, path: "/dashboard" },
  { label: "Daily Check-in", icon: CheckSquare, path: "/checkin" },
  { label: "Wellness Trends", icon: TrendingUp, path: "/trends" },
  { label: "AI Recommendations", icon: Sparkles, path: "/recommendations" },
  { label: "Team Insights", icon: Users },
  { label: "Resources", icon: BookOpen, path: "/resources" },
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
  const factors = data?.factors || [];

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
      <aside className="hidden md:flex w-64 bg-[#1B1533] text-slate-300 flex-col shrink-0">
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
              disabled={!path}
              title={!path ? `${label} is not available yet` : undefined}
              onClick={() => path && navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
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
        <nav className="md:hidden flex gap-2 overflow-x-auto mb-6 pb-1">{navItems.filter(({path}) => path).map(({label,path}) => <button key={path} onClick={() => navigate(path)} className="shrink-0 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">{label}</button>)}<button onClick={handleLogout} className="shrink-0 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">Logout</button></nav>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="text-violet-600 font-medium">Welcome back!</span>{" "}
            Here's your wellness overview for today.
          </p>
        </header>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error} <button onClick={() => { setError(""); api.dashboard().then(setData).catch((e) => setError(e.message)); }} className="underline">Try again</button></p>}
        <p className="mb-4 text-xs text-slate-500">Wellness risk scores are experimental estimates from a model trained on synthetic data. They are not validated predictions or a diagnosis.</p>

        {/* Top metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Burnout Risk"
            badge={data?.risk_level || "No data"}
            badgeTone={data?.risk_level === "high" ? "red" : "amber"}
            value={data?.risk_probability != null ? risk : "—"}
            unit="/ 100"
            subtext={data ? "Based on your check-in data" : "Complete a check-in to see your risk score"}
          />
          <MetricCard
            title="Check-in Streak"
            value={data ? data.streak : "—"}
            unit="Days"
            subtext={data?.streak ? "Consecutive check-in days" : "Your check-ins will appear here"}
            icon={Sparkles}
          />
          <MetricCard
            title="Wellness Score"
            value={data?.wellness_score ?? "—"}
            unit="/ 100"
            subtext="Based on your latest check-in"
          />
          <MetricCard
            title="Weekly Summary"
            value={data?.latest_checkin ? "Available" : "—"}
            subtext={data?.latest_checkin ? "Latest check-in received" : "Complete a check-in to start"}
            icon={FileText}
          />
        </div>

        {/* Trend + Factors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-slate-800">Burnout Risk Trend</h2>
              <span className="text-xs text-slate-400">Recent check-ins</span>
            </div>
            <div className="h-56">
              {data?.risk_trend?.length ? <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.risk_trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
                  <XAxis
                    dataKey="day"
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
              </ResponsiveContainer> : <div className="h-full grid place-items-center text-sm text-slate-500">{data ? "No trend data yet. Complete check-ins to build your trend." : "Loading your trend…"}</div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-medium text-slate-800 mb-4">Wellness Factors</h2>
            {!factors.length ? <p className="text-sm text-slate-500">{data ? "Complete a check-in to see your wellness factors." : "Loading your factors…"}</p> : factors.map((f) => (
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
              {sharing ? "Remove my check-ins from anonymous team summaries" : "Include my check-ins in anonymous team summaries"}
            </button>
            <p className="mt-2 text-xs text-slate-500">Only anonymous, aggregated summaries are shared with your manager; individual check-ins remain private.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
