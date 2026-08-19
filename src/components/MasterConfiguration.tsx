import React, { useState, useRef } from "react";
import {
  Settings,
  Building2,
  Palette,
  Users,
  Eye,
  EyeOff,
  Pencil,
  Ban,
  Download,
  Upload,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Key,
  ArrowRight
} from "lucide-react";
import { Organization, UserAccount, UserRole, LocationSite, Building, Floor, Zone, Seat, LayoutObject, ITAsset, EmployeeProfile } from "../types";
import { ModuleDefinition, ModuleAccessLevel } from "../App";

interface SeatingBackup {
  exportedAt: string;
  organizationId: string;
  organizationName: string;
  sites: LocationSite[];
  buildings: Building[];
  floors: Floor[];
  zones: Zone[];
  seats: Seat[];
  layoutObjects: LayoutObject[];
}

interface MasterConfigurationProps {
  currentOrganization: Organization;
  organizations: Organization[];
  moduleDefinitions: ModuleDefinition[];
  existingUsers: UserAccount[];
  sitesInOrg: LocationSite[];
  buildingsInOrg: Building[];
  floorsInOrg: Floor[];
  zonesInOrg: Zone[];
  seatsInOrg: Seat[];
  layoutObjectsInOrg: LayoutObject[];
  onUpdateOrganization: (org: Organization) => void;
  onCreateOrganization: (org: Organization, adminUser: UserAccount, starterSite: LocationSite) => void;
  onImportSeatingData: (backup: SeatingBackup) => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
}

const ROLE_LIST = [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MEMBER, UserRole.IT_ADMIN, UserRole.USER];
const BRAND_COLOR_PRESETS = ["#1d4ed8", "#059669", "#7c3aed", "#d97706", "#e11d48", "#334155"];

type TabId = "profile" | "workspaces" | "modules" | "permissions" | "data";

