import React from "react";
import { 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Shield, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Key,
  Layers,
  ArrowRight
} from "lucide-react";
import { UserAccount, UserRole } from "../types";

interface InsRoleBannerProps {
  currentUser: UserAccount;
  activeRole: UserRole;
  onNavigateToUsers?: () => void;
}

export default function InsRoleBanner({ 
  currentUser, 
  activeRole,
  onNavigateToUsers 
}: InsRoleBannerProps) {
  const isPermanentSuperUser = currentUser.role === UserRole.SUPER_USER;
  const isTestingRole = isPermanentSuperUser && activeRole !== UserRole.SUPER_USER;

  // Capabilities tags based on active role
  const getRoleCapabilities = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_USER:
        return [
          "Full System Administration",
          "User Role & Access Management",
          "Role Simulation Engine",
          "User Account Management",
          "Floor Designer & AI Reader",
          "IT Asset Matrix & Ingest",
          "Power BI & DevOps Blueprints",
          "Audit Log Matrix"
        ];
      case UserRole.ADMIN:
        return [
          "Administrative Floor Designer",
          "AI Floor Reader Ingest",
          "Seat Allocation Approvals",
          "Member & Staff Account Provisioning",
          "IT Asset Registry Management",
          "QR Label Matrix",
          "Power BI Analytics"
        ];
      case UserRole.IT_ADMIN:
        return [
          "Interactive Floor Map Viewer & Designer",
          "AI Floor Reader Ingest",
          "IT Hardware Asset Management",
          "Excel IT Asset Ingest",
          "QR Code Matrix & Desk Labeling",
          "Employee Asset Assignment",
          "Mobile Companion Sync"
        ];
      case UserRole.MEMBER:
      case UserRole.USER:
      default:
        return [
          "Member Desk Request Submission",
          "Live Floor Plan Viewer",
          "Employee Directory Lookup",
          "Mobile Companion Check-In",
          "Operational Handbooks"
        ];
    }
  };

  const capabilities = getRoleCapabilities(activeRole);

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 shadow-lg relative overflow-hidden" id="ins-role-banner">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        {/* Left: Banner Info */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center gap-1">
              <ShieldCheck size={12} className="text-blue-400" />
              <span>INS ROLE BANNER</span>
            </span>

            {isPermanentSuperUser ? (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[10px] font-bold font-mono flex items-center gap-1">
                <Sparkles size={11} className="text-purple-300" />
                <span>SUPER USER ACCESS ASSIGNED</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold font-mono flex items-center gap-1">
                <Lock size={11} className="text-amber-400" />
                <span>ROLE FIXED & LOCKED BY SYSTEM ADMIN</span>
              </span>
            )}

            {isTestingRole && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold font-mono animate-pulse">
                Super User Testing Active: Simulated View ({activeRole})
              </span>
            )}
          </div>

          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Institutional Access Role:</span>
              <span className="text-blue-300 underline underline-offset-4 decoration-blue-500/50">
                {activeRole}
              </span>
              {!isPermanentSuperUser && (
                <span className="text-xs font-normal text-amber-300/90 font-mono">
                  (Assigned Account Role)
                </span>
              )}
            </h2>

            <p className="text-xs text-slate-300 mt-0.5 max-w-3xl leading-relaxed">
              {isPermanentSuperUser ? (
                <>
                  You hold <strong>Super User</strong> privileges. You can manage all system features, assign user roles in <em>User Account Ops</em>, and switch active role views to test restricted member capabilities.
                </>
              ) : (
                <>
                  Your account is permanently locked to <strong>{currentUser.role}</strong> permissions assigned by the System Administrator. Self-service role modifications are restricted; your role will remain fixed until changed by an Admin or Super User in User Management.
                </>
              )}
            </p>
          </div>

          {/* Unlocked Capabilities Pills */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mr-1">
              Unlocked Functionalities:
            </span>
            {capabilities.map((cap, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-200 text-[10px] font-medium flex items-center gap-1 font-sans"
              >
                <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                <span>{cap}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right Action / Status Card */}
        <div className="shrink-0 bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between gap-2 max-w-xs">
          <div className="text-[11px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Account User:</span>
              <span className="font-bold text-white truncate max-w-[140px]">{currentUser.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Account Email:</span>
              <span className="font-mono text-slate-300 text-[10px] truncate max-w-[140px]">{currentUser.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Role Status:</span>
              <span className={`font-mono text-[10px] font-bold ${isPermanentSuperUser ? "text-purple-300" : "text-amber-400"}`}>
                {isPermanentSuperUser ? "Unrestricted Administrator" : "Fixed & Locked"}
              </span>
            </div>
          </div>

          {isPermanentSuperUser && onNavigateToUsers && (
            <button
              onClick={onNavigateToUsers}
              className="mt-1 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserCheck size={13} />
              <span>User Account Ops</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
