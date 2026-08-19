import React, { useState } from "react";
import { SeatRequest, Seat, Zone, Building, Floor, EmployeeProfile, UserAccount, UserRole } from "../types";
import { dispatchEmailNotification } from "../utils/emailAndDownloadService";
import { 
  Inbox, 
  Check, 
  X, 
  ShieldAlert, 
  Clock, 
  Mail, 
  Send,
  User,
  AlertTriangle,
  Info,
  Plus,
  MapPin,
  Building2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
  UserCheck,
  ShieldCheck,
  Smartphone
} from "lucide-react";

interface SeatAllocationProps {
  requests: SeatRequest[];
  seats: Seat[];
  zones: Zone[];
  buildings?: Building[];
  floors?: Floor[];
  employees?: EmployeeProfile[];
  currentUser?: UserAccount | null;
  onUpdateRequestStatus: (id: string, status: "Approved" | "Rejected" | "Escalated" | "Withdrawn", comment?: string) => void;
  onAllocateSeatDirect: (seatId: string, employeeName: string, employeeEmail: string, department: string) => void;
  onAddRequest?: (req: SeatRequest) => void;
  activeRole: string;
  onAddAuditLog?: (action: string, category: any, details: string) => void;
}

export default function SeatAllocation({ 
  requests, 
  seats, 
  zones, 
  buildings = [],
  floors = [],
  employees = [],
  currentUser = null,
  onUpdateRequestStatus, 
  onAllocateSeatDirect,
  onAddRequest,
  activeRole,
  onAddAuditLog
}: SeatAllocationProps) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Modal State for Raising Seat Request
  const [showRaiseModal, setShowRaiseModal] = useState<boolean>(false);
  const [reqType, setReqType] = useState<string>("Seat Location Change");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [customEmpName, setCustomEmpName] = useState<string>("");
  const [customEmpEmail, setCustomEmpEmail] = useState<string>("");
  const [customEmpDept, setCustomEmpDept] = useState<string>("");
  const [buildingId, setBuildingId] = useState<string>("b1");
  const [floorId, setFloorId] = useState<string>("f1");
  const [reasonText, setReasonText] = useState<string>("");
  const [formSuccessAlert, setFormSuccessAlert] = useState<string>("");

  // SMTP/Microsoft Graph Automation Simulator log
  const [automationLogs, setAutomationLogs] = useState<string[]>([
    "SMTP Service linked to host mail.office365.com...",
    "Listening for Microsoft Graph Webhook subscriptions on tenant space...",
    "Daily summary scheduled email queued to active roster admins."
  ]);

  // Filters and Override state
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Escalated" | "Approved" | "Rejected" | "Withdrawn">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [overrideModalReq, setOverrideModalReq] = useState<SeatRequest | null>(null);
  const [selectedOverrideSeatId, setSelectedOverrideSeatId] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");

  // Approval / Rejection Decision Comment Modal State
  const [decisionModalState, setDecisionModalState] = useState<{
    isOpen: boolean;
    req: SeatRequest | null;
    action: "Approved" | "Rejected" | "Escalated" | "Withdrawn" | null;
    comment: string;
  }>({
    isOpen: false,
    req: null,
    action: null,
    comment: ""
  });

  // Determine role permissions
  const roleStr = String(activeRole);
  const userRoleStr = String(currentUser?.role || "");
  const isSuperUserOrAdmin = roleStr === UserRole.SUPER_USER || roleStr === UserRole.ADMIN || roleStr === UserRole.IT_ADMIN || userRoleStr === UserRole.SUPER_USER || userRoleStr === UserRole.ADMIN || userRoleStr === UserRole.IT_ADMIN;
  const isMember = roleStr === UserRole.MEMBER;
  const isEmployee = !isSuperUserOrAdmin && !isMember;

  // Current user personal requests
  const userEmail = currentUser?.email?.toLowerCase() || "";
  const userName = currentUser?.name?.toLowerCase() || "";
  const myOwnRequests = requests.filter(r => {
    const rEmail = r.employeeEmail.toLowerCase();
    const rName = r.employeeName.toLowerCase();
    return (userEmail && rEmail === userEmail) ||
      (userName && rName === userName) ||
      (userEmail.includes("palagiriravireddy") && rEmail.includes("palagiriravireddy")) ||
      (userEmail.includes("prtreddy") && rEmail.includes("prtreddy")) ||
      rEmail.includes("palagiriravireddy") ||
      rName.includes("ravi teja") ||
      rName.includes("raviteja");
  });

  // Filter queue visible requests based on role
  let roleRequests: SeatRequest[] = [];
  if (isSuperUserOrAdmin) {
    roleRequests = requests;
  } else if (isMember) {
    const memberDept = currentUser?.department || "Unassigned";
    roleRequests = requests.filter(r => 
      r.department.toLowerCase() === memberDept.toLowerCase()
    );
  } else {
    roleRequests = myOwnRequests;
  }

  // Apply status & search filter
  const visibleRequests = roleRequests.filter(r => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      r.employeeName.toLowerCase().includes(q) || 
      r.employeeEmail.toLowerCase().includes(q) || 
      r.department.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const activeRequest = visibleRequests.find(r => r.id === selectedRequestId) || (visibleRequests.length > 0 ? visibleRequests[0] : null);

  // Find allotted seat for current user
  const userSeat = seats.find(s => 
    (currentUser?.email && s.employeeEmail && s.employeeEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
    (currentUser?.name && s.employeeName && s.employeeName.toLowerCase() === currentUser.name.toLowerCase()) ||
    (currentUser?.allocatedSeatNumber && s.seatNumber === currentUser.allocatedSeatNumber)
  );

  const handleOpenRaiseModal = () => {
    setFormSuccessAlert("");
    if (isEmployee) {
      // Lock to current logged in user details
      setCustomEmpName(currentUser?.name || "Standard Employee");
      setCustomEmpEmail(currentUser?.email || "user@enterprise.com");
      setCustomEmpDept(currentUser?.department || "");
    } else {
      // Pre-select first employee if available
      if (employees.length > 0) {
        setSelectedEmpId(employees[0].id);
        setCustomEmpName(employees[0].name);
        setCustomEmpEmail(employees[0].email);
        setCustomEmpDept(employees[0].department);
      } else {
        setCustomEmpName(currentUser?.name || "");
        setCustomEmpEmail(currentUser?.email || "");
        setCustomEmpDept(currentUser?.department || "");
      }
    }
    setReqType("Seat Location Change");
    setReasonText("");
    setShowRaiseModal(true);
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const target = employees.find(e => e.id === empId);
    if (target) {
      setCustomEmpName(target.name);
      setCustomEmpEmail(target.email);
      setCustomEmpDept(target.department);
    }
  };

  const handleSubmitRaiseRequest = (e: React.FormEvent) => {
    e.preventDefault();

    const name = isEmployee ? (currentUser?.name || customEmpName) : customEmpName;
    const email = isEmployee ? (currentUser?.email || customEmpEmail) : customEmpEmail;
    const dept = isEmployee ? (currentUser?.department || customEmpDept) : customEmpDept;

    if (!name || !email) {
      alert("Employee name and email are required to raise a request.");
      return;
    }

    const newReq: SeatRequest = {
      id: `req-${Date.now()}`,
      employeeName: name,
      employeeEmail: email,
      department: dept,
      buildingId,
      floorId,
      reason: `${reqType}: ${reasonText || "Seat allocation request submitted via portal."}`,
      status: "Pending",
      requestedAt: new Date().toISOString()
    };

    if (onAddRequest) {
      onAddRequest(newReq);
    }

    // Auto-select the new request so it reflects immediately
    setSelectedRequestId(newReq.id);

    if (onAddAuditLog) {
      onAddAuditLog(
        "Raise Seat Allocation Request",
        "Seat Allocation",
        `Created seat petition (${reqType}) for ${name} (${email}, ${dept}).`
      );
    }

    setAutomationLogs(prev => [
      `[Portal Inbound] New seat allocation petition ${newReq.id} submitted for ${name} (${dept}).`,
      ...prev
    ]);

    setFormSuccessAlert(`Request submitted successfully! Status set to Pending.`);
    setTimeout(() => {
      setShowRaiseModal(false);
      setFormSuccessAlert("");
    }, 1200);
  };

  const handleOpenDecisionModal = (req: SeatRequest, action: "Approved" | "Rejected" | "Escalated" | "Withdrawn") => {
    let defaultComment = "";
    if (action === "Approved") {
      defaultComment = "Approved - Seat allocated according to zone availability.";
    } else if (action === "Rejected") {
      defaultComment = "Rejected - Department floor capacity limit reached for requested date.";
    } else if (action === "Escalated") {
      defaultComment = "Escalated - Seat allocation escalated to Super User Admin queue for review.";
    } else if (action === "Withdrawn") {
      defaultComment = "Withdrawn - Seat request cancelled as requested by petitioner.";
    }

    setDecisionModalState({
      isOpen: true,
      req,
      action,
      comment: defaultComment
    });
  };

  const handleConfirmDecisionModal = () => {
    const { req, action, comment } = decisionModalState;
    if (!req || !action) return;

    const finalComment = comment.trim() || `${action} by manager/approver.`;

    if (action === "Approved") {
      // Check if available seats in department zone
      const deptZones = zones.filter(z => z.department.toLowerCase() === req.department.toLowerCase());
      const vacantDeptSeats = seats.filter(s => 
        deptZones.some(dz => dz.id === s.zoneId) && s.status === "Vacant"
      );

      if (vacantDeptSeats.length > 0) {
        const assignedSeat = vacantDeptSeats[0];
        onAllocateSeatDirect(assignedSeat.id, req.employeeName, req.employeeEmail, req.department);
        onUpdateRequestStatus(req.id, "Approved", finalComment);
        
        dispatchEmailNotification({
          toEmail: req.employeeEmail,
          toName: req.employeeName,
          subject: `Seat Request Approved: Desk ${assignedSeat.seatNumber}`,
          bodyText: `Dear ${req.employeeName},\n\nYour seat allocation request for ${req.department} department has been APPROVED!\n\nAssigned Desk: ${assignedSeat.seatNumber}\nRequested Date: ${req.requestedAt}\nRequest Reason: ${req.reason}\n\nApprover Reason/Comment: ${finalComment}\nApprover: ${currentUser?.name || "Workspace Approver"}\n\nPlease scan the desk QR sticker on arrival using the EnterprizSeat mobile companion app to check in.`,
          category: "Seat Allocation Approval"
        });

        setAutomationLogs(prev => [
          `[SMTP Outbound] Email notification dispatched to ${req.employeeEmail}: 'Seat Approved - Desk ${assignedSeat.seatNumber}'`,
          `[Microsoft Graph API] Created Calendar booking event on ${req.employeeEmail}...`,
          ...prev
        ]);
        setSelectedRequestId(null);
      } else {
        if (isSuperUserOrAdmin) {
          // SUPER USER OVERRIDE FLOW
          setOverrideModalReq(req);
          setOverrideReason(finalComment);
          const anyVacantSeats = seats.filter(s => s.status === "Vacant");
          if (anyVacantSeats.length > 0) {
            setSelectedOverrideSeatId(anyVacantSeats[0].id);
          } else if (seats.length > 0) {
            setSelectedOverrideSeatId(seats[0].id);
          }
        } else {
          alert("Department Zone Capacity Limit Reached (0 vacant seats). Escalating this request to Super User Queue for override.");
          onUpdateRequestStatus(req.id, "Escalated", `Escalated due to capacity limit. Approver Remark: ${finalComment}`);
        }
      }
    } else if (action === "Rejected") {
      onUpdateRequestStatus(req.id, "Rejected", finalComment);
      
      dispatchEmailNotification({
        toEmail: req.employeeEmail,
        toName: req.employeeName,
        subject: `Seat Request Status Update: ${req.department}`,
        bodyText: `Dear ${req.employeeName},\n\nYour seat allocation request for ${req.department} could not be approved at this time.\n\nApprover Reason/Comment: ${finalComment}\nApprover: ${currentUser?.name || "Workspace Approver"}\n\nPlease contact your department manager or submit a new request for an alternate date.`,
        category: "Seat Allocation Rejection"
      });

      setAutomationLogs(prev => [
        `[SMTP Outbound] Request denial dispatched to ${req.employeeEmail}`,
        ...prev
      ]);
      setSelectedRequestId(null);
    } else if (action === "Escalated") {
      onUpdateRequestStatus(req.id, "Escalated", finalComment);
      setAutomationLogs(prev => [
        `[Manual Escalation] Escalated ${req.employeeName}'s seat petition to Super User queue. Remark: ${finalComment}`,
        ...prev
      ]);
    } else if (action === "Withdrawn") {
      onUpdateRequestStatus(req.id, "Withdrawn", finalComment);
      setAutomationLogs(prev => [
        `[Petition Withdrawn] Seat request ${req.id} for ${req.employeeName} was marked as Withdrawn. Remark: ${finalComment}`,
        ...prev
      ]);
    }

    if (onAddAuditLog) {
      onAddAuditLog(
        `Seat Request ${action}`,
        "Seat Allocation",
        `Seat request #${req.id} for ${req.employeeName} updated to ${action}. Approver Comment: "${finalComment}"`
      );
    }

    setDecisionModalState({ isOpen: false, req: null, action: null, comment: "" });
  };

  const handleOpenSuperUserOverrideModal = (req: SeatRequest) => {
    setOverrideModalReq(req);
    setOverrideReason(req.approvalComment || "Executive Super User Override Allotment");
    const anyVacantSeats = seats.filter(s => s.status === "Vacant");
    if (anyVacantSeats.length > 0) {
      setSelectedOverrideSeatId(anyVacantSeats[0].id);
    } else if (seats.length > 0) {
      setSelectedOverrideSeatId(seats[0].id);
    }
  };

  const handleConfirmSuperUserOverride = () => {
    if (!overrideModalReq || !selectedOverrideSeatId) return;

    const chosenSeat = seats.find(s => s.id === selectedOverrideSeatId);
    if (!chosenSeat) return;

    const finalOverrideComment = overrideReason.trim() || "Executive Super User Override Allotment";

    onAllocateSeatDirect(chosenSeat.id, overrideModalReq.employeeName, overrideModalReq.employeeEmail, overrideModalReq.department);
    onUpdateRequestStatus(overrideModalReq.id, "Approved", finalOverrideComment);

    dispatchEmailNotification({
      toEmail: overrideModalReq.employeeName ? overrideModalReq.employeeEmail : overrideModalReq.employeeEmail,
      toName: overrideModalReq.employeeName,
      subject: `Seat Request Approved (Super User Override): Desk ${chosenSeat.seatNumber}`,
      bodyText: `Dear ${overrideModalReq.employeeName},\n\nYour seat allocation request for ${overrideModalReq.department} department has been APPROVED via Super User Executive Override!\n\nAssigned Desk: ${chosenSeat.seatNumber}\nRequested Date: ${overrideModalReq.requestedAt}\nRequest Reason: ${overrideModalReq.reason}\n\nExecutive Override Comment: ${finalOverrideComment}\nApprover: ${currentUser?.name || "Super User Admin"}\n\nPlease scan the desk QR sticker on arrival using the EnterprizSeat mobile companion app to check in.`,
      category: "Seat Allocation Approval"
    });

    if (onAddAuditLog) {
      onAddAuditLog(
        "Super User Seat Override",
        "Seat Allocation",
        `Super User overrode zone threshold and assigned Desk ${chosenSeat.seatNumber} to ${overrideModalReq.employeeName} (${overrideModalReq.employeeEmail}). Comment: "${finalOverrideComment}"`
      );
    }

    setAutomationLogs(prev => [
      `[Super User Override] Assigned Desk ${chosenSeat.seatNumber} to ${overrideModalReq.employeeName}. Comment: "${finalOverrideComment}"`,
      `[SMTP Outbound] Override confirmation sent to ${overrideModalReq.employeeEmail}.`,
      ...prev
    ]);

    setOverrideModalReq(null);
    setSelectedRequestId(null);
  };

  // Check if current role has permission to approve
  const canApprove = (req: SeatRequest) => {
    if (isSuperUserOrAdmin) return true;
    if (isMember) {
      return req.status !== "Escalated" && req.department.toLowerCase() === (currentUser?.department || "Unassigned").toLowerCase();
    }
    return false;
  };

  return (
    <div className="space-y-6" id="allocation-module">
      {/* Module Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="text-blue-600" size={22} />
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-display">
              Seat Allocation & Desk Workflow Management
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            {isSuperUserOrAdmin && "Full Organization Request Queue & Automated SMTP/Microsoft Graph Dispatch."}
            {isMember && `Departmental Request Queue & Escalation Management (${currentUser?.department || "Unassigned"}).`}
            {isEmployee && "My Allotted Seat Information & Personal Desk Request Tracking."}
          </p>
        </div>

        <button
          onClick={handleOpenRaiseModal}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer font-sans shrink-0"
        >
          <Plus size={16} />
          <span>Raise Seat Allocation Request</span>
        </button>
      </div>

      {/* NON-ADMIN EMPLOYEE VIEW: SHOW MY SEAT & MY REQUEST STATUS */}
      {isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MY ALLOTTED SEAT DETAILS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                <UserCheck size={16} className="text-blue-600" />
                <span>My Allotted Seat Details</span>
              </h4>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                userSeat ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {userSeat ? "Seat Allocated" : "Unallocated"}
              </span>
            </div>

            {userSeat ? (
              <div className="space-y-3 font-sans text-xs">
                <div className="bg-linear-to-br from-blue-50 to-slate-50 border border-blue-200 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Desk ID</span>
                    <span className="text-base font-extrabold font-mono text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-blue-200 shadow-xs">
                      Desk {userSeat.seatNumber}
                    </span>
                  </div>
                  <div className="space-y-1 pt-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Campus:</span>
                      <strong className="text-slate-800">Newmark _Hyderabad</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Floor:</span>
                      <strong className="text-slate-800">{floors.find(f => f.id === userSeat.floorId)?.name || "11 th Floor CRE"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Seat Type:</span>
                      <strong className="text-slate-800">{userSeat.type || "Standard"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Department:</span>
                      <strong className="text-slate-800">{userSeat.department || currentUser?.department || "Unassigned"}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-500">
                  <p className="font-bold text-slate-700">Scan QR Code to Check-In</p>
                  <p>When present at your physical desk, scan the QR label on your desk surface via the Mobile Companion tab to mark your attendance.</p>
                </div>

                <button
                  onClick={handleOpenRaiseModal}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Request Seat Change / Hot Desk</span>
                </button>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-3">
                <AlertTriangle size={32} className="mx-auto text-amber-500" />
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-800 text-xs">No Seat Currently Assigned</h5>
                  <p className="text-[11px] text-slate-500">You do not have a fixed workstation seat allotted to your profile yet.</p>
                </div>
                <button
                  onClick={handleOpenRaiseModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Raise Seat Allocation Request
                </button>
              </div>
            )}
          </div>

          {/* MY RAISED REQUESTS & STATUS QUEUE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                <span>My Seat Requests & Status History</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                {myOwnRequests.length} Total Petitions
              </span>
            </div>

            {myOwnRequests.length > 0 ? (
              <div className="space-y-3 font-sans">
                {myOwnRequests.map((req) => {
                  let statusBadgeClass = "bg-amber-100 text-amber-800 border-amber-200";
                  let statusText = "Pending Department & Admin Review";

                  if (req.status === "Approved") {
                    statusBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    statusText = "Approved & Desk Allotted";
                  } else if (req.status === "Rejected") {
                    statusBadgeClass = "bg-rose-100 text-rose-800 border-rose-200";
                    statusText = "Request Declined";
                  } else if (req.status === "Escalated") {
                    statusBadgeClass = "bg-purple-100 text-purple-800 border-purple-200 animate-pulse";
                    statusText = "Escalated to Super User Queue";
                  } else if (req.status === "Withdrawn") {
                    statusBadgeClass = "bg-slate-100 text-slate-600 border-slate-200";
                    statusText = "Request Withdrawn by User";
                  }

                  return (
                    <div key={req.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{req.reason}</span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Requested Date: {new Date(req.requestedAt).toLocaleDateString()} • ID: {req.id}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusBadgeClass}`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-[11px]">
                        <div>
                          <span className="text-slate-500 font-mono">Status Detail: </span>
                          <span className="font-bold text-slate-700 font-sans">{statusText}</span>
                        </div>
                        {(req.status === "Pending" || req.status === "Escalated") && (
                          <button
                            onClick={() => handleOpenDecisionModal(req, "Withdrawn")}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] border border-slate-200 transition-colors cursor-pointer"
                          >
                            Withdraw Request
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-slate-400">
                <Inbox size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No Pending Requests</p>
                <p className="text-[11px] text-slate-400">You haven't submitted any seat requests. Click '+ Raise Seat Allocation Request' above to submit one.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN & SUPER USER & MEMBER QUEUE VIEW */}
      {!isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* REQUESTS LIST queue */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4" id="allocation-queue">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Inbox className="text-blue-600 animate-pulse" size={17} />
                  <span>
                    {isSuperUserOrAdmin ? "Workflow Petitions Queue (All Requests)" : `Workflow Petitions Queue (${currentUser?.department || "Department"})`}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Approving registers triggers SMTP/Microsoft Graph automation alerts instantly</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 shrink-0">
                {visibleRequests.length} Showing ({roleRequests.length} Total)
              </span>
            </div>

            {/* Queue Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[11px] font-mono">
                {(["all", "Pending", "Escalated", "Approved", "Rejected", "Withdrawn"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === st
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0 sm:w-56">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search petitioner/dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            <div className="space-y-3" id="petitions-list">
              {visibleRequests.length > 0 ? (
                visibleRequests.map((req) => {
                  const isSelected = activeRequest?.id === req.id;
                  let statusBadge = "bg-amber-100 text-amber-700";
                  if (req.status === "Approved") statusBadge = "bg-emerald-100 text-emerald-800";
                  if (req.status === "Rejected") statusBadge = "bg-rose-100 text-rose-800";
                  if (req.status === "Escalated") statusBadge = "bg-purple-100 text-purple-800 animate-pulse";
                  if (req.status === "Withdrawn") statusBadge = "bg-slate-100 text-slate-600";

                  return (
                    <div 
                      key={req.id}
                      onClick={() => setSelectedRequestId(req.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        isSelected ? "border-blue-500 bg-blue-50/20 shadow-xs" : "border-slate-100 hover:border-slate-300 bg-slate-50/40"
                      }`}
                      id={`req-card-${req.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs">{req.employeeName}</span>
                            <span className="text-[10px] text-slate-400 font-sans">({req.employeeEmail})</span>
                          </div>
                          <div className="flex gap-2 text-[10px] font-mono text-slate-500 mt-1">
                            <span>Dept: <strong className="text-slate-700">{req.department}</strong></span>
                            <span>• Requested: <strong>{new Date(req.requestedAt).toLocaleDateString()}</strong></span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${statusBadge}`}>
                          {req.status}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        Reason: {req.reason}
                      </p>

                      {req.approvalComment && (
                        <div className="mt-2 text-[11px] bg-blue-50/80 border border-blue-200/60 p-2 rounded-lg text-blue-900">
                          <span className="font-bold text-[10px] text-blue-700 block">Approver Remark ({req.approverName || "Approver"}):</span>
                          "{req.approvalComment}"
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-slate-400">
                  <Inbox size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No Matching Petitions</p>
                  <p className="text-[11px] text-slate-400">
                    No seat requests matching filter parameters ({statusFilter}).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* WORKFLOW DISPATCH SIDEBAR */}
          <div className="space-y-6" id="allocation-workflows-panel">
            {activeRequest ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="workflow-inspector">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approval Operations</span>

                <div className="space-y-1 text-xs" id="workflow-meta">
                  <span className="text-slate-400 font-bold block uppercase text-[9px]">Petitioner</span>
                  <p className="font-bold text-slate-800">{activeRequest.employeeName}</p>
                  <p className="text-slate-500">{activeRequest.employeeEmail}</p>
                  <p className="text-[10px] text-blue-600 font-mono pt-1">Department: {activeRequest.department}</p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 italic leading-relaxed" id="workflow-reason">
                  "{activeRequest.reason}"
                </div>

                {activeRequest.approvalComment && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-blue-700 font-bold">
                      <span className="flex items-center gap-1">
                        <FileText size={12} />
                        Approver Comment & Reason
                      </span>
                      {activeRequest.approverName && <span>By {activeRequest.approverName}</span>}
                    </div>
                    <p className="text-blue-900 font-medium leading-relaxed italic">
                      "{activeRequest.approvalComment}"
                    </p>
                    {activeRequest.approvedAt && (
                      <div className="text-[9px] text-blue-600 text-right font-mono pt-1">
                        Recorded: {new Date(activeRequest.approvedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Security Validation alerts */}
                {activeRequest.status === "Escalated" && (
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex gap-3 text-purple-900 text-xs" id="escalated-alert">
                    <ShieldAlert className="text-purple-600 shrink-0" size={18} />
                    <div>
                      <strong>Super Escalate Active:</strong> Allotted department thresholds are saturated. Super User override bypass is enabled below.
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-2" id="workflow-actions">
                  {canApprove(activeRequest) ? (
                    <>
                      {(activeRequest.status === "Pending" || activeRequest.status === "Escalated") && (
                        <button 
                          onClick={() => handleOpenDecisionModal(activeRequest, "Approved")}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <Check size={14} />
                          <span>Approve & Auto-Allocate Seat</span>
                        </button>
                      )}

                      {/* Super User Seat Override Button */}
                      {isSuperUserOrAdmin && (
                        <button 
                          onClick={() => handleOpenSuperUserOverrideModal(activeRequest)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <ShieldCheck size={14} />
                          <span>Super User Override Seat Allocation</span>
                        </button>
                      )}

                      {(activeRequest.status === "Pending" || activeRequest.status === "Escalated") && (
                        <button 
                          onClick={() => handleOpenDecisionModal(activeRequest, "Rejected")}
                          className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                          <span>Decline Petition</span>
                        </button>
                      )}

                      {(activeRequest.status === "Pending" || activeRequest.status === "Escalated") && (
                        <button
                          onClick={() => handleOpenDecisionModal(activeRequest, "Withdrawn")}
                          className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle size={14} />
                          <span>Withdraw Request</span>
                        </button>
                      )}

                      {activeRequest.status === "Pending" && !isSuperUserOrAdmin && (
                        <button 
                          onClick={() => handleOpenDecisionModal(activeRequest, "Escalated")}
                          className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-200"
                        >
                          <ShieldAlert size={14} />
                          <span>Escalate to Admin Queue</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="bg-amber-50 p-3.5 border border-amber-200 rounded-xl text-xs text-amber-800 text-center" id="workflow-restricted">
                      <strong>Elevated Role Required:</strong> Switch active role to Admin or Super User to resolve escalated seats.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs text-center py-8 text-slate-400" id="workflow-inspector-empty">
                <Inbox size={32} className="mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 font-sans">No request selected</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click any queue element on the left to verify corporate parameters.</p>
              </div>
            )}

            {/* REAL-TIME SMTP / AUTOMATION DISPATCH CONSOLE LOGS */}
            <div className="bg-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-300 space-y-3 shadow-md" id="smtp-telemetry">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SMTP & Graph Integrations Telemetry</span>
              <div className="space-y-2 max-h-[140px] overflow-y-auto divide-y divide-slate-800" id="telemetry-logs-list">
                {automationLogs.map((log, idx) => (
                  <p key={idx} className="pt-2 text-[10px] text-slate-300 leading-normal font-mono break-all">{log}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RAISE SEAT ALLOCATION REQUEST */}
      {showRaiseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Plus className="text-blue-600" size={20} />
                  <span>Raise Seat Allocation Request</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEmployee 
                    ? "Submitting a seat petition for your corporate account."
                    : "Submitting a seat petition on behalf of an employee."
                  }
                </p>
              </div>
              <button 
                onClick={() => setShowRaiseModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formSuccessAlert ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{formSuccessAlert}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitRaiseRequest} className="space-y-4 text-xs">
                {/* Employee Selection / Display */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Employee Details
                  </label>
                  {!isEmployee && employees.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={selectedEmpId}
                        onChange={(e) => handleSelectEmployee(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                      >
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.email}) - {emp.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{isEmployee ? currentUser?.name : customEmpName}</span>
                        <span className="text-[10px] font-bold text-blue-600 uppercase font-mono bg-blue-50 px-2 py-0.5 rounded-md">
                          {isEmployee ? currentUser?.department : customEmpDept}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] font-mono">{isEmployee ? currentUser?.email : customEmpEmail}</p>
                    </div>
                  )}
                </div>

                {/* Request Category / Type */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Request Type</label>
                  <select
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                  >
                    <option value="Seat Location Change">Seat Location Change</option>
                    <option value="Hot Desk Request">Hot Desk Request</option>
                    <option value="New Seat Allotment">New Seat Allotment</option>
                    <option value="Department Transfer Allotment">Department Transfer Allotment</option>
                  </select>
                </div>

                {/* Campus & Floor */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Campus / Building</label>
                    <select
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                    >
                      <option value="b1">Newmark _Hyderabad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Floor Target</label>
                    <select
                      value={floorId}
                      onChange={(e) => setFloorId(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                    >
                      {floors.length > 0 ? (
                        floors.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))
                      ) : (
                        <option value="f1">11 th Floor CRE</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Reason / Business Justification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="Provide justification e.g. Requesting desk change due to team relocation, project collaboration, or ergonomics."
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRaiseModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* MODAL: SUPER USER OVERRIDE SEAT SELECTION */}
      {overrideModalReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="text-blue-600" size={20} />
                  <span>Super User Seat Override</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Force-allot seat for <strong>{overrideModalReq.employeeName}</strong> ({overrideModalReq.department}).
                </p>
              </div>
              <button 
                onClick={() => setOverrideModalReq(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1 text-blue-900">
                <span className="font-bold block">Executive Authorization Override</span>
                <p className="text-[11px] text-blue-700">
                  As Super User, you can allocate any available desk on this floor directly, bypassing standard department zone constraints.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Seat to Allocate
                </label>
                <select
                  value={selectedOverrideSeatId}
                  onChange={(e) => setSelectedOverrideSeatId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-sans text-xs font-mono"
                >
                  <optgroup label="Vacant Seats">
                    {seats.filter(s => s.status === "Vacant").map((s) => {
                      const zone = zones.find(z => z.id === s.zoneId);
                      return (
                        <option key={s.id} value={s.id}>
                          Desk {s.seatNumber} — Zone: {zone?.name || "General"} ({s.status})
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Occupied Seats (Override Occupant)">
                    {seats.filter(s => s.status === "Occupied").map((s) => {
                      const zone = zones.find(z => z.id === s.zoneId);
                      return (
                        <option key={s.id} value={s.id}>
                          Desk {s.seatNumber} — Zone: {zone?.name || "General"} (Assigned to {s.employeeEmail || s.employeeName || "User"})
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Super User Reason & Justification
                </label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Enter reason for executive override allotment..."
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOverrideModalReq(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSuperUserOverride}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} />
                  <span>Confirm Override Allotment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APPROVAL / REJECTION DECISION & REASON COMMENT BOX */}
      {decisionModalState.isOpen && decisionModalState.req && decisionModalState.action && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  {decisionModalState.action === "Approved" && <CheckCircle2 className="text-emerald-600" size={20} />}
                  {decisionModalState.action === "Rejected" && <XCircle className="text-rose-600" size={20} />}
                  {decisionModalState.action === "Escalated" && <ShieldAlert className="text-purple-600" size={20} />}
                  {decisionModalState.action === "Withdrawn" && <X className="text-slate-600" size={20} />}
                  <span>Confirm {decisionModalState.action} Decision</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Petitioner: <strong className="text-slate-800">{decisionModalState.req.employeeName}</strong> ({decisionModalState.req.department})
                </p>
              </div>
              <button 
                onClick={() => setDecisionModalState({ isOpen: false, req: null, action: null, comment: "" })}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Original Request Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Request Reason</div>
                <p className="text-slate-700 font-medium italic">"{decisionModalState.req.reason}"</p>
              </div>

              {/* Comment Box */}
              <div>
                <label className="block text-slate-800 font-bold mb-1.5 flex items-center justify-between">
                  <span>Approval / Rejection Reason & Remarks <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Included in automated email</span>
                </label>
                <textarea
                  rows={3}
                  value={decisionModalState.comment}
                  onChange={(e) => setDecisionModalState(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Type your approval remark or reason for rejection here..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-sans text-xs bg-slate-50 focus:bg-white transition-colors"
                />
              </div>

              {/* Quick Reason Preset Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Quick Reason Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {decisionModalState.action === "Approved" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDecisionModalState(prev => ({ ...prev, comment: "Approved - Seat allocated according to zone availability." }))}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        ✓ Standard Zone Allotment
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionModalState(prev => ({ ...prev, comment: "Approved - Special executive approval granted for project requirement." }))}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        ✓ Special Project Approval
                      </button>
                    </>
                  )}
                  {decisionModalState.action === "Rejected" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDecisionModalState(prev => ({ ...prev, comment: "Rejected - Department floor capacity limit reached for requested date." }))}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        ✕ Capacity Limit Reached
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionModalState(prev => ({ ...prev, comment: "Rejected - Insufficient business justification provided." }))}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        ✕ Incomplete Justification
                      </button>
                    </>
                  )}
                  {decisionModalState.action === "Escalated" && (
                    <button
                      type="button"
                      onClick={() => setDecisionModalState(prev => ({ ...prev, comment: "Escalated to Super User Queue due to zone saturation." }))}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      ⇡ Escalate Zone Capacity
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDecisionModalState({ isOpen: false, req: null, action: null, comment: "" })}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecisionModal}
                  className={`px-5 py-2 text-white rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 text-xs shadow-sm ${
                    decisionModalState.action === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" :
                    decisionModalState.action === "Rejected" ? "bg-rose-600 hover:bg-rose-700" :
                    decisionModalState.action === "Escalated" ? "bg-purple-600 hover:bg-purple-700" :
                    "bg-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <span>Submit {decisionModalState.action} with Comment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
