import { Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import CheckIn from "./components/CheckIn";
import ManagerDashboard from "./components/ManagerDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import WellnessPage from "./components/WellnessPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route element={<ProtectedRoute role="employee" />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/trends" element={<WellnessPage page="trends" />} />
        <Route path="/recommendations" element={<WellnessPage page="recommendations" />} />
        <Route path="/resources" element={<WellnessPage page="resources" />} />
      </Route>
      <Route element={<ProtectedRoute role="manager" />}>
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
