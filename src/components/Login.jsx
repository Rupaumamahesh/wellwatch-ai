import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, Mail, Lock, ChevronDown } from "lucide-react";
import { api } from "../api";

export default function Login() {
  const [role, setRole] = useState("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    try {
      const data = await api.login({ email, password, role });
      localStorage.setItem("wellwatch_token", data.access || data.token);
      localStorage.setItem("wellwatch_loggedIn", "true");
      localStorage.setItem("wellwatch_role", data.role || role);
      navigate((data.role || role) === "manager" ? "/manager-dashboard" : "/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-slate-800 font-semibold text-lg">
            WellWatch AI
          </span>
        </div>

        <h1 className="text-xl font-semibold text-slate-800 text-center mb-1">
          {forgot ? "Reset your password" : "Welcome back"}
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          {forgot ? "Password reset by email is a future feature. Contact your manager for help." : "Log in to continue to your dashboard"}
        </p>
        {location.state?.notice && <p role="status" className="mb-4 text-center text-sm text-emerald-700">{location.state.notice}</p>}

        {forgot ? <div className="space-y-4"><p className="text-center text-sm text-slate-500">Please contact your manager to reset your password.</p><button type="button" onClick={() => { setForgot(false); setError(""); }} className="w-full text-sm text-violet-600">Back to login</button></div> : <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Log in as
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
              <ChevronDown
                className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <div className="relative">
              <Mail
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
          >
            Log in
          </button>
        </form>}

        {!forgot && <p className="text-center text-sm text-slate-400 mt-5">
          <button onClick={() => { setForgot(true); setError(""); }} className="hover:text-violet-600" type="button">
            Forgot password?
          </button>
        </p>}
      </div>
    </div>
  );
}
