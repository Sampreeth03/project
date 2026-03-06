import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Wraps a route: requires login + optional role check
export function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/not-allowed" replace />;
  }

  return children;
}

export function UserRoute({ children }) {
  return <ProtectedRoute allowedRoles={['user']}>{children}</ProtectedRoute>;
}

export function RecruiterRoute({ children }) {
  return <ProtectedRoute allowedRoles={['recruiter']}>{children}</ProtectedRoute>;
}

export function AdminRoute({ children }) {
  return <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>;
}
