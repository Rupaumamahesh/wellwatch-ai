import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Activity } from "lucide-react";
import { api } from "../api";

export default function PasswordReset() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const uid = params.get("uid");
  const token = params.get("token");
  async function submit(e) {
    e.preventDefault(); setError("");
    if (!uid || !token) { setError("This reset link is incomplete. Request a new one."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    try { await api.resetPassword(uid, token, password); setDone(true); }
    catch (e) { setError(e.message); }
  }
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-sm"><div className="mb-6 flex items-center justify-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600"><Activity className="h-4 w-4 text-white" /></div><span className="text-lg font-semibold">WellWatch AI</span></div><h1 className="text-center text-xl font-semibold">Choose a new password</h1>{done ? <div className="mt-5 text-center"><p role="status" className="text-sm text-emerald-700">Password updated. You can now log in.</p><button onClick={() => navigate("/")} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Go to login</button></div> : <form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-sm text-slate-600">New password<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label><label className="block text-sm text-slate-600">Confirm new password<input required minLength={8} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white">Reset password</button></form>}</div></div>;
}
