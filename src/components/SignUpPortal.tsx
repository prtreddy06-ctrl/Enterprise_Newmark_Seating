import React, { useState } from "react";
import {
  Building2,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import { Organization, UserAccount, UserRole, LocationSite } from "../types";

interface SignUpPortalProps {
  existingUsers: UserAccount[];
  existingOrganizations: Organization[];
  onCreateWorkspace: (org: Organization, adminUser: UserAccount, starterSite: LocationSite) => void;
  onSwitchToLogin: () => void;
}

const BRAND_COLOR_PRESETS = [
  { label: "Corporate Blue", hex: "#1d4ed8" },
  { label: "Emerald", hex: "#059669" },
  { label: "Violet", hex: "#7c3aed" },
  { label: "Amber", hex: "#d97706" },
  { label: "Rose", hex: "#e11d48" },
  { label: "Slate", hex: "#334155" }
];

export default function SignUpPortal({
  existingUsers,
  existingOrganizations,
  onCreateWorkspace,
  onSwitchToLogin
}: SignUpPortalProps) {
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(BRAND_COLOR_PRESETS[0].hex);
  const [siteName, setSiteName] = useState("");
  const [siteCountry, setSiteCountry] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deriveSlug = (name: string) =>
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";

  const deriveInitials = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "CO";
    return words.slice(0, 2).map(w => w[0].toUpperCase()).join("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim() || !password) {
      setErrorMessage("Please fill in company name, your name, email, and a password.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (existingUsers.some(u => u.email.toLowerCase() === adminEmail.trim().toLowerCase())) {
      setErrorMessage("An account with this email already exists. Please sign in instead.");
      return;
    }

    setIsSubmitting(true);

    const slugBase = deriveSlug(companyName);
    const orgId = `org-${slugBase}-${Date.now().toString(36)}`;
    const uniqueSlug = existingOrganizations.some(o => o.slug === slugBase) ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

    const newOrg: Organization = {
      id: orgId,
      name: companyName.trim(),
      slug: uniqueSlug,
      primaryColor,
      logoInitials: deriveInitials(companyName),
      plan: "Trial",
      ownerEmail: adminEmail.trim().toLowerCase(),
      createdAt: new Date().toISOString()
    };

    const newAdminUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: adminName.trim(),
      email: adminEmail.trim().toLowerCase(),
      role: UserRole.SUPER_USER,
      department: "Leadership",
      status: "Active",
      password,
      lastLogin: new Date().toISOString(),
      failedLoginAttempts: 0,
      organizationId: orgId
    };

    const newSite: LocationSite = {
      id: `site-${Date.now()}`,
      name: siteName.trim() || `${companyName.trim()} HQ`,
      code: uniqueSlug.slice(0, 3).toUpperCase(),
      country: siteCountry.trim() || "Not set",
      address: "Add your office address in Site Management",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      isDefault: true,
      organizationId: orgId
    };

    onCreateWorkspace(newOrg, newAdminUser, newSite);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #1d4ed822, transparent 40%), radial-gradient(circle at 80% 80%, #1d4ed822, transparent 40%)" }} />
      <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}>
            <Sparkles size={26} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Your Company Workspace</h2>
          <p className="text-xs text-slate-400 mt-1">
            Set up an isolated seating management environment for your organization — your own sites, floors, and people, kept separate from every other company on this platform.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Company Name</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corporation"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Jordan Lee"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-9 pr-3 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ characters"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-9 pr-9 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-2 text-slate-400 hover:text-white p-1 cursor-pointer">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Head Office Name <span className="text-slate-500">(optional)</span></label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Acme HQ"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Country <span className="text-slate-500">(optional)</span></label>
              <input
                type="text"
                value={siteCountry}
                onChange={(e) => setSiteCountry(e.target.value)}
                placeholder="United States"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs font-medium text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Brand Color</label>
            <div className="flex items-center gap-2">
              {BRAND_COLOR_PRESETS.map(c => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setPrimaryColor(c.hex)}
                  title={c.label}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${primaryColor === c.hex ? "ring-2 ring-white scale-110 border-white" : "border-transparent"}`}
                />
              ))}
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer p-0.5 ml-auto bg-slate-950"
                title="Custom brand color"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? (
              <span>Setting up your workspace...</span>
            ) : (
              <>
                <span>Create Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="mt-5 w-full text-center text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={12} />
          <span>Already have an account? Sign in</span>
        </button>

        <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-start gap-2 text-[10px] text-slate-500">
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
          <span>Your workspace's users, floors, seats, and reports are only ever visible to your own company's accounts.</span>
        </div>
      </div>
    </div>
  );
}
