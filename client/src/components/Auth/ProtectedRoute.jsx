import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'student') return 'user';
  if (normalized === 'users') return 'user';
  if (normalized === 'student_user') return 'user';
  if (normalized === 'studentuser') return 'user';
  return normalized;
}

function hasRequiredRole(userRole, allowedRoles = []) {
  const role = normalizeRole(userRole);
  const allowed = allowedRoles.map(normalizeRole);

  if (allowed.includes(role)) return true;

  // Be permissive for student/user variants while keeping admin/recruiter strict.
  if (allowed.includes('user')) {
    const privilegedRoles = new Set(['admin', 'recruiter', 'platform_admin']);
    return !privilegedRoles.has(role);
  }

  return false;
}

// Wraps a route: requires login + optional role check
export function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const normalizedUserRole = normalizeRole(user?.role);
  const normalizedAllowedRoles = allowedRoles?.map(normalizeRole);

  if (normalizedAllowedRoles && !hasRequiredRole(normalizedUserRole, normalizedAllowedRoles)) {
    console.warn('ProtectedRoute denied access', {
      userRole: user?.role,
      normalizedUserRole,
      allowedRoles: normalizedAllowedRoles,
      path: location.pathname,
    });
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
