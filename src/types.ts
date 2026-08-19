export enum UserRole {
  SUPER_USER = "Super User",
  ADMIN = "Admin",
  MEMBER = "Member (Dept Head)",
  IT_ADMIN = "IT Administrator",
  USER = "User"
}

export interface LocationSite {
  id: string;
  name: string;
  code: string;
  country: string;
  address: string;
  timeZone: string;
  isDefault?: boolean;
}

export interface Building {
  id: string;
  name: string;
  location: string;
  floorsCount: number;
  siteId?: string;
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
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: "Login/Logout" | "User Ops" | "Floor Map" | "Zone/Seat" | "IT Asset" | "Excel Ingest" | "Seat Allocation" | "QR Check-in" | "System";
  details: string;
  ipAddress: string;
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

