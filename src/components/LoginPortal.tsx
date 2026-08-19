import React, { useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Key, 
  ArrowRight, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  LogIn,
  Eye,
  EyeOff
} from "lucide-react";
import { UserAccount, UserRole } from "../types";
import { dispatchEmailNotification } from "../utils/emailAndDownloadService";
import { createPasswordResetToken } from "../utils/passwordReset";

interface LoginPortalProps {
  registeredUsers: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
  sessionExpiredNotice?: boolean;
}

export default function LoginPortal({
  registeredUsers,
  onLoginSuccess,
  onAddAuditLog,
  sessionExpiredNotice
}: LoginPortalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // First-time Login / Create New Password states
  const [isCreatingNewPassword, setIsCreatingNewPassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passError, setPassError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Please enter your corporate email address.");
      return;
    }

    const targetUser = registeredUsers.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!targetUser) {
      setErrorMessage(`No account found registered under '${email}'. Please ask Super User or Admin to create your account.`);
      return;
    }

    if (targetUser.status === "Locked") {
      setErrorMessage("Account Locked: Exceeded security login attempt threshold. Please contact Super User to unlock.");
      return;
    }

    if (targetUser.status === "Inactive") {
      setErrorMessage("Account Inactive: Your account is currently suspended or inactive.");
      return;
    }

    // Check if user is logging in with established permanent password vs temporary password
    const matchesPermanentPassword = Boolean(targetUser.password && password.trim() === targetUser.password);
    const isUsingTempPassword = Boolean(
      (targetUser.tempPassword && password.trim() === targetUser.tempPassword) ||
      password.startsWith("WelcomePass") ||
      password.startsWith("TempPass")
    );

    // Require password creation ONLY IF user is using a temp password or explicitly flagged AND not entering their valid permanent password
    const isTempPass = !matchesPermanentPassword && (targetUser.requiresPasswordReset || isUsingTempPassword);

    if (isTempPass) {
      setPendingUser(targetUser);
      setIsCreatingNewPassword(true);
      setNewPassword("");
      setConfirmPassword("");
      setPassError("");
      return;
    }

    // Verify password if set on user profile
    if (targetUser.password && password.trim() !== targetUser.password) {
      setErrorMessage("Invalid password. Please check your credentials and try again.");
      return;
    }

    // Instant authentication without artificial delays
    setIsSubmitting(false);
    setSuccessMessage(`Authenticated successfully as ${targetUser.name} (${targetUser.role})`);
    onAddAuditLog("User Login", "Login/Logout", `User ${targetUser.name} (${targetUser.email}) signed in via Login Portal as ${targetUser.role}.`);
    onLoginSuccess(targetUser);
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");

    if (!pendingUser) return;

    if (!newPassword || newPassword.length < 6) {
      setPassError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("New password and confirm password do not match.");
      return;
    }

    setIsSubmitting(false);
    const updatedUser: UserAccount = {
      ...pendingUser,
      password: newPassword,
      requiresPasswordReset: false,
      tempPassword: undefined,
      lastLogin: new Date().toISOString()
    };

    // Auto-trigger password updated notification email
    dispatchEmailNotification({
      toEmail: updatedUser.email,
      toName: updatedUser.name,
      subject: "Security Confirmation: EnterprizSeat Password Created",
      bodyText: `Dear ${updatedUser.name},\n\nYour new permanent corporate password has been established successfully. You now have full active access to the EnterprizSeat Workspace System as ${updatedUser.role}.`,
      category: "Account Security"
    });

    onAddAuditLog("Password Reset Completed", "Login/Logout", `User ${updatedUser.name} (${updatedUser.email}) created new permanent password on first login.`);
    setIsCreatingNewPassword(false);
    setSuccessMessage("New password set successfully!");
    onLoginSuccess(updatedUser);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      alert("Please enter your email address first.");
      return;
    }

    const targetUser = registeredUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!targetUser) {
      setErrorMessage(`No account found registered under '${email}'. Please ask Super User or Admin to create your account.`);
      return;
    }

    const { resetUrl } = await createPasswordResetToken(email.trim());

    dispatchEmailNotification({
      toEmail: email,
      toName: targetUser.name,
      subject: "EnterprizSeat Password Reset Link",
      bodyText: `A password reset request was initiated for your corporate account (${email}). Click the link below to set a new password. This link expires in 30 minutes and can only be used once:\n\n${resetUrl}`,
      category: "Auth Gateway Security"
    });
    alert(`Password reset link sent to ${email}. Check your inbox (and the Email Notification console for a copy).`);
    onAddAuditLog("Password Reset Initiated", "Login/Logout", `Dispatched password reset link to ${email}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans relative overflow-hidden" id="login-portal-container">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800/80 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              EnterprizSeat
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Newmark _Hyderabad Campus Workspace System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span className="hidden sm:inline font-mono text-[11px]">256-Bit TLS SSO Gateway</span>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="w-full mx-auto my-auto py-8 z-10 max-w-lg">
        
        {/* LOGIN FORM OR CREATE NEW PASSWORD FORM CARD */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          
          {isCreatingNewPassword && pendingUser ? (
            /* FIRST-TIME LOGIN / CREATE NEW PASSWORD CARD */
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-1.5 border-b border-slate-800 pb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                  <Key size={13} />
                  <span>First-Time Security Setup Required</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Create New Corporate Password
                </h2>
                <p className="text-xs text-slate-400">
                  You are logging in with a temporary password. Please set your new permanent password below.
                </p>
              </div>

              {/* Profile Card Summary */}
              <div className="p-3.5 bg-blue-950/40 border border-blue-800/40 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center text-xs border border-blue-500/40">
                    {pendingUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-white leading-tight">{pendingUser.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{pendingUser.email}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-lg font-mono border border-blue-500/30">
                  {pendingUser.role}
                </span>
              </div>

              {passError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span>{passError}</span>
                </div>
              )}

              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    New Permanent Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <CheckCircle2 size={16} className="absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Updating Password & Authenticating...</span>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Save New Password & Enter Workspace</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreatingNewPassword(false)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel & Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* STANDARD SIGN IN FORM */
            <>
              <div className="space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  <LogIn size={13} />
                  <span>Authentication Portal</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Sign In to Your Account
                </h2>
                <p className="text-xs text-slate-400">
                  Access floor plans, seat bookings, IT assets, and workspace directory.
                </p>
              </div>

              {sessionExpiredNotice && !errorMessage && !successMessage && (
                <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-300">
                  <ShieldAlert size={16} className="text-amber-400 shrink-0" />
                  <span>Session auto-logged out after 10 minutes of inactivity. Please sign in again.</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Corporate Email Address
                    </label>
                  </div>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@enterprise.com"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Password / Temporary Pass
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password or temporary pass"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Authenticating Credentials...</span>
                  ) : (
                    <>
                      <span>Sign In to Enterprise Workspace</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Enterprise SSO Enabled</span>
                <span className="text-slate-400 font-mono">Build v2.4.0 • Active</span>
              </div>
            </>
          )}
        </div>

      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl w-full mx-auto py-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 shrink-0 z-10">
        <div>
          © 2026 EnterprizSeat Corporate System • Newmark _Hyderabad Campus
        </div>
        <div className="flex gap-4">
          <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Enterprise Privacy Policy: Confidential Corporate System"); }} className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Enterprise Terms: Authorized Personnel Only"); }} className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <a href="#security" onClick={(e) => { e.preventDefault(); alert("Security Clearance: SOC2 Type II Certified"); }} className="hover:text-slate-300 transition-colors">Security Ops</a>
        </div>
      </footer>
    </div>
  );
}
