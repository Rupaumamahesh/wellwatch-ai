import { useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";

export default function PasswordReset() {
  const navigate = useNavigate();
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4"><div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-sm"><div className="mb-6 flex items-center justify-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600"><Activity className="h-4 w-4 text-white" /></div><span className="text-lg font-semibold">WellWatch AI</span></div><h1 className="text-center text-xl font-semibold">Password reset</h1><p className="mt-3 text-center text-sm text-slate-500">Password reset by email is a future feature. Contact your manager for help.</p><button onClick={() => navigate("/")} className="mt-5 w-full rounded-lg bg-slate-200 py-2.5 text-sm font-medium text-slate-500">Back to login</button></div></div>;
}
