import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Download, LogOut } from "lucide-react";
import { api, clearSession } from "../api";
import { downloadCsv } from "../reports";

const personalColumns = [["date", "Date"], ["mood", "Mood"], ["stress", "Stress"], ["energy", "Energy"], ["sleep", "Sleep"], ["risk_level", "Risk level"], ["risk_score", "Risk score"]];
const teamColumns = [["date", "Date"], ["median_stress", "Median stress"]];

export default function ReportsPage({ role }) {
  const navigate = useNavigate();
  const manager = role === "manager";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { (manager ? api.teamReport() : api.history()).then((result) => setData(result)).catch((e) => setError(e.message)); }, [manager]);
  const rows = manager ? (data?.stress_trend || []).map((point) => ({ date: point.date, median_stress: point.stress })) : (Array.isArray(data) ? data : data?.checkins || []).map((item) => ({ ...item, risk_level: item.risk?.level || "", risk_score: item.risk?.score ?? "" }));
  function logout() { api.logout().catch(() => {}); clearSession(); navigate("/"); }
  function download() { downloadCsv(manager ? "team-wellness-report.csv" : "my-wellness-report.csv", rows, manager ? teamColumns : personalColumns); }
  return <div className="min-h-screen flex bg-slate-50 text-slate-800">
    <aside className="hidden md:flex w-64 bg-[#1B1533] text-slate-300 flex-col shrink-0"><div className="flex items-center gap-2 px-6 py-6"><div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div><span className="text-white font-semibold">WellWatch AI</span></div><nav className="flex-1 px-3 space-y-1">{[[manager ? "Team Overview" : "Dashboard", manager ? "/manager-dashboard" : "/dashboard"], ["Reports", manager ? "/manager-reports" : "/reports"]].map(([label, path]) => <button key={path} onClick={() => navigate(path)} className={`w-full text-left rounded-lg px-3 py-2.5 text-sm ${path.includes("reports") ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-white/5"}`}>{label}</button>)}</nav><button onClick={logout} className="m-3 mb-6 flex gap-3 px-3 py-2.5 text-sm text-slate-400"><LogOut className="w-4 h-4" />Logout</button></aside>
    <main className="min-w-0 flex-1 p-4 sm:p-8"><header className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{manager ? "Team reports" : "Wellness reports"}</h1><p className="mt-1 text-sm text-slate-500">{manager ? "Anonymous aggregate data from opted-in check-ins" : "Your personal check-in history"}</p></div><button disabled={!data || !rows.length} onClick={download} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><Download className="h-4 w-4" />Download CSV</button></header>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {manager && data && <div className="mb-4 grid gap-3 sm:grid-cols-3">{[["Contributing members", data.count ?? 0], ["At-risk", data.at_risk ?? 0], ["Median stress", data.median ?? "—"]].map(([title, value]) => <article key={title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>)}</div>}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-medium">{manager ? "Median daily stress" : "Check-in history"}</h2><p className="mt-1 text-sm text-slate-500">{manager && !rows.length ? "Team summaries are suppressed until at least three people share data." : "CSV includes the records shown here."}</p></div>{!data && !error ? <p className="p-8 text-center text-sm text-slate-500">Loading report…</p> : rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{(manager ? teamColumns : personalColumns).map(([, label]) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row.date}-${index}`}>{(manager ? teamColumns : personalColumns).map(([key]) => <td key={key} className="px-4 py-3 text-slate-600">{row[key] ?? "—"}</td>)}</tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-500">{manager ? "No report data is available." : "No check-ins yet. Your report will appear after your first check-in."}</p>}</section>
    </main>
  </div>;
}
