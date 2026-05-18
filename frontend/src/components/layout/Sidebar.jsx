import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Target, CheckSquare, Users, Settings,
  FileBarChart, Calendar, Tag, ClipboardList, LogOut, ChevronRight, User
} from "lucide-react";

const EMPLOYEE_NAV = [
  { to: "/employee/dashboard", icon: LayoutDashboard, label: "My Dashboard" },
  { to: "/employee/goals", icon: Target, label: "My Goals" },
  { to: "/employee/checkin", icon: CheckSquare, label: "Check-ins" },
];

const MANAGER_NAV = [
  { to: "/manager/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/manager/team-goals", icon: Target, label: "Team Goals" },
  { to: "/manager/approvals", icon: ClipboardList, label: "Approvals" },
  { to: "/manager/checkin-review", icon: CheckSquare, label: "Check-in Review" },
];

const ADMIN_NAV = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/cycles", icon: Calendar, label: "Cycles" },
  { to: "/admin/thrust-areas", icon: Tag, label: "Thrust Areas" },
  { to: "/admin/reports", icon: FileBarChart, label: "Reports" },
  { to: "/admin/audit", icon: Settings, label: "Audit Trail" },
];

const ROLE_CONFIG = {
  EMPLOYEE: { nav: EMPLOYEE_NAV, color: "text-accent", bg: "bg-accent/10", label: "Employee" },
  MANAGER: { nav: MANAGER_NAV, color: "text-violet-400", bg: "bg-violet-900/30", label: "Manager" },
  ADMIN: { nav: ADMIN_NAV, color: "text-amber-400", bg: "bg-amber-900/30", label: "Admin / HR" },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || "EMPLOYEE";
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.EMPLOYEE;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-primary text-white border-r border-white/5"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
        <span className="font-display font-bold text-2xl tracking-tight text-white">AtomHike</span>
      </div>

      {/* Role badge */}
      <div className={`mx-4 mt-4 px-3 py-2 rounded-lg ${config.bg} flex items-center gap-2`}>
        <div className={`w-2 h-2 rounded-full ${config.color.replace("text-", "bg-")}`} />
        <span className={`text-xs font-sans font-medium ${config.color}`}>{config.label}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {config.nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-3 text-[14px] font-sans font-medium transition-all duration-150 group
            ${isActive
              ? "bg-primary-tint text-primary border-l-4 border-accent rounded-r-md"
              : "text-white/60 hover:bg-white/5 hover:text-white rounded-md border-l-4 border-transparent"}`
          }>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-mid flex items-center justify-center shrink-0 border border-white/10">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-sans font-medium truncate">{user?.name}</p>
            <p className="text-white/50 text-[11px] font-sans truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-white/40 hover:text-status-danger transition-colors p-1.5">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
