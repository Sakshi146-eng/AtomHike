import { useEffect, useState } from "react";
import { Bell, CircleDot } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getActiveCycle } from "../../api/cycles";

const PAGE_TITLES = {
  "/employee/dashboard": "Dashboard",
  "/employee/goals":     "My Goals",
  "/employee/checkin":   "Check-ins",
  "/manager/dashboard":     "Dashboard",
  "/manager/team-goals":    "Team Goals",
  "/manager/approvals":     "Goal Approvals",
  "/manager/checkin-review":"Check-in Review",
  "/admin/dashboard":    "Dashboard",
  "/admin/users":        "User Management",
  "/admin/cycles":       "Cycles & Windows",
  "/admin/thrust-areas": "Thrust Areas",
  "/admin/reports":      "Reports",
  "/admin/audit":        "Audit Trail",
};

export default function Topbar() {
  const { user } = useAuth();
  const [cycle, setCycle] = useState(null);
  const path = window.location.pathname;
  const title = PAGE_TITLES[path] || "AtomQuest PMS";

  useEffect(() => {
    getActiveCycle().then(r => setCycle(r.data)).catch(() => {});
  }, []);

  return (
    <header className="fixed top-0 left-60 right-0 z-20 h-14 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center px-6 gap-4">
      {/* Page Title */}
      <h1 className="text-slate-800 font-semibold text-sm flex-1">{title}</h1>

      {/* Cycle Status */}
      {cycle && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
          <CircleDot className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">{cycle.name}</span>
        </div>
      )}

      {/* Bell */}
      <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
        <Bell className="w-4 h-4" />
      </button>

      {/* Avatar */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-medium text-slate-700 leading-none">{user?.name}</p>
          <p className="text-xs text-slate-400 leading-none mt-0.5">{user?.role}</p>
        </div>
      </div>
    </header>
  );
}
