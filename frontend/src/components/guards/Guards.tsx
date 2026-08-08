import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AuthGuard: React.FC = () => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin bypasses all subscription/access checks
  if (profile?.role === 'admin') {
    return <Outlet />;
  }

  // Block pending access
  if (profile?.access_status === 'pendiente') {
    return <Navigate to="/pending" replace />;
  }

  // Block expired or inactive subscription
  const blockedStatuses = ['inactive', 'expired'];
  if (profile?.subscription_status && blockedStatuses.includes(profile.subscription_status)) {
    return <Navigate to="/pending" replace />;
  }

  return <Outlet />;
};

export const AdminGuard: React.FC = () => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
