import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../loaders/Skeletons";

// Shows spinner while auth is loading; redirects to /login if unauthenticated
export function RequireAuth({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their correct dashboard
    const fallbacks = { EMPLOYEE: "/employee/dashboard", MANAGER: "/manager/dashboard", ADMIN: "/admin/dashboard" };
    return <Navigate to={fallbacks[user.role] || "/login"} replace />;
  }

  return <Outlet />;
}

// Redirect logged-in users away from /login
export function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const redirects = { EMPLOYEE: "/employee/dashboard", MANAGER: "/manager/dashboard", ADMIN: "/admin/dashboard" };
    return <Navigate to={redirects[user.role] || "/employee/dashboard"} replace />;
  }
  return <Outlet />;
}
