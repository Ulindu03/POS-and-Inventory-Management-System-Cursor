// This component protects a route:
// - Waits until we finish checking auth on first load
// - If not logged in, send the user to /login
// - If a role list is provided, only allow those roles
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated); // logged-in state
  const isChecking = useAuthStore((s) => s.isChecking);           // true while app runs checkAuth()
  const role = useAuthStore((s) => s.user?.role);                 // current user role

  // Wait for auth initialization on first load/refresh
  if (isChecking) {
    // Avoid flashing the login or the protected page while we check.
    return null; // could render a spinner here
  }

  if (!isAuthenticated) {
    // Not logged in: redirect to login page.
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && role && !requiredRoles.includes(role)) {
    // Logged in but lacks permission: send to dashboard.
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};