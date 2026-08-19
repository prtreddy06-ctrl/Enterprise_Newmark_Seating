import React, { useState } from "react";
import { SeatRequest, UserAccount, UserRole, LocationSite } from "../types";
import { 
  Bell,
  Smartphone,
  LogOut,
  UserCheck,
  X,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Sparkles,
  ShieldAlert,
  Lock,
  Globe,
  MapPin,
  Plus,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import AppDownloadModal from "./AppDownloadModal";

interface HeaderProps {
  currentUser: UserAccount | null;
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  onLogout: () => void;
  pendingRequestsCount: number;
  requests?: SeatRequest[];
  onSelectTab?: (tab: string) => void;
  activeTab: string;
  sites?: LocationSite[];
  activeSiteId?: string;
  onSelectSite?: (siteId: string) => void;
  onOpenCreateSiteModal?: () => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
  onOpenProfileModal?: () => void;
  onOpenEncryptionModal?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ 
  currentUser,
  activeRole, 
  onChangeRole, 
  onLogout,
  pendingRequestsCount, 
  requests = [],
  onSelectTab,
  activeTab,
  sites = [],
  activeSiteId = "site-hyd",
  onSelectSite,
  onOpenCreateSiteModal,
  onAddAuditLog,
  onOpenProfileModal,
  onOpenEncryptionModal,
  isSidebarOpen = true,
  onToggleSidebar
}: HeaderProps) {
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState(false);

  // Get active tab title
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "dashboard": return "Global Dashboard";
      case "designer": return "Floor Designer";
      case "reader": return "AI Floor Reader";
      case "excel": return "Excel Bulk Ingest";
      case "workflows": return "Seat Allocation";
      case "qr": return "QR Labels Matrix";
      case "mobile": return "Mobile Companion";
      case "assets": return "IT Asset Matrix";
      case "directory": return "Employee Directory";
      case "users": return "User Management";
      case "audit": return "Audit Logs";
      case "powerbi": return "Power BI Analytics";
      case "developer": return "DevOps Blueprints";
      case "manuals": return "Operational Handbooks";
      default: return "Enterprise Seating";
    }
  };

  const userName = currentUser ? currentUser.name : "Raviteja Reddy palagiri";
  const userEmail = currentUser ? currentUser.email : "prtreddy06@gmail.com";
  const userInitials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  // Role categorization for Notification scope
  const roleStr = String(activeRole);
  const userRoleStr = String(currentUser?.role || "");
  const isSuperUserOrAdmin = roleStr === UserRole.SUPER_USER || roleStr === UserRole.ADMIN || roleStr === UserRole.IT_ADMIN || userRoleStr === UserRole.SUPER_USER || userRoleStr === UserRole.ADMIN || userRoleStr === UserRole.IT_ADMIN;
  const isMember = roleStr === UserRole.MEMBER;
  const isEmployee = !isSuperUserOrAdmin && !isMember;

  // Filter requests relevant to the current user role
  let roleRequests: SeatRequest[] = [];
  if (isSuperUserOrAdmin) {
    roleRequests = requests.filter(r => r.status === "Pending" || r.status === "Escalated");
  } else if (isMember) {
    const dept = currentUser?.department || "Unassigned";
    roleRequests = requests.filter(r => 
      (r.status === "Pending" || r.status === "Escalated") && 
      r.department.toLowerCase() === dept.toLowerCase()
    );
  } else {
    // For regular Employees: show all requests created by them (Pending, Approved, Rejected, Escalated)
    roleRequests = requests.filter(r => 
      (userEmail && r.employeeEmail.toLowerCase() === userEmail.toLowerCase()) ||
      (userName && r.employeeName.toLowerCase() === userName.toLowerCase())
    );
  }

  // Active filter inside notification drawer ("all", "requests", "system")
  const [notifFilter, setNotifFilter] = useState<"all" | "requests" | "system">("all");

  const unreadCount = isEmployee 
    ? roleRequests.filter(r => r.status === "Pending" || r.status === "Approved").length
    : roleRequests.length;

  const handleToggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      setDismissedNotifs(false);
      onAddAuditLog("Open Notifications", "User Interface", "Opened Notification Bell Drawer in Header.");
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-xs relative" id="app-global-header">
      {/* LEFT TITLE SECTION */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0"
            title={isSidebarOpen ? "Hide Navigation Sidebar" : "Unhide Navigation Sidebar"}
            id="btn-toggle-sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        )}
        <h1 className="text-lg font-bold text-slate-800 tracking-tight font-display">
          {getTabTitle(activeTab)}
        </h1>
        <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
        {/* LOCATION SITE ENVIRONMENT SELECTOR */}
        {sites && sites.length > 0 && (
          <>
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/80 rounded-xl px-2.5 py-1 text-xs">
              <Globe size={13} className="text-blue-600 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Site:</span>
              <select
                value={activeSiteId}
                onChange={(e) => onSelectSite && onSelectSite(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                title="Switch active location site environment"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              {onOpenCreateSiteModal && (
                <button
                  onClick={onOpenCreateSiteModal}
                  className="ml-1 p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                  title="Create new location site environment"
                >
                  <Plus size={13} />
                </button>
              )}
            </div>
          </>
        )}

        <div className="h-4 w-px bg-slate-300 hidden md:block"></div>
        <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold tracking-tight font-mono" title="Connected to Google Firebase Firestore database. Real-time sync active across Dev and Published apps.">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Firestore Synced
        </span>
      </div>

      {/* DYNAMIC ROLE SWITCHER & PROFILE */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile App Downloads Trigger */}
        <button 
          onClick={() => setShowDownloadsModal(true)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Smartphone size={14} className="text-blue-600" />
          <span className="hidden sm:inline">Mobile Downloads</span>
        </button>

        {/* Role Switcher & Fixed Role Banner Status */}
        <div className="flex items-center gap-1.5" id="header-role-panel">
          {currentUser?.role === UserRole.SUPER_USER ? (
            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-xl px-2.5 py-1">
              <Sparkles size={13} className="text-purple-600 shrink-0" />
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide hidden sm:inline">Role Sim:</span>
              <select 
                value={activeRole} 
                onChange={(e) => onChangeRole(e.target.value as UserRole)}
                className="bg-transparent border-none text-xs font-bold text-purple-950 focus:outline-none cursor-pointer pr-1 font-sans"
                title="Super User Mode: Switch active role simulation"
              >
                <option value={UserRole.SUPER_USER}>{UserRole.SUPER_USER} (Full Access)</option>
                <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                <option value={UserRole.MEMBER}>{UserRole.MEMBER}</option>
                <option value={UserRole.IT_ADMIN}>{UserRole.IT_ADMIN}</option>
                <option value={UserRole.USER}>{UserRole.USER}</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1 text-xs font-bold text-amber-900 font-mono" title={`Assigned Role: ${currentUser?.role || activeRole}. Locked by System Admin.`}>
              <Lock size={12} className="text-amber-600 shrink-0" />
              <span>Role: {currentUser?.role || activeRole}</span>
              <span className="text-[10px] text-amber-600 font-sans font-normal hidden md:inline">(Fixed)</span>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 sm:gap-3" id="header-action-icons">
          {/* AES-256 ENCRYPTION STATUS BUTTON */}
          <button
            onClick={onOpenEncryptionModal}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            id="header-encryption-status-btn"
            title="Enterprise Data Encryption: AES-256 Storage & TLS 1.3 Active. Click to view status."
          >
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span className="hidden md:inline text-[11px] font-bold tracking-tight">AES-256</span>
          </button>

          {/* NOTIFICATION BELL BUTTON */}
          <div className="relative" id="header-notifications-wrapper">
            <button
              onClick={handleToggleNotifications}
              className={`relative cursor-pointer p-2 rounded-xl transition-all ${
                showNotifications 
                  ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500/30" 
                  : "hover:bg-slate-100 text-slate-600"
              }`}
              id="header-notifications"
              title="Notifications & Approval Queue"
            >
              <Bell size={18} />
              {unreadCount > 0 && !dismissedNotifs && (
                <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white font-mono shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN POPOVER */}
            {showNotifications && (
              <div 
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-2 duration-200"
                id="notification-dropdown-popover"
              >
                {/* Popover Header */}
                <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-xs">Notifications & Workspace Queue</h3>
                        <p className="text-[10px] text-slate-400">Campus Queue • Newmark _Hyderabad</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && !dismissedNotifs && (
                        <button
                          onClick={() => setDismissedNotifs(true)}
                          className="text-[10px] text-slate-400 hover:text-white underline font-mono cursor-pointer"
                        >
                          Clear Badge
                        </button>
                      )}
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                    <button
                      onClick={() => setNotifFilter("all")}
                      className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer ${
                        notifFilter === "all" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      All ({roleRequests.length + 1})
                    </button>
                    <button
                      onClick={() => setNotifFilter("requests")}
                      className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer ${
                        notifFilter === "requests" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {isEmployee ? "My Seat Petitions" : "Approval Queue"} ({roleRequests.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter("system")}
                      className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer ${
                        notifFilter === "system" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      System Alerts (1)
                    </button>
                  </div>
                </div>

                {/* Notification Items Stream */}
                <div className="p-3 space-y-2.5 max-h-80 overflow-y-auto">
                  {/* System Welcome Notification */}
                  {(notifFilter === "all" || notifFilter === "system") && (
                    <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Auto Email Dispatch Active
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">System</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Workspace user provisioning auto-dispatches onboarding credentials and QR pass downloads.
                      </p>
                    </div>
                  )}

                  {/* Seat Approval Requests */}
                  {(notifFilter === "all" || notifFilter === "requests") && (
                    roleRequests.length > 0 ? (
                      roleRequests.map((req) => (
                        <div 
                          key={req.id} 
                          className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{req.employeeName}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                              req.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              req.status === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              req.status === 'Escalated' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                            <div>Dept: <strong className="text-blue-300">{req.department}</strong></div>
                            {req.reason && (
                              <div className="text-slate-300 italic font-sans text-[10px] mt-1 line-clamp-2">"{req.reason}"</div>
                            )}
                          </div>
                          <div className="pt-1 flex items-center justify-between border-t border-slate-800/60">
                            <span className="text-[9px] text-slate-500 font-mono">{new Date(req.requestedAt).toLocaleDateString()}</span>
                            <button
                              onClick={() => {
                                setShowNotifications(false);
                                if (onSelectTab) onSelectTab("workflows");
                              }}
                              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isEmployee ? "View Seat Status" : "Review Request"}</span>
                              <ArrowRight size={11} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      notifFilter === "requests" && (
                        <div className="p-4 text-center text-slate-500 space-y-1">
                          <Inbox size={24} className="mx-auto text-slate-600" />
                          <p className="text-xs font-medium">No active seat notifications in queue</p>
                        </div>
                      )
                    )
                  )}
                </div>

                {/* Popover Footer */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">Role Scope: {activeRole}</span>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      if (onSelectTab) onSelectTab("workflows");
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Seat Allocation</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={onOpenProfileModal}
            className="flex items-center gap-2.5 pl-3 border-l border-slate-200 hover:bg-slate-100/80 p-1.5 rounded-xl transition-all cursor-pointer text-left group" 
            id="header-profile-user"
            title="Click to view User Profile & Update Photo or Password"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover border-2 border-blue-500 shadow-2xs group-hover:scale-105 transition-transform shrink-0"
                id="profile-avatar"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs group-hover:bg-blue-700 transition-colors shrink-0" id="profile-avatar">
                {userInitials}
              </div>
            )}
            <div className="hidden lg:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[140px] group-hover:text-blue-600 transition-colors">{userName}</span>
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px] block">{userEmail}</span>
            </div>
          </button>

          {/* Explicit Logout Button */}
          <button
            onClick={onLogout}
            title="Log Out of Enterprise Portal"
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            id="header-logout-btn"
          >
            <LogOut size={14} className="text-rose-600 shrink-0" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* DOWNLOADS MODAL */}
      <AppDownloadModal
        isOpen={showDownloadsModal}
        onClose={() => setShowDownloadsModal(false)}
        userEmail={userEmail}
        onAddAuditLog={onAddAuditLog}
      />
    </header>
  );
}

