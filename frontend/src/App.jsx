import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth, PublicRoute } from "./components/guards/RouteGuards";
import AppLayout from "./components/layout/AppLayout";

// Auth
import LoginPage from "./pages/auth/LoginPage";

// Employee
import EmployeeDashboard  from "./pages/employee/EmployeeDashboard";
import GoalsPage          from "./pages/employee/GoalsPage";
import CheckInPage        from "./pages/employee/CheckInPage";

// Manager
import ManagerDashboard   from "./pages/manager/ManagerDashboard";
import TeamGoalsPage      from "./pages/manager/TeamGoalsPage";
import GoalApprovalPage   from "./pages/manager/GoalApprovalPage";
import CheckInReviewPage  from "./pages/manager/CheckInReviewPage";

// Admin
import AdminDashboard     from "./pages/admin/AdminDashboard";
import UsersPage          from "./pages/admin/UsersPage";
import CyclesPage         from "./pages/admin/CyclesPage";
import ThrustAreasPage    from "./pages/admin/ThrustAreasPage";
import ReportsPage        from "./pages/admin/ReportsPage";
import AuditTrailPage     from "./pages/admin/AuditTrailPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontSize: "13px",
              fontFamily: "Inter, sans-serif",
              borderRadius: "10px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />

        <Routes>
          {/* ── Root redirect ── */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Public: Login ── */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ── Employee routes ── */}
          <Route element={<RequireAuth allowedRoles={["EMPLOYEE"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
              <Route path="/employee/goals"     element={<GoalsPage />} />
              <Route path="/employee/checkin"   element={<CheckInPage />} />
            </Route>
          </Route>

          {/* ── Manager routes ── */}
          <Route element={<RequireAuth allowedRoles={["MANAGER"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/manager/dashboard"      element={<ManagerDashboard />} />
              <Route path="/manager/team-goals"     element={<TeamGoalsPage />} />
              <Route path="/manager/approvals"      element={<GoalApprovalPage />} />
              <Route path="/manager/checkin-review" element={<CheckInReviewPage />} />
            </Route>
          </Route>

          {/* ── Admin routes ── */}
          <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/dashboard"    element={<AdminDashboard />} />
              <Route path="/admin/users"        element={<UsersPage />} />
              <Route path="/admin/cycles"       element={<CyclesPage />} />
              <Route path="/admin/thrust-areas" element={<ThrustAreasPage />} />
              <Route path="/admin/reports"      element={<ReportsPage />} />
              <Route path="/admin/audit"        element={<AuditTrailPage />} />
            </Route>
          </Route>

          {/* ── 404 fallback ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
