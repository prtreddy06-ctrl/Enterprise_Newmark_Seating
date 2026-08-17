/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { UserRole, Building, Floor, Zone, Seat, SeatRequest, CheckInLog, AuditLog, ITAsset, EmployeeProfile, UserAccount, LocationSite, AiReaderCopy, LayoutObject } from "./types";
import { 
  initialSites,
  initialBuildings, 
  initialFloors, 
  initialZones, 
  initialSeats, 
  initialSeatRequests, 
  initialCheckInLogs, 
  initialAuditLogs,
  initialEmployees,
  initialUsers,
  initialAssets
} from "./data/initialData";

import Header from "./components/Header";
import LoginPortal from "./components/LoginPortal";
import EmailToastAndModal from "./components/EmailToastAndModal";
import UserProfileModal from "./components/UserProfileModal";
import CreateSiteModal from "./components/CreateSiteModal";
import InsRoleBanner from "./components/InsRoleBanner";
import DashboardView from "./components/DashboardView";
import FloorMapDesigner from "./components/FloorMapDesigner";
import FloorReader from "./components/FloorReader";
import ExcelUpload from "./components/ExcelUpload";
import SeatAllocation from "./components/SeatAllocation";
import QRCodeSystem from "./components/QRCodeSystem";
import MobileSimulator from "./components/MobileSimulator";
import AssetManagement from "./components/AssetManagement";
import EmployeeDirectory from "./components/EmployeeDirectory";
import UserManagement from "./components/UserManagement";
import AuditLogsView from "./components/AuditLogsView";
import PowerBIDashboard from "./components/PowerBIDashboard";
import DeveloperFiles from "./components/DeveloperFiles";
import ManualsView from "./components/ManualsView";
import EncryptionSecurityModal from "./components/EncryptionSecurityModal";
import { getEncryptedStorage, setEncryptedStorage, reencryptAllLocalStorage, clearAllEnterprizCache } from "./lib/encryption";
import { 
  subscribeToCollection, 
  saveFirestoreDoc, 
  deleteFirestoreDoc,
  saveFirestoreBatch,
  deleteFirestoreBatch
} from "./lib/firestoreSync";
import { orderBy, limit } from "firebase/firestore";

import { 
  Grid, 
  Map as MapIcon, 
  Sparkles, 
  UploadCloud, 
  Inbox, 
  QrCode, 
  Smartphone, 
  Cpu, 
  BarChart, 
  Terminal, 
  BookOpen,
  Activity,
  Layers,
  Users,
  ShieldCheck,
  ShieldAlert,
  PanelLeftClose
} from "lucide-react";

const OLD_DEMO_EMAILS = [
  "grace.hopper@enterprise.com",
  "sarah.connor@enterprise.com",
  "alex.mercer@enterprise.com",
  "david.light@enterprise.com",
  "david.lightman@enterprise.com",
  "linus.t@enterprise.com",
  "linustorvalds@enterprise.com",
  "kaiser@enterprise.com",
  "miles.dyson@enterprise.com",
  "alan.turing@enterprise.com",
  "nikola.tesla@enterprise.com",
  "albert.einstein@enterprise.com",
  "marie.curie@enterprise.com",
  "thomas.edison@enterprise.com",
  "john.connor@enterprise.com"
];

const loadCleanBuildings = (): Building[] => {
  const loaded = loadStorage<Building[]>('buildings', initialBuildings);
  const filtered = loaded.filter(b => b.name.toLowerCase().includes("newmark"));
  return filtered.length > 0 ? filtered : initialBuildings;
};

const loadCleanFloors = (): Floor[] => {
  const creFloor: Floor = {
    id: "f1",
    buildingId: "b1",
    name: "11 th Floor CRE",
    capacity: 555,
    zonesCount: 19,
    isArchived: false,
    lastModified: "2026-07-23"
  };
  const loaded = loadStorage<Floor[]>('floors', [creFloor]);
  const obsoleteKeywords = ["floor 3", "floor 4", "floor 5"];
  const cleanFloors = loaded.filter(f => !obsoleteKeywords.some(kw => f.name.toLowerCase().includes(kw)));
  const finalFloors = cleanFloors.length > 0 ? cleanFloors : [creFloor];
  try {
    localStorage.setItem('enterprizseat_floors', JSON.stringify(finalFloors));
  } catch (e) {}
  return finalFloors;
};
const loadStorage = <T,>(key: string, fallback: T): T => {
  return getEncryptedStorage<T>(key, fallback);
};

const loadCleanUsers = (): UserAccount[] => {
  const hasStorageKey = typeof localStorage !== "undefined" && localStorage.getItem('enterprizseat_users') !== null;
  const loaded = loadStorage<UserAccount[]>('users', initialUsers);
  let cleaned = loaded.filter(u => !OLD_DEMO_EMAILS.includes(u.email.toLowerCase()));
  if (!hasStorageKey && cleaned.length === 0) cleaned = initialUsers;

  const targetIdx = cleaned.findIndex(u => u.email.toLowerCase() === "prtreddy06@gmail.com");
  if (targetIdx !== -1) {
    cleaned[targetIdx] = {
      ...cleaned[targetIdx],
      role: UserRole.SUPER_USER,
      password: cleaned[targetIdx].password || "Raviteja@06049825"
    };
  } else if (!hasStorageKey) {
    cleaned.unshift({
      id: "usr-1",
      name: "Raviteja Reddy palagiri",
      email: "prtreddy06@gmail.com",
      role: UserRole.SUPER_USER,
      department: "Corporate Infrastructure",
      status: "Active",
      password: "Raviteja@06049825",
      lastLogin: new Date().toISOString(),
      failedLoginAttempts: 0
    });
  }
  return cleaned;
};

const loadCleanRequests = (): SeatRequest[] => {
  const loaded = loadStorage<SeatRequest[]>('requests', initialSeatRequests);
  return loaded.filter(r => r && r.employeeEmail && !OLD_DEMO_EMAILS.includes(r.employeeEmail.toLowerCase()));
};

const loadCleanEmployees = (): EmployeeProfile[] => {
  const hasStorageKey = typeof localStorage !== "undefined" && localStorage.getItem('enterprizseat_employees') !== null;
  const loaded = loadStorage<EmployeeProfile[]>('employees', initialEmployees);
  let cleaned = loaded.filter(e => {
    const email = (e.email || "").toLowerCase();
    const name = (e.name || "").toLowerCase();
    if (OLD_DEMO_EMAILS.includes(email)) return false;
    if (email.endsWith("@enterprise.com")) return false;
    if (name.includes("linus") || name.includes("torvalds") || name.includes("sarah connor") || name.includes("grace hopper") || name.includes("david light")) return false;
    return true;
  }).map(e => {
    if (e.businessHead === "Marcus Wright") {
      const { businessHead, ...rest } = e;
      return rest;
    }
    return e;
  });
  if (!hasStorageKey && cleaned.length === 0) cleaned = initialEmployees;

  const targetIdx = cleaned.findIndex(e => e.email.toLowerCase() === "prtreddy06@gmail.com");
  if (targetIdx !== -1) {
    cleaned[targetIdx] = {
      ...cleaned[targetIdx],
      role: UserRole.SUPER_USER
    };
  } else if (!hasStorageKey) {
    cleaned.unshift({
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
      lastLogin: new Date().toISOString(),
      accountStatus: "Active",
      role: UserRole.SUPER_USER
    });
  }
  return cleaned;
};

export const isObsoleteAlphaSeat = (s: Seat): boolean => {
  if (!s || !s.seatNumber) return true;
  return false;
};

const loadCleanSeats = (): Seat[] => {
  const loaded = loadStorage<Seat[]>('seats', initialSeats);
  const cleaned = loaded.filter(s => !isObsoleteAlphaSeat(s));
  cleaned.forEach(s => { if (s.rotation === 180) s.rotation = 0; });
  return cleaned.length > 0 ? cleaned : initialSeats;
};

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

const loadInitialSessionUser = (userList: UserAccount[]): UserAccount | null => {
  try {
    const parsedUser = getEncryptedStorage<UserAccount | null>("active_session", null);
    const lastActivityStr = getEncryptedStorage<string | null>("last_activity", null);

    if (parsedUser) {
      if (lastActivityStr) {
        const lastActivity = parseInt(lastActivityStr, 10);
        if (!isNaN(lastActivity) && Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
          // Session expired due to 10 minutes inactivity
          localStorage.removeItem("enterprizseat_active_session");
          localStorage.removeItem("enterprizseat_last_activity");
          return null;
        }
      }

      const match = userList.find(u => u.email.toLowerCase() === parsedUser.email.toLowerCase());
      if (match) {
        if (match.email.toLowerCase() === "prtreddy06@gmail.com") {
          return { ...match, role: UserRole.SUPER_USER, password: match.password || "Raviteja@06049825" };
        }
        return match;
      }
      return parsedUser;
    }
  } catch (err) {
    console.error("Failed to restore session from encrypted storage", err);
  }
  return null;
};

