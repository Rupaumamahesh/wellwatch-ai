import { Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import CheckIn from "./components/CheckIn";
import ManagerDashboard from "./components/ManagerDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function Placeholder({ title }) {
  return <div className="min-h-screen bg-slate-50 p-8"><h1 className="text-2xl font-semibold text-slate-800">{title}</h1><p className="mt-2 text-slate-500">This view is available from the dashboard once your check-in history grows.</p></div>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route element={<ProtectedRoute role="employee" />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/trends" element={<Placeholder title="Wellness trends" />} />
        <Route path="/recommendations" element={<Placeholder title="AI recommendations" />} />
        <Route path="/resources" element={<Placeholder title="Wellness resources" />} />
      </Route>
      <Route element={<ProtectedRoute role="manager" />}>
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;