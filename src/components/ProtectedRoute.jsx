import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ role }) {
  const loggedIn = localStorage.getItem("wellwatch_loggedIn") === "true";
  const currentRole = localStorage.getItem("wellwatch_role");
  if (!loggedIn) return <Navigate to="/" replace />;
  if (role && currentRole !== role) {
    return <Navigate to={currentRole === "manager" ? "/manager-dashboard" : "/dashboard"} replace />;
  }
  return <Outlet />;
}
