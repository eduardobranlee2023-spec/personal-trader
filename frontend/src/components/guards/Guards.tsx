import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AuthGuard: React.FC = () => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'admin') {
    return <Outlet />;
  }

  const hasActiveSubscription = profile?.access_status === 'activa' && 
                                profile?.subscription_expires_at && 
                                new Date(profile.subscription_expires_at) > new Date();

  if (!hasActiveSubscription) {
    return <Navigate to="/expired" replace />;
  }

  return <Outlet />;
};

export const AdminGuard: React.FC = () => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="spinner" />
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
