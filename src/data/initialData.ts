import { LocationSite, Building, Floor, Zone, Seat, SeatRequest, ITAsset, CheckInLog, AuditLog, EmployeeProfile, UserAccount, UserRole } from "../types";
import { generateNewmarkBlueprintData } from "./newmarkFloorGenerator";

export const initialSites: LocationSite[] = [
  { 
    id: "site-hyd", 
    name: "Hyderabad Mindspace Campus", 
    code: "HYD", 
    country: "India", 
    address: "Building 11, Mindspace Cyberabad, Hitech City, Hyderabad, TS 500081", 
    timeZone: "IST (UTC+5:30)",
    isDefault: true
  }
];

export const initialBuildings: Building[] = [
  { id: "b1", name: "Newmark _Hyderabad", location: "Hyderabad, TS, India", floorsCount: 12, siteId: "site-hyd" }
];

export const initialFloors: Floor[] = [
  { id: "f1", buildingId: "b1", name: "11 th Floor CRE", capacity: 555, zonesCount: 19, isArchived: false, lastModified: "2026-07-23" }
];

const defaultNewmarkData = generateNewmarkBlueprintData("b1", "f1");

export const initialZones: Zone[] = defaultNewmarkData.zones;
export const initialSeats: Seat[] = defaultNewmarkData.seats;

export const initialAssets: ITAsset[] = [
  {
    id: "AST-1001",
    assetTag: "EQ-LP-8842",
    name: "MacBook Pro 16 M3 Max",
    type: "Laptop",
    category: "Hardware / Compute",
    manufacturer: "Apple Inc.",
    model: "A2992-M3MAX",
    serialNumber: "SN8842911",
    warrantyExpiry: "2028-06-15",
    status: "Assigned",
    employeeId: "emp-001",
    employeeName: "Raviteja Reddy palagiri",
    department: "Corporate Infrastructure",
    company: "Global Cyber Systems",
    manager: "Executive Board",
    building: "Newmark _Hyderabad",
    floor: "11 th Floor CRE",
    zone: "Zone A (Cloud Platform)",
    seatNumber: "A-100",
    seatId: "s1",
    assignmentDate: "2026-01-10",
    remarks: "Primary developer workstation with full administrator privileges."
  },
  {
    id: "AST-1002",
    assetTag: "EQ-MN-2034",
    name: "Dell UltraSharp 32 4K USB-C Monitor",
    type: "Monitor",
    category: "Peripherals / Displays",
    manufacturer: "Dell Technologies",
    model: "U3223QE",
    serialNumber: "SN2034102",
    warrantyExpiry: "2027-11-20",
    status: "Assigned",
    employeeId: "emp-001",
    employeeName: "Raviteja Reddy palagiri",
    department: "Corporate Infrastructure",
    company: "Global Cyber Systems",
    manager: "Executive Board",
    building: "Newmark _Hyderabad",
    floor: "11 th Floor CRE",
    zone: "Zone A (Cloud Platform)",
    seatNumber: "A-100",
    seatId: "s1",
    assignmentDate: "2026-01-10",
    remarks: "Dual display setup desk A-100."
  },
  {
    id: "AST-1003",
    assetTag: "EQ-DK-1102",
    name: "Thunderbolt 4 Docking Station 180W",
    type: "Docking Station",
    category: "Peripherals / Connectivity",
    manufacturer: "Lenovo",
    model: "ThinkPad Universal TB4",
    serialNumber: "SN1102553",
    warrantyExpiry: "2027-02-10",
    status: "Available",
    building: "Newmark _Hyderabad",
    floor: "11 th Floor CRE",
    zone: "IT Storage Locker 1",
    remarks: "In inventory stock, ready for immediate assignment."
  },
  {
    id: "AST-1004",
    assetTag: "EQ-KB-5592",
    name: "Logitech MX Keys S Wireless Keyboard",
    type: "Keyboard",
    category: "Input Devices",
    manufacturer: "Logitech",
    model: "MX Keys S",
    serialNumber: "SN5592112",
    warrantyExpiry: "2029-01-05",
    status: "Available",
    building: "Newmark _Hyderabad",
    floor: "11 th Floor CRE",
    zone: "IT Storage Locker 1",
    remarks: "Ergonomic keyboard in inventory."
  },
  {
    id: "AST-1005",
    assetTag: "EQ-MS-9943",
    name: "Logitech MX Master 3S Wireless Mouse",
    type: "Mouse",
    category: "Input Devices",
    manufacturer: "Logitech",
    model: "MX Master 3S",
    serialNumber: "SN9943441",
    warrantyExpiry: "2029-01-05",
    status: "Available",
    building: "Newmark _Hyderabad",
    floor: "11 th Floor CRE",
    zone: "IT Storage Locker 1",
    remarks: "Precision track mouse in inventory."
  },
  {
    id: "AST-1006",
    assetTag: "EQ-PH-7112",
    name: "Cisco IP Phone 8865 HD Video",
    type: "Telephone",
    category: "Telecommunications",
    manufacturer: "Cisco Systems",
    model: "CP-8865-K9",
    serialNumber: "SN7112880",
    warrantyExpiry: "2028-10-30",
    status: "Available",
    building: "Newmark _Hyderabad",
    floor: "11 th Floor CRE",
    zone: "IT Storage Locker 2",
    remarks: "Desk telephone in inventory."
  },
  {
    id: "AST-1007",
    assetTag: "EQ-HS-3088",
    name: "Jabra Engage 75 Stereo Wireless Headset",
    type: "Headset",
    category: "Audio",
    manufacturer: "Jabra",
    model: "Engage 75",
    serialNumber: "SN3088991",
    warrantyExpiry: "2028-04-12",
    status: "Available",
    building: "Newmark _Hyderabad",
    floor: "11 th Floor CRE",
    zone: "IT Storage Locker 2",
    remarks: "In inventory stock, ready for immediate assignment."
  },
  {
    id: "AST-1008",
    assetTag: "EQ-DT-4410",
    name: "HP Z4 G5 Workstation Tower i9-14900K",
    type: "Desktop",
    category: "Hardware / Compute",
    manufacturer: "HP Inc.",
    model: "Z4 G5",
    serialNumber: "SN4410882",
    warrantyExpiry: "2028-12-01",
    status: "Maintenance",
    building: "Newmark _Hyderabad",
    floor: "11 th Floor CRE",
    zone: "IT Bench A",
    remarks: "Undergoing RAM upgrade and thermal re-pasting."
  }
];

