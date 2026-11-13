import { Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import CheckIn from "./components/CheckIn";
import ManagerDashboard from "./components/ManagerDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import WellnessPage from "./components/WellnessPage";
import SettingsPage from "./components/SettingsPage";
import ReportsPage from "./components/ReportsPage";
import ManagerInsights from "./components/ManagerInsights";
import PasswordReset from "./components/PasswordReset";
import EmployeeInsights from "./components/EmployeeInsights";
import AdminDashboard from "./components/AdminDashboard";
import AdminUsers from "./components/AdminUsers";
import AdminTeams from "./components/AdminTeams";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/password-reset" element={<PasswordReset />} />
      <Route element={<ProtectedRoute role="employee" />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/trends" element={<WellnessPage page="trends" />} />
        <Route path="/recommendations" element={<WellnessPage page="recommendations" />} />
        <Route path="/resources" element={<WellnessPage page="resources" />} />
        <Route path="/settings" element={<SettingsPage role="employee" />} />
        <Route path="/reports" element={<ReportsPage role="employee" />} />
        <Route path="/team-insights" element={<EmployeeInsights />} />
      </Route>
      <Route element={<ProtectedRoute role="manager" />}>
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
        <Route path="/manager-insights" element={<ManagerInsights />} />
        <Route path="/manager-reports" element={<ReportsPage role="manager" />} />
        <Route path="/manager-settings" element={<SettingsPage role="manager" />} />
      </Route>
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-users" element={<AdminUsers />} />
        <Route path="/admin-teams" element={<AdminTeams />} />
        <Route path="/admin-settings" element={<SettingsPage role="admin" />} />
      </Route>
    </Routes>
  );
}

export default App;
