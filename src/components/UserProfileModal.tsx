import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Building2,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Shield
} from "lucide-react";
import { UserAccount, UserRole } from "../types";
import { dispatchEmailNotification } from "../utils/emailAndDownloadService";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUpdateUser: (updatedUser: UserAccount) => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onAddAuditLog
}: UserProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photo state
  const [avatarPreview, setAvatarPreview] = useState<string>(currentUser.avatarUrl || "");
  const [photoMessage, setPhotoMessage] = useState<string>("");

  // Password state
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  const [showRoleDetails, setShowRoleDetails] = useState(false);

  if (!isOpen) return null;

  const userInitials = currentUser.name
    ? currentUser.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  // Handle Photo File Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoMessage("Error: Selected file must be an image (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoMessage("Error: File size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatarPreview(dataUrl);
      
      const updatedUser: UserAccount = {
        ...currentUser,
        avatarUrl: dataUrl
      };
      
      onUpdateUser(updatedUser);
      onAddAuditLog("Profile Photo Updated", "User Profile", `User ${currentUser.name} updated profile photo.`);
      setPhotoMessage("Profile photo uploaded and saved successfully!");
      
      setTimeout(() => setPhotoMessage(""), 4000);
    };
    reader.readAsDataURL(file);
    
    // Reset file input so user can re-upload the same file if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    setAvatarPreview("");
    const updatedUser: UserAccount = {
      ...currentUser,
      avatarUrl: undefined
    };
    onUpdateUser(updatedUser);
    onAddAuditLog("Profile Photo Removed", "User Profile", `User ${currentUser.name} removed profile photo.`);
    setPhotoMessage("Profile photo removed.");
    setTimeout(() => setPhotoMessage(""), 3000);
  };

  // Update Password
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    // If current password exists on user, verify it
    if (currentUser.password && currentPasswordInput !== currentUser.password) {
      setPasswordFeedback({
        type: "error",
        text: "Incorrect current password. Please verify and try again."
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({
        type: "error",
        text: "New password must be at least 6 characters long."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        text: "New password and confirmation password do not match."
      });
      return;
    }

    setIsSubmittingPass(true);

    setTimeout(() => {
      setIsSubmittingPass(false);
      const updatedUser: UserAccount = {
        ...currentUser,
        password: newPassword,
        requiresPasswordReset: false,
        tempPassword: undefined
      };

      onUpdateUser(updatedUser);
      onAddAuditLog("Password Updated", "Account Security", `User ${currentUser.name} updated account password.`);

      dispatchEmailNotification({
        toEmail: currentUser.email,
        toName: currentUser.name,
        subject: "Security Notification: Password Updated",
        bodyText: `Dear ${currentUser.name},\n\nYour EnterprizSeat corporate account password has been changed successfully via your User Profile settings.\n\nIf you did not authorize this change, please contact IT Administration immediately.`,
        category: "Account Security"
      });

      setPasswordFeedback({
        type: "success",
        text: "Your password has been updated successfully!"
      });

      setCurrentPasswordInput("");
      setNewPassword("");
      setConfirmPassword("");
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-500/30">
              <User size={12} />
              <span>User Profile & Security Console</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Account Profile Settings</h2>
            <p className="text-xs text-slate-400">
              Manage your personal avatar photo, permanent password, and assigned profile details.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          
          {/* SECTION 1: PHOTO UPLOAD */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Camera size={16} className="text-blue-600" />
                  <span>Profile Photo & Avatar</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Upload a custom profile photo. You can update or replace your photo anytime.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded font-bold">
                JPG, PNG, WebP (Max 5MB)
              </span>
            </div>

            {photoMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                photoMessage.startsWith("Error")
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                {photoMessage.startsWith("Error") ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{photoMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={currentUser.name}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-2xl flex items-center justify-center shadow-md border-2 border-blue-400">
                    {userInitials}
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white text-slate-800 rounded-full shadow-lg hover:scale-105 transition-transform cursor-pointer"
                    title="Change Photo"
                  >
                    <Camera size={16} />
                  </button>
                </div>
              </div>

              {/* Upload Action Controls */}
              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>{avatarPreview ? "Upload Different Photo" : "Upload Profile Photo"}</span>
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  You can re-upload or update your profile picture as many times as you like.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: PASSWORD MANAGEMENT */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <KeyRound size={16} className="text-blue-600" />
                <span>Update Password</span>
              </h3>
              <p className="text-xs text-slate-500">
                Change your account password to maintain system security.
              </p>
            </div>

            {passwordFeedback && (
              <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                passwordFeedback.type === "error"
                  ? "bg-rose-50 border border-rose-200 text-rose-700"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-700"
              }`}>
                {passwordFeedback.type === "error" ? (
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                )}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              {currentUser.password && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl py-2 pl-9 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      title={showCurrentPass ? "Hide password" : "Show password"}
                    >
                      {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl py-2 pl-9 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      title={showNewPass ? "Hide password" : "Show password"}
                    >
                      {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <CheckCircle2 size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl py-2 pl-9 pr-9 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      title={showConfirmPass ? "Hide password" : "Show password"}
                    >
                      {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPass}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPass ? (
                    <span>Updating Password...</span>
                  ) : (
                    <>
                      <ShieldCheck size={15} className="text-emerald-400" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 3: ACCOUNT PROFILE INFORMATION */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 size={16} className="text-blue-600" />
              <span>Assigned Corporate Attributes</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Full Name</span>
                <span className="font-bold text-slate-800 text-sm">{currentUser.name}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Email Address</span>
                <span className="font-medium text-slate-700 font-mono">{currentUser.email}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Assigned Role</span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-blue-100 text-blue-800 font-extrabold rounded-lg text-xs font-mono">
                  {currentUser.role}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Department</span>
                <span className="font-semibold text-slate-800">{currentUser.department || "Enterprise"}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Allocated Desk</span>
                <span className="font-mono font-bold text-blue-600">{currentUser.allocatedSeatNumber || "Hotdesk / Flexible"}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Account Status</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px] uppercase font-mono">
                  {currentUser.status}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: INSTITUTIONAL ACCESS ROLE & PRIVILEGES */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-blue-300">
                  Institutional Access Role: {currentUser.role}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleDetails(!showRoleDetails)}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{showRoleDetails ? "Hide Privileges" : "View Role Scope"}</span>
                {showRoleDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentUser.role === UserRole.SUPER_USER
                ? "You hold Super User privileges. Full administration, floor designer, IT asset management, and role simulation engine are unlocked for your account."
                : `Your account is assigned fixed institutional privileges for ${currentUser.role}. All system features operate under standard corporate access controls.`}
            </p>

            {showRoleDetails && (
              <div className="pt-2 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                  Active System Privileges:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(currentUser.role === UserRole.SUPER_USER
                    ? ["Full System Admin", "User Role Ops", "Floor Designer", "IT Asset Matrix", "DevOps Blueprints", "Audit Logs"]
                    : ["Desk Requests", "Floor Plan Viewer", "Employee Directory", "Mobile Companion"]
                  ).map((priv, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-blue-300 text-[10px] font-medium rounded-md font-mono flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-emerald-400" />
                      <span>{priv}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done & Close
          </button>
        </div>

      </div>
    </div>
  );
}
