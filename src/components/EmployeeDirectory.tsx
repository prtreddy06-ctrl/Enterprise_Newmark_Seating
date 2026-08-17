import React, { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Building2, 
  Laptop, 
  UserCheck, 
  ShieldCheck, 
  Mail, 
  Briefcase, 
  MapPin, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  UploadCloud,
  UserPlus,
  Send,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  XCircle,
  Upload,
  Trash2
} from "lucide-react";
import * as XLSX from "xlsx";
import { EmployeeProfile, ITAsset, UserAccount, UserRole, Seat } from "../types";
import { dispatchEmailNotification } from "../utils/emailAndDownloadService";

interface EmployeeDirectoryProps {
  employees: EmployeeProfile[];
  assets: ITAsset[];
  seats?: Seat[];
  activeRole: string;
  onSelectEmployeeSeat?: (seatNumber: string) => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
  onBulkAddEmployeesAndUsers?: (newUsers: UserAccount[], newEmps: EmployeeProfile[]) => void;
  onDeleteEmployee?: (empId: string) => void;
  onBulkDeleteEmployees?: (empIds: string[]) => void;
}

export default function EmployeeDirectory({
  employees,
  assets,
  seats,
  activeRole,
  onSelectEmployeeSeat,
  onAddAuditLog,
  onBulkAddEmployeesAndUsers,
  onDeleteEmployee,
  onBulkDeleteEmployees
}: EmployeeDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterFloor, setFilterFloor] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedEmp, setSelectedEmp] = useState<EmployeeProfile | null>(null);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department && e.department.trim()) set.add(e.department.trim());
    });
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
    return list;
  }, [employees, seats]);

  // Bulk Employee Upload Modal State
  const [showBulkUploadModal, setShowBulkUploadModal] = useState<boolean>(false);
  const [bulkFileName, setBulkFileName] = useState<string>("");
  const [isParsingBulk, setIsParsingBulk] = useState<boolean>(false);
  const [parsedEmps, setParsedEmps] = useState<EmployeeProfile[]>([]);
  const [parsedUsers, setParsedUsers] = useState<UserAccount[]>([]);
  const [bulkParseErrors, setBulkParseErrors] = useState<string[]>([]);
  const [bulkSuccessDispatched, setBulkSuccessDispatched] = useState<boolean>(false);
  const [dispatchedCount, setDispatchedCount] = useState<number>(0);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.seatNumber && emp.seatNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = filterDept === "ALL" || (emp.department && emp.department.toLowerCase() === filterDept.toLowerCase());
    const matchesFloor = filterFloor === "ALL" || emp.floor === filterFloor;
    const matchesStatus = filterStatus === "ALL" || emp.accountStatus === filterStatus;

    return matchesSearch && matchesDept && matchesFloor && matchesStatus;
  });

  const toggleSelectAllEmps = () => {
    if (selectedEmpIds.length === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(filteredEmployees.map(e => e.id));
    }
  };

  const toggleSelectEmp = (empId: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const isAuthorized = ["Super User", "Admin", "IT Administrator"].includes(activeRole);

  const handleSingleDelete = (emp: EmployeeProfile) => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, or IT Administrator can delete employee profiles.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete employee profile: ${emp.name} (${emp.id})?`)) {
      return;
    }
    if (onDeleteEmployee) {
      onDeleteEmployee(emp.id);
      onAddAuditLog("Delete Employee Profile", "Employee Directory", `Permanently deleted employee profile '${emp.name}' (${emp.id}).`);
    } else if (onBulkDeleteEmployees) {
      onBulkDeleteEmployees([emp.id]);
      onAddAuditLog("Delete Employee Profile", "Employee Directory", `Permanently deleted employee profile '${emp.name}' (${emp.id}).`);
    }
    setSelectedEmpIds(prev => prev.filter(id => id !== emp.id));
  };

  const handleBulkDeleteEmps = () => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, or IT Administrator can delete employee profiles.");
      return;
    }
    if (selectedEmpIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedEmpIds.length} selected employee profile(s)?`)) {
      return;
    }
    if (onBulkDeleteEmployees) {
      onBulkDeleteEmployees(selectedEmpIds);
    } else if (onDeleteEmployee) {
      selectedEmpIds.forEach(id => onDeleteEmployee(id));
    }
    onAddAuditLog("Bulk Delete Employees", "Employee Directory", `Permanently deleted ${selectedEmpIds.length} employee profiles.`);
    setSelectedEmpIds([]);
  };

  const handleExportExcel = () => {
    const rows = filteredEmployees.map(emp => {
      const empAssets = assets.filter(a => a.employeeId === emp.id || a.employeeName === emp.name);
      return {
        "Employee ID": emp.id,
        "Employee Name": emp.name,
        "Email": emp.email,
        "Department": emp.department,
        "Company": emp.company,
        "Business Head": emp.businessHead,
        "Manager (Member)": emp.manager,
        "Floor": emp.floor,
        "Zone": emp.zone,
        "Seat Number": emp.seatNumber || "Unallocated",
        "Occupancy Status": emp.occupancyStatus,
        "Account Status": emp.accountStatus,
        "Role": emp.role,
        "Assigned Hardware Count": empAssets.length,
        "Hardware Serial Numbers": empAssets.map(a => a.serialNumber).join(", "),
        "Last Login": emp.lastLogin || "N/A"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee_Directory");
    XLSX.writeFile(workbook, `Employee_Directory_Export_${Date.now()}.xlsx`);

    onAddAuditLog("Export Directory", "User Operations", `Exported ${rows.length} employee profiles to Excel.`);
  };

  const handleDownloadEmployeeTemplate = () => {
    const templateData = [
      {
        "Full Name": "Alexander Pierce",
        "Corporate Email": "a.pierce@company.corp",
        "Department": "Engineering",
        "Role Designation": "Standard User",
        "Phone Number": "+1 (555) 301-4400",
        "Company": "Global Cyber Systems",
        "Business Head": "Corporate Board",
        "Reporting Manager": "Raviteja Reddy palagiri",
        "Assigned Floor": "11 th Floor CRE",
        "Assigned Seat Number": "108"
      },
      {
        "Full Name": "Gillian Seed",
        "Corporate Email": "g.seed@company.corp",
        "Department": "Operations",
        "Role Designation": "Admin",
        "Phone Number": "+1 (555) 402-8811",
        "Company": "Global Cyber Systems",
        "Business Head": "Corporate Board",
        "Reporting Manager": "Raviteja Reddy palagiri",
        "Assigned Floor": "11 th Floor CRE",
        "Assigned Seat Number": "302"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bulk_Employee_Profiles");
    XLSX.writeFile(workbook, "Bulk_Employee_Profile_Import_Template.xlsx");

    onAddAuditLog("Download Employee Template", "Excel Ingest", "Downloaded Bulk Employee Profile Creation template.");
  };

  const handleParseEmployeeExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setIsParsingBulk(true);
    setBulkParseErrors([]);
    setBulkSuccessDispatched(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        const newEmps: EmployeeProfile[] = [];
        const newUsers: UserAccount[] = [];
        const errors: string[] = [];

        rows.forEach((row, index) => {
          const rowNum = index + 2;
          const fullName = (row["Full Name"] || row["Name"] || row["name"] || "").toString().trim();
          const email = (row["Corporate Email"] || row["Email"] || row["email"] || "").toString().trim();
          const dept = (row["Department"] || row["department"] || "Engineering").toString().trim();
          const roleStr = (row["Role Designation"] || row["Role"] || row["role"] || "Standard User").toString().trim();
          const company = (row["Company"] || "Global Cyber Systems").toString().trim();
          const businessHead = (row["Business Head"] || "").toString().trim();
          const manager = (row["Reporting Manager"] || row["Manager"] || "Raviteja Reddy palagiri").toString().trim();
          const floor = (row["Assigned Floor"] || row["Floor"] || "11 th Floor CRE").toString().trim();
          const seatNum = (row["Assigned Seat Number"] || row["Seat Number"] || "").toString().trim();

          if (!fullName) {
            errors.push(`Row ${rowNum}: 'Full Name' is missing.`);
            return;
          }
          if (!email || !email.includes("@")) {
            errors.push(`Row ${rowNum}: Valid 'Corporate Email' is required.`);
            return;
          }

          let role = UserRole.USER;
          if (roleStr.toLowerCase().includes("super")) role = UserRole.SUPER_USER;
          else if (roleStr.toLowerCase().includes("admin")) role = UserRole.ADMIN;
          else if (roleStr.toLowerCase().includes("member") || roleStr.toLowerCase().includes("head")) role = UserRole.MEMBER;
          else if (roleStr.toLowerCase().includes("it")) role = UserRole.IT_ADMIN;

          const autoTempPass = `WelcomePass-${Math.floor(1000 + Math.random() * 9000)}`;
          const userId = `u-bulk-${Date.now()}-${index}`;

          const newUser: UserAccount = {
            id: userId,
            name: fullName,
            email,
            role,
            department: dept,
            allocatedSeatNumber: seatNum,
            status: "Active",
            lastLogin: new Date().toISOString(),
            requiresPasswordReset: true,
            tempPassword: autoTempPass
          };

          const newEmp: EmployeeProfile = {
            id: `emp-${userId}`,
            name: fullName,
            email,
            department: dept,
            company,
            businessHead,
            manager,
            floor,
            zone: "Zone A (Cloud Platform)",
            seatNumber: seatNum,
            seatType: "Standard",
            occupancyStatus: seatNum ? "Occupied" : "Vacant",
            assignedAssets: [],
            accountStatus: "Active",
            role,
            lastLogin: new Date().toISOString()
          };

          newUsers.push(newUser);
          newEmps.push(newEmp);
        });

        setParsedEmps(newEmps);
        setParsedUsers(newUsers);
        setBulkParseErrors(errors);
        setIsParsingBulk(false);
      } catch (err) {
        setIsParsingBulk(false);
        alert("Unable to parse Excel file structure.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmBulkUpload = () => {
    if (parsedEmps.length === 0 || parsedUsers.length === 0) return;

    if (onBulkAddEmployeesAndUsers) {
      onBulkAddEmployeesAndUsers(parsedUsers, parsedEmps);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://enterprizseat.corp';

    // DISPATCH EMAILS SIMULTANEOUSLY TO ALL USERS
    parsedUsers.forEach((u) => {
      dispatchEmailNotification({
        toEmail: u.email,
        toName: u.name,
        subject: `Welcome to EnterprizSeat Workspace - Profile Provisioned (${u.role})`,
        bodyText: `Dear ${u.name},

Welcome to EnterprizSeat Corporate Workspace System! Your user profile has been created and provisioned via bulk administrator upload.

Account Profile Details:
- Name: ${u.name}
- Assigned Role: ${u.role}
- Department: ${u.department || 'Corporate Infrastructure'}
- Allocated Seat Number: ${u.allocatedSeatNumber || 'Flexible Hot Desk'}

Access your workspace portal and companion installers directly:
- Workspace Portal & PWA Web App: ${origin}
- Android Companion App Installer: ${origin}/download/android-pwa-installer.html
- iOS TestFlight Companion Installer: ${origin}/download/ios-companion-installer.html

Login Credentials:
- Login Email: ${u.email}
- Temporary Password: ${u.tempPassword || 'Welcome2026!'}

Please sign in immediately using your registered email and temporary password.`,
        tempPassword: u.tempPassword || "Welcome2026!",
        category: "Bulk Account Onboarding",
        sender: "EnterprizSeat Workspace Management <no-reply@enterprizseat.corp>"
      });
    });

    setDispatchedCount(parsedEmps.length);
    setBulkSuccessDispatched(true);

    onAddAuditLog(
      "Bulk Employee Upload & Simultaneous Email Dispatch",
      "User Operations",
      `Created ${parsedEmps.length} employee profiles and automatically dispatched onboarding credentials emails to all ${parsedEmps.length} users simultaneously.`
    );
  };

  return (
    <div className="space-y-6" id="employee-directory-module">
      {/* Top Banner stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="emp-kpi-cards">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Total Personnel</span>
            <div className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{employees.length}</div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-sans">Seats Allocated</span>
            <div className="text-xl font-extrabold text-emerald-800 font-mono mt-0.5">
              {employees.filter(e => e.seatNumber).length}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider font-sans">Departments</span>
            <div className="text-xl font-extrabold text-purple-800 font-mono mt-0.5">4</div>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Briefcase size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-sans">Active Status</span>
            <div className="text-xl font-extrabold text-amber-800 font-mono mt-0.5">
              {employees.filter(e => e.accountStatus === "Active").length}
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="emp-controls-panel">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-display flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              <span>Corporate Employee Directory</span>
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Search personnel, seat allocations, reporting managers, and assigned IT equipment.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(activeRole === UserRole.SUPER_USER || activeRole === UserRole.ADMIN || activeRole === "Super User" || activeRole === "Admin") && (
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm font-sans cursor-pointer"
              >
                <UploadCloud size={15} />
                <span>Bulk Employee Upload (Excel)</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors font-sans cursor-pointer"
            >
              <Download size={14} className="text-blue-600" />
              <span>Export Employee Roster</span>
            </button>
          </div>
        </div>

        {/* Search & Filter dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee name, email, seat ID..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Departments</option>
            {availableDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Floors</option>
            {Array.from(new Set(employees.map(e => e.floor).filter(Boolean))).map(fl => (
              <option key={fl} value={fl}>{fl}</option>
            ))}
            {!employees.some(e => e.floor === "11 th Floor CRE") && (
              <option value="11 th Floor CRE">11 th Floor CRE</option>
            )}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      {selectedEmpIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 text-rose-950 font-medium">
            <span className="font-bold bg-rose-200 text-rose-900 px-2.5 py-1 rounded-lg">
              {selectedEmpIds.length} Selected
            </span>
            <span>out of {filteredEmployees.length} listed employees</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedEmpIds([])}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold bg-white border border-slate-200 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDeleteEmps}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={14} />
              <span>Delete Selected ({selectedEmpIds.length})</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="emp-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredEmployees.length > 0 && selectedEmpIds.length === filteredEmployees.length}
                    onChange={toggleSelectAllEmps}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Employee ID & Name</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Department & Role</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Business Head & Manager</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Assigned Seat Location</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Hardware Assets</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const empAssets = assets.filter(a => a.employeeId === emp.id || a.employeeName === emp.name);
                const isSelected = selectedEmpIds.includes(emp.id);

                return (
                  <tr key={emp.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? "bg-blue-50/40" : ""}`}>
                    <td className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectEmp(emp.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        {emp.avatarUrl ? (
                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="w-8 h-8 rounded-full object-cover border border-blue-400 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                            {emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Mail size={11} />
                            {emp.email}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">ID: {emp.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-800">{emp.department}</div>
                      <div className="text-[10px] text-slate-500">{emp.role}</div>
                    </td>

                    <td className="p-3">
                      <div className="text-slate-800 font-medium">{emp.manager || "Executive Board"}</div>
                      {emp.businessHead && emp.businessHead !== "N/A" && emp.businessHead !== "Marcus Wright" && (
                        <div className="text-[10px] text-slate-400">Head: {emp.businessHead}</div>
                      )}
                    </td>

                    <td className="p-3">
                      {emp.seatNumber ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            {emp.seatNumber}
                          </span>
                          {onSelectEmployeeSeat && (
                            <button
                              onClick={() => onSelectEmployeeSeat(emp.seatNumber!)}
                              className="text-[10px] text-blue-600 hover:underline flex items-center"
                            >
                              View on map
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unallocated</span>
                      )}
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{emp.floor}</div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Laptop size={14} className="text-blue-600" />
                        <span className="font-bold text-slate-800">{empAssets.length}</span>
                        <span className="text-[10px] text-slate-400">units</span>
                      </div>
                      {empAssets.length > 0 && (
                        <div className="text-[9px] font-mono text-slate-500 truncate max-w-[120px]">
                          {empAssets[0].assetTag}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                        {emp.accountStatus}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedEmp(emp)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-xs flex items-center gap-1"
                        >
                          <span>Profile</span>
                          <ChevronRight size={14} />
                        </button>
                        <button
                          onClick={() => handleSingleDelete(emp)}
                          title="Delete Employee"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal Profile Inspection */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900">{selectedEmp.name}</h4>
                <p className="text-xs text-slate-400 font-mono">{selectedEmp.email} • {selectedEmp.id}</p>
              </div>
              <button onClick={() => setSelectedEmp(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                <p className="font-bold text-slate-800">{selectedEmp.department}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">System Role</span>
                <p className="font-bold text-blue-600">{selectedEmp.role}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Seat</span>
                <p className="font-mono font-bold text-slate-800">{selectedEmp.seatNumber || "Unallocated"}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Reporting Manager</span>
                <p className="font-bold text-slate-800">{selectedEmp.manager || "N/A"}</p>
              </div>
            </div>

            {/* Linked Assets List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Laptop size={14} className="text-blue-600" />
                <span>Assigned IT Hardware Assets</span>
              </h5>

              {assets.filter(a => a.employeeId === selectedEmp.id || a.employeeName === selectedEmp.name).length > 0 ? (
                <div className="space-y-1.5">
                  {assets.filter(a => a.employeeId === selectedEmp.id || a.employeeName === selectedEmp.name).map(asset => (
                    <div key={asset.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <strong className="font-bold text-slate-800">{asset.name}</strong>
                        <div className="text-[10px] text-slate-400 font-mono">Tag: {asset.assetTag} • SN: {asset.serialNumber}</div>
                      </div>
                      <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        {asset.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No IT hardware currently assigned to this employee profile.</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const empToDelete = selectedEmp;
                  setSelectedEmp(null);
                  handleSingleDelete(empToDelete);
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>Delete Profile</span>
              </button>
              <button
                onClick={() => setSelectedEmp(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK EMPLOYEE PROFILE CREATION VIA EXCEL MODAL */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight font-display">
                    Bulk Employee Profile Upload (Excel / CSV)
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Upload employee rosters in single file & automatically dispatch onboarding email notifications to all users simultaneously.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setParsedEmps([]);
                  setParsedUsers([]);
                  setBulkParseErrors([]);
                  setBulkSuccessDispatched(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle size={20} />
              </button>
            </div>

            {bulkSuccessDispatched ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
                <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full">
                  <CheckCircle size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-emerald-900">
                    Bulk Employee Provisioning & Email Dispatch Complete!
                  </h4>
                  <p className="text-xs text-emerald-700 max-w-lg mx-auto">
                    Successfully created <strong>{dispatchedCount} employee profiles</strong> and dispatched login credential emails simultaneously to all users.
                  </p>
                </div>

                <div className="bg-white border border-emerald-200 rounded-xl p-4 text-xs font-mono text-slate-700 max-w-md mx-auto text-left space-y-1.5 shadow-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400">Total Account Profiles:</span>
                    <strong className="text-emerald-700">{dispatchedCount} Users</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400">Email Dispatch Mode:</span>
                    <strong className="text-purple-700">Simultaneous Mass Broadcast</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">System Notification Event:</span>
                    <span className="text-slate-800 font-bold">enterprizseat:email_dispatched</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    setParsedEmps([]);
                    setParsedUsers([]);
                    setBulkParseErrors([]);
                    setBulkSuccessDispatched(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  Done & Return to Directory
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Download Template Banner */}
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Download size={14} className="text-purple-600" />
                      <span>Download Standard Excel Sheet Template</span>
                    </p>
                    <p className="text-[11px] text-purple-700">
                      Required columns: Full Name, Corporate Email, Department, Role Designation, Phone Number, Company, Business Head, Reporting Manager, Assigned Floor, Assigned Seat Number.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadEmployeeTemplate}
                    className="bg-white hover:bg-purple-100 text-purple-700 border border-purple-300 text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors"
                  >
                    <Download size={13} />
                    <span>Download Template (.xlsx)</span>
                  </button>
                </div>

                {/* File Upload Box */}
                <div className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-6 text-center transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleParseEmployeeExcel}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-purple-600 shadow-2xs group-hover:scale-105 transition-transform">
                      <Upload size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {bulkFileName ? `Selected: ${bulkFileName}` : "Click or drag Excel / CSV file here to upload employee roster"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Supports .XLSX, .XLS, or .CSV formatted sheets
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parsing Errors Warning */}
                {bulkParseErrors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1 text-amber-800">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <AlertTriangle size={14} />
                      <span>Validation Notices ({bulkParseErrors.length} skipped)</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-amber-700 max-h-24 overflow-y-auto space-y-0.5 font-mono">
                      {bulkParseErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parsed Employees Preview Table */}
                {parsedEmps.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <UserPlus size={14} className="text-purple-600" />
                        <span>Parsed Employee Profiles Preview ({parsedEmps.length} Ready)</span>
                      </h4>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                        Simultaneous Email Notification On Commit
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto text-xs">
                      <table className="w-full text-left border-collapse font-sans">
                        <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase sticky top-0">
                          <tr>
                            <th className="p-2 border-b">Full Name</th>
                            <th className="p-2 border-b">Corporate Email</th>
                            <th className="p-2 border-b">Department</th>
                            <th className="p-2 border-b">Role</th>
                            <th className="p-2 border-b">Assigned Seat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {parsedEmps.map((emp, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-slate-900">{emp.name}</td>
                              <td className="p-2 font-mono text-[11px] text-slate-600">{emp.email}</td>
                              <td className="p-2">{emp.department}</td>
                              <td className="p-2">
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {emp.role}
                                </span>
                              </td>
                              <td className="p-2 font-mono font-bold text-emerald-700">{emp.seatNumber || "Hot Desk"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowBulkUploadModal(false);
                      setParsedEmps([]);
                      setParsedUsers([]);
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleConfirmBulkUpload}
                    disabled={parsedEmps.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all"
                  >
                    <Send size={14} />
                    <span>Commit Bulk Profiles & Send Emails ({parsedEmps.length} Users)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
