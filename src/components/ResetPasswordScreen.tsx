import React, { useEffect, useState } from "react";
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { UserAccount } from "../types";
import { validatePasswordResetToken, consumePasswordResetToken } from "../utils/passwordReset";
import { dispatchEmailNotification } from "../utils/emailAndDownloadService";

interface ResetPasswordScreenProps {
  token: string;
  registeredUsers: UserAccount[];
  onPasswordReset: (user: UserAccount) => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
  onBackToLogin: () => void;
}

type ScreenState = "CHECKING" | "INVALID" | "READY" | "DONE";

export default function ResetPasswordScreen({
  token,
  registeredUsers,
  onPasswordReset,
  onAddAuditLog,
  onBackToLogin
}: ResetPasswordScreenProps) {
  const [state, setState] = useState<ScreenState>("CHECKING");
  const [errorReason, setErrorReason] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    validatePasswordResetToken(token).then((result) => {
      if (cancelled) return;
      if (result.valid && result.email) {
        setEmail(result.email);
        setState("READY");
      } else {
        setErrorReason(result.reason || "This reset link is invalid.");
        setState("INVALID");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (newPassword.length < 6) {
      setFormError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const targetUser = registeredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      setFormError(`No account found for ${email}. Contact your Admin.`);
      return;
    }

    setIsSubmitting(true);

    const updatedUser: UserAccount = {
      ...targetUser,
      password: newPassword,
      tempPassword: undefined,
      requiresPasswordReset: false,
      status: targetUser.status === "Locked" ? "Active" : targetUser.status
    };

    onPasswordReset(updatedUser);
    await consumePasswordResetToken(token);

    dispatchEmailNotification({
      toEmail: updatedUser.email,
      toName: updatedUser.name,
      subject: "Security Confirmation: EnterprizSeat Password Reset Completed",
      bodyText: `Dear ${updatedUser.name},\n\nYour EnterprizSeat account password was just reset successfully. If you did not perform this action, contact your Admin immediately.`,
      category: "Account Security"
    });

    onAddAuditLog(
      "Password Reset Completed",
      "Login/Logout",
      `User ${updatedUser.name} (${updatedUser.email}) completed password reset via emailed link.`
    );

    setIsSubmitting(false);
    setState("DONE");

    // Clean the token out of the URL so refreshing/sharing it doesn't re-trigger this screen.
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Reset Your Password</h1>
            <p className="text-[11px] text-slate-500">EnterprizSeat Workspace System</p>
          </div>
        </div>

        {state === "CHECKING" && (
          <div className="py-8 text-center text-sm text-slate-400">Validating your reset link…</div>
        )}

        {state === "INVALID" && (
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{errorReason}</span>
            </div>
            <button
              onClick={onBackToLogin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Sign In & Request a New Link</span>
            </button>
          </div>
        )}

        {state === "READY" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-400">
              Setting a new password for <strong className="text-slate-200">{email}</strong>.
            </p>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Updating Password…" : "Set New Password"}
            </button>
          </form>
        )}

        {state === "DONE" && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Password updated successfully. You can now sign in with your new password.</span>
            </div>
            <button
              onClick={onBackToLogin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Go to Sign In</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
