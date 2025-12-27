import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { TeamProvider } from './hooks/useTeam';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Reviews from './pages/Reviews';
import ReviewDetail from './pages/ReviewDetail';
import ReviewManagement from './pages/ReviewManagement';
import Team from './pages/Team';
import Employees from './pages/Employees';
import OneOnOnes from './pages/OneOnOnes';
import OneOnOneDetail from './pages/OneOnOneDetail';
import Development from './pages/Development';
import OrgChart from './pages/OrgChart';
import Settings from './pages/Settings';
import Admin from './pages/Admin';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <TeamProvider>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/reviews/:id" element={<ReviewDetail />} />
                <Route path="/review-management" element={<ReviewManagement />} />
                <Route path="/team" element={<Team />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/one-on-ones" element={<OneOnOnes />} />
                <Route path="/one-on-ones/:id" element={<OneOnOneDetail />} />
                <Route path="/development" element={<Development />} />
                <Route path="/org-chart" element={<OrgChart />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TeamProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
