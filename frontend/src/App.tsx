import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import { AuthGuard, AdminGuard } from './components/guards/Guards';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PendingAccess from './pages/PendingAccess';
import Dashboard from './pages/Dashboard';
import AccountsPage from './pages/AccountsPage';
import TradesPage from './pages/TradesPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';
import StrategiesPage from './pages/StrategiesPage';
import FundingPage from './pages/FundingPage';
import AdminPanel from './pages/AdminPanel';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AccountProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pending" element={<PendingAccess />} />

            {/* Protected routes - requires auth AND active access */}
            <Route element={<AuthGuard />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/accounts" element={<AccountsPage />} />
              {/* Future routes — placeholders */}
              <Route path="/trades" element={<TradesPage />} />
              <Route path="/strategies" element={<StrategiesPage />} />
              <Route path="/funding" element={<FundingPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<AdminGuard />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AccountProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
