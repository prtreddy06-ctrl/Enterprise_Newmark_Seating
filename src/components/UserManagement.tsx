import React, { useState, useMemo } from "react";
import { 
  UserCheck, 
  ShieldAlert, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  Key, 
  Search, 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Mail,
  Building,
  Smartphone,
  QrCode,
  Download,
  Send,
  FileText
} from "lucide-react";
import { UserAccount, UserRole, Seat } from "../types";
import { dispatchEmailNotification, openMailClient, downloadEMLEmail } from "../utils/emailAndDownloadService";

interface UserManagementProps {
  users: UserAccount[];
  seats: Seat[];
  activeRole: string;
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onBulkDeleteUsers?: (userIds: string[]) => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
  onBulkAddEmployeesAndUsers?: (newUsers: UserAccount[], newEmps: any[]) => void;
}

export default function UserManagement({
  users,
  seats,
  activeRole,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onBulkDeleteUsers,
  onAddAuditLog
}: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Email Mobile Access Dispatch Modal
  const [selectedMobileUser, setSelectedMobileUser] = useState<UserAccount | null>(null);
  const [tempPassword, setTempPassword] = useState("TempPass2026!");
  const [emailDispatched, setEmailDispatched] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>(UserRole.USER);
  const [formDepartment, setFormDepartment] = useState("Engineering");
  const [formSeatNumber, setFormSeatNumber] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive" | "Locked">("Active");

  const isAuthorized = ["Super User", "Admin"].includes(activeRole);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => { if (u.department && u.department.trim()) set.add(u.department.trim()); });
    if (seats) {
      seats.forEach(s => {
        if (s.department && s.department.trim()) set.add(s.department.trim());
        if (s.allocatedDepartment && s.allocatedDepartment.trim()) set.add(s.allocatedDepartment.trim());
      });
    }
    const list = Array.from(set).filter(d => 
      d.toLowerCase() !== "vacant" && d.toLowerCase() !== "n/a" && d.toLowerCase() !== "unallocated"
    );
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
    return list.length > 0 ? list : ["Corporate Infrastructure", "Operations", "Engineering"];
  }, [users, seats]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    const matchesStatus = filterStatus === "ALL" || u.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleOpenAddModal = () => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User and Admin can create user accounts.");
      return;
    }
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormRole(UserRole.USER);
    setFormDepartment("Engineering");
    setFormSeatNumber("");
    setFormStatus("Active");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User and Admin can edit user accounts.");
      return;
    }
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormDepartment(user.department || "Engineering");
    setFormSeatNumber(user.allocatedSeatNumber || "");
    setFormStatus(user.status);
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    if (editingUser) {
      const updated: UserAccount = {
        ...editingUser,
        name: formName,
        email: formEmail,
        role: formRole,
        department: formDepartment,
        allocatedSeatNumber: formSeatNumber,
        status: formStatus
      };
      onUpdateUser(updated);
      onAddAuditLog("User Modification", "User Administration", `Updated account details for ${formEmail}`);
    } else {
      const autoTempPass = `WelcomePass-${Math.floor(1000 + Math.random() * 9000)}`;

      const newUser: UserAccount = {
        id: `u-${Date.now()}`,
        name: formName,
        email: formEmail,
        role: formRole,
        department: formDepartment,
        allocatedSeatNumber: formSeatNumber,
        status: formStatus,
        lastLogin: new Date().toISOString(),
        requiresPasswordReset: true,
        tempPassword: autoTempPass
      };
      onAddUser(newUser);

      // Auto-trigger welcome onboarding email upon profile creation
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://enterprizseat.corp';

      dispatchEmailNotification({
        toEmail: formEmail,
        toName: formName,
        subject: `Welcome to EnterprizSeat Workspace - Profile Provisioned (${formRole})`,
        bodyText: `Dear ${formName},

Welcome to EnterprizSeat Workspace System! Your user profile has been created and provisioned by the administrator.

Account Profile Details:
- Name: ${formName}
- Assigned Role: ${formRole}
- Department: ${formDepartment || 'Corporate Infrastructure'}
- Allocated Seat: ${formSeatNumber || 'Flexible Hotdesk'}

Click the hyperlinked options below to access your portal and companion installers:
- Direct Workspace Portal & PWA App: ${origin}
- Android WebApp Companion Installer: ${origin}/download/android-pwa-installer.html
- iOS TestFlight Companion Installer: ${origin}/download/ios-companion-installer.html

Login Email: ${formEmail}
Temporary Password: ${autoTempPass}

You can log in to the application portal immediately using your registered email address and temporary password.`,
        tempPassword: autoTempPass,
        category: "Account Provisioning",
        sender: "EnterprizSeat Workspace Management <no-reply@enterprizseat.corp>"
      });

      onAddAuditLog("User Creation & Auto Email", "User Administration", `Created user account and automatically dispatched onboarding email to ${formEmail}`);
    }

    setIsModalOpen(false);
  };

  const handleSendTempPassword = (user: UserAccount) => {
    const tempPass = `TempPass-${Math.floor(1000 + Math.random() * 9000)}`;
    const updatedUser: UserAccount = {
      ...user,
      tempPassword: tempPass,
      requiresPasswordReset: true
    };
    onUpdateUser(updatedUser);
    dispatchEmailNotification({
      toEmail: user.email,
      toName: user.name,
      subject: "EnterprizSeat Temporary Password Reset",
      bodyText: `Dear ${user.name},\n\nA temporary password reset has been issued for your EnterprizSeat account. Please sign in using your temporary password and set a new secure password upon first login.`,
      tempPassword: tempPass,
      category: "User Security"
    });
    onAddAuditLog("Password Reset", "User Security", `Issued temporary password reset email for user ${user.email}`);
  };

  const handleOpenMobileEmailDispatch = (user: UserAccount) => {
    const tempPass = `TempPass-${Math.floor(1000 + Math.random() * 9000)}`;
    const updatedUser: UserAccount = {
      ...user,
      tempPassword: tempPass,
      requiresPasswordReset: user.password ? false : true
    };
    onUpdateUser(updatedUser);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://enterprizseat.corp';
    dispatchEmailNotification({
      toEmail: user.email,
      toName: user.name,
      subject: "Welcome to EnterprizSeat Mobile Companion",
      bodyText: `Dear ${user.name},

Your EnterprizSeat Mobile Companion account has been provisioned.

Click the links below to access your mobile portal and installation packages:
- Direct Mobile Web Portal & PWA App: ${origin}
- Android WebApp Companion Installer: ${origin}/download/android-pwa-installer.html
- iOS TestFlight Companion Installer: ${origin}/download/ios-companion-installer.html

Temporary Password: ${tempPass}`,
      tempPassword: tempPass,
      category: "Mobile Credentials"
    });
    onAddAuditLog(
      "Mobile Credentials Dispatch",
      "User Security",
      `Dispatched automated mobile app download links and credentials email directly to ${user.email}`
    );
  };

  const handleToggleLock = (user: UserAccount) => {
    const newStatus = user.status === "Locked" ? "Active" : "Locked";
    const updated: UserAccount = { ...user, status: newStatus };
    onUpdateUser(updated);
    onAddAuditLog("Account Status Toggle", "User Security", `Changed account status of ${user.email} to ${newStatus}`);
  };

  const handleDelete = (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete account: ${email}?`)) return;
    onDeleteUser(userId);
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
    onAddAuditLog("User Deletion", "User Administration", `Permanently removed user account: ${email}`);
  };

  const toggleSelectAllUsers = () => {
    if (selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkDeleteUsers = () => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User or Admin can delete user accounts.");
      return;
    }
    if (selectedUserIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedUserIds.length} selected user accounts?`)) {
      return;
    }
    if (onBulkDeleteUsers) {
      onBulkDeleteUsers(selectedUserIds);
    } else {
      selectedUserIds.forEach(id => onDeleteUser(id));
    }
    onAddAuditLog("Bulk User Deletion", "User Administration", `Permanently removed ${selectedUserIds.length} user accounts.`);
    setSelectedUserIds([]);
  };

  return (
    <div className="space-y-6" id="user-management-module">
      {/* Top Banner & Stats */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <UserCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 font-display">User Accounts & Access Control</h2>
            <p className="text-xs text-slate-400">
              Role-based authorization • Super User, Admin, Member, IT Admin & Standard Users
            </p>
          </div>
        </div>

        {isAuthorized && (
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-md shadow-blue-200 flex items-center gap-1.5 transition-all"
          >
            <UserPlus size={15} />
            <span>Create New User</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name or email..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Roles</option>
            <option value={UserRole.SUPER_USER}>Super User</option>
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.MEMBER}>Member (Dept Head)</option>
            <option value={UserRole.IT_ADMIN}>IT Administrator</option>
            <option value={UserRole.USER}>Standard User</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Locked">Locked</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {selectedUserIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 text-rose-950 font-medium">
            <span className="font-bold bg-rose-200 text-rose-900 px-2.5 py-1 rounded-lg">
              {selectedUserIds.length} Selected
            </span>
            <span>out of {filteredUsers.length} listed user accounts</span>
          </div>
          <div className="flex items-center gap-2 font-sans">
            <button
              onClick={() => setSelectedUserIds([])}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold bg-white border border-slate-200 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDeleteUsers}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={14} />
              <span>Delete Selected ({selectedUserIds.length})</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="user-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                    onChange={toggleSelectAllUsers}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">User & Email</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Role Designation</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Department</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Allocated Seat</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Last Login</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Account Status</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <tr key={user.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? "bg-blue-50/40" : ""}`}>
                    <td className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover border border-blue-400 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                          {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Mail size={11} />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 font-bold">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ${
                      user.role === UserRole.SUPER_USER 
                        ? "bg-purple-100 text-purple-900 border border-purple-200" 
                        : user.role === UserRole.ADMIN 
                          ? "bg-blue-100 text-blue-900 border border-blue-200" 
                          : user.role === UserRole.MEMBER
                            ? "bg-indigo-100 text-indigo-900"
                            : user.role === UserRole.IT_ADMIN
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-slate-100 text-slate-700"
                    }`}>
                      {user.role}
                    </span>
                  </td>

                  <td className="p-3 text-slate-700 font-medium">
                    {user.department || "N/A"}
                  </td>

                  <td className="p-3 font-mono font-bold text-blue-700">
                    {user.allocatedSeatNumber ? (
                      <span className="bg-blue-50 px-2 py-0.5 rounded">
                        {user.allocatedSeatNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-sans font-normal italic">Unassigned</span>
                    )}
                  </td>

                  <td className="p-3 font-mono text-slate-500 text-[11px]">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                  </td>

                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      user.status === "Active" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : user.status === "Locked" 
                          ? "bg-rose-100 text-rose-800" 
                          : "bg-slate-100 text-slate-600"
                    }`}>
                      {user.status}
                    </span>
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAuthorized && (
                        <>
                          <button
                            onClick={() => handleOpenMobileEmailDispatch(user)}
                            title="Dispatch Mobile App Links & Credentials Email"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Smartphone size={15} />
                          </button>

                          <button
                            onClick={() => handleSendTempPassword(user)}
                            title="Issue Temp Reset Password"
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Key size={15} />
                          </button>

                          <button
                            onClick={() => handleToggleLock(user)}
                            title={user.status === "Locked" ? "Unlock Account" : "Lock Account"}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            {user.status === "Locked" ? <Unlock size={15} className="text-emerald-600" /> : <Lock size={15} />}
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(user)}
                            title="Edit User"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            onClick={() => handleDelete(user.id, user.email)}
                            title="Delete User"
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / CREATE USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 font-display">
                {editingUser ? "Edit User Account" : "Create New User Account"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. s.connor@company.com"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Role Designation</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value={UserRole.SUPER_USER}>{UserRole.SUPER_USER}</option>
                    <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                    <option value={UserRole.MEMBER}>{UserRole.MEMBER}</option>
                    <option value={UserRole.IT_ADMIN}>{UserRole.IT_ADMIN}</option>
                    <option value={UserRole.USER}>{UserRole.USER}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Department</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Allocated Seat</label>
                  <input
                    type="text"
                    value={formSeatNumber}
                    onChange={(e) => setFormSeatNumber(e.target.value)}
                    placeholder="e.g. A-101"
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-blue-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Account Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