export default function MasterConfiguration({
  currentOrganization,
  organizations,
  moduleDefinitions,
  existingUsers,
  sitesInOrg,
  buildingsInOrg,
  floorsInOrg,
  zonesInOrg,
  seatsInOrg,
  layoutObjectsInOrg,
  onUpdateOrganization,
  onCreateOrganization,
  onImportSeatingData,
  onAddAuditLog
}: MasterConfigurationProps) {
  const [activeSubTab, setActiveSubTab] = useState<TabId>("profile");

  // --- Company Profile form state ---
  const [companyName, setCompanyName] = useState(currentOrganization.name);
  const [logoInitials, setLogoInitials] = useState(currentOrganization.logoInitials || "");
  const [primaryColor, setPrimaryColor] = useState(currentOrganization.primaryColor);
  const [plan, setPlan] = useState(currentOrganization.plan || "Trial");
  const [profileSaved, setProfileSaved] = useState(false);

  // --- New Company Workspace (SSO) form state ---
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newBrandColor, setNewBrandColor] = useState(BRAND_COLOR_PRESETS[0]);
  const [newCompanyError, setNewCompanyError] = useState("");
  const [newCompanySuccess, setNewCompanySuccess] = useState("");

  // --- Import state ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const hiddenModules = new Set(currentOrganization.hiddenModules || []);
  const rolePermissions = currentOrganization.rolePermissions || {};

  const customizableModules = moduleDefinitions.filter(m => !m.locked);

  const handleSaveProfile = () => {
    onUpdateOrganization({
      ...currentOrganization,
      name: companyName.trim() || currentOrganization.name,
      logoInitials: logoInitials.trim().slice(0, 3).toUpperCase() || currentOrganization.logoInitials,
      primaryColor,
      plan: plan as Organization["plan"]
    });
    onAddAuditLog("Update Company Profile", "System", `Updated company profile details for "${companyName}" via Master Configuration.`);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const toggleModuleHidden = (moduleId: string) => {
    const next = new Set(hiddenModules);
    if (next.has(moduleId)) next.delete(moduleId); else next.add(moduleId);
    onUpdateOrganization({ ...currentOrganization, hiddenModules: Array.from(next) });
    onAddAuditLog("Update Module Visibility", "System", `${next.has(moduleId) ? "Hid" : "Restored"} module "${moduleId}" org-wide via Master Configuration.`);
  };

  const setRoleAccess = (role: string, moduleId: string, level: ModuleAccessLevel) => {
    const nextPermissions = {
      ...rolePermissions,
      [role]: { ...(rolePermissions[role] || {}), [moduleId]: level }
    };
    onUpdateOrganization({ ...currentOrganization, rolePermissions: nextPermissions });
    onAddAuditLog("Update Role Permissions", "System", `Set "${role}" access to "${moduleId}" to "${level}" via Master Configuration.`);
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setNewCompanyError("");
    setNewCompanySuccess("");

    if (!newCompanyName.trim() || !newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword) {
      setNewCompanyError("Please fill in company name, admin name, email, and password.");
      return;
    }
    if (newAdminPassword.length < 8) {
      setNewCompanyError("Password must be at least 8 characters.");
      return;
    }
    if (existingUsers.some(u => u.email.toLowerCase() === newAdminEmail.trim().toLowerCase())) {
      setNewCompanyError("An account with this email already exists.");
      return;
    }

    const slugBase = newCompanyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
    const uniqueSlug = organizations.some(o => o.slug === slugBase) ? `${slugBase}-${Date.now().toString(36)}` : slugBase;
    const orgId = `org-${slugBase}-${Date.now().toString(36)}`;
    const initials = newCompanyName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "CO";

    const newOrg: Organization = {
      id: orgId,
      name: newCompanyName.trim(),
      slug: uniqueSlug,
      primaryColor: newBrandColor,
      logoInitials: initials,
      plan: "Trial",
      ownerEmail: newAdminEmail.trim().toLowerCase(),
      createdAt: new Date().toISOString()
    };

    const newAdminUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: newAdminName.trim(),
      email: newAdminEmail.trim().toLowerCase(),
      role: UserRole.SUPER_USER,
      department: "Leadership",
      status: "Active",
      password: newAdminPassword,
      lastLogin: new Date().toISOString(),
      failedLoginAttempts: 0,
      organizationId: orgId
    };

    const newSite: LocationSite = {
      id: `site-${Date.now()}`,
      name: `${newCompanyName.trim()} HQ`,
      code: uniqueSlug.slice(0, 3).toUpperCase(),
      country: "Not set",
      address: "Add your office address in Site Management",
      timeZone: "UTC",
      isDefault: true,
      organizationId: orgId
    };

    onCreateOrganization(newOrg, newAdminUser, newSite);
    onAddAuditLog("Create Company Workspace (Master Config)", "System", `Super User created a new company workspace "${newOrg.name}" with SSO admin ${newAdminUser.email}.`);
    setNewCompanySuccess(`"${newOrg.name}" workspace created. ${newAdminUser.email} can now sign in as its Super User.`);
    setNewCompanyName(""); setNewAdminName(""); setNewAdminEmail(""); setNewAdminPassword("");
  };

  const handleExport = () => {
    const backup: SeatingBackup = {
      exportedAt: new Date().toISOString(),
      organizationId: currentOrganization.id,
      organizationName: currentOrganization.name,
      sites: sitesInOrg,
      buildings: buildingsInOrg,
      floors: floorsInOrg,
      zones: zonesInOrg,
      seats: seatsInOrg,
      layoutObjects: layoutObjectsInOrg
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentOrganization.slug}-seating-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onAddAuditLog("Export Seating Data", "System", `Exported seating management data (sites, buildings, floors, zones, seats, layout objects) for "${currentOrganization.name}".`);
  };

  const handleImportFile = (file: File) => {
    setImportError("");
    setImportSuccess("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Partial<SeatingBackup>;
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid file");
        const backup: SeatingBackup = {
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          organizationId: currentOrganization.id,
          organizationName: currentOrganization.name,
          sites: Array.isArray(parsed.sites) ? parsed.sites : [],
          buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [],
          floors: Array.isArray(parsed.floors) ? parsed.floors : [],
          zones: Array.isArray(parsed.zones) ? parsed.zones : [],
          seats: Array.isArray(parsed.seats) ? parsed.seats : [],
          layoutObjects: Array.isArray(parsed.layoutObjects) ? parsed.layoutObjects : []
        };
        onImportSeatingData(backup);
        onAddAuditLog("Import Seating Data", "System", `Imported seating management data into "${currentOrganization.name}" from an uploaded backup file.`);
        setImportSuccess(`Imported ${backup.seats.length} seat(s), ${backup.zones.length} zone(s), ${backup.floors.length} floor(s).`);
      } catch (err) {
        setImportError("Could not read that file — please upload a valid seating backup JSON exported from this screen.");
      }
    };
    reader.readAsText(file);
  };

  const subTabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Company Profile", icon: <Building2 size={14} /> },
    { id: "workspaces", label: "Company Workspaces & SSO", icon: <Users size={14} /> },
    { id: "modules", label: "Module Visibility", icon: <Eye size={14} /> },
    { id: "permissions", label: "Role Permissions", icon: <ShieldCheck size={14} /> },
    { id: "data", label: "Data Backup", icon: <Download size={14} /> }
  ];

  return (
    <div className="space-y-6" id="master-configuration-module">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white" style={{ backgroundColor: currentOrganization.primaryColor }}>
          <Settings size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">Master Configuration</h2>
          <p className="text-xs text-slate-400">Super User controls — company profile, workspaces, module visibility, role permissions, and data backup.</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === t.id ? "text-white" : "text-slate-500 hover:bg-slate-50"
            }`}
            style={activeSubTab === t.id ? { backgroundColor: currentOrganization.primaryColor } : {}}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* COMPANY PROFILE */}
      {activeSubTab === "profile" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-slate-800">Company Profile</h3>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Logo Initials</label>
              <input value={logoInitials} maxLength={3} onChange={(e) => setLogoInitials(e.target.value.toUpperCase())} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value as any)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="Trial">Trial</option>
                <option value="Standard">Standard</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Brand Color</label>
            <div className="flex items-center gap-2">
              {BRAND_COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => setPrimaryColor(c)} style={{ backgroundColor: c }} className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${primaryColor === c ? "ring-2 ring-slate-800 scale-110 border-white" : "border-transparent"}`} />
              ))}
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 ml-auto" />
            </div>
          </div>
          <button onClick={handleSaveProfile} className="px-5 py-2.5 text-white text-xs rounded-xl font-bold shadow-md flex items-center gap-1.5 cursor-pointer" style={{ backgroundColor: primaryColor }}>
            {profileSaved ? <CheckCircle2 size={14} /> : <Pencil size={14} />}
            <span>{profileSaved ? "Saved" : "Save Company Profile"}</span>
          </button>
        </div>
      )}

      {/* COMPANY WORKSPACES & SSO */}
      {activeSubTab === "workspaces" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl flex items-start gap-2">
            <Lock size={14} className="shrink-0 mt-0.5" />
            <span>Only Super Users can create new company workspaces / SSO admin accounts here. Admins, Members, IT Administrators, and Users never see this screen or this control.</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-slate-800">Create New Company Workspace</h3>
            {newCompanyError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2"><AlertCircle size={13} /><span>{newCompanyError}</span></div>
            )}
            {newCompanySuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2"><CheckCircle2 size={13} /><span>{newCompanySuccess}</span></div>
            )}
            <form onSubmit={handleCreateCompany} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Company Name</label>
                <input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Acme Corporation" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Admin Name</label>
                  <input value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} placeholder="Jordan Lee" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Admin Email (SSO login)</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@company.com" className="w-full p-2.5 pl-8 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Temporary Password</label>
                <div className="relative">
                  <Key size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input type="text" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="8+ characters" className="w-full p-2.5 pl-8 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Brand Color</label>
                <div className="flex items-center gap-2">
                  {BRAND_COLOR_PRESETS.map(c => (
                    <button type="button" key={c} onClick={() => setNewBrandColor(c)} style={{ backgroundColor: c }} className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${newBrandColor === c ? "ring-2 ring-slate-800 scale-110 border-white" : "border-transparent"}`} />
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 text-white text-xs rounded-xl font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer" style={{ backgroundColor: currentOrganization.primaryColor }}>
                <Plus size={14} />
                <span>Create Workspace & SSO Admin</span>
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">All Company Workspaces ({organizations.length})</h3>
            <div className="space-y-2">
              {organizations.map(org => (
                <div key={org.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: org.primaryColor }}>{org.logoInitials || "CO"}</div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{org.name} {org.id === currentOrganization.id && <span className="text-[9px] text-blue-600">(this workspace)</span>}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{org.ownerEmail} • {org.plan || "Trial"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE VISIBILITY */}
      {activeSubTab === "modules" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Module Visibility</h3>
          <p className="text-xs text-slate-400 mb-4">Hide modules your company doesn't need — hidden modules disappear from the sidebar for every role, org-wide.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {customizableModules.map(m => {
              const isHidden = hiddenModules.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModuleHidden(m.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    isHidden ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-white border-slate-200 text-slate-800 hover:border-blue-300"
                  }`}
                >
                  <span>{m.label}</span>
                  {isHidden ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} style={{ color: currentOrganization.primaryColor }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ROLE PERMISSIONS MATRIX */}
      {activeSubTab === "permissions" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Role Permissions</h3>
          <p className="text-xs text-slate-400 mb-4">Set each role's access per module: Edit, View only, or Hidden. Super User always keeps full access, to prevent an accidental lockout.</p>
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                <th className="py-2 pr-3">Module</th>
                {ROLE_LIST.map(r => <th key={r} className="py-2 px-2 text-center">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {customizableModules.map(m => (
                <tr key={m.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-bold text-slate-700">{m.label}</td>
                  {ROLE_LIST.map(role => {
                    if (role === UserRole.SUPER_USER) {
                      return (
                        <td key={role} className="py-2 px-2 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><Pencil size={10} /> Edit</span>
                        </td>
                      );
                    }
                    const current = rolePermissions[role]?.[m.id] || m.defaultAccess[role] || "hidden";
                    return (
                      <td key={role} className="py-2 px-2 text-center">
                        <select
                          value={current}
                          onChange={(e) => setRoleAccess(role, m.id, e.target.value as ModuleAccessLevel)}
                          className={`text-[10px] font-bold rounded-full px-2 py-1 border cursor-pointer focus:outline-none ${
                            current === "edit" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            current === "view" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          <option value="edit">Edit</option>
                          <option value="view">View</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DATA BACKUP */}
      {activeSubTab === "data" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Download size={18} /></div>
            <h3 className="text-sm font-bold text-slate-800">Export Seating Data</h3>
            <p className="text-xs text-slate-400">Downloads a JSON backup of this company's sites, buildings, floors, zones, seats, and layout objects.</p>
            <div className="text-[11px] text-slate-500 font-mono bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              {sitesInOrg.length} site(s) • {buildingsInOrg.length} building(s) • {floorsInOrg.length} floor(s) • {zonesInOrg.length} zone(s) • {seatsInOrg.length} seat(s) • {layoutObjectsInOrg.length} object(s)
            </div>
            <button onClick={handleExport} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-bold shadow-md shadow-blue-200 flex items-center gap-1.5 cursor-pointer">
              <Download size={14} />
              <span>Download Backup (.json)</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Upload size={18} /></div>
            <h3 className="text-sm font-bold text-slate-800">Import Seating Data</h3>
            <p className="text-xs text-slate-400">Restore or merge a previously exported backup file back into this company's workspace. Existing records with matching IDs are updated; new ones are added.</p>
            {importError && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2"><AlertCircle size={13} /><span>{importError}</span></div>}
            {importSuccess && <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2"><CheckCircle2 size={13} /><span>{importSuccess}</span></div>}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
            <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl font-bold shadow-md shadow-purple-200 flex items-center gap-1.5 cursor-pointer">
              <Upload size={14} />
              <span>Upload Backup File</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
