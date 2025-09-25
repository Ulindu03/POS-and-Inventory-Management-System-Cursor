// This component protects a route.
// In simple English:
// - Wait until the app finishes the first-time auth check.
// - If not logged in, send the user to /login.
// - If requiredRoles provided, only allow users with those roles.
// - Legacy 'admin' is treated as 'store_owner'.
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

  const normalizeRole = (r?: string | null) => {
    if (!r) return undefined;
    const v = String(r).toLowerCase();
    if (v === 'admin' || v === 'store_owner') return 'store_owner';
    return v;
  };
  const normalizeList = (arr?: string[]) => arr?.map((r) => (String(r).toLowerCase() === 'admin' ? 'store_owner' : String(r).toLowerCase()));

  const userRole = normalizeRole(role);
  const allow = normalizeList(requiredRoles);

  if (allow && userRole && !allow.includes(userRole)) {
    // Logged in but lacks permission: send to dashboard.
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};