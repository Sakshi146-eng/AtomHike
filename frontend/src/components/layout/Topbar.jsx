import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, CircleDot, User, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getActiveCycle } from "../../api/cycles";
import { getMyGoals, getTeamGoals } from "../../api/goals";

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
  const location = useLocation();
  const navigate = useNavigate();
  const [cycle,      setCycle]      = useState(null);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [notifications, setNotifications] = useState([]);
  const bellRef = useRef(null);
  const path  = location.pathname;
  const title = PAGE_TITLES[path] || "AtomQuest PMS";

  // Load active cycle
  useEffect(() => {
    getActiveCycle().then(r => setCycle(r.data)).catch(() => {});
  }, []);

  // Load role-specific notifications
  useEffect(() => {
    if (!user?.role) return;
    if (user.role === "EMPLOYEE") {
      getMyGoals()
        .then(r => {
          const rejected = r.data.filter(g => g.status === "REJECTED");
          setNotifications(rejected.map(g => ({
            id: g.id,
            icon: "warn",
            title: "Goal returned for revision",
            body: g.title,
            href: "/employee/goals",
          })));
        })
        .catch(() => {});
    } else if (user.role === "MANAGER") {
      getTeamGoals()
        .then(r => {
          const pending = r.data.filter(g => g.status === "PENDING_APPROVAL");
          setNotifications(pending.map(g => ({
            id: g.id,
            icon: "info",
            title: "Goal awaiting your approval",
            body: `${g.owner?.name} — ${g.title}`,
            href: "/manager/approvals",
          })));
        })
        .catch(() => {});
    }
  }, [user?.role]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.length;

  return (
    <header className="fixed top-0 left-64 right-0 z-20 h-16 bg-white border-b border-surface-border flex items-center px-8 gap-4">
      {/* Breadcrumb / Title */}
      <h1 className="font-sans font-semibold text-[14px] text-ink-primary flex-1">{title}</h1>

      {/* Cycle Status */}
      {cycle && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-success-light border border-[#bbf7d0]">
          <CircleDot className="w-3.5 h-3.5 text-status-success" />
          <span className="font-sans text-[12px] font-medium text-green-800">{cycle.name}</span>
        </div>
      )}

      {/* Bell Notification */}
      <div className="relative ml-2" ref={bellRef}>
        <button
          onClick={() => setNotifOpen(o => !o)}
          className="relative p-2 text-ink-secondary hover:text-primary hover:bg-surface-bg rounded-md transition-colors"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white font-sans text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {notifOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white border border-surface-border rounded-2xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <p className="font-sans text-[13px] font-semibold text-primary">
                Notifications {unreadCount > 0 && <span className="ml-1 text-red-500">({unreadCount})</span>}
              </p>
              <button onClick={() => setNotifOpen(false)} className="text-ink-secondary hover:text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                  <p className="font-sans text-[13px] text-ink-secondary">All caught up!</p>
                  <p className="font-sans text-[11px] text-ink-secondary/70 mt-0.5">No new notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { navigate(n.href); setNotifOpen(false); }}
                    className="w-full text-left px-4 py-3 border-b border-surface-border last:border-b-0 hover:bg-surface-bg transition-colors flex items-start gap-3"
                  >
                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      n.icon === "warn" ? "bg-red-50" : "bg-blue-50"
                    }`}>
                      {n.icon === "warn"
                        ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        : <Bell className="w-3.5 h-3.5 text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[12px] font-semibold text-primary leading-snug">{n.title}</p>
                      <p className="font-sans text-[11px] text-ink-secondary truncate mt-0.5">{n.body}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-[1px] h-6 bg-surface-border mx-2"></div>

      {/* Avatar & Role */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="font-sans text-[13px] font-semibold text-ink-primary leading-tight">{user?.name}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-primary-tint text-primary font-sans text-[10px] font-bold uppercase tracking-wide">
            {user?.role || "Employee"}
          </span>
        </div>
        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
