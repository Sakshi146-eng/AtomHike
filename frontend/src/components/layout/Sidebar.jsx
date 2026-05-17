import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Target, CheckSquare, Users, Settings,
  FileBarChart, Calendar, Tag, ClipboardList, LogOut, ChevronRight, Zap
} from "lucide-react";

const EMPLOYEE_NAV = [
  { to: "/employee/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/employee/goals",     icon: Target,           label: "My Goals"  },
  { to: "/employee/checkin",   icon: CheckSquare,      label: "Check-ins" },
];

const MANAGER_NAV = [
  { to: "/manager/dashboard",    icon: LayoutDashboard, label: "Dashboard"  },
  { to: "/manager/team-goals",   icon: Target,          label: "Team Goals" },
  { to: "/manager/approvals",    icon: ClipboardList,   label: "Approvals"  },
  { to: "/manager/checkin-review", icon: CheckSquare,   label: "Check-in Review" },
];

const ADMIN_NAV = [
  { to: "/admin/dashboard",     icon: LayoutDashboard, label: "Dashboard"    },
  { to: "/admin/users",         icon: Users,           label: "Users"        },
  { to: "/admin/cycles",        icon: Calendar,        label: "Cycles"       },
  { to: "/admin/thrust-areas",  icon: Tag,             label: "Thrust Areas" },
  { to: "/admin/reports",       icon: FileBarChart,    label: "Reports"      },
  { to: "/admin/audit",         icon: Settings,        label: "Audit Trail"  },
];

const ROLE_CONFIG = {
  EMPLOYEE: { nav: EMPLOYEE_NAV, color: "text-sky-400",     bg: "bg-sky-900/30",   label: "Employee"   },
  MANAGER:  { nav: MANAGER_NAV,  color: "text-violet-400",  bg: "bg-violet-900/30",label: "Manager"    },
  ADMIN:    { nav: ADMIN_NAV,    color: "text-amber-400",   bg: "bg-amber-900/30", label: "Admin / HR" },
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
      className="fixed inset-y-0 left-0 z-30 w-60 flex flex-col bg-slate-900 border-r border-slate-800"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">AtomQuest</p>
          <p className="text-slate-500 text-xs mt-0.5">PMS Portal</p>
        </div>
      </div>

      {/* Role badge */}
      <div className={`mx-3 mt-3 px-3 py-2 rounded-lg ${config.bg} flex items-center gap-2`}>
        <div className={`w-2 h-2 rounded-full ${config.color.replace("text-", "bg-")}`} />
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {config.nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
            ${isActive
              ? "bg-brand-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"}`
          }>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
