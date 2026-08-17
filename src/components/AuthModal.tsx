import React, { useState } from "react";
import { 
  Shield, 
  Lock, 
  Mail, 
  Key, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  LogOut, 
  RefreshCw,
  Clock,
  ShieldAlert,
  Eye,
  EyeOff
} from "lucide-react";
import { UserRole } from "../types";
import { dispatchEmailNotification } from "../utils/emailAndDownloadService";

interface AuthModalProps {
  currentUser: {
    name: string;
    email: string;
    role: UserRole;
  } | null;
  onLoginSuccess: (email: string, role: UserRole) => void;
  onLogout: () => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
}

export default function AuthModal({
  currentUser,
  onLoginSuccess,
  onLogout,
  onAddAuditLog
}: AuthModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"LOGIN" | "FORGOT" | "RESET_MANDATORY" | "TOKEN_INSPECTOR">("LOGIN");

  // Form states
  const [email, setEmail] = useState("prtreddy06@gmail.com");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.SUPER_USER);

  // Mandatory Reset Form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Lock Simulator state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Token Simulator
  const [mockToken, setMockToken] = useState({
    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItMSIsImVtYWlsIjoicHJ0cmVkZHkwNkBnbWFpbC5jb20iLCJyb2xlIjoiU3VwZXIgVXNlciIsImlhdCI6MTc4NDU0MDIwMCwiZXhwIjoxNzg0NTQ3NDAwfQ.signature",
    refreshToken: "ref_tok_88492019201192840129",
    expiresIn: "3600 seconds (1 hour)",
    issuer: "https://auth.enterprise-seating.corp/oauth/token"
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      alert("Account Locked: Exceeded 3 failed login attempts. Contact Super User or Admin to unlock.");
      return;
    }

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    // Trigger wrong password scenario simulation if password is 'wrong'
    if (password === "wrong") {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      onAddAuditLog("Failed Login", "Login/Logout", `Failed login attempt (${nextFail}/3) for '${email}'.`);
      if (nextFail >= 3) {
        setIsLocked(true);
        alert("Account Locked: 3 consecutive invalid password attempts detected. Account locked for security.");
      } else {
        alert(`Invalid Credentials (${nextFail}/3 attempts). Try entering valid password.`);
      }
      return;
    }

    // Mandatory reset simulation if password is 'temp'
    if (password === "temp") {
      setAuthMode("RESET_MANDATORY");
      return;
    }

    // Successful login
    setFailedAttempts(0);
    onLoginSuccess(email, selectedRole);
    onAddAuditLog("User Login", "Login/Logout", `Successful authentication as '${selectedRole}' (${email}).`);
    setIsOpen(false);
  };

  const handleMandatoryResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters long and contain numbers and symbols.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    onAddAuditLog("Password Reset", "Login/Logout", `Mandatory password change completed for '${email}'.`);
    alert("Password Updated Successfully! Signing you in...");
    onLoginSuccess(email, selectedRole);
    setAuthMode("LOGIN");
    setIsOpen(false);
  };

  return (
    <div id="auth-system-wrapper">
      {/* Floating Header Access Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setAuthMode("TOKEN_INSPECTOR"); setIsOpen(true); }}
          className="text-xs font-mono bg-slate-800 text-slate-200 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors font-sans"
          title="Inspect Active JWT Session & Security Tokens"
        >
          <Lock size={13} className="text-emerald-400" />
          <span>JWT Security</span>
        </button>

        <button
          onClick={() => { setAuthMode("LOGIN"); setIsOpen(true); }}
          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors font-sans"
        >
          <Shield size={14} />
          <span>Auth Portal</span>
        </button>
      </div>

      {/* Auth Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 font-display">
                    {authMode === "LOGIN" && "Enterprise SSO Login"}
                    {authMode === "FORGOT" && "Reset Forgotten Password"}
                    {authMode === "RESET_MANDATORY" && "Mandatory Password Change"}
                    {authMode === "TOKEN_INSPECTOR" && "JWT Token & Session Inspector"}
                  </h4>
                  <p className="text-[11px] text-slate-500">256-bit Encrypted SSL Gateway</p>
                </div>
              </div>

              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {/* Account Lock Warning Banner */}
            {isLocked && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-900 text-xs">
                <ShieldAlert className="text-rose-600 shrink-0" size={18} />
                <div>
                  <strong className="font-bold">Account Locked:</strong> 3 failed attempts recorded. Account restricted. Click unlock in User Management or contact Administrator.
                </div>
              </div>
            )}

            {/* LOGIN FORM */}
            {authMode === "LOGIN" && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Corporate Email</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Role Persona</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full border border-slate-200 bg-slate-50 p-2 rounded-xl text-xs font-bold text-slate-800 mt-1"
                  >
                    <option value={UserRole.SUPER_USER}>Super User (Raviteja Reddy palagiri)</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.MEMBER}>Member / Dept Head</option>
                    <option value={UserRole.IT_ADMIN}>IT Administrator</option>
                    <option value={UserRole.USER}>Standard User</option>
                  </select>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode("FORGOT")}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                  <span className="text-[10px] text-slate-400">Password tips: type 'wrong' or 'temp'</span>
                </div>

                <button
                  type="submit"
                  disabled={isLocked}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                >
                  <UserCheck size={16} />
                  <span>Authenticate & Authorize</span>
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {authMode === "FORGOT" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Enter your corporate email address. We will send an encrypted password reset token to your inbox.
                </p>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Corporate Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs mt-1"
                  />
                </div>
                <div className="flex justify-between gap-2">
                  <button
                    onClick={() => setAuthMode("LOGIN")}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
                  >
                    Back to Login
                  </button>
                  <button
                    onClick={() => {
                      dispatchEmailNotification({
                        toEmail: email,
                        subject: "EnterprizSeat SSO Password Reset Token",
                        bodyText: `A password reset request was initiated for your corporate SSO account (${email}). Click the link below or copy the 256-bit reset token to complete password reset:\n\n${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset?token=tok_256bit_${Math.random().toString(36).substring(2)}`,
                        category: "Auth Gateway Security"
                      });
                      onAddAuditLog("Password Reset Request", "Login/Logout", `Dispatched password reset email token to ${email}`);
                      setAuthMode("LOGIN");
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Send Reset Link
                  </button>
                </div>
              </div>
            )}

            {/* MANDATORY RESET FORM */}
            {authMode === "RESET_MANDATORY" && (
              <form onSubmit={handleMandatoryResetSubmit} className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>First-Time Login Security Requirement:</strong> Your account was issued with a temporary password. You must set a new secure password before proceeding.
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">New Secure Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters..."
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat password..."
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs mt-1"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs"
                >
                  Update Password & Sign In
                </button>
              </form>
            )}

            {/* JWT TOKEN INSPECTOR */}
            {authMode === "TOKEN_INSPECTOR" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl space-y-2 overflow-x-auto">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-sans">Active JWT Bearer Header</div>
                  <div className="text-[10px] text-slate-300 break-all">{mockToken.accessToken}</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-700">
                  <div className="text-[10px] font-bold text-slate-400 uppercase font-sans">Session Parameters</div>
                  <div>Role Claims: <strong>{currentUser?.role || selectedRole}</strong></div>
                  <div>Inactivity Timeout: <strong>15 minutes (Active)</strong></div>
                  <div>Token Expiry: <strong>{mockToken.expiresIn}</strong></div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 bg-slate-800 text-white rounded-xl font-sans font-bold text-xs"
                >
                  Close Inspector
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