export const initialEmployees: EmployeeProfile[] = [
  {
    id: "emp-001",
    name: "Raviteja Reddy palagiri",
    email: "prtreddy06@gmail.com",
    department: "Corporate Infrastructure",
    company: "Global Cyber Systems",
    manager: "Executive Board",
    floor: "11 th Floor CRE",
    zone: "Zone A (Cloud Platform)",
    seatNumber: "A-100",
    seatType: "Executive",
    occupancyStatus: "Occupied",
    assignedAssets: [],
    lastLogin: "2026-07-21T09:55:00Z",
    accountStatus: "Active",
    role: UserRole.SUPER_USER
  }
];

export const initialUsers: UserAccount[] = [
  { 
    id: "usr-1", 
    name: "Raviteja Reddy palagiri", 
    email: "prtreddy06@gmail.com", 
    role: UserRole.SUPER_USER, 
    department: "Corporate Infrastructure", 
    status: "Active", 
    password: "Raviteja@06049825",
    lastLogin: "2026-07-21T09:55:00Z", 
    failedLoginAttempts: 0 
  }
];

export const initialSeatRequests: SeatRequest[] = [];

export const initialCheckInLogs: CheckInLog[] = [
  { id: "log-1", employeeName: "Raviteja Reddy palagiri", seatNumber: "A-100", buildingName: "Newmark _Hyderabad", floorName: "11 th Floor CRE", checkInTime: "2026-07-20T08:02:11-07:00", status: "Checked In" }
];

export const initialAuditLogs: AuditLog[] = [
  { id: "aud-1", timestamp: "2026-07-21T09:55:12Z", user: "Raviteja Reddy palagiri (Super User)", action: "User Login", category: "Login/Logout", details: "Successful JWT SSO authentication from Corporate Subnet.", ipAddress: "192.168.1.100" }
];

