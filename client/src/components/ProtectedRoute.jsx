import React from 'react';
import { Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="center-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p className="center-screen-text">Loading AssetTrack...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
    return (
      <div className="center-screen" role="alert">
        <Lock size={32} aria-hidden="true" />
        <h2>Access Denied</h2>
        <p className="center-screen-text">You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