const initialLayoutObjects: LayoutObject[] = [
  { id: "obj-1", floorId: "f1", name: "Executive Suite A", type: "Cabin", x: 620, y: 300, width: 140, height: 100, rotation: 0, color: "#cbd5e1" },
  { id: "obj-2", floorId: "f1", name: "Main Conference Room", type: "Conference Rooms", x: 800, y: 50, width: 220, height: 140, rotation: 0, color: "#bae6fd" },
  { id: "obj-3", floorId: "f1", name: "Cafeteria / Pantry", type: "Pantry", x: 820, y: 240, width: 200, height: 160, rotation: 0, color: "#fef08a" },
  { id: "obj-4", floorId: "f1", name: "Main Reception", type: "Reception", x: 20, y: 200, width: 120, height: 70, rotation: 0, color: "#fed7aa" },
  { id: "obj-5", floorId: "f1", name: "East Side Restrooms", type: "Rest Rooms", x: 20, y: 300, width: 120, height: 90, rotation: 0, color: "#f1f5f9" },
  { id: "obj-6", floorId: "f1", name: "Emergency Exit North", type: "Emergency Exit", x: 400, y: 10, width: 80, height: 20, rotation: 0, color: "#fca5a5" },
  { id: "obj-7", floorId: "f1", name: "Emergency Exit South", type: "Emergency Exit", x: 400, y: 470, width: 80, height: 20, rotation: 0, color: "#fca5a5" }
];

