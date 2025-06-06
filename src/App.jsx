import { Routes, Route, Link } from 'react-router-dom';
import Airspaces from './pages/Airspaces';
import Aircrafts from './pages/Aircrafts';
import Callsigns from './pages/callsigns';
import Constraints from './pages/Constraints';
import ExtPoints from './pages/ExtPoints';
import IntPoints from './pages/IntPoints';
import Dashboard from './pages/Dashboard';
import DashboardAircrafts from './pages/DashboardAircrafts';
import DashboardAirspaces from './pages/DashboardAirspaces';
import DashboardCallsigns from './pages/DashboardCallsigns';
import DashboardConstraints from './pages/DashboardConstraints';
import DashboardExtPoints from './pages/DashboardExtPoints';
import DashboardIntPoints from './pages/DashboardIntPoints';
import Auth from './Auth';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route
          path="/"
          element={
            <div className="container mx-auto p-4">
              <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">ATCO Training</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link to="/airspaces" className="p-6 bg-white rounded-lg shadow hover:bg-gray-50">
                  <h2 className="text-xl font-semibold text-center">Airspaces</h2>
                </Link>
                <Link to="/aircrafts" className="p-6 bg-white rounded-lg shadow hover:bg-gray-50">
                  <h2 className="text-xl font-semibold text-center">Aircrafts</h2>
                </Link>
                <Link to="/callsigns" className="p-6 bg-white rounded-lg shadow hover:bg-gray-50">
                  <h2 className="text-xl font-semibold text-center">Callsigns</h2>
                </Link>
                <Link to="/constraints" className="p-6 bg-white rounded-lg shadow hover:bg-gray-50">
                  <h2 className="text-xl font-semibold text-center">Constraints</h2>
                </Link>
                <Link to="/ext_points" className="p-6 bg-white rounded-lg shadow hover:bg-gray-50">
                  <h2 className="text-xl font-semibold text-center">External Points</h2>
                </Link>
                <Link to="/int_points" className="p-6 bg-white rounded-lg shadow hover:bg-gray-50">
                  <h2 className="text-xl font-semibold text-center">Internal Points</h2>
                </Link>
                <Link to="/dashboard" className="p-6 bg-white rounded-lg shadow hover:bg-gray-50">
                  <h2 className="text-xl font-semibold text-center">Dashboard</h2>
                </Link>
              </div>
            </div>
          }
        />
        <Route path="/airspaces" element={<Airspaces />} />
        <Route path="/aircrafts" element={<Aircrafts />} />
        <Route path="/callsigns" element={<Callsigns />} />
        <Route path="/constraints" element={<Constraints />} />
        <Route path="/ext_points" element={<ExtPoints />} />
        <Route path="/int_points" element={<IntPoints />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/aircrafts" element={<DashboardAircrafts />} />
        <Route path="/dashboard/airspaces" element={<DashboardAirspaces />} />
        <Route path="/dashboard/callsigns" element={<DashboardCallsigns />} />
        <Route path="/dashboard/constraints" element={<DashboardConstraints />} />
        <Route path="/dashboard/ext_points" element={<DashboardExtPoints />} />
        <Route path="/dashboard/int_points" element={<DashboardIntPoints />} />
      </Routes>
    </div>
  );
}

export default App;