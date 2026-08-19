export enum UserRole {
  SUPER_USER = "Super User",
  ADMIN = "Admin",
  MEMBER = "Member (Dept Head)",
  IT_ADMIN = "IT Administrator",
  USER = "User"
}

// A tenant/company workspace. Every account, site, and downstream record
// (buildings, floors, zones, seats, employees, assets, requests, logs)
// carries an organizationId matching one of these so multiple companies
// can use the same deployment with separate branding and separate data.
export interface Organization {
  id: string;
  name: string;
  slug: string; // url/display-safe short code, e.g. "acme-corp"
  primaryColor: string; // hex, drives sidebar/header accent for this company
  logoInitials?: string; // 1-3 letters shown in the brand mark if no logo image
  logoUrl?: string;
  plan?: "Trial" | "Standard" | "Enterprise";
  ownerEmail: string;
  createdAt: string;
  // Master Configuration: which sidebar modules are switched off for everyone
  // in this workspace, regardless of role (e.g. "we never use DevOps Blueprints").
  hiddenModules?: string[];
  // Master Configuration: per-role access level for each module. Missing
  // entries fall back to the module's built-in default (see MODULE_DEFINITIONS
  // in App.tsx). Super User is intentionally not fully overridable to "hidden"
  // for its own account, to avoid an admin locking themselves out.
  rolePermissions?: {
    [role: string]: {
      [moduleId: string]: "edit" | "view" | "hidden";
    };
  };
}

export interface LocationSite {
  id: string;
  name: string;
  code: string;
  country: string;
  address: string;
  timeZone: string;
  isDefault?: boolean;
  organizationId?: string;
}

export interface Building {
  id: string;
  name: string;
  location: string;
  floorsCount: number;
  siteId?: string;
  organizationId?: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  capacity: number;
  zonesCount: number;
  isArchived?: boolean;
  lastModified?: string;
  siteId?: string;
  organizationId?: string;
}

export interface AiReaderCopy {
  id: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  siteId: string;
  siteName: string;
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorName: string;
  zonesCount: number;
  seatsCount: number;
  facilitiesCount: number;
  zones: Zone[];
  seats: Seat[];
  layoutObjects?: any[];
  previewUrl?: string;
  mode: "CREATED_NEW" | "REPLACED_EXISTING";
}

export interface Zone {
  id: string;
  floorId: string;
  name: string;
  department: string;
  color: string;
  type?: string;
  x: number; // custom layout offset
  y: number;
  width: number;
  height: number;
  capacity: number;
  isConfirmed?: boolean;
  // Optional freeform outline: when set, the zone renders as a smooth custom
  // shape through these points (in zone-local coordinates, i.e. relative to
  // x/y) instead of a plain rectangle. Each point can be dragged independently
  // so a single side can be pushed in/out without moving the whole edge.
  points?: { x: number; y: number }[];
  // CAD layer controls
  zIndex?: number;
  isLocked?: boolean;
  isHidden?: boolean;
  organizationId?: string;
}

export interface ITAsset {
  id: string; // Asset ID
  assetTag: string;
  name: string;
  type: string; // Laptop, Desktop, Docking Station, Monitor, Keyboard, Mouse, Telephone, Headset, etc.
  category?: string;
  manufacturer?: string;
  model?: string;
  serialNumber: string;
  warrantyExpiry: string;
  status: "Assigned" | "Available" | "Maintenance" | "Decommissioned";
  employeeId?: string;
  employeeName?: string;
  department?: string;
  company?: string;
  businessHead?: string;
  manager?: string;
  building?: string;
  floor?: string;
  zone?: string;
  seatNumber?: string;
  seatId?: string;
  assignmentDate?: string;
  remarks?: string;
  organizationId?: string;
}

export interface Seat {
  id: string;
  seatNumber: string;
  zoneId: string;
  floorId: string;
  buildingId: string;
  type: "Standard" | "Hot Desk" | "Executive" | "Collaborative";
  status: "Vacant" | "Occupied" | "Reserved";
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  allocatedDepartment?: string;
  allocatedManager?: string;
  managerName?: string;
  isFixedSlot?: boolean;
  x: number; // canvas relative percentage or pixels
  y: number;
  rotation?: number;
  assets?: ITAsset[];
  organizationId?: string;
}

export interface LayoutObject {
  id: string;
  floorId?: string;
  name: string;
  type: "Pantry" | "Reception" | "Emergency Exit" | "Rest Rooms" | "Conference Rooms" | "Cabin" | "Training Room" | "Dummy Cluster Pillar" | "Structural Pillar" | string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  // CAD layer controls
  zIndex?: number;
  isLocked?: boolean;
  isHidden?: boolean;
  organizationId?: string;
}

export interface EmployeeProfile {
  id: string; // Employee ID
  name: string;
  email: string;
  department: string;
  company: string;
  businessHead?: string;
  manager: string;
  floor: string;
  zone: string;
  seatNumber: string;
  seatType: string;
  occupancyStatus: "Occupied" | "Vacant" | "Remote" | "On Leave";
  assignedAssets: ITAsset[];
  lastLogin: string;
  accountStatus: "Active" | "Inactive" | "Locked";
  role: UserRole;
  avatarUrl?: string;
  organizationId?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  allocatedSeatNumber?: string;
  status: "Active" | "Inactive" | "Locked";
  lastLogin?: string;
  requiresPasswordReset?: boolean;
  password?: string;
  tempPassword?: string;
  failedLoginAttempts?: number;
  avatarUrl?: string;
  organizationId?: string;
}

export interface SeatRequest {
  id: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  buildingId: string;
  floorId: string;
  reason: string;
  status: "Pending" | "Approved" | "Escalated" | "Rejected" | "Withdrawn";
  requestedAt: string;
  escalatedToAdmin?: boolean;
  approvalComment?: string;
  approverName?: string;
  approvedAt?: string;
  organizationId?: string;
}

export interface CheckInLog {
  id: string;
  employeeName: string;
  seatNumber: string;
  buildingName: string;
  floorName: string;
  checkInTime: string;
  checkOutTime?: string;
  status: "Checked In" | "Checked Out";
  organizationId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: "Login/Logout" | "User Ops" | "Floor Map" | "Zone/Seat" | "IT Asset" | "Excel Ingest" | "Seat Allocation" | "QR Check-in" | "System";
  details: string;
  ipAddress: string;
  organizationId?: string;
}

export interface AssetExcelImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  importedAssets: ITAsset[];
  errorReport: {
    rowNumber: number;
    assetId: string;
    serialNumber: string;
    reason: string;
    fieldInError?: string;
    rawData: Record<string, any>;
  }[];
}