export default function App() {
  // Global Simulation State with LocalStorage Persistence
  const [employees, setEmployees] = useState<EmployeeProfile[]>(() => loadCleanEmployees());
  const [users, setUsers] = useState<UserAccount[]>(() => loadCleanUsers());

  // Current Logged-In User State (restores session on page refresh)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => loadInitialSessionUser(loadCleanUsers()));
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.SUPER_USER);

  const [sites, setSites] = useState<LocationSite[]>(() => loadStorage('sites', initialSites));
  const [activeSiteId, setActiveSiteId] = useState<string>(() => loadStorage('activeSiteId', 'site-hyd'));
  const [isCreateSiteModalOpen, setIsCreateSiteModalOpen] = useState<boolean>(false);
  const [aiReaderCopies, setAiReaderCopies] = useState<AiReaderCopy[]>(() => loadStorage('ai_reader_copies', []));

  const [buildings, setBuildings] = useState<Building[]>(() => loadCleanBuildings());
  const [floors, setFloors] = useState<Floor[]>(() => loadCleanFloors());
  const [zones, setZones] = useState<Zone[]>(() => loadStorage('zones', initialZones));
  const [seats, setSeats] = useState<Seat[]>(() => loadCleanSeats());
  const [layoutObjects, setLayoutObjects] = useState<LayoutObject[]>(() => loadStorage('layout_objects', initialLayoutObjects));
  const [requests, setRequests] = useState<SeatRequest[]>(() => loadCleanRequests());
  const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>(() => loadStorage('checkInLogs', initialCheckInLogs));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadStorage('auditLogs', initialAuditLogs));
  const [assets, setAssets] = useState<ITAsset[]>(() => loadStorage('assets', initialAssets));

  const handleSelectSite = (siteId: string) => {
    setActiveSiteId(siteId);
    localStorage.setItem("enterprizseat_activeSiteId", JSON.stringify(siteId));
    const siteObj = sites.find(s => s.id === siteId);
    if (siteObj) {
      logAuditAction("Switch Environment", "System", `Switched active location site environment to ${siteObj.name} (${siteObj.code}).`);
    }
  };

  const handleAddNewSite = (newSite: LocationSite, initialBuildingName?: string) => {
    const updatedSites = [...sites, newSite];
    setSites(updatedSites);
    localStorage.setItem("enterprizseat_sites", JSON.stringify(updatedSites));
    saveFirestoreDoc("sites", newSite);

    // Create default building for this new site
    const newBuildingId = `b-${Date.now()}`;
    const newBuilding: Building = {
      id: newBuildingId,
      name: initialBuildingName || `${newSite.name} Primary Tower`,
      location: `${newSite.address}`,
      floorsCount: 1,
      siteId: newSite.id
    };

    const updatedBuildings = [...buildings, newBuilding];
    setBuildings(updatedBuildings);
    localStorage.setItem("enterprizseat_buildings", JSON.stringify(updatedBuildings));
    saveFirestoreDoc("buildings", newBuilding);

    // Create default floor for this building
    const newFloor: Floor = {
      id: `f-${Date.now()}`,
      buildingId: newBuildingId,
      siteId: newSite.id,
      name: "Floor 1 (Executive Level)",
      capacity: 50,
      zonesCount: 2,
      isArchived: false,
      lastModified: new Date().toISOString().split("T")[0]
    };
    const updatedFloors = [...floors, newFloor];
    setFloors(updatedFloors);
    localStorage.setItem("enterprizseat_floors", JSON.stringify(updatedFloors));
    saveFirestoreDoc("floors", newFloor);

    setActiveSiteId(newSite.id);
    localStorage.setItem("enterprizseat_activeSiteId", JSON.stringify(newSite.id));

    logAuditAction("Create Location Site Environment", "Site Management", `Created new site environment ${newSite.name} (${newSite.code}) with building '${newBuilding.name}'.`);
  };

  const handleCommitFloorData = (data: {
    mode: "CREATE_NEW" | "REPLACE_EXISTING";
    targetFloorId?: string;
    newFloorName?: string;
    targetBuildingId: string;
    targetSiteId: string;
    extractedZones: Zone[];
    extractedSeats: Seat[];
    layoutObjects?: any[];
    fileName: string;
    filePreviewUrl?: string;
  }) => {
    let finalFloorId = data.targetFloorId;
    let finalFloorName = "";

    if (data.mode === "CREATE_NEW") {
      const newFloorId = `f-${Date.now()}`;
      const newFloor: Floor = {
        id: newFloorId,
        buildingId: data.targetBuildingId,
        siteId: data.targetSiteId,
        name: data.newFloorName || `Floor ${floors.length + 1} (Uploaded)`,
        capacity: data.extractedSeats.length,
        zonesCount: data.extractedZones.length,
        isArchived: false,
        lastModified: new Date().toISOString().split("T")[0]
      };
      finalFloorId = newFloorId;
      finalFloorName = newFloor.name;

      const updatedFloors = [...floors, newFloor];
      setFloors(updatedFloors);
      localStorage.setItem("enterprizseat_floors", JSON.stringify(updatedFloors));
      saveFirestoreDoc("floors", newFloor);
    } else {
      const targetFloor = floors.find(f => f.id === data.targetFloorId);
      finalFloorName = targetFloor ? targetFloor.name : "Selected Floor";
      
      const updatedFloors = floors.map(f => {
        if (f.id === data.targetFloorId) {
          const updated = {
            ...f,
            capacity: data.extractedSeats.length,
            zonesCount: data.extractedZones.length,
            lastModified: new Date().toISOString().split("T")[0]
          };
          saveFirestoreDoc("floors", updated);
          return updated;
        }
        return f;
      });
      setFloors(updatedFloors);
      localStorage.setItem("enterprizseat_floors", JSON.stringify(updatedFloors));
    }

    // When replacing an existing floor, delete old orphaned seat/zone/object documents from Firestore
    if (data.mode !== "CREATE_NEW" && finalFloorId) {
      const newSeatIdSet = new Set(data.extractedSeats.map((s, idx) => s.id.includes(finalFloorId!) ? s.id : `${finalFloorId}-seat-${idx + 1}`));
      const newZoneIdSet = new Set(data.extractedZones.map(z => z.id.includes(finalFloorId!) ? z.id : `${finalFloorId}-${z.id}`));
      const newObjIdSet = new Set((data.layoutObjects || []).map((o, idx) => o.id && o.id.includes(finalFloorId!) ? o.id : `${finalFloorId}-obj-${idx + 1}`));

      const staleSeatsToDelete = seats.filter(s => s.floorId === finalFloorId && !newSeatIdSet.has(s.id)).map(s => s.id);
      const staleZonesToDelete = zones.filter(z => z.floorId === finalFloorId && !newZoneIdSet.has(z.id)).map(z => z.id);
      const staleObjectsToDelete = layoutObjects.filter(o => o.floorId === finalFloorId && !newObjIdSet.has(o.id)).map(o => o.id);

      if (staleSeatsToDelete.length > 0) deleteFirestoreBatch("seats", staleSeatsToDelete);
      if (staleZonesToDelete.length > 0) deleteFirestoreBatch("zones", staleZonesToDelete);
      if (staleObjectsToDelete.length > 0) deleteFirestoreBatch("layoutObjects", staleObjectsToDelete);
    }

    // Update Zones
    const newZones = data.extractedZones.map(z => ({
      ...z,
      floorId: finalFloorId!,
      id: z.id.includes(finalFloorId!) ? z.id : `${finalFloorId}-${z.id}`
    }));
    const updatedZones = [...zones.filter(z => z.floorId !== finalFloorId), ...newZones];
    setZones(updatedZones);
    localStorage.setItem("enterprizseat_zones", JSON.stringify(updatedZones));
    saveFirestoreBatch("zones", newZones);

    // Update Seats
    const newSeats = data.extractedSeats.map((s, idx) => ({
      ...s,
      floorId: finalFloorId!,
      buildingId: data.targetBuildingId,
      id: s.id.includes(finalFloorId!) ? s.id : `${finalFloorId}-seat-${idx + 1}`
    }));
    const updatedSeats = [...seats.filter(s => s.floorId !== finalFloorId), ...newSeats];
    setSeats(updatedSeats);
    localStorage.setItem("enterprizseat_seats", JSON.stringify(updatedSeats));
    saveFirestoreBatch("seats", newSeats);

    // Update Layout Objects if provided
    if (data.layoutObjects && data.layoutObjects.length > 0) {
      const newObjects = data.layoutObjects.map((o, idx) => ({
        ...o,
        floorId: finalFloorId!,
        id: o.id && o.id.includes(finalFloorId!) ? o.id : `${finalFloorId}-obj-${idx + 1}`
      }));
      const updatedObjects = [...layoutObjects.filter(o => o.floorId !== finalFloorId), ...newObjects];
      setLayoutObjects(updatedObjects);
      localStorage.setItem("enterprizseat_layout_objects", JSON.stringify(updatedObjects));
      saveFirestoreBatch("layoutObjects", newObjects);
    }

    // Switch active site view if provided
    if (data.targetSiteId) {
      setActiveSiteId(data.targetSiteId);
    }

    // Save AI Reader Copy record for immediate action
    const siteObj = sites.find(s => s.id === data.targetSiteId);
    const bldgObj = buildings.find(b => b.id === data.targetBuildingId);

    const newCopy: AiReaderCopy = {
      id: `aicopy-${Date.now()}`,
      fileName: data.fileName,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser ? currentUser.name : "System User",
      siteId: data.targetSiteId,
      siteName: siteObj ? siteObj.name : "Corporate Site",
      buildingId: data.targetBuildingId,
      buildingName: bldgObj ? bldgObj.name : "Primary Building",
      floorId: finalFloorId!,
      floorName: finalFloorName,
      zonesCount: newZones.length,
      seatsCount: newSeats.length,
      facilitiesCount: data.layoutObjects ? data.layoutObjects.length : 0,
      zones: newZones,
      seats: newSeats,
      previewUrl: data.filePreviewUrl,
      mode: data.mode === "CREATE_NEW" ? "CREATED_NEW" : "REPLACED_EXISTING"
    };

    const updatedCopies = [newCopy, ...aiReaderCopies];
    setAiReaderCopies(updatedCopies);
    localStorage.setItem("enterprizseat_ai_reader_copies", JSON.stringify(updatedCopies));

    logAuditAction(
      "Floor Blueprint Ingested",
      "Floor Map",
      `Floor '${finalFloorName}' ${data.mode === "CREATE_NEW" ? "created" : "replaced"} from '${data.fileName}' with ${newSeats.length} seats and ${newZones.length} zones. Copy created in AI Reader.`
    );

    setActiveTab("designer");
  };

  const handleDeleteAiCopy = (copyId: string) => {
    const updated = aiReaderCopies.filter(c => c.id !== copyId);
    setAiReaderCopies(updated);
    localStorage.setItem("enterprizseat_ai_reader_copies", JSON.stringify(updated));
  };

  // Guarantee Super User role for prtreddy06@gmail.com
  useEffect(() => {
    if (currentUser && currentUser.email.toLowerCase() === "prtreddy06@gmail.com") {
      if (currentUser.role !== UserRole.SUPER_USER) {
        const updatedUser: UserAccount = {
          ...currentUser,
          role: UserRole.SUPER_USER,
          password: currentUser.password || "Raviteja@06049825"
        };
        setCurrentUser(updatedUser);
        setActiveRole(UserRole.SUPER_USER);
      }
    }
    
    // Ensure user & employee lists reflect Super User role for prtreddy06@gmail.com
    setUsers(prev => {
      let changed = false;
      const updated = prev.map(u => {
        if (u.email.toLowerCase() === "prtreddy06@gmail.com" && (u.role !== UserRole.SUPER_USER || !u.password)) {
          changed = true;
          return { ...u, role: UserRole.SUPER_USER, password: u.password || "Raviteja@06049825" };
        }
        return u;
      });
      return changed ? updated : prev;
    });

    setEmployees(prev => {
      let changed = false;
      const updated = prev.map(e => {
        if (e.email.toLowerCase() === "prtreddy06@gmail.com" && e.role !== UserRole.SUPER_USER) {
          changed = true;
          return { ...e, role: UserRole.SUPER_USER };
        }
        return e;
      });
      return changed ? updated : prev;
    });
  }, []);

  // Sync assigned seat occupant names into existing employees list automatically
  useEffect(() => {
    if (seats.length === 0) return;
    setEmployees(prev => {
      let modified = false;
      const nextEmps = [...prev];

      seats.forEach(s => {
        const empName = (s.employeeName || s.occupantName || "").trim();
        const empEmail = (s.employeeEmail || s.occupantEmail || "").trim();
        if (empName || empEmail) {
          const emailKey = empEmail.toLowerCase();
          const nameKey = empName.toLowerCase();

          const targetIdx = nextEmps.findIndex(e => 
            (emailKey && e.email && e.email.toLowerCase() === emailKey) || 
            (nameKey && e.name && e.name.toLowerCase() === nameKey)
          );
          if (targetIdx !== -1) {
            const current = nextEmps[targetIdx];
            const targetDept = s.department || s.allocatedDepartment || current.department;
            if (current.seatNumber !== s.seatNumber || current.department !== targetDept) {
              nextEmps[targetIdx] = {
                ...current,
                seatNumber: s.seatNumber,
                department: targetDept,
                occupancyStatus: "Occupied"
              };
              modified = true;
            }
          }
        }
      });

      if (modified) {
        setEncryptedStorage('employees', nextEmps, true);
        return nextEmps;
      }
      return prev;
    });
  }, [seats]);

  // Active module tab
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Keep activeRole synchronized with logged-in user role & sync active session
  useEffect(() => {
    if (currentUser) {
      setActiveRole(currentUser.role);
      localStorage.setItem("enterprizseat_active_session", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("enterprizseat_active_session");
    }
  }, [currentUser]);

  // 10-Minute Idle Auto-Logout Security Effect
  useEffect(() => {
    if (!currentUser) return;

    const initialTime = Date.now();
    lastActivityRef.current = initialTime;
    localStorage.setItem("enterprizseat_last_activity", initialTime.toString());

    const handleUserInteraction = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem("enterprizseat_last_activity", now.toString());
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserInteraction, { passive: true }));

    const idleTimer = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= IDLE_TIMEOUT_MS) {
        const loggedOutName = currentUser.name;
        logAuditAction(
          "Auto Logout - 10 Min Idle",
          "Security",
          `User ${loggedOutName} auto-logged out after 10 minutes of inactivity.`
        );
        setCurrentUser(null);
        localStorage.removeItem("enterprizseat_active_session");
        localStorage.removeItem("enterprizseat_last_activity");
        setSessionExpiredNotice(true);
      }
    }, 5000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserInteraction));
      clearInterval(idleTimer);
    };
  }, [currentUser]);

  // Enforce allowed tabs based on activeRole simulation / assigned role
  useEffect(() => {
    if (!currentUser) return;
    const isSuper = activeRole === UserRole.SUPER_USER;
    const isAdminRole = activeRole === UserRole.ADMIN;
    const isIT = activeRole === UserRole.IT_ADMIN;

    const accessMap: Record<string, boolean> = {
      dashboard: true,
      designer: isSuper || isAdminRole,
      reader: isSuper || isAdminRole,
      excel: isSuper || isAdminRole || isIT,
      assets: isSuper || isAdminRole || isIT,
      directory: true,
      users: isSuper || isAdminRole,
      workflows: true,
      qr: isSuper || isAdminRole || isIT,
      mobile: true,
      audit: isSuper,
      powerbi: isSuper || isAdminRole,
      developer: isSuper,
      manuals: true
    };

    if (!accessMap[activeTab]) {
      setActiveTab("dashboard");
    }
  }, [activeRole, activeTab, currentUser]);

  // Real-Time Firestore Synchronization for Dev & Published Apps
  useEffect(() => {
    let isMounted = true;

    const unsubUsers = subscribeToCollection<UserAccount>("users", (items) => {
      if (isMounted && Array.isArray(items)) {
        setUsers(items);
        setEncryptedStorage('users', items);
      }
    }, loadCleanUsers());

    const unsubEmployees = subscribeToCollection<EmployeeProfile>("employees", (items) => {
      if (isMounted && Array.isArray(items)) {
        setEmployees(items);
        setEncryptedStorage('employees', items);
      }
    }, loadCleanEmployees());

    const unsubBuildings = subscribeToCollection<Building>("buildings", (items) => {
      if (isMounted && Array.isArray(items)) {
        setBuildings(items);
        setEncryptedStorage('buildings', items);
      }
    }, loadCleanBuildings());

    const purgedDocIds = new Set<string>();

    const unsubFloors = subscribeToCollection<Floor>("floors", (items) => {
      if (isMounted && Array.isArray(items)) {
        const obsoleteKeywords = ["floor 3", "floor 4", "floor 5"];
        const validFloors = items.filter(f => {
          const isObsolete = obsoleteKeywords.some(kw => f.name.toLowerCase().includes(kw));
          if (isObsolete && !purgedDocIds.has(f.id)) {
            purgedDocIds.add(f.id);
            console.log(`[Firestore Clean] Purging obsolete floor document ${f.id} (${f.name})`);
            deleteFirestoreDoc("floors", f.id);
          }
          return !isObsolete;
        });

        const hasFloorStorage = typeof localStorage !== "undefined" && localStorage.getItem('enterprizseat_floors') !== null;
        const finalFloors = validFloors.length > 0 ? validFloors : (hasFloorStorage ? [] : loadCleanFloors());
        setFloors(finalFloors);
        setEncryptedStorage('floors', finalFloors);
      }
    }, loadCleanFloors());

    const unsubZones = subscribeToCollection<Zone>("zones", (items) => {
      if (isMounted && Array.isArray(items)) {
        setZones(items);
        setEncryptedStorage('zones', items);
      }
    }, initialZones);

    const unsubSeats = subscribeToCollection<Seat>("seats", (items) => {
      if (isMounted && Array.isArray(items)) {
        const cleanSeats = items.filter(s => {
          const isObsolete = isObsoleteAlphaSeat(s);
          if (isObsolete && !purgedDocIds.has(s.id)) {
            purgedDocIds.add(s.id);
            console.log(`[Firestore Clean] Purging obsolete demo seat ${s.id} (${s.seatNumber})`);
            deleteFirestoreDoc("seats", s.id);
            return false;
          }
          if (s.rotation === 180) {
            s.rotation = 0;
          }
          return !isObsolete;
        });

        const hasSeatStorage = typeof localStorage !== "undefined" && localStorage.getItem('enterprizseat_seats') !== null;
        const finalSeatsList = cleanSeats.length > 0 ? cleanSeats : (hasSeatStorage ? [] : initialSeats);
        setSeats(finalSeatsList);
        setEncryptedStorage('seats', finalSeatsList);
      }
    }, initialSeats);

    const unsubRequests = subscribeToCollection<SeatRequest>("requests", (items) => {
      if (isMounted && Array.isArray(items)) {
        setRequests(items);
        setEncryptedStorage('requests', items);
      }
    }, loadCleanRequests());

    const unsubCheckInLogs = subscribeToCollection<CheckInLog>("checkInLogs", (items) => {
      if (isMounted && Array.isArray(items)) {
        setCheckInLogs(items);
        setEncryptedStorage('checkInLogs', items);
      }
    }, initialCheckInLogs, [orderBy("checkInTime", "desc"), limit(500)]);

    const unsubAuditLogs = subscribeToCollection<AuditLog>("auditLogs", (items) => {
      if (isMounted && Array.isArray(items)) {
        setAuditLogs(items);
        setEncryptedStorage('auditLogs', items);
      }
    }, initialAuditLogs, [orderBy("timestamp", "desc"), limit(500)]);

    const unsubAssets = subscribeToCollection<ITAsset>("assets", (items) => {
      if (isMounted && Array.isArray(items)) {
        setAssets(items);
        setEncryptedStorage('assets', items);
      }
    }, initialAssets);

    const unsubLayoutObjects = subscribeToCollection<LayoutObject>("layoutObjects", (items) => {
      if (isMounted && Array.isArray(items)) {
        setLayoutObjects(items);
        setEncryptedStorage('layout_objects', items);
      }
    }, initialLayoutObjects);

    return () => {
      isMounted = false;
      unsubUsers();
      unsubEmployees();
      unsubBuildings();
      unsubFloors();
      unsubZones();
      unsubSeats();
      unsubRequests();
      unsubCheckInLogs();
      unsubAuditLogs();
      unsubAssets();
      unsubLayoutObjects();
    };
  }, []);

  // User Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const handleUpdateCurrentUserProfile = (updatedUser: UserAccount) => {
    setCurrentUser(updatedUser);
    saveFirestoreDoc("users", updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setEmployees(prev => prev.map(e => {
      if (e.email.toLowerCase() === updatedUser.email.toLowerCase()) {
        const updatedEmp = { ...e, avatarUrl: updatedUser.avatarUrl };
        saveFirestoreDoc("employees", updatedEmp);
        return updatedEmp;
      }
      return e;
    }));
  };

  // Helper log generator
  const logAuditAction = (action: string, category: any, details: string) => {
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      timestamp: new Date().toISOString(),
      user: activeRole,
      action,
      category: category || "System",
      details,
      ipAddress: "192.168.1.110"
    };
    saveFirestoreDoc("auditLogs", log);
    setAuditLogs(prev => [log, ...prev].slice(0, 500));
  };

  // State mutator functions
  const handleUpdateFloors = (updatedFloors: Floor[]) => {
    setFloors(prevFloors => {
      const updatedIds = new Set(updatedFloors.map(f => f.id));
      const deletedFloors = prevFloors.filter(f => !updatedIds.has(f.id));

      deletedFloors.forEach(df => {
        console.log(`[Firestore Sync] Deleting floor doc ${df.id} (${df.name}) from Firestore`);
        deleteFirestoreDoc("floors", df.id);

        setZones(prevZones => {
          const remainingZones = prevZones.filter(z => z.floorId !== df.id);
          const deletedZones = prevZones.filter(z => z.floorId === df.id);
          deletedZones.forEach(dz => deleteFirestoreDoc("zones", dz.id));
          try {
            localStorage.setItem('enterprizseat_zones', JSON.stringify(remainingZones));
          } catch (e) {}
          return remainingZones;
        });

        setSeats(prevSeats => {
          const remainingSeats = prevSeats.filter(s => s.floorId !== df.id);
          const deletedSeats = prevSeats.filter(s => s.floorId === df.id);
          deletedSeats.forEach(ds => deleteFirestoreDoc("seats", ds.id));
          try {
            localStorage.setItem('enterprizseat_seats', JSON.stringify(remainingSeats));
          } catch (e) {}
          return remainingSeats;
        });
      });

      updatedFloors.forEach(f => saveFirestoreDoc("floors", f));

      try {
        localStorage.setItem('enterprizseat_floors', JSON.stringify(updatedFloors));
      } catch (e) {
        console.error("Failed to write floors to localStorage", e);
      }

      return updatedFloors;
    });

    logAuditAction("Update Floors", "Infrastructure", `Updated floor list layout matrix.`);
  };

  const handleUpdateBuildings = (updatedBuildings: Building[]) => {
    setBuildings(prevBuildings => {
      const updatedIds = new Set(updatedBuildings.map(b => b.id));
      const deletedBuildings = prevBuildings.filter(b => !updatedIds.has(b.id));

      if (deletedBuildings.length > 0) {
        deleteFirestoreBatch("buildings", deletedBuildings.map(b => b.id));
      }

      saveFirestoreBatch("buildings", updatedBuildings);

      try {
        localStorage.setItem('enterprizseat_buildings', JSON.stringify(updatedBuildings));
      } catch (e) {
        console.error("Failed to write buildings to localStorage", e);
      }

      return updatedBuildings;
    });

    logAuditAction("Update Buildings", "Infrastructure", `Updated building infrastructure list.`);
  };

  const handleUpdateZones = (updatedZones: Zone[]) => {
    setZones(prevZones => {
      const updatedIds = new Set(updatedZones.map(z => z.id));
      const deletedZoneIds = prevZones.filter(z => !updatedIds.has(z.id)).map(z => z.id);
      if (deletedZoneIds.length > 0) {
        deleteFirestoreBatch("zones", deletedZoneIds);
      }
      saveFirestoreBatch("zones", updatedZones);
      return updatedZones;
    });
    try {
      localStorage.setItem('enterprizseat_zones', JSON.stringify(updatedZones));
    } catch (e) {
      console.error("Failed to write zones to localStorage", e);
    }
    logAuditAction("Update Zones", "Zone/Seat", `Modified spatial zone matrix on Floor Designer.`);
  };

  const handleUpdateSeats = (updatedSeats: Seat[]) => {
    setSeats(prevSeats => {
      const prevMap = new Map(prevSeats.map(p => [p.id, p]));
      const updatedIds = new Set(updatedSeats.map(s => s.id));
      const deletedSeatIds = prevSeats.filter(s => !updatedIds.has(s.id)).map(s => s.id);
      if (deletedSeatIds.length > 0) {
        deleteFirestoreBatch("seats", deletedSeatIds);
      }

      const changedSeats = updatedSeats.filter(s => {
        const prev = prevMap.get(s.id);
        if (!prev) return true;
        return JSON.stringify(prev) !== JSON.stringify(s);
      });

      if (changedSeats.length > 0) {
        saveFirestoreBatch("seats", changedSeats);
      }
      return updatedSeats;
    });
    try {
      localStorage.setItem('enterprizseat_seats', JSON.stringify(updatedSeats));
    } catch (e) {
      console.error("Failed to write seats to localStorage", e);
    }
  };

  const handleCommitBulkSeats = (bulkSeats: Seat[], targetFloorId?: string) => {
    let changedSeatsList: Seat[] = [];

    setSeats(prevSeats => {
      const updatedMap = new Map<string, Seat>();
      prevSeats.forEach(s => updatedMap.set(s.id, s));

      const normalizeNum = (numStr?: string) => {
        if (!numStr) return "";
        return numStr.toString().trim().toLowerCase().replace(/^s[-_\s]*/i, "").replace(/^seat[-_\s]*/i, "").trim();
      };

      const targetFloorSeatMap = new Map<string, string>();
      prevSeats.forEach(s => {
        if (!targetFloorId || s.floorId === targetFloorId) {
          const key = normalizeNum(s.seatNumber);
          if (key) targetFloorSeatMap.set(key, s.id);
        }
      });

      bulkSeats.forEach(incoming => {
        const incomingFloorId = incoming.floorId || targetFloorId || "f1";
        const incomingKey = normalizeNum(incoming.seatNumber);
        const targetMatchedId = incomingKey ? targetFloorSeatMap.get(incomingKey) : undefined;
        const existingId = updatedMap.has(incoming.id) 
          ? incoming.id 
          : targetMatchedId;

        if (existingId && updatedMap.has(existingId)) {
          const existingSeat = updatedMap.get(existingId)!;
          const mergedSeat: Seat = {
            ...existingSeat,
            ...incoming,
            id: existingSeat.id, // preserve existing seat ID
            floorId: incomingFloorId,
            buildingId: incoming.buildingId || existingSeat.buildingId || "b1",
            x: incoming.x !== undefined ? incoming.x : existingSeat.x,
            y: incoming.y !== undefined ? incoming.y : existingSeat.y
          };
          updatedMap.set(existingId, mergedSeat);
          changedSeatsList.push(mergedSeat);
        } else {
          const newSeatObj = {
            ...incoming,
            floorId: incomingFloorId
          };
          updatedMap.set(incoming.id, newSeatObj);
          changedSeatsList.push(newSeatObj);
          if (incomingKey) targetFloorSeatMap.set(incomingKey, incoming.id);
        }
      });

      const finalSeats = Array.from(updatedMap.values());
      try {
        localStorage.setItem("enterprizseat_seats", JSON.stringify(finalSeats));
      } catch (e) {
        console.error("Failed to write seats to localStorage", e);
      }
      return finalSeats;
    });

    if (changedSeatsList.length > 0) {
      saveFirestoreBatch("seats", changedSeatsList);
    }

    logAuditAction("Bulk Import Seats", "Seat Management", `Processed bulk Excel seat sheet (${bulkSeats.length} rows updated/imported).`);
  };

  const handleUpdateLayoutObjects = (updatedObjects: LayoutObject[]) => {
    setLayoutObjects(prevObjects => {
      const prevMap = new Map(prevObjects.map(p => [p.id, p]));
      const updatedIds = new Set(updatedObjects.map(o => o.id));
      const deletedIds = prevObjects.filter(o => !updatedIds.has(o.id)).map(o => o.id);
      if (deletedIds.length > 0) {
        deleteFirestoreBatch("layoutObjects", deletedIds);
      }

      const changedObjects = updatedObjects.filter(o => {
        const prev = prevMap.get(o.id);
        if (!prev) return true;
        return JSON.stringify(prev) !== JSON.stringify(o);
      });

      if (changedObjects.length > 0) {
        saveFirestoreBatch("layoutObjects", changedObjects);
      }
      return updatedObjects;
    });
    try {
      localStorage.setItem('enterprizseat_layout_objects', JSON.stringify(updatedObjects));
    } catch (e) {
      console.error("Failed to write layoutObjects to localStorage", e);
    }
  };

  const handleAddRequest = (newRequest: SeatRequest) => {
    setRequests(prev => [newRequest, ...prev]);
    saveFirestoreDoc("requests", newRequest);
    logAuditAction("Submit Seat Request", "Seat Allocation", `Employee ${newRequest.employeeName} submitted a seat request.`);
  };

  const handleUpdateRequestStatus = (
    id: string, 
    status: "Approved" | "Rejected" | "Escalated" | "Withdrawn",
    comment?: string
  ) => {
    setRequests(prev => {
      const targetReq = prev.find(r => r.id === id);
      const targetEmail = targetReq?.employeeEmail?.toLowerCase() || "";

      return prev.map(r => {
        let updatedR = r;
        if (r.id === id) {
          updatedR = { 
            ...r, 
            status, 
            escalatedToAdmin: status === "Escalated",
            approvalComment: comment || r.approvalComment,
            approverName: currentUser?.name || "System Approver",
            approvedAt: new Date().toISOString()
          };
        } else if (targetEmail && r.employeeEmail.toLowerCase() === targetEmail && r.status === "Pending" && (status === "Approved" || status === "Rejected" || status === "Withdrawn")) {
          updatedR = { ...r, status, approvalComment: comment || r.approvalComment };
        }
        if (updatedR !== r) {
          saveFirestoreDoc("requests", updatedR);
        }
        return updatedR;
      });
    });
    logAuditAction("Update Request Status", "Seat Allocation", `Seat Request #${id} status updated to ${status}. Reason/Comment: ${comment || "None provided"}`);
  };

  const handleAllocateSeatDirect = (seatId: string, employeeName: string, employeeEmail: string, department: string) => {
    setSeats(prev => prev.map(s => {
      if (s.id === seatId) {
        const updatedS: Seat = {
          ...s,
          status: "Occupied",
          employeeId: `emp-alloc-${Date.now()}`,
          employeeName,
          employeeEmail,
          department
        };
        saveFirestoreDoc("seats", updatedS);
        return updatedS;
      }
      return s;
    }));
    logAuditAction("Direct Allocation", "Seat Allocation", `Assigned ${employeeName} directly to Seat #${seatId}.`);
  };

  const handleCheckIn = (seatId: string, employeeName: string) => {
    setSeats(prev => prev.map(s => {
      if (s.id === seatId) {
        const updatedS: Seat = {
          ...s,
          status: "Occupied",
          employeeId: `emp-scan-${Date.now()}`,
          employeeName,
          employeeEmail: `${employeeName.toLowerCase().replace(/\s/g, ".")}@enterprise.com`,
          department: "Engineering"
        };
        saveFirestoreDoc("seats", updatedS);
        return updatedS;
      }
      return s;
    }));

    const target = seats.find(s => s.id === seatId);
    if (target) {
      const newLog: CheckInLog = {
        id: `log-new-${Date.now()}`,
        employeeName,
        seatNumber: target.seatNumber,
        buildingName: "Newmark _Hyderabad",
        floorName: floors.find(f => f.id === target.floorId)?.name || "11 th Floor CRE",
        checkInTime: new Date().toISOString(),
        status: "Checked In"
      };
      saveFirestoreDoc("checkInLogs", newLog);
      setCheckInLogs(prev => [newLog, ...prev].slice(0, 500));
    }
    logAuditAction("QR Check-In", "QR Check-in", `${employeeName} scanned QR and checked into Seat.`);
  };

  const handleCheckOut = (seatId: string) => {
    const target = seats.find(s => s.id === seatId);
    if (!target) return;

    setSeats(prev => prev.map(s => {
      if (s.id === seatId) {
        const updatedS: Seat = {
          ...s,
          status: "Vacant",
          employeeId: undefined,
          employeeName: undefined,
          employeeEmail: undefined,
          department: undefined
        };
        saveFirestoreDoc("seats", updatedS);
        return updatedS;
      }
      return s;
    }));

    const checkoutLog: CheckInLog = {
      id: `log-checkout-${Date.now()}`,
      employeeName: target.employeeName || "Roster Employee",
      seatNumber: target.seatNumber,
      buildingName: "Newmark _Hyderabad",
      floorName: floors.find(f => f.id === target.floorId)?.name || "11 th Floor CRE",
      checkInTime: new Date().toISOString(),
      checkOutTime: new Date().toISOString(),
      status: "Checked Out"
    };
    saveFirestoreDoc("checkInLogs", checkoutLog);
    setCheckInLogs(prev => [checkoutLog, ...prev].slice(0, 500));
    logAuditAction("QR Check-Out", "QR Check-in", `${target.employeeName || "Employee"} checked out from Seat.`);
  };

  const handleAddAssets = (newAssets: ITAsset[]) => {
    setAssets(prev => [...newAssets, ...prev]);
    newAssets.forEach(a => saveFirestoreDoc("assets", a));
    logAuditAction("Add IT Assets", "IT Asset", `Injected ${newAssets.length} IT assets into central registry.`);
  };

  const handleUpdateAssets = (updatedAssets: ITAsset[]) => {
    setAssets(updatedAssets);
    updatedAssets.forEach(a => saveFirestoreDoc("assets", a));
    logAuditAction("Update IT Assets", "IT Asset", `Updated IT asset state matrix.`);
  };

  const handleAddUser = (user: UserAccount) => {
    saveFirestoreDoc("users", user);
    setUsers(prev => [user, ...prev]);

    // Automatically create matching Employee Profile in Employee Directory
    const newEmpProfile: EmployeeProfile = {
      id: `emp-${user.id}`,
      name: user.name,
      email: user.email,
      department: user.department || "Engineering",
      company: "Global Cyber Systems",
      manager: "Raviteja Reddy palagiri",
      floor: "11 th Floor CRE",
      zone: "Zone A (Cloud Platform)",
      seatNumber: user.allocatedSeatNumber || "",
      seatType: "Standard",
      occupancyStatus: user.allocatedSeatNumber ? "Occupied" : "Vacant",
      assignedAssets: [],
      accountStatus: user.status === "Active" ? "Active" : user.status === "Locked" ? "Locked" : "Inactive",
      role: user.role,
      lastLogin: user.lastLogin
    };

    saveFirestoreDoc("employees", newEmpProfile);
    setEmployees(prev => {
      if (prev.some(e => e.email.toLowerCase() === user.email.toLowerCase())) return prev;
      return [newEmpProfile, ...prev];
    });
  };

  const handleBulkAddEmployeesAndUsers = (newUsers: UserAccount[], newEmps: EmployeeProfile[]) => {
    newUsers.forEach(u => saveFirestoreDoc("users", u));
    newEmps.forEach(e => saveFirestoreDoc("employees", e));

    setUsers(prev => {
      const existingEmails = new Set(prev.map(u => u.email.toLowerCase()));
      const filtered = newUsers.filter(u => !existingEmails.has(u.email.toLowerCase()));
      return [...filtered, ...prev];
    });

    setEmployees(prev => {
      const existingEmails = new Set(prev.map(e => e.email.toLowerCase()));
      const filtered = newEmps.filter(e => !existingEmails.has(e.email.toLowerCase()));
      return [...filtered, ...prev];
    });

    logAuditAction(
      "Bulk Employee Creation & Email Dispatch",
      "User Administration",
      `Created ${newEmps.length} employee profiles and dispatched onboarding credentials emails to all ${newEmps.length} users simultaneously.`
    );
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    saveFirestoreDoc("users", updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setEmployees(prev => prev.map(e => {
      if (e.email.toLowerCase() === updatedUser.email.toLowerCase()) {
        const updatedEmp = {
          ...e,
          name: updatedUser.name,
          department: updatedUser.department || e.department,
          seatNumber: updatedUser.allocatedSeatNumber || e.seatNumber,
          role: updatedUser.role,
          accountStatus: updatedUser.status === "Active" ? "Active" : updatedUser.status === "Locked" ? "Locked" : "Inactive"
        };
        saveFirestoreDoc("employees", updatedEmp);
        return updatedEmp;
      }
      return e;
    }));
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    deleteFirestoreDoc("users", userId);
    setUsers(prev => {
      const next = prev.filter(u => u.id !== userId);
      setEncryptedStorage('users', next, true);
      return next;
    });
    if (targetUser) {
      const targetEmp = employees.find(e => e.email.toLowerCase() === targetUser.email.toLowerCase());
      if (targetEmp) deleteFirestoreDoc("employees", targetEmp.id);
      setEmployees(prev => {
        const next = prev.filter(e => e.email.toLowerCase() !== targetUser.email.toLowerCase());
        setEncryptedStorage('employees', next, true);
        return next;
      });
    }
  };

  const handleBulkDeleteUsers = (userIds: string[]) => {
    const targetUsers = users.filter(u => userIds.includes(u.id));
    const targetEmails = targetUsers.map(u => u.email.toLowerCase());

    deleteFirestoreBatch("users", userIds);
    setUsers(prev => {
      const next = prev.filter(u => !userIds.includes(u.id));
      setEncryptedStorage('users', next, true);
      return next;
    });

    const targetEmps = employees.filter(e => targetEmails.includes(e.email.toLowerCase()));
    if (targetEmps.length > 0) {
      deleteFirestoreBatch("employees", targetEmps.map(e => e.id));
      setEmployees(prev => {
        const next = prev.filter(e => !targetEmails.includes(e.email.toLowerCase()));
        setEncryptedStorage('employees', next, true);
        return next;
      });
    }
  };

  const handleDeleteEmployee = (empId: string) => {
    const targetEmp = employees.find(e => e.id === empId);
    deleteFirestoreDoc("employees", empId);

    setEmployees(prev => {
      const next = prev.filter(e => e.id !== empId);
      setEncryptedStorage('employees', next, true);
      return next;
    });

    if (targetEmp) {
      const empEmail = (targetEmp.email || "").toLowerCase();
      const empName = (targetEmp.name || "").toLowerCase();

      // 1. Unassign seat occupied by this employee
      setSeats(prev => {
        let changed = false;
        const updatedSeats = prev.map(s => {
          const sName = (s.employeeName || s.occupantName || "").toLowerCase();
          const sEmail = (s.employeeEmail || s.occupantEmail || "").toLowerCase();
          if (s.employeeId === empId || (empEmail && sEmail === empEmail) || (empName && sName === empName)) {
            changed = true;
            return {
              ...s,
              status: "Available" as const,
              employeeName: "",
              employeeEmail: "",
              occupantName: "",
              occupantEmail: "",
              employeeId: "",
              allocatedDepartment: ""
            };
          }
          return s;
        });
        if (changed) {
          const changedSeats = updatedSeats.filter((s, idx) => prev[idx] !== s);
          saveFirestoreBatch("seats", changedSeats);
          setEncryptedStorage('seats', updatedSeats, true);
        }
        return changed ? updatedSeats : prev;
      });

      // 2. Unassign IT assets assigned to this employee
      setAssets(prev => {
        let changed = false;
        const updatedAssets = prev.map(a => {
          const aName = (a.employeeName || "").toLowerCase();
          if (a.employeeId === empId || (empName && aName === empName)) {
            changed = true;
            return {
              ...a,
              employeeId: "",
              employeeName: "",
              status: "Available" as const
            };
          }
          return a;
        });
        if (changed) {
          const changedAssets = updatedAssets.filter((a, idx) => prev[idx] !== a);
          saveFirestoreBatch("assets", changedAssets);
          setEncryptedStorage('assets', updatedAssets, true);
        }
        return changed ? updatedAssets : prev;
      });

      // 3. Delete matching user account if it exists
      if (empEmail) {
        const matchingUsers = users.filter(u => u.email.toLowerCase() === empEmail);
        if (matchingUsers.length > 0) {
          deleteFirestoreBatch("users", matchingUsers.map(u => u.id));
          setUsers(prev => {
            const next = prev.filter(u => u.email.toLowerCase() !== empEmail);
            setEncryptedStorage('users', next, true);
            return next;
          });
        }
      }
    }
  };

  const handleBulkDeleteEmployees = (empIds: string[]) => {
    const targetEmps = employees.filter(e => empIds.includes(e.id));
    const targetEmails = targetEmps.map(e => (e.email || "").toLowerCase()).filter(Boolean);
    const targetNames = targetEmps.map(e => (e.name || "").toLowerCase()).filter(Boolean);

    deleteFirestoreBatch("employees", empIds);
    setEmployees(prev => {
      const next = prev.filter(e => !empIds.includes(e.id));
      setEncryptedStorage('employees', next, true);
      return next;
    });

    // 1. Unassign seats assigned to any of these employees
    setSeats(prev => {
      let changed = false;
      const updatedSeats = prev.map(s => {
        const sName = (s.employeeName || s.occupantName || "").toLowerCase();
        const sEmail = (s.employeeEmail || s.occupantEmail || "").toLowerCase();
        if ((s.employeeId && empIds.includes(s.employeeId)) || (sEmail && targetEmails.includes(sEmail)) || (sName && targetNames.includes(sName))) {
          changed = true;
          return {
            ...s,
            status: "Available" as const,
            employeeName: "",
            employeeEmail: "",
            occupantName: "",
            occupantEmail: "",
            employeeId: "",
            allocatedDepartment: ""
          };
        }
        return s;
      });
      if (changed) {
        const changedSeats = updatedSeats.filter((s, idx) => prev[idx] !== s);
        saveFirestoreBatch("seats", changedSeats);
        setEncryptedStorage('seats', updatedSeats, true);
      }
      return changed ? updatedSeats : prev;
    });

    // 2. Unassign IT assets assigned to any of these employees
    setAssets(prev => {
      let changed = false;
      const updatedAssets = prev.map(a => {
        const aName = (a.employeeName || "").toLowerCase();
        if ((a.employeeId && empIds.includes(a.employeeId)) || (aName && targetNames.includes(aName))) {
          changed = true;
          return {
            ...a,
            employeeId: "",
            employeeName: "",
            status: "Available" as const
          };
        }
        return a;
      });
      if (changed) {
        const changedAssets = updatedAssets.filter((a, idx) => prev[idx] !== a);
        saveFirestoreBatch("assets", changedAssets);
        setEncryptedStorage('assets', updatedAssets, true);
      }
      return changed ? updatedAssets : prev;
    });

    // 3. Delete matching user accounts in users
    if (targetEmails.length > 0) {
      const matchingUsers = users.filter(u => targetEmails.includes(u.email.toLowerCase()));
      if (matchingUsers.length > 0) {
        deleteFirestoreBatch("users", matchingUsers.map(u => u.id));
        setUsers(prev => {
          const next = prev.filter(u => !targetEmails.includes(u.email.toLowerCase()));
          setEncryptedStorage('users', next, true);
          return next;
        });
      }
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    deleteFirestoreDoc("assets", assetId);
    setAssets(prev => {
      const next = prev.filter(a => a.id !== assetId);
      setEncryptedStorage('assets', next, true);
      return next;
    });
  };

  const handleBulkDeleteAssets = (assetIds: string[]) => {
    deleteFirestoreBatch("assets", assetIds);
    setAssets(prev => {
      const next = prev.filter(a => !assetIds.includes(a.id));
      setEncryptedStorage('assets', next, true);
      return next;
    });
  };

  const pendingRequestsCount = requests.filter(r => r.status === "Pending" || r.status === "Escalated").length;

  // Sidebar navigation item class helper
  const getNavItemClass = (tabId: string) => {
    const base = "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold transition-all rounded-lg ";
    if (activeTab === tabId) {
      return base + "bg-blue-50 text-blue-700 font-bold shadow-2xs";
    }
    return base + "hover:bg-slate-50 text-slate-600";
  };

  // Render Login Portal if not logged in
  if (!currentUser) {
    return (
      <>
        <LoginPortal
          registeredUsers={users}
          sessionExpiredNotice={sessionExpiredNotice}
          onLoginSuccess={(user) => {
            const isSuperUser = user.email.toLowerCase() === "prtreddy06@gmail.com" || user.role === UserRole.SUPER_USER;
            const finalUser = isSuperUser ? { ...user, role: UserRole.SUPER_USER } : user;
            
            // Persist updated user state (including reset password) in Firestore & local state
            saveFirestoreDoc("users", finalUser);

            const matchingEmp = employees.find(e => e.email.toLowerCase() === finalUser.email.toLowerCase());
            if (matchingEmp) {
              const updatedEmp = { ...matchingEmp, lastLogin: finalUser.lastLogin };
              saveFirestoreDoc("employees", updatedEmp);
            }

            setUsers(prevUsers => {
              const updated = prevUsers.map(u => 
                u.email.toLowerCase() === finalUser.email.toLowerCase() ? finalUser : u
              );
              if (!updated.some(u => u.email.toLowerCase() === finalUser.email.toLowerCase())) {
                updated.push(finalUser);
              }
              setEncryptedStorage("users", updated);
              return updated;
            });

            setCurrentUser(finalUser);
            setActiveRole(finalUser.role);
            setSessionExpiredNotice(false);
            const now = Date.now();
            lastActivityRef.current = now;
            setEncryptedStorage("active_session", finalUser);
            setEncryptedStorage("last_activity", now.toString());
          }}
          onAddAuditLog={logAuditAction}
        />
        <EmailToastAndModal />
      </>
    );
  }

  const isSuperUser = activeRole === UserRole.SUPER_USER;
  const isAdmin = activeRole === UserRole.ADMIN;
  const isITAdmin = activeRole === UserRole.IT_ADMIN;

  const canAccessDesigner = true; // All roles can view the Floor Map & Designer (editing restricted to Super User & Admin inside component)
  const canAccessReader = isSuperUser || isAdmin || isITAdmin;
  const canAccessExcel = isSuperUser || isAdmin || isITAdmin;
  const canAccessAssets = isSuperUser || isAdmin || isITAdmin;
  const canAccessUsers = isSuperUser || isAdmin;
  const canAccessQR = isSuperUser || isAdmin || isITAdmin;
  const canAccessAudit = isSuperUser;
  const canAccessPowerBI = isSuperUser || isAdmin;
  const canAccessDeveloper = isSuperUser;

  const currentUserInitials = currentUser.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex overflow-hidden antialiased" id="app-root-container">
      {/* LEFT APPLICATION NAVIGATION SIDEBAR */}
      <aside 
        className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ${
          isSidebarOpen ? "w-64 opacity-100" : "w-0 opacity-0 overflow-hidden pointer-events-none border-r-0"
        }`} 
        id="app-sidebar-rail"
      >
        {/* Brand Section */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Layers size={18} />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-800 uppercase font-display">
              Enterpriz<span className="text-blue-600">Seat</span>
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Hide Navigation Sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {/* Clean Continuous Corporate Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1" id="sidebar-nav-links">
            <button 
              onClick={() => setActiveTab("dashboard")}
              className={getNavItemClass("dashboard")}
              id="btn-nav-dashboard"
            >
              <Grid size={15} />
              <span>Global Dashboard</span>
            </button>

            {canAccessDesigner && (
              <button 
                onClick={() => setActiveTab("designer")}
                className={getNavItemClass("designer")}
                id="btn-nav-designer"
              >
                <MapIcon size={15} />
                <span>Floor Designer</span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab("workflows")}
              className={`${getNavItemClass("workflows")} justify-between`}
              id="btn-nav-workflows"
            >
              <span className="flex items-center gap-3">
                <Inbox size={15} />
                <span>Seat Allocation</span>
              </span>
              {pendingRequestsCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {canAccessAssets && (
              <button 
                onClick={() => setActiveTab("assets")}
                className={getNavItemClass("assets")}
                id="btn-nav-assets"
              >
                <Cpu size={15} />
                <span>IT Asset Matrix</span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab("directory")}
              className={getNavItemClass("directory")}
              id="btn-nav-directory"
            >
              <Users size={15} />
              <span>Employee Directory</span>
            </button>

            {canAccessUsers && (
              <button 
                onClick={() => setActiveTab("users")}
                className={getNavItemClass("users")}
                id="btn-nav-users"
              >
                <ShieldCheck size={15} />
                <span>User Account Ops</span>
              </button>
            )}

            {canAccessReader && (
              <button 
                onClick={() => setActiveTab("reader")}
                className={getNavItemClass("reader")}
                id="btn-nav-reader"
              >
                <Sparkles size={15} />
                <span>AI Floor Reader</span>
              </button>
            )}

            {canAccessExcel && (
              <button 
                onClick={() => setActiveTab("excel")}
                className={getNavItemClass("excel")}
                id="btn-nav-excel"
              >
                <UploadCloud size={15} />
                <span>IT Asset Ingest</span>
              </button>
            )}

            {canAccessQR && (
              <button 
                onClick={() => setActiveTab("qr")}
                className={getNavItemClass("qr")}
                id="btn-nav-qr"
              >
                <QrCode size={15} />
                <span>QR Labels Matrix</span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab("mobile")}
              className={getNavItemClass("mobile")}
              id="btn-nav-mobile"
            >
              <Smartphone size={15} />
              <span>Mobile Companion</span>
            </button>

            {canAccessAudit && (
              <button 
                onClick={() => setActiveTab("audit")}
                className={getNavItemClass("audit")}
                id="btn-nav-audit"
              >
                <Activity size={15} />
                <span>Audit Logs</span>
              </button>
            )}

            {canAccessPowerBI && (
              <button 
                onClick={() => setActiveTab("powerbi")}
                className={getNavItemClass("powerbi")}
                id="btn-nav-powerbi"
              >
                <BarChart size={15} />
                <span>Power BI Analytics</span>
              </button>
            )}

            {canAccessDeveloper && (
              <button 
                onClick={() => setActiveTab("developer")}
                className={getNavItemClass("developer")}
                id="btn-nav-developer"
              >
                <Terminal size={15} />
                <span>DevOps Blueprints</span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab("manuals")}
              className={getNavItemClass("manuals")}
              id="btn-nav-manuals"
            >
              <BookOpen size={15} />
              <span>Operational Handbooks</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Details */}
        <div className="p-4 border-t border-slate-100 mt-auto">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full bg-slate-50 hover:bg-slate-100 p-3 rounded-xl flex items-center space-x-3 transition-colors text-left cursor-pointer group"
            title="Manage Profile Photo & Password Settings"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-blue-500 shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-700 transition-colors">
                {currentUserInitials}
              </div>
            )}
            <div className="overflow-hidden text-left text-xs">
              <p className="font-bold text-slate-800 truncate leading-snug group-hover:text-blue-600 transition-colors">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate leading-none mt-0.5">{currentUser.email}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col h-full overflow-hidden" id="app-split-layout">
        {/* GLOBAL PROFILE/ROLE HEADER */}
        <Header 
          currentUser={currentUser}
          activeRole={activeRole} 
          onChangeRole={(newRole) => {
            setActiveRole(newRole);
          }} 
          onLogout={() => {
            const logoutUserName = currentUser.name;
            setCurrentUser(null);
            setActiveRole(UserRole.SUPER_USER);
            setSessionExpiredNotice(false);
            localStorage.removeItem("enterprizseat_active_session");
            localStorage.removeItem("enterprizseat_last_activity");
            logAuditAction("User Logout", "Login/Logout", `User ${logoutUserName} signed out from application.`);
          }}
          pendingRequestsCount={pendingRequestsCount} 
          requests={requests}
          onSelectTab={setActiveTab}
          activeTab={activeTab}
          sites={sites}
          activeSiteId={activeSiteId}
          onSelectSite={handleSelectSite}
          onOpenCreateSiteModal={() => setIsCreateSiteModalOpen(true)}
          onAddAuditLog={logAuditAction}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenEncryptionModal={() => setIsEncryptionModalOpen(true)}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />

        {/* MAIN CANVAS BODY */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50/50" id="app-main-content-stream">
          {activeTab === "dashboard" && (
            <DashboardView 
              seats={seats} 
              zones={zones} 
              requests={requests} 
              buildings={buildings}
              floors={floors}
              sites={sites}
              activeSiteId={activeSiteId}
              onSelectSite={handleSelectSite}
              employees={employees}
              checkInLogs={checkInLogs}
              activeRole={activeRole}
              onNavigateToRequests={() => setActiveTab("workflows")} 
              onNavigateToFloorMap={() => setActiveTab("designer")} 
              onAddAuditLog={logAuditAction}
            />
          )}

          {activeTab === "designer" && (
            <FloorMapDesigner 
              buildings={buildings} 
              floors={floors} 
              zones={zones} 
              seats={seats} 
              employees={employees}
              layoutObjects={layoutObjects}
              sites={sites}
              activeSiteId={activeSiteId}
              onUpdateZones={handleUpdateZones} 
              onUpdateSeats={handleUpdateSeats} 
              onUpdateLayoutObjects={handleUpdateLayoutObjects}
              onUpdateBuildings={handleUpdateBuildings}
              onUpdateFloors={handleUpdateFloors}
              onCommitExtractedFloor={handleCommitFloorData}
              onAddAuditLog={logAuditAction}
              activeRole={activeRole}
            />
          )}

          {activeTab === "reader" && (
            <FloorReader 
              activeRole={activeRole}
              buildings={buildings}
              floors={floors}
              sites={sites}
              activeSiteId={activeSiteId}
              aiReaderCopies={aiReaderCopies}
              onCommitExtractedFloor={handleCommitFloorData}
              onOpenInFloorDesigner={(floorId, buildingId) => {
                setActiveTab("designer");
              }}
              onDeleteAiCopy={handleDeleteAiCopy}
              onAddAuditLog={logAuditAction}
            />
          )}

          {activeTab === "excel" && (
            <ExcelUpload 
              onCommitBulkAssets={handleAddAssets}
              onCommitBulkSeats={handleCommitBulkSeats}
              existingAssets={assets}
              existingSeats={seats}
              employees={employees}
              activeRole={activeRole}
              onAddAuditLog={logAuditAction}
              floors={floors}
              buildings={buildings}
            />
          )}

          {activeTab === "assets" && (
            <AssetManagement 
              assets={assets}
              seats={seats}
              employees={employees}
              activeRole={activeRole}
              onAddAsset={(newAsset) => setAssets(prev => [newAsset, ...prev])}
              onUpdateAsset={(updatedAsset) => setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a))}
              onDeleteAsset={handleDeleteAsset}
              onBulkDeleteAssets={handleBulkDeleteAssets}
              onAddAuditLog={logAuditAction}
            />
          )}

          {activeTab === "directory" && (
            <EmployeeDirectory 
              employees={employees}
              assets={assets}
              seats={seats}
              activeRole={activeRole}
              onSelectEmployeeSeat={(seatNum) => {
                setActiveTab("designer");
              }}
              onAddAuditLog={logAuditAction}
              onBulkAddEmployeesAndUsers={handleBulkAddEmployeesAndUsers}
              onDeleteEmployee={handleDeleteEmployee}
              onBulkDeleteEmployees={handleBulkDeleteEmployees}
            />
          )}

          {activeTab === "users" && (
            <UserManagement 
              users={users}
              seats={seats}
              activeRole={activeRole}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onBulkDeleteUsers={handleBulkDeleteUsers}
              onAddAuditLog={logAuditAction}
              onBulkAddEmployeesAndUsers={handleBulkAddEmployeesAndUsers}
            />
          )}

          {activeTab === "workflows" && (
            <SeatAllocation 
              requests={requests} 
              seats={seats} 
              zones={zones} 
              buildings={buildings}
              floors={floors}
              employees={employees}
              currentUser={currentUser}
              onUpdateRequestStatus={handleUpdateRequestStatus} 
              onAllocateSeatDirect={handleAllocateSeatDirect}
              onAddRequest={handleAddRequest}
              activeRole={activeRole}
              onAddAuditLog={logAuditAction}
            />
          )}

          {activeTab === "qr" && (
            <QRCodeSystem 
              seats={seats} 
              checkInLogs={checkInLogs} 
              onCheckIn={handleCheckIn} 
              onCheckOut={handleCheckOut} 
            />
          )}

          {activeTab === "mobile" && (
            <MobileSimulator 
              seats={seats} 
              currentUser={currentUser}
              onAddRequest={handleAddRequest} 
              onCheckIn={handleCheckIn} 
              onCheckOut={handleCheckOut} 
            />
          )}

          {activeTab === "audit" && (
            <AuditLogsView 
              logs={auditLogs}
            />
          )}

          {activeTab === "powerbi" && (
            <PowerBIDashboard 
              seats={seats}
              assets={assets}
              employees={employees}
              buildings={buildings}
              floors={floors}
              zones={zones}
              requests={requests}
              checkInLogs={checkInLogs}
              auditLogs={auditLogs}
            />
          )}

          {activeTab === "developer" && (
            <DeveloperFiles />
          )}

          {activeTab === "manuals" && (
            <ManualsView />
          )}
        </main>

        {/* Status Bar / Footer */}
        <footer className="h-10 border-t border-slate-200 px-6 flex items-center justify-between bg-white text-[10px] font-semibold text-slate-500 shrink-0 select-none">
          <div className="flex space-x-6">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>System Online</span>
            </span>
            <span>Build Version: 1.2.0.8-enterprise</span>
            <span>Database Latency: 12ms</span>
          </div>
          <div className="flex space-x-4">
            <span>© 2026 Global Corporate Systems</span>
            <span className="text-blue-600 hover:underline cursor-pointer">Technical Support</span>
          </div>
        </footer>
      </div>

      {/* User Profile & Security Settings Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateUser={handleUpdateCurrentUserProfile}
          onAddAuditLog={logAuditAction}
        />
      )}

      {/* Create Location Site Environment Modal */}
      <CreateSiteModal
        isOpen={isCreateSiteModalOpen}
        onClose={() => setIsCreateSiteModalOpen(false)}
        onAddSite={handleAddNewSite}
      />

      {/* Enterprise Data Encryption & Security Status Modal */}
      <EncryptionSecurityModal
        isOpen={isEncryptionModalOpen}
        onClose={() => setIsEncryptionModalOpen(false)}
        usersCount={users.length}
        seatsCount={seats.length}
        requestsCount={requests.length}
      />

      {/* Global Email Notifications Toast & SMTP Relay Terminal Modal */}
      <EmailToastAndModal />
    </div>
  );
}
