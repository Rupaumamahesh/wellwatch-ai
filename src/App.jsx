import { Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import CheckIn from "./components/CheckIn";
import ManagerDashboard from "./components/ManagerDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/checkin" element={<CheckIn />} />
      <Route path="/manager-dashboard" element={<ManagerDashboard />} />
    </Routes>
  );
}

export default App;