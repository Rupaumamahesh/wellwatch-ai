import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, LayoutGrid, LogOut, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, clearSession } from "../api";

export default function EmployeeInsights() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.profile().then(setProfile).catch((e) => setError(e.message));
    api.employeeTeamStats().then(setReport).catch((e) => setError(e.message));
  }, []);
  async function toggleSharing() {
    setSaving(true); setError("");
    try { const result = await api.share(!profile?.share_with_manager); setProfile({ ...profile, share_with_manager: result.share_with_manager }); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }
  function logout() { api.logout().catch(() => {}); clearSession(); navigate("/"); }
  return <div className="min-h-screen flex bg-slate-50 text-slate-800"><aside className="hidden md:flex w-64 bg-[#1B1533] text-slate-300 flex-col shrink-0"><div className="flex items-center gap-2 px-6 py-6"><div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div><span className="text-white font-semibold">WellWatch AI</span></div><nav className="flex-1 px-3 space-y-1"><button onClick={() => navigate("/dashboard")} className="w-full flex gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5"><LayoutGrid className="h-4 w-4" />Dashboard</button><button className="w-full flex gap-3 rounded-lg bg-violet-600 px-3 py-2.5 text-left text-sm text-white"><Users className="h-4 w-4" />Team Insights</button><button onClick={() => navigate("/settings")} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 hover:bg-white/5">Settings</button></nav><button onClick={logout} className="m-3 mb-6 flex gap-3 px-3 py-2.5 text-sm text-slate-400"><LogOut className="w-4 h-4" />Logout</button></aside><main className="min-w-0 flex-1 p-4 sm:p-8"><nav className="md:hidden mb-6 flex gap-2 overflow-x-auto pb-1">{[["Dashboard", "/dashboard"], ["Team Insights", "/team-insights"], ["Settings", "/settings"]].map(([label, path]) => <button key={path} onClick={() => navigate(path)} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">{label}</button>)}<button onClick={logout} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">Logout</button></nav><header className="mb-6"><h1 className="text-2xl font-semibold">Team Insights</h1><p className="mt-1 text-sm text-slate-500">Anonymous, minimum cohort size summaries for your team</p></header>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Your contribution and privacy</h2><p className="mt-2 text-sm text-slate-600">{profile?.share_with_manager ? "Your check-ins are included in anonymous team summaries." : "Your check-ins are private and are not included in team summaries."} Team summaries require at least three people; your individual check-ins and comments are never shown.</p><label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(profile?.share_with_manager)} disabled={!profile || saving} onChange={toggleSharing} className="h-4 w-4 accent-violet-600"/>Allow my check-ins to contribute to anonymous team summaries</label></section>
    {report && <><div className="grid gap-4 sm:grid-cols-3">{[["Contributing members", report.count], ["Median team risk", report.median ?? "—"], ["At-risk group", report.at_risk ?? "—"]].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value ?? "—"}</p></article>)}</div><section className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-medium">Team stress trend</h2><div className="relative mt-4 h-64">{report.stress_trend?.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={report.stress_trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5"/><XAxis dataKey="date"/><YAxis domain={[0,100]}/><Tooltip/><Line dataKey="stress" name="Median stress" stroke="#7c3aed" strokeWidth={2}/></LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-sm text-slate-500">{report.count < 3 ? "Team summaries are hidden until at least three people share check-ins." : "No shared trend data available."}</div>}</div></section><p className="mt-4 text-xs text-slate-500">This is a group summary to support team wellbeing conversations, not an assessment of any individual.</p></>}
  </main></div>;
}
