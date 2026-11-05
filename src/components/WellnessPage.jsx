import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, BookOpen, CheckSquare, LayoutGrid, LogOut, Sparkles, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, clearSession } from "../api";

const links = [
  ["Dashboard", "/dashboard", LayoutGrid],
  ["Daily Check-in", "/checkin", CheckSquare],
  ["Wellness Trends", "/trends", TrendingUp],
  ["AI Recommendations", "/recommendations", Sparkles],
  ["Resources", "/resources", BookOpen],
];
const titles = { trends: "Wellness trends", recommendations: "Your recommendations", resources: "Wellness resources" };

export default function WellnessPage({ page }) {
  const navigate = useNavigate();
  const [result, setResult] = useState({ key: "", data: null, error: "" });
  const [range, setRange] = useState("4w");

  useEffect(() => {
    const key = `${page}:${range}`;
    if (page === "trends") api.trends(range).then((data) => setResult({ key, data, error: "" })).catch((e) => setResult({ key, data: null, error: e.message }));
    if (page === "recommendations") api.recommendations().then((data) => setResult({ key, data, error: "" })).catch((e) => setResult({ key, data: null, error: e.message }));
  }, [page, range]);

  const key = `${page}:${range}`;
  const data = result.key === key ? result.data : null;
  const error = result.key === key ? result.error : "";

  function logout() {
    api.logout().catch(() => {});
    clearSession();
    navigate("/");
  }

  const recommendations = data?.recommendations || [];
  return <div className="min-h-screen flex bg-slate-50 text-slate-800">
    <aside className="hidden md:flex w-64 bg-[#1B1533] text-slate-300 flex-col shrink-0">
      <div className="flex items-center gap-2 px-6 py-6"><div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div><span className="text-white font-semibold">WellWatch AI</span></div>
      <nav className="flex-1 px-3 space-y-1">{links.map(([label, path, Icon]) => <button key={path} onClick={() => navigate(path)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${path === `/${page}` ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-white/5"}`}><Icon className="w-4 h-4" />{label}</button>)}</nav>
      <button onClick={logout} className="m-3 mb-6 flex gap-3 px-3 py-2.5 text-sm text-slate-400"><LogOut className="w-4 h-4" />Logout</button>
    </aside>
    <main className="min-w-0 flex-1 p-4 sm:p-8">
      <nav className="md:hidden flex gap-2 overflow-x-auto mb-6 pb-1">{links.map(([label, path]) => <button key={path} onClick={() => navigate(path)} className="shrink-0 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">{label}</button>)}<button onClick={logout} className="shrink-0 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">Logout</button></nav>
      <header className="mb-6"><h1 className="text-2xl font-semibold">{titles[page]}</h1><p className="text-sm text-slate-500 mt-1">{page === "trends" ? "Your check-in patterns over time" : page === "recommendations" ? "Suggestions based on your check-ins" : "Support for your wellbeing"}</p></header>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error} <button onClick={() => { const currentKey = `${page}:${range}`; const request = page === "trends" ? api.trends(range) : api.recommendations(); request.then((value) => setResult({ key: currentKey, data: value, error: "" })).catch((e) => setResult({ key: currentKey, data: null, error: e.message })); }} className="underline">Try again</button></p>}
      {page === "trends" && <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4"><h2 className="font-medium">Daily check-in trends</h2><label className="text-sm text-slate-500">Time period <select value={range} onChange={(e) => setRange(e.target.value)} className="ml-2 rounded border border-slate-200 px-2 py-1 text-slate-700"><option value="1w">1 week</option><option value="4w">4 weeks</option><option value="3m">3 months</option></select></label></div>
        {data === null && !error ? <p className="py-16 text-center text-sm text-slate-500">Loading your trends…</p> : data?.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" /><XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} /><Tooltip /><Line dataKey="stress" name="Stress" stroke="#ef4444" dot={false} /><Line dataKey="energy" name="Energy" stroke="#7c3aed" dot={false} /><Line dataKey="sleep" name="Sleep" stroke="#378ADD" dot={false} /></LineChart></ResponsiveContainer></div> : !error && <p className="py-16 text-center text-sm text-slate-500">No check-ins yet. Complete a daily check-in to see your trends.</p>}
      </section>}
      {page === "recommendations" && <section className="space-y-3">{data === null && !error ? <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading recommendations…</p> : recommendations.length ? recommendations.map((item, i) => <article key={`${i}-${item}`} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex gap-3"><Sparkles className="w-5 h-5 text-violet-600 shrink-0"/><p className="text-sm text-slate-700">{item}</p></div></article>) : !error && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No recommendations available yet. Complete a check-in to receive suggestions.</p>}</section>}
      {page === "resources" && <section className="grid gap-4 sm:grid-cols-2"><article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Take a mindful pause</h2><p className="mt-2 text-sm text-slate-500">Step away from your screen, take a few slow breaths, and give yourself a short reset between tasks.</p></article><article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Talk to someone</h2><p className="mt-2 text-sm text-slate-500">Reach out to someone you trust or your workplace wellness team when you need support.</p></article><article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Protect your recovery time</h2><p className="mt-2 text-sm text-slate-500">Set a clear end to your workday where possible and make room for rest, movement, and sleep.</p></article><article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Need urgent help?</h2><p className="mt-2 text-sm text-slate-500">Contact your local emergency service or a qualified mental health professional.</p></article></section>}
    </main>
  </div>;
}
