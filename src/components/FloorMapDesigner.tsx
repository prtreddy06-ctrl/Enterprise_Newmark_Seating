import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Building, Floor, Zone, Seat, UserRole, LocationSite, LayoutObject, EmployeeProfile } from "../types";
import { downloadDepartmentSeatTemplate, downloadFullFloorLayoutTemplate } from "../utils/excelTemplates";
import ReplaceOrCreateFloorModal from "./ReplaceOrCreateFloorModal";
import { saveFirestoreDoc, deleteFirestoreDoc, saveFirestoreBatch } from "../lib/firestoreSync";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  Plus, 
  Trash2, 
  Move, 
  RotateCw, 
  Sparkles, 
  Grid,
  MapPin, 
  Layers, 
  Eye, 
  Lock,
  Settings,
  HelpCircle,
  TrendingUp,
  Sliders,
  CheckCircle,
  RefreshCw,
  FolderPlus,
  Copy,
  Clipboard,
  Undo2,
  Redo2,
  Save,
  Clock,
  AlertTriangle,
  Download,
  Building2,
  PlusCircle,
  LayoutGrid,
  CheckSquare,
  Square,
  Filter,
  FileSpreadsheet,
  UploadCloud,
  Upload,
  XCircle,
  Edit3,
  Maximize,
  Palette,
  Users,
  ChevronDown,
  PanelLeftOpen,
  PanelLeftClose,
  Ruler
} from "lucide-react";

interface LayoutVersion {
  id: string;
  versionNumber: string;
  floorId: string;
  modifiedBy: string;
  modifiedDate: string;
  notes: string;
  seatCount: number;
  zoneCount: number;
}

interface FloorMapDesignerProps {
  buildings: Building[];
  floors: Floor[];
  zones: Zone[];
  seats: Seat[];
  employees?: EmployeeProfile[];
  layoutObjects?: LayoutObject[];
  sites?: LocationSite[];
  activeSiteId?: string;
  onUpdateZones: (zones: Zone[]) => void;
  onUpdateSeats: (seats: Seat[]) => void;
  onUpdateLayoutObjects?: (objects: LayoutObject[]) => void;
  onUpdateBuildings?: (buildings: Building[]) => void;
  onUpdateFloors?: (floors: Floor[]) => void;
  onCommitExtractedFloor?: (data: {
    mode: "CREATE_NEW" | "REPLACE_EXISTING";
    targetFloorId?: string;
    newFloorName?: string;
    targetBuildingId: string;
    targetSiteId: string;
    extractedZones: Zone[];
    extractedSeats: Seat[];
    layoutObjects?: any[];
    fileName: string;
  }) => void;
  onAddAuditLog?: (action: string, category: any, details: string) => void;
  activeRole: string;
  brandColor?: string;
  editAccessOverride?: "edit" | "view";
}

export default function FloorMapDesigner({ 
  buildings, 
  floors, 
  zones, 
  seats,
  employees = [],
  layoutObjects: propsLayoutObjects,
  sites = [],
  activeSiteId = "site-hyd",
  onUpdateZones, 
  onUpdateSeats,
  onUpdateLayoutObjects,
  onUpdateBuildings,
  onUpdateFloors,
  onCommitExtractedFloor,
  onAddAuditLog,
  activeRole,
  brandColor = "#1d4ed8",
  editAccessOverride
}: FloorMapDesignerProps) {
  const canEditLayout = editAccessOverride
    ? editAccessOverride === "edit"
    : (activeRole === UserRole.SUPER_USER || activeRole === UserRole.ADMIN || activeRole === "Super User" || activeRole === "Admin");

  // Map Edit Protection Mode: defaults to false (Protected View Map mode) to prevent accidental layout modifications
  const [isMapEditMode, setIsMapEditMode] = useState<boolean>(false);
  const [showMoreToolsMenu, setShowMoreToolsMenu] = useState<boolean>(false);
  const [showSidebarPalette, setShowSidebarPalette] = useState<boolean>(false);
  const canModifyCanvas = canEditLayout && isMapEditMode;

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("b1");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("f1");

  // Manager Selection Filter for Seat Highlighting
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>("All");
  const [showManagerListModal, setShowManagerListModal] = useState<boolean>(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState<string>("");

  // Department Name Search/Filter for Zone Highlighting
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState<string>("");

  // Vacant-Seat-Only Highlight — lets any role (view-only included) quickly spot open desks
  const [showVacantOnly, setShowVacantOnly] = useState<boolean>(false);

  // Only suggest departments that actually have at least one real seat —
  // this stops empty/leftover demo zones (e.g. old seed data with 0 seats)
  // from cluttering the department search autocomplete.
  const departmentList = useMemo(() => {
    const set = new Set<string>();
    (zones || []).forEach(z => {
      if (!z.department || !z.department.trim() || z.department.toLowerCase().includes("unassigned")) return;
      const hasRealSeats = (seats || []).some(s => s.zoneId === z.id);
      if (hasRealSeats) set.add(z.department.trim());
    });
    const list = Array.from(set);
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return list;
  }, [zones, seats]);

  const matchingDepartmentZoneIds = useMemo(() => {
    const q = departmentSearchQuery.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      (zones || [])
        .filter(z => (z.department || "").toLowerCase().includes(q))
        .map(z => z.id)
    );
  }, [zones, departmentSearchQuery]);

  const matchingDepartmentSeatsCount = useMemo(() => {
    const q = departmentSearchQuery.trim().toLowerCase();
    if (!q) return 0;
    return (seats || []).filter(s =>
      matchingDepartmentZoneIds.has(s.zoneId) ||
      (s.department || "").toLowerCase().includes(q) ||
      (s.allocatedDepartment || "").toLowerCase().includes(q)
    ).length;
  }, [seats, matchingDepartmentZoneIds, departmentSearchQuery]);

  const managerList = useMemo(() => {
    const set = new Set<string>();
    (seats || []).forEach(s => {
      if (s.allocatedManager && s.allocatedManager.trim()) set.add(s.allocatedManager.trim());
      if (s.managerName && s.managerName.trim()) set.add(s.managerName.trim());
    });
    (employees || []).forEach(e => {
      if (e.manager && e.manager.trim()) set.add(e.manager.trim());
    });
    const list = Array.from(set).filter(m => 
      m.toLowerCase() !== "unassigned manager" && 
      m.toLowerCase() !== "n/a" &&
      m.toLowerCase() !== "vacant"
    );
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return list;
  }, [seats, employees]);

  const managerSummaryData = useMemo(() => {
    return managerList.map(mgr => {
      const target = mgr.toLowerCase();
      
      const mgrSeats = (seats || []).filter(s => {
        if (s.allocatedManager && s.allocatedManager.toLowerCase() === target) return true;
        if (s.managerName && s.managerName.toLowerCase() === target) return true;
        
        const empName = (s.employeeName || "").toLowerCase();
        const empEmail = (s.employeeEmail || "").toLowerCase();
        if (employees && (empName || empEmail)) {
          const match = employees.find(e => 
            (empEmail && e.email && e.email.toLowerCase() === empEmail) ||
            (empName && e.name && e.name.toLowerCase() === empName)
          );
          if (match && match.manager && match.manager.toLowerCase() === target) return true;
        }
        return false;
      });

      const totalSeats = mgrSeats.length;
      const currentFloorSeats = mgrSeats.filter(s => s.floorId === selectedFloorId).length;

      const floorsBreakdownMap = new Map<string, { floorId: string; floorName: string; buildingName: string; seatCount: number }>();
      mgrSeats.forEach(s => {
        const fId = s.floorId || "unknown";
        if (!floorsBreakdownMap.has(fId)) {
          const fl = floors.find(f => f.id === fId);
          const b = buildings.find(b => b.id === fl?.buildingId);
          floorsBreakdownMap.set(fId, {
            floorId: fId,
            floorName: fl?.name || "Main Floor",
            buildingName: b?.name || "Main Building",
            seatCount: 0
          });
        }
        floorsBreakdownMap.get(fId)!.seatCount += 1;
      });

      const floorList = Array.from(floorsBreakdownMap.values());
      const distinctFloorsCount = floorList.length;

      const deptSet = new Set<string>();
      mgrSeats.forEach(s => {
        if (s.department) deptSet.add(s.department);
        if (s.allocatedDepartment) deptSet.add(s.allocatedDepartment);
      });

      return {
        managerName: mgr,
        totalSeats,
        currentFloorSeats,
        distinctFloorsCount,
        floorList,
        departments: Array.from(deptSet).join(", ") || "General Workspace"
      };
    });
  }, [managerList, seats, employees, floors, buildings, selectedFloorId]);

  const isSeatOfSelectedManager = (seat: Seat) => {
    if (!selectedManagerFilter || selectedManagerFilter === "All") return false;
    const target = selectedManagerFilter.toLowerCase();
    
    if (seat.allocatedManager && seat.allocatedManager.toLowerCase() === target) return true;
    if (seat.managerName && seat.managerName.toLowerCase() === target) return true;
    
    const empName = (seat.employeeName || "").toLowerCase();
    const empEmail = (seat.employeeEmail || "").toLowerCase();
    if (employees && (empName || empEmail)) {
      const match = employees.find(e => 
        (empEmail && e.email && e.email.toLowerCase() === empEmail) ||
        (empName && e.name && e.name.toLowerCase() === empName)
      );
      if (match && match.manager && match.manager.toLowerCase() === target) return true;
    }
    return false;
  };
  
  // Selection and Canvas State
  const [selectedElement, setSelectedElement] = useState<{ type: "zone" | "seat" | "object"; id: string } | null>(null);
  const [zoom, setZoom] = useState<number>(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Grid settings
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(20);

  // Real CAD tools: rulers along the canvas edges + a two-click distance measurement tool
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [isMeasureMode, setIsMeasureMode] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  // 1 grid unit = 1 foot of real-world floor space (matches standard CAD desk/aisle sizing conventions)
  const PIXELS_PER_FOOT = gridSize;

  // Layers Panel: visibility/lock/z-order control over zones & layout objects
  const [showLayersPanel, setShowLayersPanel] = useState<boolean>(false);

  // Multi-Seat Selection & Zone Constraint Lock State
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [lockSeatsInZone, setLockSeatsInZone] = useState<boolean>(false);

  // DRAG & DROP INTERNAL STATE
  const [draggedPreset, setDraggedPreset] = useState<string | null>(null);
  const [activeDragElement, setActiveDragElement] = useState<{ type: "zone" | "seat" | "object"; id: string } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Marquee Box Dragging Selection state
  const [isMarqueeMode, setIsMarqueeMode] = useState<boolean>(false);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState<boolean>(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  // Full-Screen Canvas State
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const toggleFullScreen = () => {
    setIsFullScreen(prev => {
      const next = !prev;
      if (next) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };

  // New Building/Floor Form inputs
  const [newCampusName, setNewCampusName] = useState<string>("North Tech Park");
  const [newBuildingName, setNewBuildingName] = useState<string>("Building Delta");
  const [newBuildingLocation, setNewBuildingLocation] = useState<string>("Austin, TX");
  
  const [newFloorName, setNewFloorName] = useState<string>("12 th Floor CRE");
  const [newFloorCode, setNewFloorCode] = useState<string>("FL-12");
  const [newFloorCapacity, setNewFloorCapacity] = useState<number>(100);

  // Excel Floor Layout Upload Modal State
  const [showExcelLayoutUploadModal, setShowExcelLayoutUploadModal] = useState<boolean>(false);
  const [parsedExcelSeats, setParsedExcelSeats] = useState<Seat[]>([]);
  const [parsedExcelZones, setParsedExcelZones] = useState<Zone[]>([]);
  const [excelLayoutFileName, setExcelLayoutFileName] = useState<string>("");
  const [excelLayoutParseErrors, setExcelLayoutParseErrors] = useState<string[]>([]);
  const [excelLayoutSuccessMsg, setExcelLayoutSuccessMsg] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [layoutObjects, setLayoutObjects] = useState<LayoutObject[]>(() => {
    if (propsLayoutObjects && propsLayoutObjects.length > 0) return propsLayoutObjects;
    try {
      const saved = localStorage.getItem('enterprizseat_layout_objects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error loading layout_objects from localStorage", e);
    }
    return [
      { id: "obj-1", floorId: "f1", name: "Executive Suite A", type: "Cabin", x: 620, y: 300, width: 140, height: 100, rotation: 0, color: "#cbd5e1" },
      { id: "obj-2", floorId: "f1", name: "Main Conference Room", type: "Conference Rooms", x: 800, y: 50, width: 220, height: 140, rotation: 0, color: "#bae6fd" },
      { id: "obj-3", floorId: "f1", name: "Cafeteria / Pantry", type: "Pantry", x: 820, y: 240, width: 200, height: 160, rotation: 0, color: "#fef08a" },
      { id: "obj-4", floorId: "f1", name: "Main Reception", type: "Reception", x: 20, y: 200, width: 120, height: 70, rotation: 0, color: "#fed7aa" },
      { id: "obj-5", floorId: "f1", name: "East Side Restrooms", type: "Rest Rooms", x: 20, y: 300, width: 120, height: 90, rotation: 0, color: "#f1f5f9" },
      { id: "obj-6", floorId: "f1", name: "Emergency Exit North", type: "Emergency Exit", x: 400, y: 10, width: 80, height: 20, rotation: 0, color: "#fca5a5" },
      { id: "obj-7", floorId: "f1", name: "Emergency Exit South", type: "Emergency Exit", x: 400, y: 470, width: 80, height: 20, rotation: 0, color: "#fca5a5" },
      { id: "obj-8", floorId: "f1", name: "Cluster Structural Pillar 1", type: "Dummy Cluster Pillar", x: 480, y: 180, width: 60, height: 60, rotation: 0, color: "#64748b" },
    ];
  });

  useEffect(() => {
    if (propsLayoutObjects && propsLayoutObjects.length > 0) {
      setLayoutObjects(propsLayoutObjects);
    }
  }, [propsLayoutObjects]);

  // Real-Time Auto-Save & Crash Recovery State
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Auto-Save Effect: Automatically sync state to LocalStorage so no changes are lost on restart/refresh
  useEffect(() => {
    try {
      localStorage.setItem('enterprizseat_zones', JSON.stringify(zones));
      localStorage.setItem('enterprizseat_seats', JSON.stringify(seats));
      localStorage.setItem('enterprizseat_layout_objects', JSON.stringify(layoutObjects));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error("Auto-save to LocalStorage failed", err);
    }
  }, [zones, seats, layoutObjects]);
  
  // Unsaved Changes & Version State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [versionHistory, setVersionHistory] = useState<LayoutVersion[]>([
    {
      id: "ver-1",
      versionNumber: "v1.0",
      floorId: "f1",
      modifiedBy: "System Admin",
      modifiedDate: "2026-07-20 10:00:00",
      notes: "Initial floor baseline creation",
      seatCount: 15,
      zoneCount: 3
    }
  ]);
  const [currentVersion, setCurrentVersion] = useState<string>("v1.0");

  // Clipboard & Undo/Redo
  const [clipboard, setClipboard] = useState<{ type: "seat" | "zone" | "object"; data: any } | null>(null);
  const [undoStack, setUndoStack] = useState<Array<{ zones: Zone[]; seats: Seat[]; objects: LayoutObject[] }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ zones: Zone[]; seats: Seat[]; objects: LayoutObject[] }>>([]);

  // Modals state
  const [showSaveVersionModal, setShowSaveVersionModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showBulkGeneratorModal, setShowBulkGeneratorModal] = useState<boolean>(false);
  const [showCreateBuildingModal, setShowCreateBuildingModal] = useState<boolean>(false);
  const [showCreateFloorModal, setShowCreateFloorModal] = useState<boolean>(false);
  const [showRenameFloorModal, setShowRenameFloorModal] = useState<boolean>(false);
  const [renameFloorNameInput, setRenameFloorNameInput] = useState<string>("");
  const [showBulkDeptModal, setShowBulkDeptModal] = useState<boolean>(false);
  const [bulkDeptInput, setBulkDeptInput] = useState<string>("");
  const [bulkManagerInput, setBulkManagerInput] = useState<string>("");
  const [bulkIsFixedSlot, setBulkIsFixedSlot] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteTargetType, setDeleteTargetType] = useState<"floor" | "zone" | "seat">("floor");

  // In-App Delete Confirmation Modal State
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    type: "seat" | "zone" | "object" | "group" | "building" | "floor";
    title: string;
    message: string;
    action: () => void;
  } | null>(null);

  // Canvas Active Zone Resize Handle State
  const [activeResizeZone, setActiveResizeZone] = useState<{
    zoneId: string;
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  // Edit Zone Modal State
  const [editingZoneModal, setEditingZoneModal] = useState<Zone | null>(null);

  // Canvas Active Facility / Layout Object Resize Handle State
  const [activeResizeObject, setActiveResizeObject] = useState<{
    objectId: string;
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  // Edit & Enlarge Facility Modal State
  const [editingObjectModal, setEditingObjectModal] = useState<LayoutObject | null>(null);

  // Freeform Zone Corner/Curve Editing: lets a single point on the outline be
  // dragged independently (pushed in or out) instead of the whole side moving
  // together, and renders the outline as a smooth curve through the points.
  const [activeDragVertex, setActiveDragVertex] = useState<{
    zoneId: string;
    vertexIndex: number;
    startX: number;
    startY: number;
    initialVX: number;
    initialVY: number;
  } | null>(null);

  /** Default 8-point outline (4 corners + 4 edge midpoints) for a zone's current box, in zone-local coordinates. */
  const getDefaultZonePoints = (zone: Zone): { x: number; y: number }[] => [
    { x: 0, y: 0 },
    { x: zone.width / 2, y: 0 },
    { x: zone.width, y: 0 },
    { x: zone.width, y: zone.height / 2 },
    { x: zone.width, y: zone.height },
    { x: zone.width / 2, y: zone.height },
    { x: 0, y: zone.height },
    { x: 0, y: zone.height / 2 }
  ];

  /** Turns a zone into an editable freeform outline (no-op if already freeform). */
  const enableFreeformZone = (zone: Zone) => {
    if (zone.points && zone.points.length > 0) return;
    saveSnapshot();
    const updated = zones.map(z => z.id === zone.id ? { ...z, points: getDefaultZonePoints(zone) } : z);
    onUpdateZones(updated);
    if (onAddAuditLog) onAddAuditLog("Enable Freeform Corners", "Floor Map", `Enabled per-corner freeform/curve editing on zone "${zone.name}"`);
  };

  /** Reverts a freeform zone back to a plain rectangle. */
  const resetZoneToRectangle = (zone: Zone) => {
    saveSnapshot();
    const updated = zones.map(z => {
      if (z.id !== zone.id) return z;
      const { points, ...rest } = z;
      return rest as Zone;
    });
    onUpdateZones(updated);
    if (onAddAuditLog) onAddAuditLog("Reset Zone Shape", "Floor Map", `Reset zone "${zone.name}" back to a plain rectangle`);
  };

  /** Builds a smooth closed SVG path (via Catmull-Rom -> cubic Bezier) through a set of points. */
  const buildSmoothClosedPath = (points: { x: number; y: number }[]): string => {
    const n = points.length;
    if (n < 3) return "";
    const p = (i: number) => points[((i % n) + n) % n];
    let d = `M ${p(0).x} ${p(0).y} `;
    for (let i = 0; i < n; i++) {
      const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y} `;
    }
    return d + "Z";
  };

  const startDragZoneVertex = (e: React.MouseEvent, zone: Zone, vertexIndex: number) => {
    e.stopPropagation();
    if (!canModifyCanvas || !zone.points) return;
    saveSnapshot();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorInCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const cursorInCanvasY = (e.clientY - rect.top - pan.y) / zoom;
    const vertex = zone.points[vertexIndex];

    setActiveDragVertex({
      zoneId: zone.id,
      vertexIndex,
      startX: cursorInCanvasX,
      startY: cursorInCanvasY,
      initialVX: vertex.x,
      initialVY: vertex.y
    });
  };

  /** Double-click on the freeform outline inserts a new draggable point at the nearest edge midpoint, giving finer control for irregular real-map shapes. */
  const insertZoneVertexAtClick = (e: React.MouseEvent, zone: Zone) => {
    e.stopPropagation();
    if (!canModifyCanvas || !zone.points || zone.points.length === 0) return;
    const svgEl = (e.currentTarget as SVGPathElement).ownerSVGElement;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    const pts = zone.points;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
      const d = Math.hypot(clickX - midX, clickY - midY);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const a = pts[bestIdx], b = pts[(bestIdx + 1) % pts.length];
    const newPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    saveSnapshot();
    const updated = zones.map(z =>
      z.id === zone.id
        ? { ...z, points: [...pts.slice(0, bestIdx + 1), newPoint, ...pts.slice(bestIdx + 1)] }
        : z
    );
    onUpdateZones(updated);
    if (onAddAuditLog) onAddAuditLog("Add Curve Point", "Floor Map", `Added an extra outline point to zone "${zone.name}" for finer freeform shaping.`);
  };

  const filterCleanSeats = (seatList: Seat[]): Seat[] => {
    return (seatList || []).filter(s => {
      if (!s) return false;
      const num = (s.seatNumber || "").toString().trim().toUpperCase();
      const id = (s.id || "").toString().trim().toLowerCase();
      if (/^s\d+$/.test(id)) return false;
      if (id === "seat-1" || id === "seat-2" || id === "seat-3" || id === "seat-4" || id === "seat-5") return false;
      if (/^[A-Z]+-\d+$/i.test(num)) return false;
      if (num.startsWith("ZON-") || num.startsWith("ZON_") || id.startsWith("seat-auto-")) return false;
      return true;
    });
  };

  // Local Fast Drag State for ultra-responsive seat, zone, and facility moving
  const [localSeats, setLocalSeats] = useState<Seat[]>(() => filterCleanSeats(seats));
  const localSeatsRef = useRef<Seat[]>(filterCleanSeats(seats));
  const hasDraggedSeatsRef = useRef<boolean>(false);

  const [localZones, setLocalZones] = useState<Zone[]>(zones);
  const localZonesRef = useRef<Zone[]>(zones);
  const hasDraggedZonesRef = useRef<boolean>(false);

  const [localObjects, setLocalObjects] = useState<LayoutObject[]>(layoutObjects);
  const localObjectsRef = useRef<LayoutObject[]>(layoutObjects);
  const hasDraggedObjectsRef = useRef<boolean>(false);

  useEffect(() => {
    if (!activeDragElement && !activeResizeZone && !activeResizeObject) {
      const cleaned = filterCleanSeats(seats);
      setLocalSeats(cleaned);
      localSeatsRef.current = cleaned;
      setLocalZones(zones);
      localZonesRef.current = zones;
      setLocalObjects(layoutObjects);
      localObjectsRef.current = layoutObjects;
    }
  }, [seats, zones, layoutObjects, activeDragElement, activeResizeZone, activeResizeObject]);

  // Auto-Generate Layout Facilities for active floor if 0 facilities exist
  useEffect(() => {
    if (!selectedFloorId) return;

    // Auto-Generate Facilities / Layout Objects (Meeting rooms, Pantry, Boardroom, Reception, Restrooms, Cabins, Emergency exit) if 0 exist
    const floorObjects = localObjects.filter(o => o.floorId === selectedFloorId || (selectedFloorId === "f1" && (!o.floorId || o.floorId === "f1")));
    if (floorObjects.length === 0) {
      console.log(`[Floor Designer] Floor ${selectedFloorId} has 0 layout objects. Auto-generating meeting rooms, pantry, reception, cabins...`);
      const defaultFacilities: LayoutObject[] = [
        {
          id: `obj-${selectedFloorId}-mrm1`,
          floorId: selectedFloorId,
          name: "Meeting Room (Einstein)",
          type: "Conference Rooms",
          x: 1140,
          y: 280,
          width: 220,
          height: 90,
          rotation: 0,
          color: "#14b8a6"
        },
        {
          id: `obj-${selectedFloorId}-boardroom`,
          floorId: selectedFloorId,
          name: "Executive Board Room",
          type: "Conference Rooms",
          x: 650,
          y: 180,
          width: 140,
          height: 90,
          rotation: 0,
          color: "#8b5cf6"
        },
        {
          id: `obj-${selectedFloorId}-pantry`,
          floorId: selectedFloorId,
          name: "Cafeteria & Pantry Bay",
          type: "Pantry",
          x: 350,
          y: 120,
          width: 280,
          height: 160,
          rotation: 0,
          color: "#f97316"
        },
        {
          id: `obj-${selectedFloorId}-reception`,
          floorId: selectedFloorId,
          name: "RECEPTION & Visitor Lobby",
          type: "Reception",
          x: 800,
          y: 200,
          width: 160,
          height: 70,
          rotation: 0,
          color: "#06b6d4"
        },
        {
          id: `obj-${selectedFloorId}-restrooms`,
          floorId: selectedFloorId,
          name: "Rest Rooms & Wellness Bay",
          type: "Rest Rooms",
          x: 410,
          y: 380,
          width: 110,
          height: 110,
          rotation: 0,
          color: "#a855f7"
        },
        {
          id: `obj-${selectedFloorId}-cabin1`,
          floorId: selectedFloorId,
          name: "TOKYO Executive Cabin",
          type: "Cabin",
          x: 40,
          y: 300,
          width: 160,
          height: 120,
          rotation: 0,
          color: "#ec4899"
        },
        {
          id: `obj-${selectedFloorId}-exit`,
          floorId: selectedFloorId,
          name: "Emergency Exit & Stairwell",
          type: "Emergency Exit",
          x: 1300,
          y: 30,
          width: 80,
          height: 30,
          rotation: 0,
          color: "#fca5a5"
        }
      ];

      const mergedObjects = [...localObjects, ...defaultFacilities];
      updateLocalObjects(mergedObjects);
      if (onUpdateLayoutObjects) onUpdateLayoutObjects(mergedObjects);
      defaultFacilities.forEach(o => saveFirestoreDoc("layoutObjects", o));
    }
  }, [selectedFloorId, localZones.length, localSeats.length, localObjects.length]);

  const updateLocalSeats = (newSeats: Seat[]) => {
    localSeatsRef.current = newSeats;
    setLocalSeats(newSeats);
  };

  const updateLocalZones = (newZones: Zone[]) => {
    localZonesRef.current = newZones;
    setLocalZones(newZones);
  };

  const updateLocalObjects = (newObjects: LayoutObject[]) => {
    localObjectsRef.current = newObjects;
    setLocalObjects(newObjects);
  };

  const startResizeObject = (
    e: React.MouseEvent,
    obj: LayoutObject,
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
  ) => {
    e.stopPropagation();
    if (!canModifyCanvas) return;
    saveSnapshot();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorInCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const cursorInCanvasY = (e.clientY - rect.top - pan.y) / zoom;

    setActiveResizeObject({
      objectId: obj.id,
      handle,
      startX: cursorInCanvasX,
      startY: cursorInCanvasY,
      initialX: obj.x,
      initialY: obj.y,
      initialWidth: obj.width,
      initialHeight: obj.height
    });
  };

  const handleScaleObject = (objectId: string, factor: number) => {
    if (!canModifyCanvas) return;
    saveSnapshot();
    const updated = layoutObjects.map(obj => {
      if (obj.id === objectId) {
        const newW = Math.max(40, Math.round(obj.width * factor));
        const newH = Math.max(20, Math.round(obj.height * factor));
        return { ...obj, width: newW, height: newH };
      }
      return obj;
    });
    setLayoutObjects(updated);
    if (onUpdateLayoutObjects) onUpdateLayoutObjects(updated);
    if (onAddAuditLog) onAddAuditLog("Enlarge Facility", "Layout Object", `Scaled facility size by ${(factor * 100).toFixed(0)}%`);
  };

  const startResizeZone = (
    e: React.MouseEvent,
    zone: Zone,
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
  ) => {
    e.stopPropagation();
    if (!canModifyCanvas) return;
    saveSnapshot();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorInCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const cursorInCanvasY = (e.clientY - rect.top - pan.y) / zoom;

    setActiveResizeZone({
      zoneId: zone.id,
      handle,
      startX: cursorInCanvasX,
      startY: cursorInCanvasY,
      initialX: zone.x,
      initialY: zone.y,
      initialWidth: zone.width,
      initialHeight: zone.height
    });
  };

  const fitZoneToEnclosedSeats = (targetZone: Zone) => {
    saveSnapshot();
    const seatsInZone = seats.filter(s => s.zoneId === targetZone.id);
    if (seatsInZone.length === 0) {
      alert(`No seats currently associated with Zone "${targetZone.name}". Place or assign seats to this zone first.`);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    seatsInZone.forEach(s => {
      if (s.x < minX) minX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.x + 48 > maxX) maxX = s.x + 48;
      if (s.y + 48 > maxY) maxY = s.y + 48;
    });

    const padding = 20;
    let fitX = Math.max(0, Math.round(minX - padding));
    let fitY = Math.max(0, Math.round(minY - padding));
    let fitW = Math.max(100, Math.round(maxX - minX + padding * 2));
    let fitH = Math.max(80, Math.round(maxY - minY + padding * 2));

    if (snapToGrid) {
      fitX = Math.round(fitX / gridSize) * gridSize;
      fitY = Math.round(fitY / gridSize) * gridSize;
      fitW = Math.round(fitW / gridSize) * gridSize;
      fitH = Math.round(fitH / gridSize) * gridSize;
    }

    const updated = zones.map(z => z.id === targetZone.id ? { ...z, x: fitX, y: fitY, width: fitW, height: fitH } : z);
    onUpdateZones(updated);
    if (onAddAuditLog) onAddAuditLog("Fit Zone Bounds", "Zone/Seat", `Resized zone "${targetZone.name}" to fit ${seatsInZone.length} seats`);
  };

  // Bulk Infrastructure Deletion state
  const [showManageInfrastructureModal, setShowManageInfrastructureModal] = useState<boolean>(false);
  const [infrastructureTab, setInfrastructureTab] = useState<"buildings" | "floors">("buildings");
  const [selectedBuildingIdsForDelete, setSelectedBuildingIdsForDelete] = useState<Set<string>>(new Set());
  const [selectedFloorIdsForDelete, setSelectedFloorIdsForDelete] = useState<Set<string>>(new Set());
  const [floorFilterBuildingId, setFloorFilterBuildingId] = useState<string>("all");

  // Version save modal form inputs
  const [versionNotesInput, setVersionNotesInput] = useState<string>("");
  const [saveMode, setSaveMode] = useState<"update" | "new_version">("new_version");

  // Bulk Generator inputs
  const [bulkRows, setBulkRows] = useState<number>(5);
  const [bulkCols, setBulkCols] = useState<number>(10);
  const [bulkZoneId, setBulkZoneId] = useState<string>("");
  const [bulkSeatType, setBulkSeatType] = useState<any>("Standard");
  const [bulkPrefix, setBulkPrefix] = useState<string>("DESK-");
  const [bulkStartNum, setBulkStartNum] = useState<number>(101);
  const [bulkEndNum, setBulkEndNum] = useState<number>(150);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isParsingExcelLayout, setIsParsingExcelLayout] = useState<boolean>(false);

  // Keydown & Selection Recovery Effects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullScreen) {
          setIsFullScreen(false);
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        }
        if (deleteConfirmData) {
          setDeleteConfirmData(null);
        }
        return;
      }

      // Check if user is typing in an input, textarea, or select field
      const activeEl = document.activeElement as HTMLElement | null;
      const targetTag = activeEl?.tagName?.toLowerCase();
      const isInput = targetTag === "input" || targetTag === "textarea" || targetTag === "select" || activeEl?.isContentEditable;

      if (!isInput) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedElement || selectedSeatIds.length > 0) {
            e.preventDefault();
            handleDeleteCurrentSelection();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen, selectedElement, selectedSeatIds, seats, zones, layoutObjects, canEditLayout, deleteConfirmData, localSeats]);

  // Ensure selected building and floor remain valid if items are deleted
  useEffect(() => {
    if (buildings.length > 0 && !buildings.some(b => b.id === selectedBuildingId)) {
      setSelectedBuildingId(buildings[0].id);
    }
  }, [buildings, selectedBuildingId]);

  useEffect(() => {
    const validFloors = floors.filter(f => f.buildingId === selectedBuildingId);
    if (validFloors.length > 0 && !validFloors.some(f => f.id === selectedFloorId)) {
      setSelectedFloorId(validFloors[0].id);
    } else if (validFloors.length === 0 && floors.length > 0 && !floors.some(f => f.id === selectedFloorId)) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedBuildingId, selectedFloorId]);

  const handleDownloadLayoutExcelTemplate = () => {
    const templateData = [
      {
        "Building Name": currentBuilding?.name || "Newmark _Hyderabad",
        "Floor Name": currentFloor?.name || "11 th Floor CRE",
        "Zone Name": "Zone A (Cloud Platform)",
        "Seat Number": "A-101",
        "Seat Type": "Standard",
        "Status": "Occupied",
        "X Coordinate": 120,
        "Y Coordinate": 150,
        "Assigned Employee Name": "Sarah Connor",
        "Assigned Employee Email": "s.connor@enterprise.corp"
      },
      {
        "Building Name": currentBuilding?.name || "Newmark _Hyderabad",
        "Floor Name": currentFloor?.name || "11 th Floor CRE",
        "Zone Name": "Zone A (Cloud Platform)",
        "Seat Number": "A-102",
        "Seat Type": "Standard",
        "Status": "Vacant",
        "X Coordinate": 180,
        "Y Coordinate": 150,
        "Assigned Employee Name": "",
        "Assigned Employee Email": ""
      },
      {
        "Building Name": currentBuilding?.name || "Newmark _Hyderabad",
        "Floor Name": currentFloor?.name || "11 th Floor CRE",
        "Zone Name": "Zone B (DevOps & Infrastructure)",
        "Seat Number": "B-201",
        "Seat Type": "Executive",
        "Status": "Occupied",
        "X Coordinate": 300,
        "Y Coordinate": 150,
        "Assigned Employee Name": "David Lightman",
        "Assigned Employee Email": "d.lightman@enterprise.corp"
      },
      {
        "Building Name": currentBuilding?.name || "Newmark _Hyderabad",
        "Floor Name": currentFloor?.name || "11 th Floor CRE",
        "Zone Name": "Zone C (Security Operations)",
        "Seat Number": "C-301",
        "Seat Type": "Quiet Desk",
        "Status": "Reserved",
        "X Coordinate": 450,
        "Y Coordinate": 150,
        "Assigned Employee Name": "Alex Murphy",
        "Assigned Employee Email": "a.murphy@enterprise.corp"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Floor_Layout_Data");
    XLSX.writeFile(workbook, "Floor_Layout_Seats_Zones_Template.xlsx");

    if (onAddAuditLog) {
      onAddAuditLog("Download Spatial Excel Template", "Floor Designer", "Downloaded Floor Layout Seats & Zones Excel import template.");
    }
  };

  const handleParseLayoutExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelLayoutFileName(file.name);
    setIsParsingExcelLayout(true);
    setExcelLayoutParseErrors([]);
    setExcelLayoutSuccessMsg("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        const errors: string[] = [];
        const newSeats: Seat[] = [];
        const zoneMap = new Map<string, Zone>();
        const zoneSeatCounters = new Map<string, number>();

        rows.forEach((row, index) => {
          const rowNum = index + 2;
          const seatNum = (row["Seat Number"] || row["Seat"] || row["seatNumber"] || "").toString().trim();
          const zoneName = (row["Zone Name"] || row["Zone"] || "Zone A (Cloud Platform)").toString().trim();
          const seatTypeStr = (row["Seat Type"] || row["Type"] || "Standard").toString().trim();
          const statusStr = (row["Status"] || row["Occupancy Status"] || "Vacant").toString().trim();
          const rawX = parseFloat(row["X Coordinate"] || row["X"]);
          const rawY = parseFloat(row["Y Coordinate"] || row["Y"]);
          const empName = (row["Assigned Employee Name"] || row["Employee Name"] || "").toString().trim();
          const empEmail = (row["Assigned Employee Email"] || row["Employee Email"] || "").toString().trim();

          if (!seatNum) {
            errors.push(`Row ${rowNum}: 'Seat Number' is missing.`);
            return;
          }

          if (!zoneMap.has(zoneName)) {
            const existingZone = zones.find(z => z.floorId === selectedFloorId && z.name.toLowerCase() === zoneName.toLowerCase());
            if (existingZone) {
              zoneMap.set(zoneName, { ...existingZone });
            } else {
              const zoneIndex = zoneMap.size;
              const newZoneObj: Zone = {
                id: `z-excel-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                name: zoneName,
                floorId: selectedFloorId,
                department: "General Workspace",
                capacity: 20,
                x: 40 + (zoneIndex % 3) * 260,
                y: 80 + Math.floor(zoneIndex / 3) * 240,
                width: 230,
                height: 200,
                color: zoneIndex % 4 === 0 ? "border-blue-500 bg-blue-50/40" : zoneIndex % 4 === 1 ? "border-purple-500 bg-purple-50/40" : zoneIndex % 4 === 2 ? "border-emerald-500 bg-emerald-50/40" : "border-amber-500 bg-amber-50/40"
              };
              zoneMap.set(zoneName, newZoneObj);
            }
          }

          const assignedZone = zoneMap.get(zoneName)!;
          const currentSeatCountInZone = zoneSeatCounters.get(zoneName) || 0;

          // Sequential Grid Arrangement Pattern inside Zone
          const COLS_PER_ROW = 4;
          const STEP_X = 50;
          const STEP_Y = 50;
          const PADDING_LEFT = 15;
          const PADDING_TOP = 40;

          const col = currentSeatCountInZone % COLS_PER_ROW;
          const rowInZone = Math.floor(currentSeatCountInZone / COLS_PER_ROW);

          const seqX = assignedZone.x + PADDING_LEFT + (col * STEP_X);
          const seqY = assignedZone.y + PADDING_TOP + (rowInZone * STEP_Y);

          // Use raw coordinates if provided and valid positive numbers; otherwise auto-position sequentially
          const finalX = (!isNaN(rawX) && rawX > 0) ? rawX : seqX;
          const finalY = (!isNaN(rawY) && rawY > 0) ? rawY : seqY;

          // Auto-expand zone boundaries if seats exceed initial zone width/height
          const requiredWidth = (finalX + 45) - assignedZone.x;
          const requiredHeight = (finalY + 45) - assignedZone.y;
          if (requiredWidth > assignedZone.width) {
            assignedZone.width = Math.max(assignedZone.width, requiredWidth + 20);
          }
          if (requiredHeight > assignedZone.height) {
            assignedZone.height = Math.max(assignedZone.height, requiredHeight + 20);
          }

          zoneSeatCounters.set(zoneName, currentSeatCountInZone + 1);

          let seatType: "Standard" | "Hot Desk" | "Executive" | "Collaborative" = "Standard";
          if (seatTypeStr.toLowerCase().includes("hot")) seatType = "Hot Desk";
          else if (seatTypeStr.toLowerCase().includes("exec")) seatType = "Executive";
          else if (seatTypeStr.toLowerCase().includes("collab") || seatTypeStr.toLowerCase().includes("group")) seatType = "Collaborative";

          let status: "Vacant" | "Occupied" | "Reserved" = "Vacant";
          if (statusStr.toLowerCase().includes("occup") || empName) status = "Occupied";
          else if (statusStr.toLowerCase().includes("reser")) status = "Reserved";

          const seatObj: Seat = {
            id: `s-excel-${Date.now()}-${index}`,
            seatNumber: seatNum,
            zoneId: assignedZone.id,
            floorId: selectedFloorId,
            buildingId: selectedBuildingId,
            x: finalX,
            y: finalY,
            type: seatType,
            status,
            employeeName: empName || undefined,
            employeeEmail: empEmail || undefined,
            rotation: 0
          };

          newSeats.push(seatObj);
        });

        const newlyCreatedZones = Array.from(zoneMap.values()).filter(z => !zones.some(existing => existing.id === z.id));

        setParsedExcelSeats(newSeats);
        setParsedExcelZones(newlyCreatedZones);
        setExcelLayoutParseErrors(errors);
        setIsParsingExcelLayout(false);
      } catch (err) {
        setIsParsingExcelLayout(false);
        alert("Unable to parse Excel file structure.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCommitLayoutExcel = () => {
    if (parsedExcelSeats.length === 0) return;
    saveSnapshot();

    const updatedZones = parsedExcelZones.length > 0 ? [...zones, ...parsedExcelZones] : zones;
    if (parsedExcelZones.length > 0) {
      onUpdateZones(updatedZones);
      updateLocalZones(updatedZones);
      saveFirestoreBatch("zones", parsedExcelZones);
    }

    const newSeatNumbers = new Set(parsedExcelSeats.map(s => s.seatNumber));
    const preservedSeats = seats.filter(s => !(s.floorId === selectedFloorId && newSeatNumbers.has(s.seatNumber)));
    const updatedSeats = [...preservedSeats, ...parsedExcelSeats];
    
    onUpdateSeats(updatedSeats);
    updateLocalSeats(updatedSeats);
    saveFirestoreBatch("seats", parsedExcelSeats);

    setExcelLayoutSuccessMsg(`Successfully imported ${parsedExcelSeats.length} seats and created ${parsedExcelZones.length} new zones into ${currentFloor?.name || 'current floor'} layout.`);

    if (onAddAuditLog) {
      onAddAuditLog(
        "Excel Layout Import",
        "Floor Designer",
        `Imported ${parsedExcelSeats.length} seats and ${parsedExcelZones.length} zones into ${currentFloor?.name} layout via Excel upload.`
      );
    }
    setHasUnsavedChanges(true);
  };

  // Push state to Undo Stack before modification
  const saveSnapshot = () => {
    const currentZonesSnapshot = JSON.parse(JSON.stringify(localZonesRef.current || zones));
    const currentSeatsSnapshot = JSON.parse(JSON.stringify(localSeatsRef.current || seats));
    const currentObjectsSnapshot = JSON.parse(JSON.stringify(localObjectsRef.current || layoutObjects));

    setUndoStack(prev => [
      ...prev.slice(-30), 
      { zones: currentZonesSnapshot, seats: currentSeatsSnapshot, objects: currentObjectsSnapshot }
    ]);
    setRedoStack([]);
    setHasUnsavedChanges(true);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    
    // Capture current snapshot for redo
    const currentSnapshot = {
      zones: JSON.parse(JSON.stringify(localZonesRef.current || zones)),
      seats: JSON.parse(JSON.stringify(localSeatsRef.current || seats)),
      objects: JSON.parse(JSON.stringify(localObjectsRef.current || layoutObjects))
    };

    setRedoStack(prev => [...prev, currentSnapshot]);

    updateLocalZones(last.zones);
    onUpdateZones(last.zones);

    updateLocalSeats(last.seats);
    onUpdateSeats(last.seats);

    updateLocalObjects(last.objects);
    setLayoutObjects(last.objects);
    if (onUpdateLayoutObjects) onUpdateLayoutObjects(last.objects);

    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];

    const currentSnapshot = {
      zones: JSON.parse(JSON.stringify(localZonesRef.current || zones)),
      seats: JSON.parse(JSON.stringify(localSeatsRef.current || seats)),
      objects: JSON.parse(JSON.stringify(localObjectsRef.current || layoutObjects))
    };

    setUndoStack(prev => [...prev, currentSnapshot]);

    updateLocalZones(next.zones);
    onUpdateZones(next.zones);

    updateLocalSeats(next.seats);
    onUpdateSeats(next.seats);

    updateLocalObjects(next.objects);
    setLayoutObjects(next.objects);
    if (onUpdateLayoutObjects) onUpdateLayoutObjects(next.objects);

    setRedoStack(prev => prev.slice(0, -1));
  };

  // Helper filter lists
  const currentFloors = floors.filter(f => f.buildingId === selectedBuildingId);
  const currentZones = localZones.filter(z => z.floorId === selectedFloorId || (selectedFloorId === "f1" && (!z.floorId || z.floorId === "f1")));
  const currentZoneIds = new Set(currentZones.map(z => z.id));
  const currentSeats = localSeats.filter(s => 
    s.floorId === selectedFloorId || 
    (selectedFloorId === "f1" && (!s.floorId || s.floorId === "f1")) ||
    (s.zoneId && currentZoneIds.has(s.zoneId))
  );
  const currentLayoutObjects = localObjects.filter(o => o.floorId === selectedFloorId || (selectedFloorId === "f1" && (!o.floorId || o.floorId === "f1")));
  const currentBuilding = buildings.find(b => b.id === selectedBuildingId);
  const currentFloor = floors.find(f => f.id === selectedFloorId);

  // Zoom limits
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.2));
  const handleZoomReset = () => {
    setZoom(0.6);
    setPan({ x: 0, y: 0 });
  };

  // Preset drag
  const handlePresetDragStart = (e: React.DragEvent, type: string) => {
    if (!canModifyCanvas) {
      e.preventDefault();
      return;
    }
    setDraggedPreset(type);
  };

  // Canvas Drop Handler
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current || !draggedPreset) return;

    if (!canModifyCanvas) {
      if (!canEditLayout) {
        alert("Role Permission Denied: Only Super Users and Admins can modify floor layout components.");
      } else {
        alert("Floor Map is currently in View Only mode (Protected). Click 'Edit Map' in the top header bar to enable editing & dragging.");
      }
      return;
    }

    saveSnapshot();

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;

    let finalX = Math.round(rawX);
    let finalY = Math.round(rawY);

    if (snapToGrid) {
      finalX = Math.round(finalX / gridSize) * gridSize;
      finalY = Math.round(finalY / gridSize) * gridSize;
    }

    if (draggedPreset.startsWith("seat-")) {
      const seatType = draggedPreset.split("-")[1] as any;
      const count = seats.length + 1;
      const seatNum = `${seatType.substring(0,1).toUpperCase()}-${100 + count}`;
      
      const closestZone = currentZones.find(z => 
        finalX >= z.x && finalX <= z.x + z.width &&
        finalY >= z.y && finalY <= z.y + z.height
      );

      const newSeat: Seat = {
        id: `seat-new-${Date.now()}`,
        seatNumber: seatNum,
        zoneId: closestZone?.id || (currentZones[0]?.id || "z1"),
        floorId: selectedFloorId,
        buildingId: selectedBuildingId,
        type: seatType,
        status: "Vacant",
        x: finalX,
        y: finalY,
        rotation: 0
      };
      
      onUpdateSeats([...seats, newSeat]);
      setSelectedElement({ type: "seat", id: newSeat.id });
    } else if (draggedPreset === "zone-new") {
      const count = zones.length + 1;
      const newZone: Zone = {
        id: `zone-new-${Date.now()}`,
        floorId: selectedFloorId,
        name: `Zone ${String.fromCharCode(65 + (count % 26))} (Unconfirmed)`,
        department: "Unassigned (Pending Confirmation)",
        color: "#" + Math.floor(Math.random()*16777215).toString(16),
        x: finalX,
        y: finalY,
        width: 180,
        height: 140,
        capacity: 20,
        isConfirmed: false
      };
      onUpdateZones([...zones, newZone]);
      setSelectedElement({ type: "zone", id: newZone.id });
    } else {
      const type = draggedPreset as any;
      const count = layoutObjects.length + 1;
      const colorsMap: Record<string, string> = {
        "Cabin": "#cbd5e1",
        "Conference Rooms": "#bae6fd",
        "Pantry": "#fef08a",
        "Reception": "#fed7aa",
        "Rest Rooms": "#f1f5f9",
        "Emergency Exit": "#fca5a5",
        "Dummy Cluster Pillar": "#64748b",
        "Structural Pillar": "#64748b"
      };

      const isPillar = type === "Dummy Cluster Pillar" || type === "Structural Pillar";

      const newObj: LayoutObject = {
        id: `obj-new-${Date.now()}`,
        floorId: selectedFloorId,
        name: isPillar ? `Cluster Pillar ${count} (No Seats)` : `New ${type} ${count}`,
        type,
        x: finalX,
        y: finalY,
        width: type === "Emergency Exit" ? 80 : isPillar ? 60 : 120,
        height: type === "Emergency Exit" ? 20 : isPillar ? 60 : 90,
        rotation: 0,
        color: colorsMap[type] || "#e2e8f0"
      };

      const nextObjects = [...layoutObjects, newObj];
      setLayoutObjects(nextObjects);
      updateLocalObjects(nextObjects);
      if (onUpdateLayoutObjects) {
        onUpdateLayoutObjects(nextObjects);
      } else {
        localStorage.setItem('enterprizseat_layout_objects', JSON.stringify(nextObjects));
      }
      saveFirestoreDoc("layoutObjects", newObj);
      setSelectedElement({ type: "object", id: newObj.id });
    }

    setDraggedPreset(null);
  };

  // Canvas Mouse Actions
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-draggable='true']")) {
      return;
    }

    // Real CAD Measure Tool: click two points on the canvas to get a live distance readout
    if (isMeasureMode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cursorX = (e.clientX - rect.left - pan.x) / zoom;
      const cursorY = (e.clientY - rect.top - pan.y) / zoom;
      setMeasurePoints(prev => {
        if (prev.length >= 2) return [{ x: cursorX, y: cursorY }];
        return [...prev, { x: cursorX, y: cursorY }];
      });
      return;
    }

    // If Shift key is held or Box Select tool is enabled, start Marquee Box Selection
    if (e.shiftKey || isMarqueeMode) {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cursorX = (e.clientX - rect.left - pan.x) / zoom;
        const cursorY = (e.clientY - rect.top - pan.y) / zoom;
        setMarqueeStart({ x: cursorX, y: cursorY });
        setMarqueeEnd({ x: cursorX, y: cursorY });
        setIsMarqueeSelecting(true);
      }
      return;
    }

    // Deselect multi-selected seats when clicking on empty canvas without Shift
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedSeatIds([]);
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isMarqueeSelecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cursorX = (e.clientX - rect.left - pan.x) / zoom;
      const cursorY = (e.clientY - rect.top - pan.y) / zoom;
      setMarqueeEnd({ x: cursorX, y: cursorY });
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (activeDragVertex && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cursorInCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const cursorInCanvasY = (e.clientY - rect.top - pan.y) / zoom;

      let newVX = activeDragVertex.initialVX + (cursorInCanvasX - activeDragVertex.startX);
      let newVY = activeDragVertex.initialVY + (cursorInCanvasY - activeDragVertex.startY);

      if (snapToGrid) {
        newVX = Math.round(newVX / gridSize) * gridSize;
        newVY = Math.round(newVY / gridSize) * gridSize;
      }

      const updatedZones = zones.map(z => {
        if (z.id !== activeDragVertex.zoneId || !z.points) return z;
        const newPoints = z.points.map((pt, idx) =>
          idx === activeDragVertex.vertexIndex ? { x: newVX, y: newVY } : pt
        );
        return { ...z, points: newPoints };
      });
      onUpdateZones(updatedZones);
      return;
    }

    if (activeResizeZone && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cursorInCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const cursorInCanvasY = (e.clientY - rect.top - pan.y) / zoom;

      const dx = cursorInCanvasX - activeResizeZone.startX;
      const dy = cursorInCanvasY - activeResizeZone.startY;

      let newX = activeResizeZone.initialX;
      let newY = activeResizeZone.initialY;
      let newW = activeResizeZone.initialWidth;
      let newH = activeResizeZone.initialHeight;

      const { handle } = activeResizeZone;

      if (handle.includes("e")) {
        newW = Math.max(80, activeResizeZone.initialWidth + dx);
      }
      if (handle.includes("s")) {
        newH = Math.max(60, activeResizeZone.initialHeight + dy);
      }
      if (handle.includes("w")) {
        const possibleW = activeResizeZone.initialWidth - dx;
        if (possibleW >= 80) {
          newW = possibleW;
          newX = activeResizeZone.initialX + dx;
        }
      }
      if (handle.includes("n")) {
        const possibleH = activeResizeZone.initialHeight - dy;
        if (possibleH >= 60) {
          newH = possibleH;
          newY = activeResizeZone.initialY + dy;
        }
      }

      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
        newW = Math.round(newW / gridSize) * gridSize;
        newH = Math.round(newH / gridSize) * gridSize;
      }

      const updatedZones = zones.map(z => 
        z.id === activeResizeZone.zoneId ? { ...z, x: newX, y: newY, width: newW, height: newH } : z
      );
      onUpdateZones(updatedZones);
      return;
    }

    if (activeResizeObject && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cursorInCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const cursorInCanvasY = (e.clientY - rect.top - pan.y) / zoom;

      const dx = cursorInCanvasX - activeResizeObject.startX;
      const dy = cursorInCanvasY - activeResizeObject.startY;

      let newX = activeResizeObject.initialX;
      let newY = activeResizeObject.initialY;
      let newW = activeResizeObject.initialWidth;
      let newH = activeResizeObject.initialHeight;

      const { handle } = activeResizeObject;

      if (handle.includes("e")) {
        newW = Math.max(40, activeResizeObject.initialWidth + dx);
      }
      if (handle.includes("s")) {
        newH = Math.max(20, activeResizeObject.initialHeight + dy);
      }
      if (handle.includes("w")) {
        const possibleW = activeResizeObject.initialWidth - dx;
        if (possibleW >= 40) {
          newW = possibleW;
          newX = activeResizeObject.initialX + dx;
        }
      }
      if (handle.includes("n")) {
        const possibleH = activeResizeObject.initialHeight - dy;
        if (possibleH >= 20) {
          newH = possibleH;
          newY = activeResizeObject.initialY + dy;
        }
      }

      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
        newW = Math.round(newW / gridSize) * gridSize;
        newH = Math.round(newH / gridSize) * gridSize;
      }

      const updatedObjects = layoutObjects.map(o => 
        o.id === activeResizeObject.objectId ? { ...o, x: newX, y: newY, width: newW, height: newH } : o
      );
      setLayoutObjects(updatedObjects);
      if (onUpdateLayoutObjects) onUpdateLayoutObjects(updatedObjects);
      return;
    }

    if (activeDragElement && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
      const rawY = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;

      let finalX = Math.round(rawX);
      let finalY = Math.round(rawY);

      if (snapToGrid) {
        finalX = Math.round(finalX / gridSize) * gridSize;
        finalY = Math.round(finalY / gridSize) * gridSize;
      }

      if (activeDragElement.type === "zone") {
        const zoneToMove = localZonesRef.current.find(z => z.id === activeDragElement.id);
        if (zoneToMove) {
          hasDraggedZonesRef.current = true;
          const deltaX = finalX - zoneToMove.x;
          const deltaY = finalY - zoneToMove.y;

          const updatedZones = localZonesRef.current.map(z => 
            z.id === activeDragElement.id ? { ...z, x: finalX, y: finalY } : z
          );
          updateLocalZones(updatedZones);

          // Auto seat translation inside zone
          const updatedSeats = localSeatsRef.current.map(s => {
            if (s.zoneId === activeDragElement.id) {
              return {
                ...s,
                x: s.x + deltaX,
                y: s.y + deltaY
              };
            }
            return s;
          });
          updateLocalSeats(updatedSeats);
          hasDraggedSeatsRef.current = true;
        }
      } else if (activeDragElement.type === "seat") {
        const activeSeat = localSeatsRef.current.find(s => s.id === activeDragElement.id);
        if (activeSeat) {
          hasDraggedSeatsRef.current = true;
          const deltaX = finalX - activeSeat.x;
          const deltaY = finalY - activeSeat.y;

          // Check if dragging a seat that is part of a multi-seat selection
          if (selectedSeatIds.includes(activeDragElement.id) && selectedSeatIds.length > 1) {
            const updatedSeats = localSeatsRef.current.map(s => {
              if (selectedSeatIds.includes(s.id)) {
                let targetX = Math.round(s.x + deltaX);
                let targetY = Math.round(s.y + deltaY);

                if (snapToGrid) {
                  targetX = Math.round(targetX / gridSize) * gridSize;
                  targetY = Math.round(targetY / gridSize) * gridSize;
                }

                // ZONE BOUNDARY CONTAINMENT CONSTRAINT (only if lockSeatsInZone is enabled)
                if (lockSeatsInZone && s.zoneId) {
                  const parentZone = localZonesRef.current.find(z => z.id === s.zoneId);
                  if (parentZone) {
                    const minX = parentZone.x + 4;
                    const maxX = Math.max(parentZone.x + 4, parentZone.x + parentZone.width - 48);
                    const minY = parentZone.y + 4;
                    const maxY = Math.max(parentZone.y + 4, parentZone.y + parentZone.height - 48);

                    targetX = Math.max(minX, Math.min(targetX, maxX));
                    targetY = Math.max(minY, Math.min(targetY, maxY));
                  }
                }

                return { ...s, x: targetX, y: targetY };
              }
              return s;
            });
            updateLocalSeats(updatedSeats);
          } else {
            // Single seat drag
            let targetX = finalX;
            let targetY = finalY;

            let newZoneId = activeSeat.zoneId;
            let didCrossIntoNewZone = false;

            if (lockSeatsInZone && activeSeat.zoneId) {
              const parentZone = localZonesRef.current.find(z => z.id === activeSeat.zoneId);
              if (parentZone) {
                const minX = parentZone.x + 4;
                const maxX = Math.max(parentZone.x + 4, parentZone.x + parentZone.width - 48);
                const minY = parentZone.y + 4;
                const maxY = Math.max(parentZone.y + 4, parentZone.y + parentZone.height - 48);

                targetX = Math.max(minX, Math.min(targetX, maxX));
                targetY = Math.max(minY, Math.min(targetY, maxY));
              }
            } else if (!lockSeatsInZone) {
              // Auto-detect zone when seat lands in a zone box
              const landedZone = localZonesRef.current.find(z => 
                targetX >= z.x - 10 && targetX <= z.x + z.width - 15 &&
                targetY >= z.y - 10 && targetY <= z.y + z.height - 15
              );
              if (landedZone && landedZone.id !== activeSeat.zoneId) {
                newZoneId = landedZone.id;
                didCrossIntoNewZone = true;
              }
            }

            const updatedSeats = localSeatsRef.current.map(s => 
              s.id === activeDragElement.id
                ? { ...s, x: targetX, y: targetY, zoneId: newZoneId, isFixedSlot: didCrossIntoNewZone ? true : s.isFixedSlot }
                : s
            );
            updateLocalSeats(updatedSeats);
            if (didCrossIntoNewZone && onAddAuditLog) {
              const newZoneName = localZonesRef.current.find(z => z.id === newZoneId)?.name || newZoneId;
              onAddAuditLog("Seat Moved & Locked to Zone", "Floor Map", `Seat ${activeSeat.seatNumber} moved into zone "${newZoneName}" and locked there.`);
            }
          }
        }
      } else if (activeDragElement.type === "object") {
        hasDraggedObjectsRef.current = true;
        const updatedObjects = localObjectsRef.current.map(obj => 
          obj.id === activeDragElement.id ? { ...obj, x: finalX, y: finalY } : obj
        );
        updateLocalObjects(updatedObjects);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (hasDraggedZonesRef.current) {
      onUpdateZones(localZonesRef.current);
      hasDraggedZonesRef.current = false;
    }

    if (hasDraggedSeatsRef.current) {
      onUpdateSeats(localSeatsRef.current);
      hasDraggedSeatsRef.current = false;
    }

    if (hasDraggedObjectsRef.current) {
      // BUGFIX: this used to only update the component's own internal
      // `layoutObjects` state and never called the parent callback — so the
      // move was never persisted to App.tsx/Firestore. Any later re-render
      // then re-synced this component from the (still-stale) parent prop,
      // snapping the object back to its pre-drag position. Zones and seats
      // already called their parent callback here; objects now do too.
      setLayoutObjects(localObjectsRef.current);
      if (onUpdateLayoutObjects) onUpdateLayoutObjects(localObjectsRef.current);
      hasDraggedObjectsRef.current = false;
    }

    if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
      const minX = Math.min(marqueeStart.x, marqueeEnd.x);
      const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
      const minY = Math.min(marqueeStart.y, marqueeEnd.y);
      const maxY = Math.max(marqueeStart.y, marqueeEnd.y);

      // Only perform multi-select if marquee box is larger than a tiny click
      if (maxX - minX > 8 || maxY - minY > 8) {
        const foundSeatIds = currentSeats
          .filter(s => (s.x + 40 >= minX && s.x <= maxX && s.y + 40 >= minY && s.y <= maxY))
          .map(s => s.id);

        if (foundSeatIds.length > 0) {
          setSelectedSeatIds(foundSeatIds);
          setSelectedElement({ type: "seat", id: foundSeatIds[0] });
        }
      }

      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }

    setIsPanning(false);
    setActiveDragElement(null);
    setActiveResizeZone(null);
    setActiveResizeObject(null);
    setActiveDragVertex(null);
  };

  const startDragElement = (e: React.MouseEvent, type: "zone" | "seat" | "object", id: string, initialX: number, initialY: number) => {
    e.stopPropagation();

    if (type === "seat") {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelectedSeatIds(prev => 
          prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
      } else {
        if (!selectedSeatIds.includes(id)) {
          setSelectedSeatIds([id]);
        }
      }
    } else {
      setSelectedSeatIds([]);
    }

    setSelectedElement({ type, id });
    if (!canModifyCanvas) return;

    saveSnapshot();
    
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorInCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const cursorInCanvasY = (e.clientY - rect.top - pan.y) / zoom;

    setDragOffset({
      x: cursorInCanvasX - initialX,
      y: cursorInCanvasY - initialY
    });
    
    setActiveDragElement({ type, id });
  };

  // Copy / Paste / Rotate
  const handleCopy = () => {
    if (!selectedElement) return;
    if (selectedElement.type === "seat") {
      const target = seats.find(s => s.id === selectedElement.id);
      if (target) setClipboard({ type: "seat", data: { ...target } });
    } else if (selectedElement.type === "zone") {
      const target = zones.find(z => z.id === selectedElement.id);
      if (target) setClipboard({ type: "zone", data: { ...target } });
    } else if (selectedElement.type === "object") {
      const target = layoutObjects.find(o => o.id === selectedElement.id);
      if (target) setClipboard({ type: "object", data: { ...target } });
    }
  };

  const handlePaste = () => {
    if (!clipboard) return;
    saveSnapshot();
    const offsetX = 30;
    const offsetY = 30;

    if (clipboard.type === "seat") {
      const newSeat: Seat = {
        ...clipboard.data,
        id: `seat-copy-${Date.now()}`,
        seatNumber: `${clipboard.data.seatNumber}-CP`,
        x: clipboard.data.x + offsetX,
        y: clipboard.data.y + offsetY,
        status: "Vacant"
      };
      onUpdateSeats([...seats, newSeat]);
      setSelectedElement({ type: "seat", id: newSeat.id });
    } else if (clipboard.type === "zone") {
      const newZone: Zone = {
        ...clipboard.data,
        id: `zone-copy-${Date.now()}`,
        name: `${clipboard.data.name} (Copy)`,
        x: clipboard.data.x + offsetX,
        y: clipboard.data.y + offsetY
      };
      onUpdateZones([...zones, newZone]);
      setSelectedElement({ type: "zone", id: newZone.id });
    } else if (clipboard.type === "object") {
      const newObj: LayoutObject = {
        ...clipboard.data,
        id: `obj-copy-${Date.now()}`,
        floorId: selectedFloorId,
        name: `${clipboard.data.name} (Copy)`,
        x: clipboard.data.x + offsetX,
        y: clipboard.data.y + offsetY
      };
      setLayoutObjects([...layoutObjects, newObj]);
      if (onUpdateLayoutObjects) onUpdateLayoutObjects([...layoutObjects, newObj]);
      setSelectedElement({ type: "object", id: newObj.id });
    }
  };

  const rotateSelected = () => {
    if (!selectedElement) return;
    saveSnapshot();
    if (selectedElement.type === "seat") {
      const updated = seats.map(s => 
        s.id === selectedElement.id ? { ...s, rotation: ((s.rotation || 0) + 90) % 360 } : s
      );
      onUpdateSeats(updated);
    } else if (selectedElement.type === "object") {
      const updated = layoutObjects.map(o => 
        o.id === selectedElement.id ? { ...o, rotation: (o.rotation + 90) % 360 } : o
      );
      setLayoutObjects(updated);
      if (onUpdateLayoutObjects) onUpdateLayoutObjects(updated);
    }
  };

  const executeDeleteSingleSeat = (seatId: string, seatNumber?: string) => {
    saveSnapshot();
    const nextSeats = seats.filter(s => s.id !== seatId);
    onUpdateSeats(nextSeats);
    updateLocalSeats(nextSeats);
    setSelectedElement(null);
    setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
    if (onAddAuditLog) onAddAuditLog("Delete Seat", "Zone/Seat", `Deleted seat #${seatNumber || seatId}`);
  };

  const executeDeleteZone = (zoneId: string, zoneName?: string) => {
    saveSnapshot();
    const nextZones = zones.filter(z => z.id !== zoneId);
    onUpdateZones(nextZones);
    const nextSeats = seats.map(s => s.zoneId === zoneId ? { ...s, zoneId: "" } : s);
    onUpdateSeats(nextSeats);
    updateLocalSeats(nextSeats);
    setSelectedElement(null);
    if (onAddAuditLog) onAddAuditLog("Delete Zone", "Zone/Seat", `Deleted zone ${zoneName || zoneId}`);
  };

  const executeDeleteObject = (objId: string) => {
    saveSnapshot();
    const nextObjects = layoutObjects.filter(o => o.id !== objId);
    setLayoutObjects(nextObjects);
    if (onUpdateLayoutObjects) onUpdateLayoutObjects(nextObjects);
    setSelectedElement(null);
  };


  const executeDeleteGroupSeats = () => {
    saveSnapshot();
    const count = selectedSeatIds.length;
    const nextSeats = seats.filter(s => !selectedSeatIds.includes(s.id));
    onUpdateSeats(nextSeats);
    updateLocalSeats(nextSeats);
    setSelectedSeatIds([]);
    setSelectedElement(null);
    if (onAddAuditLog) onAddAuditLog("Bulk Delete Seats", "Zone/Seat", `Deleted ${count} seats`);
  };

  const handleDeleteCurrentSelection = () => {
    if (!canModifyCanvas) {
      if (!canEditLayout) {
        alert("Role Permission Denied: Only Super Users and Admins can delete elements.");
      } else {
        alert("Floor Map is locked in View Mode (Protected). Click 'Edit Map' in the top header toolbar to enable editing.");
      }
      return;
    }

    if (selectedSeatIds.length > 0) {
      const occupiedSeats = seats.filter(s => selectedSeatIds.includes(s.id) && s.status === "Occupied");
      if (occupiedSeats.length > 0) {
        setDeleteConfirmData({
          type: "group",
          title: "Delete Selected Seats",
          message: `Warning: ${occupiedSeats.length} of the selected seats are occupied by employees. Delete selected seats anyway?`,
          action: () => executeDeleteGroupSeats()
        });
        return;
      }
      executeDeleteGroupSeats();
      return;
    }

    if (!selectedElement) return;

    if (selectedElement.type === "seat") {
      const seatToDelete = seats.find(s => s.id === selectedElement.id) || localSeats.find(s => s.id === selectedElement.id);
      if (seatToDelete?.status === "Occupied") {
        setDeleteConfirmData({
          type: "seat",
          title: "Delete Occupied Seat",
          message: `Warning: Seat ${seatToDelete.seatNumber} is currently occupied by ${seatToDelete.employeeName || "an employee"}. Are you sure you want to delete this seat?`,
          action: () => executeDeleteSingleSeat(selectedElement.id, seatToDelete.seatNumber)
        });
        return;
      }
      executeDeleteSingleSeat(selectedElement.id, seatToDelete?.seatNumber);
    } else if (selectedElement.type === "zone") {
      const zoneToDelete = zones.find(z => z.id === selectedElement.id);
      const zoneSeats = seats.filter(s => s.zoneId === selectedElement.id);
      const occupiedInZone = zoneSeats.filter(s => s.status === "Occupied").length;
      if (occupiedInZone > 0) {
        setDeleteConfirmData({
          type: "zone",
          title: "Delete Zone with Occupied Seats",
          message: `Warning: Zone "${zoneToDelete?.name || "Zone"}" contains ${occupiedInZone} occupied seat(s). Deleting this zone will disassociate those seats. Proceed?`,
          action: () => executeDeleteZone(selectedElement.id, zoneToDelete?.name)
        });
        return;
      }
      executeDeleteZone(selectedElement.id, zoneToDelete?.name);
    } else if (selectedElement.type === "object") {
      executeDeleteObject(selectedElement.id);
    }
  };

  const deleteSelected = () => {
    handleDeleteCurrentSelection();
  };

  const resizeZone = (widthChange: number, heightChange: number) => {
    if (!selectedElement || selectedElement.type !== "zone") return;
    saveSnapshot();
    const updated = zones.map(z => {
      if (z.id === selectedElement.id) {
        return {
          ...z,
          width: Math.max(z.width + widthChange, 80),
          height: Math.max(z.height + heightChange, 60)
        };
      }
      return z;
    });
    onUpdateZones(updated);
  };

  // Bulk Seat Generator Logic
  const handleGenerateBulkSeats = () => {
    if (bulkEndNum < bulkStartNum) {
      alert("End Seat Number must be greater than or equal to Start Seat Number.");
      return;
    }

    saveSnapshot();
    const targetZone = zones.find(z => z.id === bulkZoneId) || currentZones[0];
    const startX = targetZone ? targetZone.x + 20 : 100;
    const startY = targetZone ? targetZone.y + 40 : 100;
    const spacingX = 42;
    const spacingY = 42;

    const newSeatsList: Seat[] = [];
    const totalSeats = bulkEndNum - bulkStartNum + 1;
    const cols = Math.max(1, bulkCols);

    for (let i = 0; i < totalSeats; i++) {
      const seatVal = bulkStartNum + i;
      const seatNum = `${bulkPrefix}${seatVal}`;
      const r = Math.floor(i / cols);
      const c = i % cols;

      newSeatsList.push({
        id: `seat-bulk-${Date.now()}-${i}`,
        seatNumber: seatNum,
        zoneId: targetZone?.id || "z1",
        floorId: selectedFloorId,
        buildingId: selectedBuildingId,
        type: bulkSeatType,
        status: "Vacant",
        x: startX + (c * spacingX),
        y: startY + (r * spacingY),
        rotation: 0
      });
    }

    // Auto-adjust target zone dimensions if generated grid exceeds current bounds
    if (targetZone) {
      const maxCol = Math.min(totalSeats, cols);
      const maxRow = Math.ceil(totalSeats / cols);
      const reqW = Math.max(targetZone.width, (maxCol * spacingX) + 40);
      const reqH = Math.max(targetZone.height, (maxRow * spacingY) + 60);

      if (reqW > targetZone.width || reqH > targetZone.height) {
        const updatedZones = zones.map(z => z.id === targetZone.id ? { ...z, width: reqW, height: reqH } : z);
        onUpdateZones(updatedZones);
      }
    }

    onUpdateSeats([...seats, ...newSeatsList]);
    setShowBulkGeneratorModal(false);
    if (onAddAuditLog) onAddAuditLog("Bulk Seat Generation", "Zone/Seat", `Bulk generated ${newSeatsList.length} seats (${bulkPrefix}${bulkStartNum} to ${bulkPrefix}${bulkEndNum}) in ${targetZone ? targetZone.name : "Floor Canvas"}`);
  };

  // Duplicate Floor Logic
  const handleDuplicateFloor = () => {
    if (!currentFloor) return;
    saveSnapshot();
    const newFloorId = `f-${Date.now()}`;
    const dupFloorName = `${currentFloor.name} (Copy)`;

    const newFloorObj: Floor = {
      id: newFloorId,
      buildingId: selectedBuildingId,
      siteId: currentFloor.siteId || activeSiteId,
      name: dupFloorName,
      capacity: currentFloor.capacity,
      zonesCount: currentFloor.zonesCount || currentZones.length,
      isArchived: false,
      lastModified: new Date().toISOString().split("T")[0]
    };

    // Duplicate zones - keep exact same zone name as requested by user
    const sourceZones = localZones.length > 0 ? localZones : zones;
    const currentZonesList = sourceZones.filter(z => z.floorId === selectedFloorId || (selectedFloorId === "f1" && (!z.floorId || z.floorId === "f1")));

    const zoneIdMap: Record<string, string> = {};
    const newZonesList = currentZonesList.map((z, zIdx) => {
      const newZId = `z-dup-${Date.now()}-${zIdx}-${Math.floor(Math.random()*1000)}`;
      zoneIdMap[z.id] = newZId;
      return {
        ...z,
        id: newZId,
        floorId: newFloorId,
        name: z.name
      };
    });

    // Duplicate seats - preserve ALL details
    const sourceSeats = localSeats.length > 0 ? localSeats : seats;
    const currentZoneIds = new Set(currentZonesList.map(z => z.id));
    let currentSeatsList = sourceSeats.filter(s => 
      s.floorId === selectedFloorId || 
      (selectedFloorId === "f1" && (!s.floorId || s.floorId === "f1")) ||
      (s.zoneId && currentZoneIds.has(s.zoneId))
    );

    // If source floor seats list is empty, build clean seat list from zones
    if (currentSeatsList.length === 0 && currentZonesList.length > 0) {
      let globalIndex = 1;
      currentZonesList.forEach((z) => {
        const capacity = z.capacity && z.capacity > 0 ? z.capacity : 20;
        const cols = Math.min(8, Math.max(3, Math.floor((z.width - 20) / 48)));
        const startX = z.x + 20;
        const startY = z.y + 40;
        const dept = z.department || "Unassigned";

        for (let i = 0; i < capacity; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const seatX = Math.round(startX + col * 48);
          const seatY = Math.round(startY + row * 48);

          if (seatX <= z.x + z.width - 30 && seatY <= z.y + z.height - 30) {
            currentSeatsList.push({
              id: `seat-src-${Date.now()}-${z.id}-${i}`,
              seatNumber: `${globalIndex++}`,
              zoneId: z.id,
              floorId: selectedFloorId,
              buildingId: selectedBuildingId,
              type: i % 7 === 0 ? "Executive" : i % 5 === 0 ? "Hot Desk" : "Standard",
              status: "Vacant",
              department: dept,
              x: seatX,
              y: seatY,
              rotation: 0
            });
          }
        }
      });
    }

    const newSeatsList = currentSeatsList.map((s, idx) => {
      // Clear ALL employee occupant records and set status to Vacant as requested by user
      const cleanSeat: Seat = {
        id: `seat-dup-${Date.now()}-${idx}-${Math.floor(Math.random()*1000)}`,
        floorId: newFloorId,
        buildingId: selectedBuildingId,
        zoneId: zoneIdMap[s.zoneId] || s.zoneId || "",
        seatNumber: s.seatNumber ? `${s.seatNumber}` : `S-${idx + 1}`,
        type: s.type || "Standard",
        status: "Vacant",
        allocatedDepartment: s.allocatedDepartment || s.department || "",
        department: s.department || s.allocatedDepartment || "",
        allocatedManager: undefined,
        managerName: undefined,
        employeeId: undefined,
        employeeName: undefined,
        employeeEmail: undefined,
        isFixedSlot: false,
        x: s.x,
        y: s.y,
        rotation: s.rotation || 0,
        assets: []
      };
      return cleanSeat;
    });

    // Duplicate layout objects (facilities, cabins, conference rooms, pantry, reception, restrooms, emergency exits, etc.)
    const sourceObjects = localObjects.length > 0 ? localObjects : layoutObjects;
    let currentObjectsList = sourceObjects.filter(o => 
      o.floorId === selectedFloorId || 
      (selectedFloorId === "f1" && (!o.floorId || o.floorId === "f1"))
    );

    if (currentObjectsList.length === 0) {
      currentObjectsList = [
        { id: `obj-src-mrm1`, floorId: selectedFloorId, name: "Meeting Room (Einstein)", type: "Conference Rooms", x: 1140, y: 280, width: 220, height: 90, rotation: 0, color: "#14b8a6" },
        { id: `obj-src-boardroom`, floorId: selectedFloorId, name: "Executive Board Room", type: "Conference Rooms", x: 650, y: 180, width: 140, height: 90, rotation: 0, color: "#8b5cf6" },
        { id: `obj-src-pantry`, floorId: selectedFloorId, name: "Cafeteria & Pantry Bay", type: "Pantry", x: 350, y: 120, width: 280, height: 160, rotation: 0, color: "#f97316" },
        { id: `obj-src-reception`, floorId: selectedFloorId, name: "RECEPTION & Visitor Lobby", type: "Reception", x: 800, y: 200, width: 160, height: 70, rotation: 0, color: "#06b6d4" },
        { id: `obj-src-restrooms`, floorId: selectedFloorId, name: "Rest Rooms & Wellness Bay", type: "Rest Rooms", x: 410, y: 380, width: 110, height: 110, rotation: 0, color: "#a855f7" },
        { id: `obj-src-cabin1`, floorId: selectedFloorId, name: "TOKYO Executive Cabin", type: "Cabin", x: 40, y: 300, width: 160, height: 120, rotation: 0, color: "#ec4899" },
        { id: `obj-src-exit`, floorId: selectedFloorId, name: "Emergency Exit & Stairwell", type: "Emergency Exit", x: 1300, y: 30, width: 80, height: 30, rotation: 0, color: "#fca5a5" }
      ];
    }

    const newObjectsList = currentObjectsList.map((o, idx) => ({
      ...o,
      id: `obj-dup-${Date.now()}-${idx}-${Math.floor(Math.random()*1000)}`,
      floorId: newFloorId,
      name: o.name
    }));

    // Direct Firestore sync for all newly created duplicated documents
    saveFirestoreDoc("floors", newFloorObj);
    saveFirestoreBatch("zones", newZonesList);
    saveFirestoreBatch("seats", newSeatsList);
    saveFirestoreBatch("layoutObjects", newObjectsList);

    // Update parent global states
    const updatedZones = [...sourceZones, ...newZonesList];
    const updatedSeats = [...sourceSeats, ...newSeatsList];
    const updatedObjects = [...sourceObjects, ...newObjectsList];

    if (onUpdateFloors) onUpdateFloors([...floors, newFloorObj]);
    onUpdateZones(updatedZones);
    onUpdateSeats(updatedSeats);

    if (onUpdateLayoutObjects) {
      onUpdateLayoutObjects(updatedObjects);
    }
    setLayoutObjects(updatedObjects);
    localStorage.setItem('enterprizseat_layout_objects', JSON.stringify(updatedObjects));

    // Immediately update local canvas state so duplicated elements render instantly
    updateLocalZones(updatedZones);
    updateLocalSeats(updatedSeats);
    updateLocalObjects(updatedObjects);

    setSelectedFloorId(newFloorId);
    if (onAddAuditLog) onAddAuditLog("Duplicate Floor Map", "Floor Plan", `Duplicated floor ${currentFloor.name} as ${dupFloorName} with ${newSeatsList.length} seats, ${newZonesList.length} zones, and ${newObjectsList.length} layout objects.`);
    alert(`Successfully duplicated ${currentFloor.name}! Switched to new floor: ${dupFloorName}`);
  };

  // Create Building / Campus Handler
  const handleCreateBuilding = () => {
    if (!newBuildingName.trim()) return;
    const newBld: Building = {
      id: `bld-${Date.now()}`,
      name: newBuildingName,
      location: newBuildingLocation,
      floorsCount: 1
    };
    if (onUpdateBuildings) onUpdateBuildings([...buildings, newBld]);

    // Create baseline floor 1 for new building
    const firstFloor: Floor = {
      id: `f-${Date.now()}`,
      buildingId: newBld.id,
      name: "Floor 1 (Main Hall)",
      capacity: 100,
      zonesCount: 1
    };
    if (onUpdateFloors) onUpdateFloors([...floors, firstFloor]);

    setSelectedBuildingId(newBld.id);
    setSelectedFloorId(firstFloor.id);
    setShowCreateBuildingModal(false);
    if (onAddAuditLog) onAddAuditLog("Create Building", "Infrastructure", `Created new building "${newBuildingName}" at ${newBuildingLocation}`);
  };

  // Create Floor Handler
  const handleCreateFloor = () => {
    if (!newFloorName.trim()) return;
    const newFl: Floor = {
      id: `f-${Date.now()}`,
      buildingId: selectedBuildingId,
      name: newFloorName,
      capacity: newFloorCapacity,
      zonesCount: 1
    };
    if (onUpdateFloors) onUpdateFloors([...floors, newFl]);
    setSelectedFloorId(newFl.id);
    setShowCreateFloorModal(false);
    if (onAddAuditLog) onAddAuditLog("Create Floor", "Infrastructure", `Created floor "${newFloorName}" in building ${currentBuilding?.name}`);
  };

  // Save Version Handler
  const handleSaveVersion = () => {
    const versionNum = saveMode === "new_version" ? `v${(versionHistory.length + 1).toFixed(1)}` : currentVersion;
    const newVer: LayoutVersion = {
      id: `ver-${Date.now()}`,
      versionNumber: versionNum,
      floorId: selectedFloorId,
      modifiedBy: activeRole,
      modifiedDate: new Date().toLocaleString(),
      notes: versionNotesInput || (saveMode === "new_version" ? "Manual floor layout milestone" : "Updated layout state"),
      seatCount: currentSeats.length,
      zoneCount: currentZones.length
    };

    setVersionHistory(prev => [newVer, ...prev]);
    setCurrentVersion(versionNum);
    setHasUnsavedChanges(false);
    setShowSaveVersionModal(false);
    setVersionNotesInput("");
    if (onAddAuditLog) onAddAuditLog("Save Layout Version", "Floor Plan", `Saved floor version ${versionNum} with ${currentSeats.length} seats.`);
  };

  // Safe Export & Delete Floor
  const handleExportFloorJSON = () => {
    const exportData = {
      building: currentBuilding,
      floor: currentFloor,
      zones: currentZones,
      seats: currentSeats,
      objects: layoutObjects,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentFloor?.name.replace(/\s+/g, "_")}_Export.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onAddAuditLog) onAddAuditLog("Export Floor Data", "Floor Plan", `Exported blueprint JSON for ${currentFloor?.name}`);
  };

  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState<boolean>(false);
  const [pendingUploadData, setPendingUploadData] = useState<{
    fileName: string;
    zones: Zone[];
    seats: Seat[];
    objects?: any[];
  } | null>(null);

  const handleImportFloorJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const importedZones = Array.isArray(data.zones) ? data.zones : [];
        const importedSeats = Array.isArray(data.seats) ? data.seats : [];
        const importedObjects = Array.isArray(data.objects) ? data.objects : [];

        setPendingUploadData({
          fileName: file.name,
          zones: importedZones,
          seats: importedSeats,
          objects: importedObjects
        });

        setIsReplaceModalOpen(true);
      } catch (err) {
        console.error("Failed to parse JSON map file", err);
        alert("Invalid JSON map file format. Please upload a valid exported blueprint file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmDeleteFloor = () => {
    if (activeRole !== "Super User" && activeRole !== "Admin") {
      alert("Permission Denied: Only Super Users and Admins can delete floor layouts.");
      return;
    }
    const occupiedSeats = currentSeats.filter(s => s.status === "Occupied");
    
    // Perform deletion
    const remainingFloors = floors.filter(f => f.id !== selectedFloorId);
    const remainingZones = zones.filter(z => z.floorId !== selectedFloorId);
    const remainingSeats = seats.filter(s => s.floorId !== selectedFloorId);

    if (onUpdateFloors) onUpdateFloors(remainingFloors);
    onUpdateZones(remainingZones);
    onUpdateSeats(remainingSeats);

    if (onAddAuditLog) {
      onAddAuditLog("Delete Floor Layout", "Floor Plan", `Deleted floor "${currentFloor?.name}" along with ${currentZones.length} zones and ${currentSeats.length} seats (Occupied impact: ${occupiedSeats.length}).`);
    }

    setShowDeleteModal(false);
    if (remainingFloors.length > 0) {
      setSelectedFloorId(remainingFloors[0].id);
    }
  };

  // Bulk Delete Selected Buildings
  const handleConfirmBulkDeleteBuildings = () => {
    if (activeRole !== "Super User" && activeRole !== "Admin") {
      alert("Permission Denied: Only Super Users and Admins can delete buildings.");
      return;
    }
    if (selectedBuildingIdsForDelete.size === 0) return;

    const bldFloors = floors.filter(f => selectedBuildingIdsForDelete.has(f.buildingId));
    const bldFloorIds = new Set(bldFloors.map(f => f.id));
    const bldSeats = seats.filter(s => bldFloorIds.has(s.floorId));
    const occupiedSeats = bldSeats.filter(s => s.status === "Occupied");

    const remainingBuildings = buildings.filter(b => !selectedBuildingIdsForDelete.has(b.id));
    const remainingFloors = floors.filter(f => !selectedBuildingIdsForDelete.has(f.buildingId));
    const remainingZones = zones.filter(z => !bldFloorIds.has(z.floorId));
    const remainingSeats = seats.filter(s => !bldFloorIds.has(s.floorId));

    if (onUpdateBuildings) onUpdateBuildings(remainingBuildings);
    if (onUpdateFloors) onUpdateFloors(remainingFloors);
    onUpdateZones(remainingZones);
    onUpdateSeats(remainingSeats);

    if (onAddAuditLog) {
      onAddAuditLog(
        "Bulk Delete Buildings", 
        "Infrastructure", 
        `Deleted ${selectedBuildingIdsForDelete.size} building(s), ${bldFloors.length} floor(s), and ${bldSeats.length} seat(s) (${occupiedSeats.length} occupied affected).`
      );
    }

    setSelectedBuildingIdsForDelete(new Set());
    if (selectedBuildingIdsForDelete.has(selectedBuildingId)) {
      if (remainingBuildings.length > 0) {
        setSelectedBuildingId(remainingBuildings[0].id);
        const nextFloors = remainingFloors.filter(f => f.buildingId === remainingBuildings[0].id);
        if (nextFloors.length > 0) {
          setSelectedFloorId(nextFloors[0].id);
        }
      }
    }
  };

  // Keyboard Shortcuts (Undo, Redo, Copy, Paste, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
        handlePaste();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElement || selectedSeatIds.length > 0) {
          e.preventDefault();
          handleDeleteCurrentSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, selectedSeatIds, undoStack, redoStack, clipboard, canEditLayout]);

  // Bulk Delete Selected Floors
  const handleConfirmBulkDeleteFloors = () => {
    if (activeRole !== "Super User" && activeRole !== "Admin") {
      alert("Permission Denied: Only Super Users and Admins can delete floors.");
      return;
    }
    if (selectedFloorIdsForDelete.size === 0) return;

    const targetSeats = seats.filter(s => selectedFloorIdsForDelete.has(s.floorId));
    const occupiedSeats = targetSeats.filter(s => s.status === "Occupied");

    const remainingFloors = floors.filter(f => !selectedFloorIdsForDelete.has(f.id));
    const remainingZones = zones.filter(z => !selectedFloorIdsForDelete.has(z.floorId));
    const remainingSeats = seats.filter(s => !selectedFloorIdsForDelete.has(s.floorId));

    if (onUpdateFloors) onUpdateFloors(remainingFloors);
    onUpdateZones(remainingZones);
    onUpdateSeats(remainingSeats);

    if (onAddAuditLog) {
      onAddAuditLog(
        "Bulk Delete Floors", 
        "Infrastructure", 
        `Deleted ${selectedFloorIdsForDelete.size} floor(s) and ${targetSeats.length} seat(s) (${occupiedSeats.length} occupied affected).`
      );
    }

    setSelectedFloorIdsForDelete(new Set());
    if (selectedFloorIdsForDelete.has(selectedFloorId)) {
      if (remainingFloors.length > 0) {
        setSelectedFloorId(remainingFloors[0].id);
      }
    }
  };

  const activeZoneData = selectedElement?.type === "zone" ? zones.find(z => z.id === selectedElement.id) : null;
  const activeSeatData = selectedElement?.type === "seat" ? localSeats.find(s => s.id === selectedElement.id) : null;
  const activeObjectData = selectedElement?.type === "object" ? layoutObjects.find(o => o.id === selectedElement.id) : null;

  const occupiedSeatsInFloor = currentSeats.filter(s => s.status === "Occupied");

  return (
    <div className={isFullScreen ? "fixed inset-0 z-50 bg-slate-900 text-slate-100 p-4 w-screen h-screen overflow-hidden flex flex-col space-y-3 animate-in fade-in duration-200" : "space-y-4"} id="floor-builder-module">
      {/* TOP HEADER CONTROLS BAR: VERSION & SAVE ACTIONS */}
      <div className={isFullScreen ? "bg-slate-800 p-3.5 rounded-xl border border-slate-700 shadow-md flex flex-wrap items-center justify-between gap-4 shrink-0" : "bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4"} id="designer-top-toolbar">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold font-display ${isFullScreen ? "text-white" : "text-slate-800"}`}>Floor Layout Designer</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                hasUnsavedChanges ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-emerald-100 text-emerald-700"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasUnsavedChanges ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                {hasUnsavedChanges ? "Unsaved CAD Modifications" : "Layout Version Synced"}
              </span>
            </div>
            <p className={`text-xs ${isFullScreen ? "text-slate-400" : "text-slate-400"}`}>
              Manual layout CAD editor • Active Version: <strong className={`font-mono ${isFullScreen ? "text-slate-200" : "text-slate-600"}`}>{currentVersion}</strong>
            </p>
          </div>
        </div>

        {/* Action Button Group — compact single line, secondary actions tucked into "More Tools" */}
        <div className="flex flex-wrap items-center gap-2 relative">
          {canEditLayout ? (
            <>
              {/* MAP PROTECTION TOGGLE BUTTON */}
              {!isMapEditMode ? (
                <button 
                  onClick={() => {
                    setIsMapEditMode(true);
                    setShowSidebarPalette(true);
                    if (onAddAuditLog) onAddAuditLog("Enable Map Edit Mode", "Floor Designer", "Unlocked floor map for layout modifications");
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-amber-200 transition-all cursor-pointer ring-2 ring-amber-300 ring-offset-1 animate-pulse"
                  title="Click to unlock map editing mode. Allows dragging, repositioning, and customizing seats or zones."
                >
                  <Edit3 size={14} />
                  <span>Edit Map</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setIsMapEditMode(false);
                    if (onAddAuditLog) onAddAuditLog("Lock Map View Mode", "Floor Designer", "Locked floor map in protected read-only view mode");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-200 transition-all cursor-pointer ring-2 ring-emerald-400 ring-offset-1"
                  title="Click to lock map into protected View Only mode. Prevents accidental drags or changes while navigating."
                >
                  <Lock size={14} />
                  <span>Lock / View Map</span>
                </button>
              )}

              {/* MODE STATUS PILL — compact, icon-only label on small screens */}
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                isMapEditMode 
                  ? "bg-amber-50 text-amber-900 border-amber-300" 
                  : "bg-blue-50 text-blue-900 border-blue-200"
              }`}>
                {isMapEditMode ? (
                  <>
                    <Edit3 size={13} className="text-amber-600 animate-pulse" />
                    <span>Edit Mode</span>
                  </>
                ) : (
                  <>
                    <Lock size={13} className="text-blue-600" />
                    <span>Protected View</span>
                  </>
                )}
              </div>

              {/* Show/Hide Sidebar Toggle */}
              <button
                onClick={() => setShowSidebarPalette(prev => !prev)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title={showSidebarPalette ? "Hide the tools sidebar to free up canvas space" : "Show the tools sidebar (drag-and-drop palette, building/floor scope)"}
              >
                {showSidebarPalette ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                <span className="hidden md:inline">{showSidebarPalette ? "Hide Sidebar" : "Show Sidebar"}</span>
              </button>

              <button 
                onClick={() => setShowSaveVersionModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-md shadow-blue-200 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Save size={14} />
                <span>Save & Version</span>
              </button>

              {/* MORE TOOLS DROPDOWN — everything less-frequently-used lives here */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowMoreToolsMenu(prev => !prev)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings size={14} />
                  <span>More Tools</span>
                  <ChevronDown size={13} className={`transition-transform ${showMoreToolsMenu ? "rotate-180" : ""}`} />
                </button>

                {showMoreToolsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreToolsMenu(false)} />
                    <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-[70vh] overflow-y-auto">
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); if (!isMapEditMode) setIsMapEditMode(true); setShowCreateBuildingModal(true); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <Building2 size={14} className="text-slate-500" /><span>+ Building</span>
                      </button>
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); if (!isMapEditMode) setIsMapEditMode(true); setShowCreateFloorModal(true); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <PlusCircle size={14} className="text-slate-500" /><span>+ Floor</span>
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); if (!isMapEditMode) setIsMapEditMode(true); setShowBulkGeneratorModal(true); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <LayoutGrid size={14} className="text-purple-500" /><span>Bulk Seat Generator</span>
                      </button>
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); if (!isMapEditMode) setIsMapEditMode(true); setShowExcelLayoutUploadModal(true); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <FileSpreadsheet size={14} className="text-emerald-500" /><span>Import Excel Layout</span>
                      </button>
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); downloadDepartmentSeatTemplate(onAddAuditLog, floors, buildings); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <Download size={14} className="text-teal-500" /><span>Download Excel Template</span>
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); if (!isMapEditMode) setIsMapEditMode(true); handleDuplicateFloor(); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <Copy size={14} className="text-slate-500" /><span>Duplicate Floor</span>
                      </button>
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); setShowPreviewModal(true); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <Eye size={14} className="text-blue-500" /><span>Preview Layout</span>
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); fileInputRef.current?.click(); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <Upload size={14} className="text-purple-500" /><span>Restore JSON</span>
                      </button>
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); handleExportFloorJSON(); }}
                        className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <Download size={14} className="text-slate-500" /><span>Backup JSON</span>
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => { setShowMoreToolsMenu(false); if (!isMapEditMode) setIsMapEditMode(true); setShowManageInfrastructureModal(true); }}
                        className="w-full px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer text-left"
                      >
                        <Trash2 size={14} className="text-rose-500" /><span>Delete Buildings / Floors</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-2 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                <Lock size={13} className="text-purple-600" />
                <span>Read-Only Viewer Mode (Customization restricted to Super User & Admin)</span>
              </span>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportFloorJSON} 
            accept=".json" 
            className="hidden" 
          />

          {/* EXPAND FULL SCREEN BUTTON — kept visible, used constantly */}
          <button 
            onClick={toggleFullScreen}
            className={`text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 ${
              isFullScreen 
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
            }`}
            title="Expand floor designer to full screen mode for comfortable seating customization (ESC to exit)"
          >
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden lg:inline">{isFullScreen ? "Exit Full Screen" : "Expand Full Screen"}</span>
          </button>
        </div>
      </div>

      {/* WORKSPACE GRID: LEFT DOCK & RIGHT CANVAS */}
      <div className={
        isFullScreen
          ? (showSidebarPalette
              ? "flex-1 grid grid-cols-1 xl:grid-cols-5 gap-4 h-[calc(100vh-85px)] min-h-0 overflow-hidden"
              : "flex-1 grid grid-cols-1 gap-4 h-[calc(100vh-85px)] min-h-0 overflow-hidden")
          : (showSidebarPalette
              ? "grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-250px)] min-h-[560px]"
              : "grid grid-cols-1 gap-6 h-[calc(100vh-250px)] min-h-[560px]")
      }>
        {/* LEFT DOCK: SCOPE SELECTORS & DRAGGABLE PALETTE — hidden until Edit Map or explicitly shown */}
        {showSidebarPalette && (
        <div
          className={isFullScreen ? "bg-slate-800 p-4 rounded-xl border-2 shadow-md flex flex-col space-y-4 overflow-y-auto max-h-full xl:col-span-1 text-slate-100" : "bg-white p-0 rounded-2xl border-2 shadow-xs flex flex-col overflow-hidden"}
          style={{ borderColor: isFullScreen ? `${brandColor}b3` : brandColor }}
        >
          <div className={isFullScreen ? "" : "px-5 py-3.5 -mx-0"} style={isFullScreen ? {} : { backgroundColor: brandColor }}>
            <h4 className={`text-sm font-bold tracking-tight uppercase flex items-center gap-2 ${isFullScreen ? "text-slate-800" : "text-white"}`}>
              <Layers className={isFullScreen ? "text-blue-600" : "text-blue-100"} size={16} />
              <span>Scope & Palette</span>
            </h4>
            <p className={`text-xs mt-0.5 ${isFullScreen ? "text-slate-400" : "text-blue-100"}`}>Pick location and drag CAD items onto grid</p>
          </div>
          <div className={isFullScreen ? "flex-1 flex flex-col space-y-4 overflow-y-auto" : "flex-1 flex flex-col space-y-6 p-5 overflow-y-auto"}>

          {/* Building & Floor Dropdowns */}
          <div className="space-y-3" id="floor-selectors">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Campus / Building</label>
                {(activeRole === "Super User" || activeRole === "Admin") && (
                  <button 
                    onClick={() => {
                      setInfrastructureTab("buildings");
                      setShowManageInfrastructureModal(true);
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                  >
                    <Trash2 size={10} />
                    <span>Manage/Delete</span>
                  </button>
                )}
              </div>
              <select 
                value={selectedBuildingId} 
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Floor Level</label>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setRenameFloorNameInput(currentFloor?.name || "");
                      setShowRenameFloorModal(true);
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    title="Rename active floor level"
                  >
                    <Edit3 size={10} />
                    <span>Rename Floor</span>
                  </button>
                  {(activeRole === "Super User" || activeRole === "Admin") && (
                    <button 
                      onClick={() => {
                        setInfrastructureTab("floors");
                        setShowManageInfrastructureModal(true);
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      <Trash2 size={10} />
                      <span>Manage/Delete</span>
                    </button>
                  )}
                </div>
              </div>
              <select 
                value={selectedFloorId} 
                onChange={(e) => setSelectedFloorId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {currentFloors.map(f => (
                  <option key={f.id} value={f.id}>{f.name} (Capacity: {f.capacity})</option>
                ))}
              </select>
            </div>
          </div>

          {/* DRAGGABLE PALETTE */}
          {canEditLayout ? (
            <div className="space-y-4">
              {!isMapEditMode ? (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Lock size={14} className="text-blue-600" />
                      View Map Mode
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Protected</span>
                  </div>
                  <p className="text-[11px] text-blue-700 leading-snug">
                    Map is protected against accidental modifications while navigating. Click <strong>Edit Map</strong> to unlock dragging & layout editing.
                  </p>
                  <button
                    onClick={() => {
                      setIsMapEditMode(true);
                      if (onAddAuditLog) onAddAuditLog("Enable Map Edit", "Floor Map", "Unlocked floor map for editing.");
                    }}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Edit3 size={13} />
                    <span>Unlock Edit Mode</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Edit3 size={14} className="text-amber-600 animate-pulse" />
                      Edit Map Mode
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase">Unlocked</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Drag palette items onto grid or drag seats/zones to reposition.
                  </p>
                </div>
              )}

              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Drag to Canvas</span>
              
              {/* Draggable Zone Item */}
              <div 
                draggable={isMapEditMode}
                onDragStart={(e) => handlePresetDragStart(e, "zone-new")}
                className={`flex items-center gap-3 p-2.5 border border-dashed text-xs rounded-xl transition-all ${
                  isMapEditMode 
                    ? "border-purple-300 bg-purple-50 hover:bg-purple-100 cursor-grab" 
                    : "border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-400 flex items-center justify-center font-bold text-purple-700 text-[10px]">
                  Z
                </div>
                <div>
                  <p className="font-bold text-slate-700">Corporate Zone Block</p>
                  <p className="text-[10px] text-slate-400">Draggable Area Manager</p>
                </div>
              </div>

              {/* Draggable Seat Presets */}
              <div className="grid grid-cols-2 gap-2">
                <div 
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, "seat-Standard")}
                  className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-grab text-center text-xs"
                >
                  <div className="w-5 h-5 mx-auto bg-blue-500 rounded-xs mb-1"></div>
                  <p className="font-medium text-slate-700 text-[10px]">Standard Seat</p>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, "seat-Hot Desk")}
                  className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-grab text-center text-xs"
                >
                  <div className="w-5 h-5 mx-auto bg-emerald-500 rounded-xs mb-1"></div>
                  <p className="font-medium text-slate-700 text-[10px]">Hot Desk</p>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, "seat-Executive")}
                  className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-grab text-center text-xs"
                >
                  <div className="w-5 h-5 mx-auto bg-purple-500 rounded-xs mb-1"></div>
                  <p className="font-medium text-slate-700 text-[10px]">Executive Cabin</p>
                </div>
                <div 
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, "seat-Collaborative")}
                  className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-grab text-center text-xs"
                >
                  <div className="w-5 h-5 mx-auto bg-pink-500 rounded-xs mb-1"></div>
                  <p className="font-medium text-slate-700 text-[10px]">Group Collab</p>
                </div>
              </div>

              {/* Architectural elements */}
              <div className="space-y-2">
                <div 
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, "Conference Rooms")}
                  className="p-2 border border-slate-200 bg-sky-50/50 hover:bg-sky-100/60 rounded-lg cursor-grab flex items-center justify-between text-xs font-semibold text-slate-600"
                >
                  <span>Meeting/Conference Room</span>
                  <span className="text-[10px] bg-sky-100 px-1.5 py-0.5 rounded-sm">2D Box</span>
                </div>

                <div 
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, "Pantry")}
                  className="p-2 border border-slate-200 bg-yellow-50/50 hover:bg-yellow-100/60 rounded-lg cursor-grab flex items-center justify-between text-xs font-semibold text-slate-600"
                >
                  <span>Cafeteria / Pantry Area</span>
                  <span className="text-[10px] bg-yellow-100 px-1.5 py-0.5 rounded-sm">Pantry</span>
                </div>

                <div 
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, "Emergency Exit")}
                  className="p-2 border border-slate-200 bg-red-50/50 hover:bg-red-100/60 rounded-lg cursor-grab flex items-center justify-between text-xs font-semibold text-slate-600"
                >
                  <span>Emergency Exit / Stairwell</span>
                  <span className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded-sm text-red-700">Exit</span>
                </div>

                <div 
                  draggable
                  onDragStart={(e) => handlePresetDragStart(e, "Dummy Cluster Pillar")}
                  className="p-2 border border-slate-300 bg-slate-100 hover:bg-slate-200/80 rounded-lg cursor-grab flex items-center justify-between text-xs font-semibold text-slate-700 shadow-2xs"
                  title="Architectural pillar without seat/occupancy count"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-slate-700 rounded-xs flex items-center justify-center text-[9px] text-white font-mono font-bold">P</div>
                    <span>Dummy Cluster Pillar</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-sm text-slate-700 font-mono font-bold">0 Seats</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center gap-1.5 text-purple-700 font-bold">
                <Lock size={14} />
                <span>Read-Only Viewer Mode</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                You are currently viewing the Floor Designer in <strong>Read-Only mode</strong>.
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700">Role Permissions Summary:</p>
                <div className="flex items-center justify-between">
                  <span>Super User & Admin:</span>
                  <span className="text-emerald-600 font-bold">Full Editing</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Your Role ({activeRole}):</span>
                  <span className="text-purple-600 font-bold">Read-Only Access</span>
                </div>
              </div>
              <p className="text-slate-400 text-[10px] italic">
                Tip: Click any seat or zone on the floor map canvas to inspect occupancy details and employee assignments.
              </p>
            </div>
          )}

          {/* INSPECTOR DRAWER */}
          {selectedElement && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">Node Inspector</span>
                <button onClick={() => setSelectedElement(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">×</button>
              </div>

              {!canEditLayout && (
                <div className="bg-purple-50 border border-purple-200 text-purple-700 text-[11px] p-2 rounded-md font-semibold flex items-center gap-1.5">
                  <Lock size={12} />
                  <span>Read-Only Inspector View</span>
                </div>
              )}

              {activeZoneData && (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-slate-800 text-xs uppercase font-display">Zone: {activeZoneData.name}</p>
                    <button 
                      onClick={() => setEditingZoneModal(activeZoneData)}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={10} />
                      <span>Modal Edit</span>
                    </button>
                  </div>

                  {/* Confirmation Status Banner */}
                  {(activeZoneData.department.includes("Unassigned") || activeZoneData.isConfirmed === false) ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg text-xs space-y-2 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <span>Confirmation Required</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-tight">
                        Confirm zone details before confirming allocation on floor map:
                      </p>
                      {canEditLayout && (
                        <button
                          onClick={() => {
                            saveSnapshot();
                            const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, isConfirmed: true } : z);
                            onUpdateZones(updated);
                            if (onAddAuditLog) onAddAuditLog("Confirm Zone", "Floor Designer", `Confirmed zone "${activeZoneData.name}" with department "${activeZoneData.department}"`);
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <CheckCircle size={14} />
                          <span>Confirm Zone & Department</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                      <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                      <span>Zone & Department Confirmed by User</span>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Zone Name</label>
                    <input 
                      type="text" 
                      value={activeZoneData.name}
                      disabled={!canEditLayout}
                      onChange={(e) => {
                        if (!canEditLayout) return;
                        saveSnapshot();
                        const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, name: e.target.value } : z);
                        onUpdateZones(updated);
                      }}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Department</label>
                      <input 
                        type="text" 
                        value={activeZoneData.department}
                        disabled={!canEditLayout}
                        onChange={(e) => {
                          if (!canEditLayout) return;
                          saveSnapshot();
                          const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, department: e.target.value } : z);
                          onUpdateZones(updated);
                        }}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Capacity</label>
                      <input 
                        type="number" 
                        value={activeZoneData.capacity}
                        disabled={!canEditLayout}
                        onChange={(e) => {
                          if (!canEditLayout) return;
                          saveSnapshot();
                          const val = parseInt(e.target.value) || 0;
                          const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, capacity: val } : z);
                          onUpdateZones(updated);
                        }}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Color Accent Picker */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase block">Color Accent</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={activeZoneData.color}
                        disabled={!canEditLayout}
                        onChange={(e) => {
                          if (!canEditLayout) return;
                          saveSnapshot();
                          const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, color: e.target.value } : z);
                          onUpdateZones(updated);
                        }}
                        className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5 shrink-0"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        {["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4", "#64748b"].map(c => (
                          <button
                            key={c}
                            disabled={!canEditLayout}
                            onClick={() => {
                              if (!canEditLayout) return;
                              saveSnapshot();
                              const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, color: c } : z);
                              onUpdateZones(updated);
                            }}
                            style={{ backgroundColor: c }}
                            className={`w-4 h-4 rounded-full border border-white cursor-pointer transition-transform hover:scale-125 shrink-0 ${
                              activeZoneData.color === c ? "ring-2 ring-blue-600 scale-110" : ""
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Coordinates & Dimensions */}
                  {canEditLayout && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">CAD Coordinates & Dimensions</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase block">X Position</label>
                          <input 
                            type="number"
                            value={activeZoneData.x}
                            onChange={(e) => {
                              saveSnapshot();
                              const val = parseInt(e.target.value) || 0;
                              const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, x: val } : z);
                              onUpdateZones(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 p-1 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase block">Y Position</label>
                          <input 
                            type="number"
                            value={activeZoneData.y}
                            onChange={(e) => {
                              saveSnapshot();
                              const val = parseInt(e.target.value) || 0;
                              const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, y: val } : z);
                              onUpdateZones(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 p-1 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase block">Width</label>
                          <input 
                            type="number"
                            value={activeZoneData.width}
                            onChange={(e) => {
                              saveSnapshot();
                              const val = Math.max(80, parseInt(e.target.value) || 80);
                              const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, width: val } : z);
                              onUpdateZones(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 p-1 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold uppercase block">Height</label>
                          <input 
                            type="number"
                            value={activeZoneData.height}
                            onChange={(e) => {
                              saveSnapshot();
                              const val = Math.max(60, parseInt(e.target.value) || 60);
                              const updated = zones.map(z => z.id === activeZoneData.id ? { ...z, height: val } : z);
                              onUpdateZones(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 p-1 rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Fit Action */}
                  {canEditLayout && (
                    <button 
                      onClick={() => fitZoneToEnclosedSeats(activeZoneData)}
                      className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Automatically resize zone bounding box to neatly fit seats inside it"
                    >
                      <Maximize size={12} />
                      <span>Fit Zone to Enclosed Seats</span>
                    </button>
                  )}
                </div>
              )}

              {activeSeatData && (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Seat {activeSeatData.seatNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold font-mono">{activeSeatData.type}</span>
                  </div>

                  {/* Standardized Location Identity Card */}
                  {(() => {
                    const bName = buildings.find(b => b.id === (activeSeatData.buildingId || selectedBuildingId))?.name || "Newmark _Hyderabad";
                    const fName = floors.find(f => f.id === (activeSeatData.floorId || selectedFloorId))?.name || "11 th Floor CRE";
                    const mgrName = activeSeatData.allocatedManager || activeSeatData.managerName || (activeSeatData.employeeName ? activeSeatData.employeeName : "Unassigned Manager");
                    const identityString = `${bName} • ${activeSeatData.seatNumber} • ${mgrName} • ${fName}`;

                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1 shadow-sm border border-slate-800">
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider block font-mono">Standardized Seat Location</span>
                        <p className="font-mono text-[11px] font-bold leading-tight text-slate-100 break-words">{identityString}</p>
                      </div>
                    );
                  })()}

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Seat Identifier</label>
                    <input 
                      type="text" 
                      value={activeSeatData.seatNumber}
                      disabled={!canEditLayout}
                      onChange={(e) => {
                        if (!canEditLayout) return;
                        saveSnapshot();
                        const updated = seats.map(s => s.id === activeSeatData.id ? { ...s, seatNumber: e.target.value } : s);
                        onUpdateSeats(updated);
                      }}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  {/* Direct Department & Manager Allocation Panel */}
                  <div className="bg-indigo-50/80 border border-indigo-200 p-3 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1 font-mono">
                        <Users size={12} className="text-indigo-600" />
                        <span>Direct Dept & Manager Allocation</span>
                      </span>
                      {activeSeatData.isFixedSlot && (
                        <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">Fixed Slot</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 font-bold uppercase block">Allocate Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Engineering, Finance, IT — or type Vacant to clear this seat"
                        value={activeSeatData.allocatedDepartment || activeSeatData.department || ""}
                        disabled={!canEditLayout}
                        onChange={(e) => {
                          if (!canEditLayout) return;
                          saveSnapshot();
                          const deptVal = e.target.value;
                          const isVacant = deptVal.trim().toLowerCase() === "vacant";
                          const updated = seats.map(s => s.id === activeSeatData.id ? (
                            isVacant ? {
                              ...s,
                              allocatedDepartment: "",
                              department: "",
                              allocatedManager: "",
                              managerName: "",
                              isFixedSlot: false,
                              employeeName: undefined,
                              employeeId: undefined,
                              employeeEmail: undefined,
                              status: "Vacant" as const
                            } : {
                              ...s,
                              allocatedDepartment: deptVal,
                              department: deptVal,
                              isFixedSlot: true,
                              status: s.status === "Vacant" ? "Reserved" as const : s.status
                            }
                          ) : s);
                          onUpdateSeats(updated);
                        }}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-semibold text-slate-800 disabled:bg-slate-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-600 font-bold uppercase block">Choose Manager</label>
                      <input
                        type="text"
                        placeholder="e.g. Sarah Jenkins (Engineering Manager)"
                        value={activeSeatData.allocatedManager || activeSeatData.managerName || ""}
                        disabled={!canEditLayout}
                        onChange={(e) => {
                          if (!canEditLayout) return;
                          saveSnapshot();
                          const mgrVal = e.target.value;
                          const updated = seats.map(s => s.id === activeSeatData.id ? { 
                            ...s, 
                            allocatedManager: mgrVal, 
                            managerName: mgrVal,
                            isFixedSlot: true
                          } : s);
                          onUpdateSeats(updated);
                        }}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-semibold text-slate-800 disabled:bg-slate-50"
                      />
                    </div>

                    {canEditLayout && (
                      <div className="pt-1">
                        <label className="text-[10px] font-bold text-indigo-900 cursor-pointer flex items-center gap-1.5">
                          <input 
                            type="checkbox"
                            checked={!!activeSeatData.isFixedSlot}
                            onChange={(e) => {
                              saveSnapshot();
                              const isFixed = e.target.checked;
                              const updated = seats.map(s => s.id === activeSeatData.id ? { 
                                ...s, 
                                isFixedSlot: isFixed,
                                status: isFixed ? "Reserved" : s.status
                              } : s);
                              onUpdateSeats(updated);
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Lock as Fixed Slot for Department</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Seat Type</label>
                    <select 
                      value={activeSeatData.type}
                      disabled={!canEditLayout}
                      onChange={(e) => {
                        if (!canEditLayout) return;
                        saveSnapshot();
                        const updated = seats.map(s => s.id === activeSeatData.id ? { ...s, type: e.target.value as any } : s);
                        onUpdateSeats(updated);
                      }}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-medium disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Hot Desk">Hot Desk</option>
                      <option value="Executive">Executive</option>
                      <option value="Collaborative">Collaborative</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Occupancy Status</label>
                    <select 
                      value={activeSeatData.status}
                      disabled={!canEditLayout}
                      onChange={(e) => {
                        if (!canEditLayout) return;
                        saveSnapshot();
                        const updated = seats.map(s => s.id === activeSeatData.id ? { ...s, status: e.target.value as any } : s);
                        onUpdateSeats(updated);
                      }}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-medium disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <option value="Vacant">Vacant</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Reserved">Reserved</option>
                    </select>
                  </div>

                  {activeSeatData.employeeName && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg space-y-0.5 text-xs">
                      <span className="text-[10px] font-bold text-blue-600 uppercase block">Assigned Occupant</span>
                      <p className="font-bold text-slate-800">{activeSeatData.employeeName}</p>
                      <p className="text-[10px] text-slate-500">{activeSeatData.department || "General Pool"}</p>
                    </div>
                  )}

                  {canEditLayout && (
                    <div className="flex gap-2">
                      <button 
                        onClick={rotateSelected}
                        className="flex-1 bg-white border border-slate-200 py-1.5 px-2 rounded-md hover:bg-slate-100 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600 cursor-pointer"
                      >
                        <RotateCw size={12} />
                        <span>Rotate 90°</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeObjectData && (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">{activeObjectData.type}</span>
                    <span className="font-mono text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                      {activeObjectData.width} × {activeObjectData.height} px
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Title / Facility Label</label>
                    <input 
                      type="text" 
                      value={activeObjectData.name}
                      disabled={!canEditLayout}
                      onChange={(e) => {
                        if (!canEditLayout) return;
                        saveSnapshot();
                        const updated = layoutObjects.map(obj => obj.id === activeObjectData.id ? { ...obj, name: e.target.value } : obj);
                        setLayoutObjects(updated);
                        if (onUpdateLayoutObjects) onUpdateLayoutObjects(updated);
                      }}
                      className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  {canEditLayout && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Facility Type</label>
                        <select
                          value={activeObjectData.type}
                          onChange={(e) => {
                            saveSnapshot();
                            const updated = layoutObjects.map(obj => obj.id === activeObjectData.id ? { ...obj, type: e.target.value as any } : obj);
                            setLayoutObjects(updated);
                            if (onUpdateLayoutObjects) onUpdateLayoutObjects(updated);
                          }}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded-md text-xs font-medium text-slate-700"
                        >
                          <option value="Pantry">Pantry / Cafeteria</option>
                          <option value="Conference Rooms">Conference Rooms</option>
                          <option value="Emergency Exit">Emergency Exit</option>
                          <option value="Cabin">Executive Suite / Cabin</option>
                          <option value="Reception">Reception Desk</option>
                          <option value="Rest Rooms">Rest Rooms</option>
                          <option value="Breakout Zone">Breakout Lounge</option>
                          <option value="Storage">Storage / Server Room</option>
                        </select>
                      </div>

                      {/* Enlarge & Sizing Quick Actions */}
                      <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 space-y-2">
                        <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Enlarge Facility Size</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleScaleObject(activeObjectData.id, 1.25)}
                            className="bg-white border border-purple-200 hover:bg-purple-600 hover:text-white text-purple-700 py-1 px-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            +25% Enlarge
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleScaleObject(activeObjectData.id, 1.5)}
                            className="bg-white border border-purple-200 hover:bg-purple-600 hover:text-white text-purple-700 py-1 px-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            +50% Enlarge
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleScaleObject(activeObjectData.id, 2.0)}
                            className="bg-purple-600 hover:bg-purple-700 text-white py-1 px-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            2x Double Size
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleScaleObject(activeObjectData.id, 0.8)}
                            className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 py-1 px-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            -20% Shrink
                          </button>
                        </div>

                        {/* Numeric Width & Height Inputs */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="text-[9px] text-purple-900 font-bold uppercase block">Width (px)</label>
                            <input 
                              type="number"
                              value={activeObjectData.width}
                              onChange={(e) => {
                                saveSnapshot();
                                const val = Math.max(20, parseInt(e.target.value) || 20);
                                const updated = layoutObjects.map(obj => obj.id === activeObjectData.id ? { ...obj, width: val } : obj);
                                setLayoutObjects(updated);
                                if (onUpdateLayoutObjects) onUpdateLayoutObjects(updated);
                              }}
                              className="w-full bg-white border border-purple-200 p-1 rounded font-mono text-xs font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-purple-900 font-bold uppercase block">Height (px)</label>
                            <input 
                              type="number"
                              value={activeObjectData.height}
                              onChange={(e) => {
                                saveSnapshot();
                                const val = Math.max(20, parseInt(e.target.value) || 20);
                                const updated = layoutObjects.map(obj => obj.id === activeObjectData.id ? { ...obj, height: val } : obj);
                                setLayoutObjects(updated);
                                if (onUpdateLayoutObjects) onUpdateLayoutObjects(updated);
                              }}
                              className="w-full bg-white border border-purple-200 p-1 rounded font-mono text-xs font-bold text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setEditingObjectModal(activeObjectData)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Maximize size={13} />
                        <span>Enlarge & Customize Props</span>
                      </button>

                      <button 
                        onClick={rotateSelected}
                        className="w-full bg-white border border-slate-200 py-1.5 rounded-md hover:bg-slate-100 flex items-center justify-center gap-1 font-semibold text-slate-600 text-xs cursor-pointer"
                      >
                        <RotateCw size={12} />
                        <span>Rotate Facility 90°</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {canEditLayout && (
                <button 
                  onClick={deleteSelected}
                  className="w-full bg-red-50 text-red-600 border border-red-200 py-1.5 rounded-md hover:bg-red-100 flex items-center justify-center gap-1.5 text-xs font-bold mt-2 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete Selected</span>
                </button>
              )}
            </div>
          )}
          </div>
        </div>
        )}

        {/* CENTRAL CANVAS */}
        <div className={isFullScreen ? "bg-slate-950 rounded-xl border border-slate-800 p-3 xl:col-span-4 flex flex-col space-y-2 h-full relative overflow-hidden" : "bg-slate-100 rounded-2xl border border-slate-200 p-4 xl:col-span-3 flex flex-col space-y-3 h-full min-h-[560px] relative overflow-hidden"} id="floor-canvas-container">
          {/* Upper Toolbar */}
          <div className={isFullScreen ? "bg-slate-900/90 backdrop-blur-xs p-3 rounded-xl border border-slate-800 flex flex-wrap gap-3 items-center justify-between z-10 text-slate-100" : "bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between z-10"}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase flex items-center gap-1.5 ${isFullScreen ? "text-slate-200" : "text-slate-700"}`}>
                <Sparkles className="text-blue-500 animate-pulse" size={15} />
                <span>{currentBuilding?.name} - {currentFloor?.name}</span>
              </span>

              {/* Real-time Auto-save Badge */}
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Auto-Saved {lastSavedTime ? `(${lastSavedTime})` : "Active"}</span>
              </div>

              {/* Zone Bound Lock Constraint Toggle */}
              <button 
                onClick={() => setLockSeatsInZone(!lockSeatsInZone)}
                title="When enabled, dragging seats keeps them inside their assigned Zone boundaries"
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  lockSeatsInZone 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs" 
                    : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {lockSeatsInZone ? <Lock size={13} className="text-indigo-600" /> : <Eye size={13} />}
                <span>{lockSeatsInZone ? "Seats Locked In Zone" : "Zone Lock OFF"}</span>
              </button>

              {/* Marquee Box Select Mode Toggle */}
              <button 
                onClick={() => setIsMarqueeMode(!isMarqueeMode)}
                title="Click and drag box on canvas to select multiple seats at once (or hold Shift key while dragging)"
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isMarqueeMode 
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs" 
                    : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CheckSquare size={13} />
                <span>{isMarqueeMode ? "Box Select ACTIVE" : "Box Select"}</span>
              </button>

              {/* Manager Filter for Map Highlighting */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                selectedManagerFilter !== "All"
                  ? "bg-amber-100 border-amber-300 text-amber-900 shadow-xs"
                  : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-amber-50/70 border-amber-200 text-amber-900"
              }`}>
                <Users size={13} className="text-amber-600 shrink-0" />
                <span className="whitespace-nowrap">Manager:</span>
                <select
                  value={selectedManagerFilter}
                  onChange={(e) => setSelectedManagerFilter(e.target.value)}
                  className="text-[11px] font-bold bg-white text-slate-800 border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer max-w-[140px]"
                >
                  <option value="All">All Managers</option>
                  {managerList.map(mgr => (
                    <option key={mgr} value={mgr}>{mgr}</option>
                  ))}
                </select>
                {selectedManagerFilter !== "All" && (
                  <span className="text-[9px] font-mono bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                    {currentSeats.filter(s => isSeatOfSelectedManager(s)).length} seats
                  </span>
                )}
              </div>

              {/* All Managers Directory Button */}
              <button
                onClick={() => setShowManagerListModal(true)}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-xs shrink-0"
                title="View complete directory of all managers, total seats, and floor distributions"
              >
                <Users size={13} />
                <span>All Managers ({managerList.length})</span>
              </button>

              {/* Department Name Search for Zone Highlighting */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                matchingDepartmentZoneIds.size > 0
                  ? "bg-indigo-100 border-indigo-300 text-indigo-900 shadow-xs"
                  : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-indigo-50/70 border-indigo-200 text-indigo-900"
              }`}>
                <Building2 size={13} className="text-indigo-600 shrink-0" />
                <input
                  type="text"
                  list="department-search-suggestions"
                  value={departmentSearchQuery}
                  onChange={(e) => setDepartmentSearchQuery(e.target.value)}
                  placeholder="Search department..."
                  className="text-[11px] font-bold bg-white text-slate-800 border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-[130px]"
                />
                <datalist id="department-search-suggestions">
                  {departmentList.map(dept => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
                {departmentSearchQuery.trim() !== "" && (
                  <>
                    <span className="text-[9px] font-mono bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-extrabold">
                      {matchingDepartmentSeatsCount} seat{matchingDepartmentSeatsCount === 1 ? "" : "s"}
                    </span>
                    <button
                      onClick={() => setDepartmentSearchQuery("")}
                      className="text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
                      title="Clear department search"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>

              {/* Vacant Seats Only Highlight Toggle — visible to every role, edit or view-only */}
              <button
                onClick={() => setShowVacantOnly(!showVacantOnly)}
                title="Highlight only vacant/available seats on the map"
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showVacantOnly
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <CheckSquare size={13} />
                <span>{showVacantOnly ? `Vacant Only (${currentSeats.filter(s => s.status === "Vacant").length})` : "Show Vacant Only"}</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className={`flex gap-3 text-xs font-mono items-center ${isFullScreen ? "text-slate-400" : "text-slate-500"}`}>
              <span>Zones: <strong>{currentZones.length}</strong></span>
              <span>Seats: <strong>{currentSeats.length}</strong></span>
              <span>Vacant: <strong className="text-emerald-500">{currentSeats.filter(s => s.status === "Vacant").length}</strong></span>
              <span>Occupied: <strong className="text-blue-500">{occupiedSeatsInFloor.length}</strong></span>
            </div>

            {/* Editing Tools (Undo, Redo, Copy, Paste, Grid toggle, Zoom & Full Screen) */}
            <div className="flex items-center gap-2">
              {canEditLayout && (
                <>
                  <button 
                    onClick={handleUndo} 
                    disabled={undoStack.length === 0}
                    title="Undo (Ctrl+Z)"
                    className={`p-1.5 rounded-lg border text-slate-600 disabled:opacity-40 cursor-pointer ${isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                  >
                    <Undo2 size={14} />
                  </button>

                  <button 
                    onClick={handleRedo} 
                    disabled={redoStack.length === 0}
                    title="Redo (Ctrl+Y)"
                    className={`p-1.5 rounded-lg border text-slate-600 disabled:opacity-40 cursor-pointer ${isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                  >
                    <Redo2 size={14} />
                  </button>

                  <button 
                    onClick={handleCopy} 
                    disabled={!selectedElement && selectedSeatIds.length === 0}
                    title="Copy Object"
                    className={`p-1.5 rounded-lg border text-slate-600 disabled:opacity-40 cursor-pointer ${isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                  >
                    <Copy size={14} />
                  </button>

                  <button 
                    onClick={handlePaste} 
                    disabled={!clipboard}
                    title="Paste Object"
                    className={`p-1.5 rounded-lg border text-slate-600 disabled:opacity-40 cursor-pointer ${isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                  >
                    <Clipboard size={14} />
                  </button>
                </>
              )}

              <button 
                onClick={() => setSnapToGrid(!snapToGrid)}
                title="Toggle Snap Grid"
                className={`p-1.5 rounded-lg border transition-all ${
                  snapToGrid 
                    ? "bg-blue-50 border-blue-200 text-blue-600 font-bold" 
                    : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                <Grid size={15} />
              </button>

              <button 
                onClick={() => setShowRulers(!showRulers)}
                title="Toggle CAD Rulers (feet)"
                className={`p-1.5 rounded-lg border transition-all ${
                  showRulers 
                    ? "bg-blue-50 border-blue-200 text-blue-600 font-bold" 
                    : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                <Ruler size={15} />
              </button>

              <button 
                onClick={() => { setIsMeasureMode(!isMeasureMode); setMeasurePoints([]); }}
                title="Measure Distance — click two points on the canvas"
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isMeasureMode 
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs" 
                    : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Ruler size={13} />
                <span>Measure</span>
              </button>

              <button 
                onClick={() => setShowLayersPanel(!showLayersPanel)}
                title="Open the Layers panel — show/hide, lock, and reorder zones & objects"
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showLayersPanel 
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs" 
                    : isFullScreen ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Layers size={13} />
                <span>Layers</span>
              </button>

              {/* Zoom Controls */}
              <div className={`flex items-center border rounded-lg overflow-hidden ${isFullScreen ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
                <button onClick={handleZoomOut} title="Zoom Out" className={`p-1.5 ${isFullScreen ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-50 text-slate-600"}`}><ZoomOut size={14} /></button>
                <span className={`px-2 text-[10px] font-bold font-mono select-none ${isFullScreen ? "text-slate-300 bg-slate-800" : "text-slate-600 bg-slate-50"}`}>{Math.round(zoom * 100)}%</span>
                <button onClick={handleZoomIn} title="Zoom In" className={`p-1.5 ${isFullScreen ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-50 text-slate-600"}`}><ZoomIn size={14} /></button>
                <button onClick={handleZoomReset} title="Reset Zoom" className={`p-1.5 border-l ${isFullScreen ? "border-slate-700 hover:bg-slate-700 text-slate-300" : "border-slate-200 hover:bg-slate-50 text-slate-600"}`}><Maximize2 size={13} /></button>
              </div>

              {/* Full Screen Mode Canvas Toggle */}
              <button 
                onClick={toggleFullScreen}
                title={isFullScreen ? "Exit Full Screen Mode (ESC)" : "Expand Full Screen Mode"}
                className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                  isFullScreen 
                    ? "bg-amber-500 border-amber-400 text-white hover:bg-amber-600" 
                    : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden sm:inline">{isFullScreen ? "Exit Full" : "Full Screen"}</span>
              </button>
            </div>
          </div>

          {/* CANVAS WORKSPACE AREA */}
          <div 
            ref={canvasRef}
            onDrop={handleCanvasDrop}
            onDragOver={(e) => e.preventDefault()}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="flex-1 w-full relative bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden cursor-crosshair select-none"
            style={{
              backgroundImage: snapToGrid ? "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)" : "none",
              backgroundSize: snapToGrid ? `${gridSize * zoom}px ${gridSize * zoom}px` : "none",
              backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
            id="cad-blueprint-grid"
          >
            {/* Active Manager Highlight Banner */}
            {selectedManagerFilter !== "All" && (
              <div className="absolute top-3 left-4 right-4 z-[58] bg-amber-500/95 backdrop-blur-md text-white px-4 py-2 rounded-xl shadow-lg border border-amber-600 flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-amber-100 shrink-0" />
                  <span>
                    Highlighting Team of Manager: <strong className="underline decoration-amber-200">{selectedManagerFilter}</strong> —{" "}
                    <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-[11px] font-bold">
                      {currentSeats.filter(s => isSeatOfSelectedManager(s)).length} desk(s) on this floor
                    </span>{" "}
                    ({managerSummaryData.find(m => m.managerName === selectedManagerFilter)?.totalSeats || 0} total across {managerSummaryData.find(m => m.managerName === selectedManagerFilter)?.distinctFloorsCount || 1} floor locations)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowManagerListModal(true)}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    All Managers List
                  </button>
                  <button
                    onClick={() => setSelectedManagerFilter("All")}
                    className="px-2.5 py-1 bg-slate-900/40 hover:bg-slate-900/60 text-amber-100 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Clear Filter
                  </button>
                </div>
              </div>
            )}

            {/* View Mode Lock Floating Banner Notice */}
            {!isMapEditMode && canEditLayout && (
              <div className={`absolute ${selectedManagerFilter !== "All" ? "top-14" : "top-3"} left-1/2 -translate-x-1/2 z-[60] bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl shadow-xl border border-slate-700/80 flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 pointer-events-auto`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0"></span>
                  <Lock size={14} className="text-blue-400 shrink-0" />
                  <span>Floor Map is in <strong>Protected View Mode</strong> (dragging locked).</span>
                </div>
                <button
                  onClick={() => {
                    setIsMapEditMode(true);
                    if (onAddAuditLog) onAddAuditLog("Enable Map Edit Mode", "Floor Designer", "Unlocked floor map via canvas banner.");
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-3 py-1 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Edit3 size={12} />
                  <span>Unlock Edit Mode</span>
                </button>
              </div>
            )}

            {/* CAD RULERS — horizontal (top) & vertical (left), scaled with zoom/pan, labeled in feet */}
            {showRulers && (
              <>
                <div className="absolute top-0 left-5 right-0 h-5 z-30 pointer-events-none overflow-hidden bg-white/80 border-b border-slate-300">
                  {Array.from({ length: 120 }).map((_, i) => {
                    const unitPx = gridSize * zoom;
                    const screenX = (i * gridSize * zoom) + (pan.x % unitPx);
                    if (screenX < 0 || screenX > 4000) return null;
                    const isMajor = i % 5 === 0;
                    return (
                      <div key={i} className="absolute top-0" style={{ left: `${screenX}px` }}>
                        <div className={isMajor ? "w-px h-3 bg-slate-500" : "w-px h-1.5 bg-slate-300"} />
                        {isMajor && (
                          <span className="absolute top-2.5 left-0.5 text-[8px] font-mono text-slate-500 whitespace-nowrap">
                            {Math.round(((i * gridSize) - (pan.x / zoom > 0 ? 0 : 0)) / 1)}ft
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="absolute top-5 left-0 bottom-0 w-5 z-30 pointer-events-none overflow-hidden bg-white/80 border-r border-slate-300">
                  {Array.from({ length: 120 }).map((_, i) => {
                    const unitPx = gridSize * zoom;
                    const screenY = (i * gridSize * zoom) + (pan.y % unitPx);
                    if (screenY < 0 || screenY > 3000) return null;
                    const isMajor = i % 5 === 0;
                    return (
                      <div key={i} className="absolute left-0" style={{ top: `${screenY}px` }}>
                        <div className={isMajor ? "h-px w-3 bg-slate-500" : "h-px w-1.5 bg-slate-300"} />
                        {isMajor && (
                          <span className="absolute left-3 -top-1.5 text-[8px] font-mono text-slate-500 rotate-0 whitespace-nowrap">
                            {i * gridSize}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* MEASURE TOOL prompt */}
            {isMeasureMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[60] bg-blue-600 text-white px-3 py-1.5 rounded-xl shadow-lg text-[11px] font-bold flex items-center gap-2 pointer-events-none">
                <Ruler size={13} />
                <span>{measurePoints.length === 0 ? "Click a start point on the map" : measurePoints.length === 1 ? "Click an end point to measure" : "Click again to start a new measurement"}</span>
              </div>
            )}

            {/* LAYERS PANEL — floating, screen-space (not affected by canvas zoom/pan) */}
            {showLayersPanel && canEditLayout && (
              <div className="absolute top-3 right-3 z-[65] w-64 max-h-[70%] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="px-3 py-2 flex items-center justify-between shrink-0" style={{ backgroundColor: brandColor }}>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers size={13} />
                    <span>Layers</span>
                  </span>
                  <button onClick={() => setShowLayersPanel(false)} className="text-blue-100 hover:text-white text-sm font-bold cursor-pointer">×</button>
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                  {[
                    ...currentZones.map(z => ({ kind: "zone" as const, id: z.id, name: z.name, zIndex: z.zIndex || 0, isHidden: !!z.isHidden, isLocked: !!z.isLocked })),
                    ...currentLayoutObjects.map(o => ({ kind: "object" as const, id: o.id, name: o.name || o.type, zIndex: o.zIndex || 0, isHidden: !!o.isHidden, isLocked: !!o.isLocked }))
                  ]
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map(item => (
                      <div
                        key={`${item.kind}-${item.id}`}
                        onClick={() => setSelectedElement({ type: item.kind, id: item.id })}
                        className={`flex items-center justify-between gap-1 px-2.5 py-1.5 cursor-pointer hover:bg-slate-50 ${
                          selectedElement?.type === item.kind && selectedElement.id === item.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <span className={`text-[11px] font-semibold truncate flex-1 ${item.isHidden ? "text-slate-300 italic" : "text-slate-700"}`}>
                          {item.kind === "zone" ? "▭ " : "▪ "}{item.name}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.kind === "zone") {
                                onUpdateZones(zones.map(z => z.id === item.id ? { ...z, zIndex: (z.zIndex || 0) + 1 } : z));
                              } else if (onUpdateLayoutObjects) {
                                onUpdateLayoutObjects(layoutObjects.map(o => o.id === item.id ? { ...o, zIndex: (o.zIndex || 0) + 1 } : o));
                              }
                            }}
                            title="Bring forward"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <ChevronDown size={11} className="rotate-180" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.kind === "zone") {
                                onUpdateZones(zones.map(z => z.id === item.id ? { ...z, zIndex: (z.zIndex || 0) - 1 } : z));
                              } else if (onUpdateLayoutObjects) {
                                onUpdateLayoutObjects(layoutObjects.map(o => o.id === item.id ? { ...o, zIndex: (o.zIndex || 0) - 1 } : o));
                              }
                            }}
                            title="Send backward"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          >
                            <ChevronDown size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.kind === "zone") {
                                onUpdateZones(zones.map(z => z.id === item.id ? { ...z, isLocked: !z.isLocked } : z));
                              } else if (onUpdateLayoutObjects) {
                                onUpdateLayoutObjects(layoutObjects.map(o => o.id === item.id ? { ...o, isLocked: !o.isLocked } : o));
                              }
                            }}
                            title={item.isLocked ? "Unlock" : "Lock"}
                            className={`p-1 rounded cursor-pointer ${item.isLocked ? "text-amber-600 hover:bg-amber-50" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"}`}
                          >
                            <Lock size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.kind === "zone") {
                                onUpdateZones(zones.map(z => z.id === item.id ? { ...z, isHidden: !z.isHidden } : z));
                              } else if (onUpdateLayoutObjects) {
                                onUpdateLayoutObjects(layoutObjects.map(o => o.id === item.id ? { ...o, isHidden: !o.isHidden } : o));
                              }
                            }}
                            title={item.isHidden ? "Show" : "Hide"}
                            className={`p-1 rounded cursor-pointer ${item.isHidden ? "text-slate-300 hover:bg-slate-50" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}
                          >
                            <Eye size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  {currentZones.length === 0 && currentLayoutObjects.length === 0 && (
                    <p className="text-[11px] text-slate-400 text-center py-4">No zones or objects on this floor yet.</p>
                  )}
                </div>
              </div>
            )}

            <div 
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                transition: isPanning ? "none" : "transform 0.1s ease-out",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
            >
              {/* CAD Measurement Line Overlay */}
              {measurePoints.length > 0 && (
                <svg className="absolute top-0 left-0 pointer-events-none z-50" style={{ width: "6000px", height: "6000px", overflow: "visible" }}>
                  {measurePoints[0] && measurePoints[1] && (
                    <line
                      x1={measurePoints[0].x} y1={measurePoints[0].y}
                      x2={measurePoints[1].x} y2={measurePoints[1].y}
                      stroke="#2563eb" strokeWidth={2 / zoom} strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                    />
                  )}
                  {measurePoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={5 / zoom} fill="#2563eb" stroke="white" strokeWidth={1.5 / zoom} />
                  ))}
                  {measurePoints[0] && measurePoints[1] && (() => {
                    const dx = measurePoints[1].x - measurePoints[0].x;
                    const dy = measurePoints[1].y - measurePoints[0].y;
                    const distFeet = Math.sqrt(dx * dx + dy * dy) / PIXELS_PER_FOOT;
                    const midX = (measurePoints[0].x + measurePoints[1].x) / 2;
                    const midY = (measurePoints[0].y + measurePoints[1].y) / 2;
                    return (
                      <foreignObject x={midX - 40} y={midY - 30 / zoom} width={80} height={24} style={{ overflow: "visible" }}>
                        <div style={{ transform: `scale(${1 / zoom})`, transformOrigin: "center" }} className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg text-center whitespace-nowrap">
                          {distFeet.toFixed(1)} ft
                        </div>
                      </foreignObject>
                    );
                  })()}
                </svg>
              )}

              {/* Marquee Selection Box Overlay */}
              {isMarqueeSelecting && marqueeStart && marqueeEnd && (
                <div 
                  style={{
                    position: "absolute",
                    left: `${Math.min(marqueeStart.x, marqueeEnd.x)}px`,
                    top: `${Math.min(marqueeStart.y, marqueeEnd.y)}px`,
                    width: `${Math.abs(marqueeEnd.x - marqueeStart.x)}px`,
                    height: `${Math.abs(marqueeEnd.y - marqueeStart.y)}px`,
                  }}
                  className="border-2 border-blue-500 bg-blue-500/15 rounded-xl pointer-events-none z-40 shadow-xs backdrop-blur-[1px]"
                />
              )}

              {/* Draw current Floor Zones */}
              {currentZones.filter(z => !z.isHidden).map((zone) => {
                const isSelected = selectedElement?.type === "zone" && selectedElement.id === zone.id;
                const isDeptSearchMatch = matchingDepartmentZoneIds.has(zone.id);
                const isDeptSearchActive = departmentSearchQuery.trim() !== "";
                const isZoneLocked = !!zone.isLocked;
                return (
                  <div 
                    key={zone.id}
                    data-draggable="true"
                    onMouseDown={(e) => { if (isZoneLocked) return; startDragElement(e, "zone", zone.id, zone.x, zone.y); }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (isZoneLocked) return;
                      setEditingZoneModal(zone);
                    }}
                    style={{
                      position: "absolute",
                      left: `${zone.x}px`,
                      top: `${zone.y}px`,
                      width: `${zone.width}px`,
                      height: `${zone.height}px`,
                      borderColor: zone.color,
                      backgroundColor: `${zone.color}0c`,
                      opacity: isDeptSearchActive && !isDeptSearchMatch ? 0.35 : 1,
                      zIndex: zone.zIndex || 0,
                      cursor: isZoneLocked ? "not-allowed" : undefined
                    }}
                    className={`border-2 rounded-2xl flex flex-col justify-between p-3.5 transition-all group ${isZoneLocked ? "cursor-not-allowed" : "cursor-move"} ${
                      isSelected ? "ring-2 ring-blue-600 shadow-xl border-solid z-20" 
                        : isDeptSearchMatch ? "ring-2 ring-indigo-500 shadow-xl border-solid z-10 animate-pulse" 
                        : "border-dashed hover:border-solid hover:bg-slate-400/5 z-0"
                    }`}
                  >
                    {/* Floating CAD Quick Actions Bar */}
                    {isSelected && canModifyCanvas && (
                      <div 
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute -top-11 left-0 flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-xl shadow-xl z-50 text-[10px] font-semibold animate-in fade-in zoom-in-95"
                      >
                        <button
                          onClick={() => setEditingZoneModal(zone)}
                          className="hover:bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                          title="Open full Zone Properties Modal"
                        >
                          <Edit3 size={11} className="text-blue-400" />
                          <span>Edit</span>
                        </button>
                        <div className="w-px h-3 bg-slate-700 mx-0.5" />
                        <button
                          onClick={() => fitZoneToEnclosedSeats(zone)}
                          className="hover:bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                          title="Auto-Fit Zone bounds to enclosed seats"
                        >
                          <Maximize size={11} />
                          <span>Fit Seats</span>
                        </button>
                        <div className="w-px h-3 bg-slate-700 mx-0.5" />
                        <div className="flex items-center gap-1 px-1">
                          {["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e"].map(colorHex => (
                            <button
                              key={colorHex}
                              onClick={() => {
                                saveSnapshot();
                                const updated = zones.map(z => z.id === zone.id ? { ...z, color: colorHex } : z);
                                onUpdateZones(updated);
                              }}
                              style={{ backgroundColor: colorHex }}
                              className="w-3.5 h-3.5 rounded-full border border-white/40 hover:scale-125 transition-transform cursor-pointer"
                            />
                          ))}
                        </div>
                        <div className="w-px h-3 bg-slate-700 mx-0.5" />
                        {zone.points && zone.points.length > 0 ? (
                          <button
                            onClick={() => resetZoneToRectangle(zone)}
                            className="hover:bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                            title="Reset back to a plain rectangle"
                          >
                            <Square size={11} />
                            <span>Reset Shape</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => enableFreeformZone(zone)}
                            className="hover:bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                            title="Enable freeform corners — drag any point on the outline independently to curve or notch one side"
                          >
                            <Sliders size={11} />
                            <span>Freeform Corners</span>
                          </button>
                        )}
                        <div className="w-px h-3 bg-slate-700 mx-0.5" />
                        <button
                          onClick={() => handleDeleteCurrentSelection()}
                          className="hover:bg-red-600 text-red-300 hover:text-white px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                          title="Delete Zone"
                        >
                          <Trash2 size={11} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}

                    {/* Freeform Curve Outline: smooth shape through the zone's custom points, drawn over the rectangle */}
                    {zone.points && zone.points.length > 0 && (
                      <svg
                        className="absolute"
                        style={{ left: 0, top: 0, width: `${zone.width}px`, height: `${zone.height}px`, overflow: "visible", pointerEvents: "none" }}
                      >
                        <path
                          d={buildSmoothClosedPath(zone.points)}
                          fill={`${zone.color}1a`}
                          stroke={zone.color}
                          strokeWidth={2}
                          style={{ pointerEvents: isSelected && canModifyCanvas ? "stroke" : "none", cursor: isSelected && canModifyCanvas ? "copy" : "default" }}
                          onDoubleClick={(e) => insertZoneVertexAtClick(e, zone)}
                        />
                      </svg>
                    )}

                    {/* Freeform Corner/Curve Drag Handles: each point moves independently — push one side in without moving the rest */}
                    {isSelected && canModifyCanvas && zone.points && zone.points.length > 0 && (
                      <>
                        {zone.points.map((pt, idx) => (
                          <div
                            key={idx}
                            onMouseDown={(e) => startDragZoneVertex(e, zone, idx)}
                            style={{ left: `${pt.x}px`, top: `${pt.y}px` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-600 rounded-full cursor-move z-30 hover:scale-125 transition-transform shadow-xs"
                            title="Drag to push this point in or out independently"
                          />
                        ))}
                      </>
                    )}

                    {/* 8 Interactive CAD Resize Handles (rectangle mode only) */}
                    {isSelected && canModifyCanvas && (!zone.points || zone.points.length === 0) && (
                      <>
                        <div 
                          onMouseDown={(e) => startResizeZone(e, zone, "nw")}
                          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize z-30 hover:scale-125 transition-transform shadow-xs"
                          title="Resize Top-Left"
                        />
                        <div 
                          onMouseDown={(e) => startResizeZone(e, zone, "n")}
                          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize z-30 hover:scale-125 transition-transform shadow-xs"
                          title="Resize Top"
                        />
                        <div 
                          onMouseDown={(e) => startResizeZone(e, zone, "ne")}
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize z-30 hover:scale-125 transition-transform shadow-xs"
                          title="Resize Top-Right"
                        />
                        <div 
                          onMouseDown={(e) => startResizeZone(e, zone, "e")}
                          className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize z-30 hover:scale-125 transition-transform shadow-xs"
                          title="Resize Right"
                        />
                        <div 
                          onMouseDown={(e) => startResizeZone(e, zone, "se")}
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize z-30 hover:scale-125 transition-transform shadow-xs"
                          title="Resize Bottom-Right"
                        />
                        <div 
                          onMouseDown={(e) => startResizeZone(e, zone, "s")}
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize z-30 hover:scale-125 transition-transform shadow-xs"
                          title="Resize Bottom"
                        />
                        <div 
                          onMouseDown={(e) => startResizeZone(e, zone, "sw")}
                          className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize z-30 hover:scale-125 transition-transform shadow-xs"
                          title="Resize Bottom-Left"
                        />
                        <div 
                          onMouseDown={(e) => startResizeZone(e, zone, "w")}
                          className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize z-30 hover:scale-125 transition-transform shadow-xs"
                          title="Resize Left"
                        />
                      </>
                    )}

                    <div className="flex justify-between items-start pointer-events-none">
                      <div className="min-w-0 pr-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wide">Zone</span>
                        <h5 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-snug break-words" title={zone.name}>{zone.name}</h5>
                      </div>
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: zone.color }}
                      ></span>
                    </div>

                    <div className="flex justify-between items-end text-[9px] font-semibold text-slate-500 pointer-events-none">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 uppercase tracking-wide">{zone.department}</span>
                      <span>Cap: {zone.capacity}</span>
                    </div>
                  </div>
                );
              })}

              {/* Draw Layout Objects / Facilities */}
              {currentLayoutObjects.filter(o => !o.isHidden).map((obj) => {
                const isSelected = selectedElement?.type === "object" && selectedElement.id === obj.id;
                const isObjLocked = !!obj.isLocked;
                return (
                  <div 
                    key={obj.id}
                    data-draggable="true"
                    onMouseDown={(e) => { if (isObjLocked) return; startDragElement(e, "object", obj.id, obj.x, obj.y); }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (isObjLocked) return;
                      setEditingObjectModal(obj);
                    }}
                    style={{
                      position: "absolute",
                      left: `${obj.x}px`,
                      top: `${obj.y}px`,
                      width: `${obj.width}px`,
                      height: `${obj.height}px`,
                      backgroundColor: obj.color,
                      transform: `rotate(${obj.rotation}deg)`,
                      zIndex: obj.zIndex || 0,
                      cursor: isObjLocked ? "not-allowed" : undefined
                    }}
                    className={`rounded-xl border border-slate-300 p-2 text-center flex flex-col items-center justify-center transition-all ${isObjLocked ? "cursor-not-allowed" : "cursor-move"} ${
                      isSelected ? "ring-2 ring-purple-600 border-solid z-30 shadow-lg" : "hover:border-purple-400"
                    }`}
                  >
                    {isSelected && canModifyCanvas && (
                      <>
                        {/* 8 Interactive CAD Handles for Facility Resizing */}
                        <div onMouseDown={(e) => startResizeObject(e, obj, "nw")} className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-nwse-resize z-40 hover:scale-125 transition-transform shadow-xs" title="Resize NW" />
                        <div onMouseDown={(e) => startResizeObject(e, obj, "n")} className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-ns-resize z-40 hover:scale-125 transition-transform shadow-xs" title="Resize N" />
                        <div onMouseDown={(e) => startResizeObject(e, obj, "ne")} className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-nesw-resize z-40 hover:scale-125 transition-transform shadow-xs" title="Resize NE" />
                        <div onMouseDown={(e) => startResizeObject(e, obj, "e")} className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-ew-resize z-40 hover:scale-125 transition-transform shadow-xs" title="Resize E" />
                        <div onMouseDown={(e) => startResizeObject(e, obj, "se")} className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-nwse-resize z-40 hover:scale-125 transition-transform shadow-xs" title="Resize SE" />
                        <div onMouseDown={(e) => startResizeObject(e, obj, "s")} className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-ns-resize z-40 hover:scale-125 transition-transform shadow-xs" title="Resize S" />
                        <div onMouseDown={(e) => startResizeObject(e, obj, "sw")} className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-nesw-resize z-40 hover:scale-125 transition-transform shadow-xs" title="Resize SW" />
                        <div onMouseDown={(e) => startResizeObject(e, obj, "w")} className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-purple-600 rounded-full cursor-ew-resize z-40 hover:scale-125 transition-transform shadow-xs" title="Resize W" />

                        {/* Floating CAD Action Bar for Enlarge & Customize */}
                        <div 
                          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-2.5 py-1 rounded-xl shadow-xl border border-purple-500/50 flex items-center gap-1.5 text-[10px] font-bold z-50 whitespace-nowrap animate-in fade-in"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span className="text-purple-300 font-mono border-r border-slate-700 pr-1.5">{obj.width}×{obj.height}px</span>
                          
                          <button 
                            type="button"
                            onClick={() => handleScaleObject(obj.id, 1.25)}
                            className="hover:bg-purple-600 text-purple-200 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            title="Enlarge facility size +25%"
                          >
                            +25% Enlarge
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleScaleObject(obj.id, 0.8)}
                            className="hover:bg-slate-700 text-slate-300 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            title="Shrink facility size -20%"
                          >
                            -20% Shrink
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingObjectModal(obj)}
                            className="hover:bg-purple-600 text-purple-200 hover:text-white px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                            title="Enlarge & Customize Facility Properties"
                          >
                            <Maximize size={11} />
                            <span>Size Props</span>
                          </button>
                          <button 
                            type="button"
                            onClick={rotateSelected}
                            className="hover:bg-slate-700 text-slate-300 hover:text-white p-1 rounded cursor-pointer transition-colors"
                            title="Rotate 90°"
                          >
                            <RotateCw size={11} />
                          </button>
                          <button 
                            type="button"
                            onClick={deleteSelected}
                            className="hover:bg-rose-600 text-rose-300 hover:text-white p-1 rounded cursor-pointer transition-colors"
                            title="Delete Facility"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </>
                    )}

                    {(obj.type === "Dummy Cluster Pillar" || obj.type === "Structural Pillar") && (
                      <div className="absolute inset-0 bg-slate-900/10 pointer-events-none rounded-xl border border-slate-700/40 flex items-center justify-center overflow-hidden">
                        <div className="absolute w-full h-[1px] bg-slate-600/30 rotate-45" />
                        <div className="absolute w-full h-[1px] bg-slate-600/30 -rotate-45" />
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block pointer-events-none z-10">{obj.type}</span>
                    <span className="text-[10px] font-bold text-slate-800 line-clamp-1 pointer-events-none z-10">{obj.name}</span>
                    {(obj.type === "Dummy Cluster Pillar" || obj.type === "Structural Pillar") && (
                      <span className="text-[8px] font-mono text-slate-700 font-bold bg-slate-200/90 px-1.5 py-0.5 rounded-xs mt-0.5 pointer-events-none z-10 border border-slate-300">
                        0 Seats (Dummy Pillar)
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Draw Seats */}
              {currentSeats.map((seat) => {
                const isSingleSelected = selectedElement?.type === "seat" && selectedElement.id === seat.id;
                const isGroupSelected = selectedSeatIds.includes(seat.id);
                const isManagerMatch = isSeatOfSelectedManager(seat);
                const isFilteringManager = selectedManagerFilter !== "All";
                const isDeptSearchActive = departmentSearchQuery.trim() !== "";
                const isDeptSeatMatch = isDeptSearchActive && (
                  matchingDepartmentZoneIds.has(seat.zoneId) ||
                  (seat.department || "").toLowerCase().includes(departmentSearchQuery.trim().toLowerCase()) ||
                  (seat.allocatedDepartment || "").toLowerCase().includes(departmentSearchQuery.trim().toLowerCase())
                );
                
                let statusBorder = "border-slate-300 bg-white hover:border-slate-500";
                let badgeDot = "bg-slate-400";
                if (seat.status === "Occupied") {
                  statusBorder = "border-blue-600 bg-blue-50/50 hover:bg-blue-100/50";
                  badgeDot = "bg-blue-600";
                } else if (seat.status === "Reserved") {
                  statusBorder = "border-purple-600 bg-purple-50/50 hover:bg-purple-100/50";
                  badgeDot = "bg-purple-600";
                } else {
                  statusBorder = "border-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/50";
                  badgeDot = "bg-emerald-600";
                }

                let managerHighlightStyle = "";
                if (isFilteringManager) {
                  if (isManagerMatch) {
                    managerHighlightStyle = "ring-4 ring-amber-400 border-amber-500 bg-amber-200/90 scale-110 z-40 shadow-xl animate-pulse";
                  } else {
                    managerHighlightStyle = "opacity-30 grayscale-50";
                  }
                }

                let deptHighlightStyle = "";
                if (isDeptSearchActive) {
                  if (isDeptSeatMatch) {
                    deptHighlightStyle = "ring-4 ring-indigo-500 border-indigo-600 bg-indigo-200/90 scale-110 z-40 shadow-xl";
                  } else if (!isFilteringManager) {
                    deptHighlightStyle = "opacity-30 grayscale-50";
                  }
                }

                let vacantHighlightStyle = "";
                if (showVacantOnly) {
                  if (seat.status === "Vacant") {
                    vacantHighlightStyle = "ring-4 ring-emerald-500 border-emerald-600 bg-emerald-200/90 scale-110 z-40 shadow-xl animate-pulse";
                  } else if (!isFilteringManager && !isDeptSearchActive) {
                    vacantHighlightStyle = "opacity-25 grayscale";
                  }
                }

                const bName = currentBuilding?.name || "Newmark _Hyderabad";
                const fName = currentFloor?.name || "11 th Floor CRE";
                const mgrName = seat.allocatedManager || seat.managerName || (seat.employeeName ? seat.employeeName : "Unassigned Manager");
                const deptName = seat.allocatedDepartment || seat.department || "No Department Assigned";
                const seatIdentityTitle = `${seat.seatNumber} • ${deptName} • ${mgrName} • ${bName} - ${fName} • ${seat.status}`;

                return (
                  <div 
                    key={seat.id}
                    data-draggable="true"
                    title={seatIdentityTitle}
                    onMouseDown={(e) => startDragElement(e, "seat", seat.id, seat.x, seat.y)}
                    style={{
                      position: "absolute",
                      left: `${seat.x}px`,
                      top: `${seat.y}px`,
                      transform: `rotate(${seat.rotation || 0}deg)`
                    }}
                    className={`w-11 h-11 border-2 rounded-xl flex flex-col items-center justify-center cursor-move shadow-2xs text-[9px] font-bold transition-all relative ${statusBorder} ${managerHighlightStyle} ${deptHighlightStyle} ${vacantHighlightStyle} ${
                      isGroupSelected 
                        ? "ring-2 ring-blue-600 ring-offset-1 border-blue-600 bg-blue-100/90 scale-105 z-30 shadow-md" 
                        : isSingleSelected 
                        ? "ring-2 ring-blue-600 border-solid scale-105 z-20" 
                        : ""
                    }`}
                  >
                    <span className={isDeptSeatMatch ? "text-indigo-900 font-mono text-[11px] font-extrabold" : "text-slate-700 font-mono"}>{seat.seatNumber}</span>
                    <span className="text-[7px] text-slate-400 truncate max-w-[36px] mt-0.5">{seat.type.substring(0,6)}</span>
                    <span className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${badgeDot}`}></span>
                    {isGroupSelected && (
                      <span className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px]">
                        ✓
                      </span>
                    )}
                    {isManagerMatch && isFilteringManager && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white font-mono text-[7px] font-extrabold px-1 py-0.2 rounded shadow-md border border-white z-50 whitespace-nowrap">
                        👑 MGR
                      </span>
                    )}
                    {isDeptSeatMatch && !isManagerMatch && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-mono text-[7px] font-extrabold px-1 py-0.2 rounded shadow-md border border-white z-50 whitespace-nowrap">
                        ✓ MATCH
                      </span>
                    )}
                    {seat.isFixedSlot && (
                      <span
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-700 text-white rounded-full flex items-center justify-center shadow-sm border border-white z-40"
                        title="Locked to this zone — won't be auto-reassigned"
                      >
                        <Lock size={8} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Empty Floor Canvas Watermark Banner */}
              {currentZones.length === 0 && currentSeats.length === 0 && currentLayoutObjects.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center select-none">
                  <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-dashed border-slate-300 shadow-sm max-w-md space-y-3 pointer-events-auto">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight font-display">Blank Floor Canvas</h4>
                      <p className="text-xs text-slate-500 mt-1 font-medium">This floor layout is completely empty. Start designing from scratch!</p>
                    </div>
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-1.5">
                      <p className="font-bold text-slate-700">How to design this floor:</p>
                      <ul className="list-disc list-inside space-y-1 text-[10px]">
                        <li>Drag <strong>Corporate Zone Blocks</strong> from the left dock onto the grid</li>
                        <li>Drag <strong>Single Desks / Executive Cabins / Pantries</strong> to place them</li>
                        <li>Use <strong>Bulk Seat Generator</strong> to add desk matrix automatically</li>
                        <li>Or click <strong>Import Excel Layout</strong> to load layout data from spreadsheet</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Multi-Seat Batch Control Bar */}
            {selectedSeatIds.length > 0 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[95%] overflow-x-auto">
                <div className="flex items-center gap-2 border-r border-slate-700 pr-4 shrink-0">
                  <CheckSquare size={16} className="text-blue-400" />
                  <div className="text-xs">
                    <span className="font-bold text-white block">{selectedSeatIds.length} Seats Selected</span>
                    <span className="text-[10px] text-slate-400">Multi-Select Active</span>
                  </div>
                </div>

                {/* Batch Action Controls */}
                <div className="flex items-center gap-2 text-xs shrink-0 flex-wrap">
                  <button 
                    onClick={() => setSelectedSeatIds(currentSeats.map(s => s.id))}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Select all seats on this floor"
                  >
                    <span>Select All Floor ({currentSeats.length})</span>
                  </button>

                  {/* Rotate Group */}
                  <button 
                    onClick={() => {
                      saveSnapshot();
                      const updated = seats.map(s => selectedSeatIds.includes(s.id) ? { ...s, rotation: ((s.rotation || 0) + 90) % 360 } : s);
                      onUpdateSeats(updated);
                    }}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCw size={12} />
                    <span>Rotate Group 90°</span>
                  </button>

                  {/* Align Rows (Y) */}
                  <button 
                    onClick={() => {
                      saveSnapshot();
                      const selSeats = seats.filter(s => selectedSeatIds.includes(s.id));
                      if (selSeats.length < 2) return;
                      const avgY = Math.round(selSeats.reduce((acc, s) => acc + s.y, 0) / selSeats.length);
                      const updated = seats.map(s => selectedSeatIds.includes(s.id) ? { ...s, y: avgY } : s);
                      onUpdateSeats(updated);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Align all selected seats horizontally"
                  >
                    <span>Align Rows</span>
                  </button>

                  {/* Align Columns (X) */}
                  <button 
                    onClick={() => {
                      saveSnapshot();
                      const selSeats = seats.filter(s => selectedSeatIds.includes(s.id));
                      if (selSeats.length < 2) return;
                      const avgX = Math.round(selSeats.reduce((acc, s) => acc + s.x, 0) / selSeats.length);
                      const updated = seats.map(s => selectedSeatIds.includes(s.id) ? { ...s, x: avgX } : s);
                      onUpdateSeats(updated);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Align all selected seats vertically"
                  >
                    <span>Align Cols</span>
                  </button>

                  {/* Allocate Dept & Manager Block */}
                  <button 
                    onClick={() => setShowBulkDeptModal(true)}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    title="Allocate selected seats directly to a department and manager"
                  >
                    <Users size={12} />
                    <span>Allocate Dept & Manager</span>
                  </button>

                  {/* Reassign & Lock to Zone */}
                  <select 
                    onChange={(e) => {
                      const newZoneId = e.target.value;
                      if (!newZoneId) return;
                      saveSnapshot();
                      const newZoneName = currentZones.find(z => z.id === newZoneId)?.name || newZoneId;
                      const updated = seats.map(s => selectedSeatIds.includes(s.id) ? { ...s, zoneId: newZoneId, isFixedSlot: true } : s);
                      onUpdateSeats(updated);
                      if (onAddAuditLog) {
                        onAddAuditLog("Bulk Lock Seats to Zone", "Floor Map", `Locked ${selectedSeatIds.length} seat(s) to zone "${newZoneName}".`);
                      }
                      e.target.value = "";
                    }}
                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-[11px] px-2 py-1.5 font-semibold focus:outline-none cursor-pointer"
                    defaultValue=""
                    title="Assigns the selected seats to a zone and locks them there — they'll move with that zone and won't get auto-reassigned by drag-detection."
                  >
                    <option value="" disabled>🔒 Lock Selected to Zone...</option>
                    {currentZones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>

                  {/* Unlock Selected Seats */}
                  <button
                    onClick={() => {
                      saveSnapshot();
                      const updated = seats.map(s => selectedSeatIds.includes(s.id) ? { ...s, isFixedSlot: false } : s);
                      onUpdateSeats(updated);
                      if (onAddAuditLog) {
                        onAddAuditLog("Bulk Unlock Seats", "Floor Map", `Unlocked ${selectedSeatIds.length} seat(s) from their zone.`);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Unlock selected seats so they can be freely moved/reassigned again"
                  >
                    <span>🔓 Unlock</span>
                  </button>

                  {/* Delete Group */}
                  <button 
                    onClick={handleDeleteCurrentSelection}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Delete Group</span>
                  </button>

                  {/* Clear Selection */}
                  <button 
                    onClick={() => setSelectedSeatIds([])}
                    className="px-2 py-1.5 text-slate-400 hover:text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center text-slate-500">
            <div className="flex items-center gap-2">
              <HelpCircle size={15} className="text-slate-400" />
              <span><strong>CAD Instructions:</strong> Drag nodes from dock onto canvas. Moving a zone automatically repositions nested seats. Use Ctrl+Z / Ctrl+Y for Undo/Redo.</span>
            </div>
            <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-600">Enterprise CAD Core 2.0</span>
          </div>
        </div>
      </div>

      {/* MODAL 1: SAVE VERSION MODAL */}
      {showSaveVersionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Save className="text-blue-600" size={20} />
                <h3 className="text-lg font-bold text-slate-800 font-display">Save Floor Layout Version</h3>
              </div>
              <button onClick={() => setShowSaveVersionModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">Save Mode Strategy</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setSaveMode("new_version")}
                    className={`p-3 rounded-xl border text-left font-medium transition-all ${
                      saveMode === "new_version" 
                        ? "border-blue-600 bg-blue-50 text-blue-800 font-bold" 
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="block font-bold">Save As New Version</span>
                    <span className="text-[10px] text-slate-500 font-normal">Creates a version snapshot (e.g. v{(versionHistory.length + 1).toFixed(1)})</span>
                  </button>

                  <button 
                    onClick={() => setSaveMode("update")}
                    className={`p-3 rounded-xl border text-left font-medium transition-all ${
                      saveMode === "update" 
                        ? "border-blue-600 bg-blue-50 text-blue-800 font-bold" 
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="block font-bold">Update Current Layout</span>
                    <span className="text-[10px] text-slate-500 font-normal">Overwrites current {currentVersion} baseline</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Change Log Notes & Description</label>
                <textarea 
                  rows={3}
                  value={versionNotesInput}
                  onChange={(e) => setVersionNotesInput(e.target.value)}
                  placeholder="Describe your layout changes (e.g., Added 40 hot desks in Zone B, moved executive cabins)..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Version History Table */}
              <div className="space-y-1.5 pt-2">
                <span className="font-bold text-slate-700 block text-xs">Prior Version Snapshots</span>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                  {versionHistory.map(ver => (
                    <div key={ver.id} className="p-2.5 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-blue-600 font-mono">{ver.versionNumber}</span>
                        <span className="text-slate-500 ml-2">{ver.notes}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{ver.modifiedDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowSaveVersionModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50"
              >
                Discard Changes
              </button>
              <button 
                onClick={handleSaveVersion}
                className="px-5 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                Confirm & Save Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PREVIEW LAYOUT MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="text-blue-600" size={20} />
                <h3 className="text-lg font-bold text-slate-800 font-display">Floor Layout Blueprint Preview</h3>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Building / Floor</span>
                  <p className="font-bold text-slate-800 mt-1">{currentBuilding?.name}</p>
                  <p className="text-slate-500">{currentFloor?.name}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Desk Nodes</span>
                  <p className="font-bold text-blue-600 text-lg mt-1 font-mono">{currentSeats.length}</p>
                  <p className="text-slate-500">{currentZones.length} spatial zones</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Live Occupancy</span>
                  <p className="font-bold text-emerald-600 text-lg mt-1 font-mono">{occupiedSeatsInFloor.length} Occupied</p>
                  <p className="text-slate-500">{currentSeats.length - occupiedSeatsInFloor.length} Vacant</p>
                </div>
              </div>

              {/* Mini visual canvas preview */}
              <div className="bg-slate-900 p-4 rounded-xl text-white min-h-[220px] relative overflow-hidden flex flex-col justify-center items-center border border-slate-800">
                <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-400 uppercase">
                  Mini Spatial Render Mode
                </div>
                <div className="grid grid-cols-5 gap-3 max-w-md w-full">
                  {currentZones.map(z => (
                    <div key={z.id} className="p-2 border border-slate-700 bg-slate-800/80 rounded-lg text-center text-[10px]">
                      <span className="font-bold text-blue-400 block truncate">{z.name}</span>
                      <span className="text-slate-400 font-mono">{seats.filter(s => s.zoneId === z.id).length} seats</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2 bg-slate-800 text-white text-xs rounded-xl font-bold hover:bg-slate-900"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BULK SEAT GENERATOR MODAL */}
      {showBulkGeneratorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <LayoutGrid className="text-purple-600" size={20} />
                <h3 className="text-lg font-bold text-slate-800 font-display">Bulk Seat Generator</h3>
              </div>
              <button onClick={() => setShowBulkGeneratorModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                Specify the exact seat numbering range and destination zone to generate a high-density matrix seating grid automatically.
              </p>

              {/* Seat Prefix & Range Inputs */}
              <div className="bg-purple-50/60 border border-purple-200/80 p-3.5 rounded-xl space-y-3">
                <span className="text-[10px] text-purple-900 font-bold uppercase tracking-wider block">1. Seat Numbering Range Configuration</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Seat Prefix</label>
                    <input 
                      type="text"
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value)}
                      placeholder="e.g. DESK-"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">Start Seat No.</label>
                    <input 
                      type="number" 
                      min={1} 
                      value={bulkStartNum}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setBulkStartNum(val);
                        if (bulkEndNum < val) setBulkEndNum(val);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 text-[11px]">End Seat No.</label>
                    <input 
                      type="number" 
                      min={bulkStartNum} 
                      value={bulkEndNum}
                      onChange={(e) => setBulkEndNum(parseInt(e.target.value) || bulkStartNum)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Target Zone & Seat Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px]">Target Zone</label>
                  <select 
                    value={bulkZoneId} 
                    onChange={(e) => setBulkZoneId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Target Zone...</option>
                    {currentZones.map(z => (
                      <option key={z.id} value={z.id}>{z.name} ({z.department})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px]">Seat Type</label>
                  <select 
                    value={bulkSeatType} 
                    onChange={(e) => setBulkSeatType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Standard">Standard Desk</option>
                    <option value="Hot Desk">Hot Desk</option>
                    <option value="Executive">Executive Cabin</option>
                    <option value="Collaborative">Collaborative</option>
                  </select>
                </div>
              </div>

              {/* Grid Alignment Columns */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px]">Columns per Row</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={50}
                    value={bulkCols}
                    onChange={(e) => setBulkCols(parseInt(e.target.value) || 1)}
                    className="w-full border border-slate-200 rounded-xl p-2 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px]">
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Calculated Layout</span>
                  <div className="font-mono font-bold text-slate-700">
                    {Math.ceil(Math.max(1, bulkEndNum - bulkStartNum + 1) / Math.max(1, bulkCols))} Rows × {Math.max(1, bulkCols)} Cols
                  </div>
                </div>
              </div>

              {/* Live Preview Summary */}
              {bulkEndNum >= bulkStartNum ? (
                <div className="bg-purple-100/70 border border-purple-300/80 p-3.5 rounded-xl text-purple-950 text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span>Generation Result Summary</span>
                    <span className="bg-purple-600 text-white font-mono px-2 py-0.5 rounded-full text-[10px]">
                      {bulkEndNum - bulkStartNum + 1} Seats Total
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-purple-900">
                    Will generate seats starting from <span className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-purple-200">{bulkPrefix}{bulkStartNum}</span> through <span className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-purple-200">{bulkPrefix}{bulkEndNum}</span> in <strong className="text-purple-950">{zones.find(z => z.id === bulkZoneId)?.name || currentZones[0]?.name || "Floor Canvas"}</strong>.
                  </p>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs font-semibold">
                  ⚠️ End seat number must be greater than or equal to start seat number ({bulkStartNum}).
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowBulkGeneratorModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleGenerateBulkSeats}
                disabled={bulkEndNum < bulkStartNum}
                className="px-5 py-2 bg-purple-600 text-white text-xs rounded-xl font-bold hover:bg-purple-700 shadow-md shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Generate Seat Range Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE BUILDING MODAL */}
      {showCreateBuildingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-600" size={20} />
                <h3 className="text-lg font-bold text-slate-800 font-display">Create Building / Campus</h3>
              </div>
              <button onClick={() => setShowCreateBuildingModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Campus Name</label>
                <input 
                  type="text" 
                  value={newCampusName} 
                  onChange={(e) => setNewCampusName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Building Identifier / Title</label>
                <input 
                  type="text" 
                  value={newBuildingName} 
                  onChange={(e) => setNewBuildingName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Location / City</label>
                <input 
                  type="text" 
                  value={newBuildingLocation} 
                  onChange={(e) => setNewBuildingLocation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setShowCreateBuildingModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreateBuilding} className="px-5 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200">Create Building</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE FLOOR MODAL */}
      {showCreateFloorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="text-blue-600" size={20} />
                <h3 className="text-lg font-bold text-slate-800 font-display">Create New Floor Level</h3>
              </div>
              <button onClick={() => setShowCreateFloorModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Target Building</label>
                <input 
                  type="text" 
                  value={currentBuilding?.name || ""} 
                  disabled 
                  className="w-full border border-slate-200 bg-slate-100 rounded-xl p-2.5 text-xs font-semibold text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Floor Level Name</label>
                <input 
                  type="text" 
                  value={newFloorName} 
                  onChange={(e) => setNewFloorName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Design Capacity (Max Desks)</label>
                <input 
                  type="number" 
                  value={newFloorCapacity} 
                  onChange={(e) => setNewFloorCapacity(parseInt(e.target.value) || 100)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button onClick={() => setShowCreateFloorModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleCreateFloor} className="px-5 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200">Create Floor</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: SAFE FLOOR DELETION CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle size={22} />
                <h3 className="text-lg font-bold text-slate-800 font-display">Confirm Floor Layout Deletion</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-900 space-y-2">
                <p className="font-bold text-sm">Warning: Irreversible Infrastructure Deletion!</p>
                <p>
                  You are attempting to delete <strong>{currentFloor?.name}</strong> in <strong>{currentBuilding?.name}</strong>.
                </p>
              </div>

              {/* Pre-deletion Impact Check */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Pre-Deletion Impact Summary:</span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between font-medium">
                    <span>Floor Level:</span>
                    <strong className="text-slate-800">{currentFloor?.name}</strong>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Zones Affected:</span>
                    <strong className="text-slate-800">{currentZones.length} Zones</strong>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total Seats Destroyed:</span>
                    <strong className="text-slate-800">{currentSeats.length} Seats</strong>
                  </div>
                  <div className="flex justify-between font-medium text-rose-600">
                    <span>Allocated / Occupied Seats:</span>
                    <strong className="font-bold">{occupiedSeatsInFloor.length} Employees Impacted</strong>
                  </div>
                </div>

                {occupiedSeatsInFloor.length > 0 && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                    <strong>Employees Currently Assigned:</strong>{" "}
                    {occupiedSeatsInFloor.map(s => s.employeeName || s.seatNumber).join(", ")}. Deleting this floor will unassign them automatically!
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button 
                onClick={handleExportFloorJSON}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 text-xs rounded-xl font-semibold hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Export Floor First</span>
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDeleteFloor}
                  className="px-5 py-2 bg-rose-600 text-white text-xs rounded-xl font-bold hover:bg-rose-700 shadow-md shadow-rose-200"
                >
                  Yes, Delete Floor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: BULK MANAGE & DELETE INFRASTRUCTURE (BUILDINGS & FLOORS) MODAL */}
      {showManageInfrastructureModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Trash2 className="text-rose-600" size={20} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 font-display">Manage & Delete Infrastructure</h3>
                  <p className="text-xs text-slate-400">Select multiple buildings or floors to remove from system layout</p>
                </div>
              </div>
              <button onClick={() => setShowManageInfrastructureModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 shrink-0">
              <button
                onClick={() => setInfrastructureTab("buildings")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                  infrastructureTab === "buildings"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Building2 size={14} />
                <span>Delete Buildings ({buildings.length})</span>
              </button>

              <button
                onClick={() => setInfrastructureTab("floors")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
                  infrastructureTab === "floors"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Layers size={14} />
                <span>Delete Floors ({floors.length})</span>
              </button>
            </div>

            {/* Tab 1: Buildings Deletion */}
            {infrastructureTab === "buildings" && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">Buildings Roster</span>
                  <button
                    onClick={() => {
                      if (selectedBuildingIdsForDelete.size === buildings.length) {
                        setSelectedBuildingIdsForDelete(new Set());
                      } else {
                        setSelectedBuildingIdsForDelete(new Set(buildings.map(b => b.id)));
                      }
                    }}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    {selectedBuildingIdsForDelete.size === buildings.length ? "Deselect All" : "Select All Buildings"}
                  </button>
                </div>

                <div className="space-y-2">
                  {buildings.map(bld => {
                    const bldFloors = floors.filter(f => f.buildingId === bld.id);
                    const bldFloorIds = new Set(bldFloors.map(f => f.id));
                    const bldZones = zones.filter(z => bldFloorIds.has(z.floorId));
                    const bldSeats = seats.filter(s => bldFloorIds.has(s.floorId));
                    const occupiedSeats = bldSeats.filter(s => s.status === "Occupied");
                    const isChecked = selectedBuildingIdsForDelete.has(bld.id);

                    return (
                      <div
                        key={bld.id}
                        onClick={() => {
                          setSelectedBuildingIdsForDelete(prev => {
                            const next = new Set(prev);
                            if (next.has(bld.id)) next.delete(bld.id);
                            else next.add(bld.id);
                            return next;
                          });
                        }}
                        className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? "border-rose-300 bg-rose-50/40 shadow-2xs" 
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-slate-400 hover:text-rose-600"
                          >
                            {isChecked ? (
                              <CheckSquare size={18} className="text-rose-600" />
                            ) : (
                              <Square size={18} className="text-slate-300" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-xs">{bld.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({bld.location})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                {bldFloors.length} Floors
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                {bldZones.length} Zones
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                {bldSeats.length} Seats
                              </span>
                              {occupiedSeats.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">
                                  {occupiedSeats.length} Occupied
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmData({
                              type: "building",
                              title: `Delete Building "${bld.name}"`,
                              message: `Are you sure you want to delete building "${bld.name}"? This will permanently delete all its floors, zones, and seats.`,
                              action: () => {
                                setSelectedBuildingIdsForDelete(new Set([bld.id]));
                                setTimeout(() => handleConfirmBulkDeleteBuildings(), 100);
                              }
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Building"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Floors Deletion */}
            {infrastructureTab === "floors" && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {/* Building Filter Bar */}
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Filter Building:</span>
                    <select
                      value={floorFilterBuildingId}
                      onChange={(e) => setFloorFilterBuildingId(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium text-xs"
                    >
                      <option value="all">All Buildings ({buildings.length})</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const displayFloors = floorFilterBuildingId === "all" 
                        ? floors 
                        : floors.filter(f => f.buildingId === floorFilterBuildingId);
                      
                      if (selectedFloorIdsForDelete.size === displayFloors.length) {
                        setSelectedFloorIdsForDelete(new Set());
                      } else {
                        setSelectedFloorIdsForDelete(new Set(displayFloors.map(f => f.id)));
                      }
                    }}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    {selectedFloorIdsForDelete.size > 0 ? "Deselect All" : "Select Filtered Floors"}
                  </button>
                </div>

                <div className="space-y-2">
                  {(floorFilterBuildingId === "all" ? floors : floors.filter(f => f.buildingId === floorFilterBuildingId)).map(fl => {
                    const parentBld = buildings.find(b => b.id === fl.buildingId);
                    const flZones = zones.filter(z => z.floorId === fl.id);
                    const flSeats = seats.filter(s => s.floorId === fl.id);
                    const occupiedSeats = flSeats.filter(s => s.status === "Occupied");
                    const isChecked = selectedFloorIdsForDelete.has(fl.id);

                    return (
                      <div
                        key={fl.id}
                        onClick={() => {
                          setSelectedFloorIdsForDelete(prev => {
                            const next = new Set(prev);
                            if (next.has(fl.id)) next.delete(fl.id);
                            else next.add(fl.id);
                            return next;
                          });
                        }}
                        className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? "border-rose-300 bg-rose-50/40 shadow-2xs" 
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-slate-400 hover:text-rose-600"
                          >
                            {isChecked ? (
                              <CheckSquare size={18} className="text-rose-600" />
                            ) : (
                              <Square size={18} className="text-slate-300" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-xs">{fl.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">in {parentBld?.name || "Building"}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                Capacity: {fl.capacity}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                {flZones.length} Zones
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                {flSeats.length} Seats
                              </span>
                              {occupiedSeats.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">
                                  {occupiedSeats.length} Occupied
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmData({
                              type: "floor",
                              title: `Delete Floor "${fl.name}"`,
                              message: `Are you sure you want to delete floor "${fl.name}"? This will permanently delete all its zones and seats.`,
                              action: () => {
                                setSelectedFloorIdsForDelete(new Set([fl.id]));
                                setTimeout(() => handleConfirmBulkDeleteFloors(), 100);
                              }
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Floor"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowManageInfrastructureModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>

              {infrastructureTab === "buildings" ? (
                <button
                  onClick={handleConfirmBulkDeleteBuildings}
                  disabled={selectedBuildingIdsForDelete.size === 0}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl font-bold shadow-md shadow-rose-200 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Delete {selectedBuildingIdsForDelete.size} Selected Building(s)</span>
                </button>
              ) : (
                <button
                  onClick={handleConfirmBulkDeleteFloors}
                  disabled={selectedFloorIdsForDelete.size === 0}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl font-bold shadow-md shadow-rose-200 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Delete {selectedFloorIdsForDelete.size} Selected Floor(s)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXCEL FLOOR LAYOUT UPLOAD MODAL */}
      {showExcelLayoutUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight font-display">
                    Import Floor Layout Data (Excel / CSV)
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Upload seat numbers, zone names, coordinates & status mapping directly into <strong>{currentFloor?.name}</strong>.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowExcelLayoutUploadModal(false);
                  setParsedExcelSeats([]);
                  setParsedExcelZones([]);
                  setExcelLayoutParseErrors([]);
                  setExcelLayoutSuccessMsg("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle size={20} />
              </button>
            </div>

            {excelLayoutSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
                <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full">
                  <CheckCircle size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-emerald-900">
                    Floor Layout Imported Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 max-w-lg mx-auto font-medium">
                    {excelLayoutSuccessMsg}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowExcelLayoutUploadModal(false);
                    setParsedExcelSeats([]);
                    setParsedExcelZones([]);
                    setExcelLayoutParseErrors([]);
                    setExcelLayoutSuccessMsg("");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  Return to CAD Designer
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Download Template Banners */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Download size={14} className="text-emerald-600" />
                        <span>1. CAD Layout Excel Template</span>
                      </p>
                      <p className="text-[11px] text-emerald-700 leading-tight">
                        Full spatial layout import: Building, Floor, Zone, Seat Number, Coordinates (X, Y), Department.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadLayoutExcelTemplate}
                      className="w-full bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download CAD Template</span>
                    </button>
                  </div>

                  <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <Download size={14} className="text-teal-600" />
                        <span>2. Dept Seat Allocation Template</span>
                      </p>
                      <p className="text-[11px] text-teal-700 leading-tight">
                        Bulk department & business lead mapping template (Seat Number, Department, Business Lead Name).
                      </p>
                    </div>
                    <button
                      onClick={() => downloadDepartmentSeatTemplate(onAddAuditLog, floors, buildings)}
                      className="w-full bg-white hover:bg-teal-100 text-teal-700 border border-teal-300 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download Allocation Template</span>
                    </button>
                  </div>
                </div>

                {/* Upload File Input */}
                <div className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-6 text-center transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleParseLayoutExcel}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-emerald-600 shadow-2xs group-hover:scale-105 transition-transform">
                      <Upload size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {excelLayoutFileName ? `Selected: ${excelLayoutFileName}` : "Click or drag Excel / CSV layout sheet here to upload seats & zones"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Supports .XLSX, .XLS, or .CSV formatted spatial files
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parse Errors Warning */}
                {excelLayoutParseErrors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1 text-amber-800">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <AlertTriangle size={14} />
                      <span>Parse Warnings ({excelLayoutParseErrors.length} rows skipped)</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-amber-700 max-h-24 overflow-y-auto space-y-0.5 font-mono">
                      {excelLayoutParseErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parsed Preview Table */}
                {parsedExcelSeats.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileSpreadsheet size={14} className="text-emerald-600" />
                        <span>Parsed Seats & Zones Preview ({parsedExcelSeats.length} Seats, {parsedExcelZones.length} New Zones)</span>
                      </h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Target Floor: {currentFloor?.name}
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto text-xs">
                      <table className="w-full text-left border-collapse font-sans">
                        <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase sticky top-0">
                          <tr>
                            <th className="p-2 border-b">Seat #</th>
                            <th className="p-2 border-b">Zone Name</th>
                            <th className="p-2 border-b">Seat Type</th>
                            <th className="p-2 border-b">Status</th>
                            <th className="p-2 border-b">Coords (X, Y)</th>
                            <th className="p-2 border-b">Assigned Person</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {parsedExcelSeats.map((st, i) => {
                            const parentZone = zones.find(z => z.id === st.zoneId) || parsedExcelZones.find(z => z.id === st.zoneId);
                            return (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 font-bold font-mono text-slate-900">{st.seatNumber}</td>
                                <td className="p-2 text-slate-600">{parentZone?.name || "Zone A"}</td>
                                <td className="p-2">{st.type}</td>
                                <td className="p-2">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    st.status === "Vacant" ? "bg-emerald-100 text-emerald-800" :
                                    st.status === "Occupied" ? "bg-blue-100 text-blue-800" :
                                    "bg-amber-100 text-amber-800"
                                  }`}>
                                    {st.status}
                                  </span>
                                </td>
                                <td className="p-2 font-mono text-[10px] text-slate-500">({st.x}, {st.y})</td>
                                <td className="p-2 text-slate-600">{st.employeeName || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowExcelLayoutUploadModal(false);
                      setParsedExcelSeats([]);
                      setParsedExcelZones([]);
                    }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleCommitLayoutExcel}
                    disabled={parsedExcelSeats.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Import Layout to CAD Grid ({parsedExcelSeats.length} Seats)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT & ENLARGE FACILITY / LAYOUT OBJECT MODAL */}
      {editingObjectModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Maximize size={20} className="text-purple-600" />
                <h3 className="text-base font-bold font-display">Enlarge & Customize Facility Properties</h3>
              </div>
              <button 
                onClick={() => setEditingObjectModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Name & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Facility Name / Label</label>
                  <input 
                    type="text"
                    value={editingObjectModal.name}
                    onChange={(e) => setEditingObjectModal({ ...editingObjectModal, name: e.target.value })}
                    placeholder="e.g. Cafeteria / Pantry, Main Conference"
                    className="w-full border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Facility Type</label>
                  <select 
                    value={editingObjectModal.type}
                    onChange={(e) => setEditingObjectModal({ ...editingObjectModal, type: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Pantry">Pantry / Cafeteria</option>
                    <option value="Conference Rooms">Conference Rooms</option>
                    <option value="Emergency Exit">Emergency Exit</option>
                    <option value="Cabin">Executive Suite / Cabin</option>
                    <option value="Reception">Reception Desk</option>
                    <option value="Rest Rooms">Rest Rooms</option>
                    <option value="Breakout Zone">Breakout Lounge</option>
                    <option value="Storage">Storage / Server Room</option>
                    <option value="Dummy Cluster Pillar">Dummy Cluster Pillar (0 Seats)</option>
                    <option value="Structural Pillar">Structural Pillar (No Count)</option>
                  </select>
                </div>
              </div>

              {/* Quick Scale Presets */}
              <div className="bg-purple-50/70 border border-purple-200 p-3 rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase text-purple-900 tracking-wider block">Quick Enlarge Scale Multipliers</span>
                <div className="grid grid-cols-5 gap-1.5">
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingObjectModal({ ...editingObjectModal, width: 160, height: 120 });
                    }}
                    className="px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-700 font-bold text-[10px] hover:bg-purple-600 hover:text-white cursor-pointer transition-colors"
                  >
                    100% Reset
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingObjectModal({
                        ...editingObjectModal,
                        width: Math.round(editingObjectModal.width * 1.25),
                        height: Math.round(editingObjectModal.height * 1.25)
                      });
                    }}
                    className="px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-purple-700 font-bold text-[10px] hover:bg-purple-600 hover:text-white cursor-pointer transition-colors"
                  >
                    +25% Enlarge
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingObjectModal({
                        ...editingObjectModal,
                        width: Math.round(editingObjectModal.width * 1.5),
                        height: Math.round(editingObjectModal.height * 1.5)
                      });
                    }}
                    className="px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-purple-700 font-bold text-[10px] hover:bg-purple-600 hover:text-white cursor-pointer transition-colors"
                  >
                    +50% Enlarge
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingObjectModal({
                        ...editingObjectModal,
                        width: Math.round(editingObjectModal.width * 2),
                        height: Math.round(editingObjectModal.height * 2)
                      });
                    }}
                    className="px-2 py-1.5 bg-purple-600 text-white border border-purple-600 rounded-lg font-bold text-[10px] hover:bg-purple-700 cursor-pointer transition-colors"
                  >
                    2x Double
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingObjectModal({
                        ...editingObjectModal,
                        width: Math.round(editingObjectModal.width * 3),
                        height: Math.round(editingObjectModal.height * 3)
                      });
                    }}
                    className="px-2 py-1.5 bg-indigo-600 text-white border border-indigo-600 rounded-lg font-bold text-[10px] hover:bg-indigo-700 cursor-pointer transition-colors"
                  >
                    3x Mega
                  </button>
                </div>
              </div>

              {/* Preset Dimension Shortcuts */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Preset Dimension Shortcuts</label>
                <div className="grid grid-cols-4 gap-2">
                  <button 
                    type="button"
                    onClick={() => setEditingObjectModal({ ...editingObjectModal, width: 100, height: 70 })}
                    className="p-1.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 font-medium text-[10px] hover:bg-slate-100 cursor-pointer"
                  >
                    Compact (100×70)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingObjectModal({ ...editingObjectModal, width: 180, height: 120 })}
                    className="p-1.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 font-medium text-[10px] hover:bg-slate-100 cursor-pointer"
                  >
                    Standard (180×120)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingObjectModal({ ...editingObjectModal, width: 280, height: 180 })}
                    className="p-1.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 font-medium text-[10px] hover:bg-slate-100 cursor-pointer"
                  >
                    Large (280×180)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingObjectModal({ ...editingObjectModal, width: 400, height: 260 })}
                    className="p-1.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 font-medium text-[10px] hover:bg-slate-100 cursor-pointer"
                  >
                    Grand (400×260)
                  </button>
                </div>
              </div>

              {/* Exact Dimensions & Sliders */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">Custom CAD Dimensions & Position</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-bold uppercase">Width</span>
                      <span className="font-mono font-bold text-purple-700">{editingObjectModal.width} px</span>
                    </div>
                    <input 
                      type="range"
                      min={40}
                      max={1000}
                      step={10}
                      value={editingObjectModal.width}
                      onChange={(e) => setEditingObjectModal({ ...editingObjectModal, width: parseInt(e.target.value) || 40 })}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-bold uppercase">Height</span>
                      <span className="font-mono font-bold text-purple-700">{editingObjectModal.height} px</span>
                    </div>
                    <input 
                      type="range"
                      min={20}
                      max={800}
                      step={10}
                      value={editingObjectModal.height}
                      onChange={(e) => setEditingObjectModal({ ...editingObjectModal, height: parseInt(e.target.value) || 20 })}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Width (px)</label>
                    <input 
                      type="number"
                      value={editingObjectModal.width}
                      onChange={(e) => setEditingObjectModal({ ...editingObjectModal, width: Math.max(20, parseInt(e.target.value) || 20) })}
                      className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Height (px)</label>
                    <input 
                      type="number"
                      value={editingObjectModal.height}
                      onChange={(e) => setEditingObjectModal({ ...editingObjectModal, height: Math.max(20, parseInt(e.target.value) || 20) })}
                      className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">X Pos</label>
                    <input 
                      type="number"
                      value={editingObjectModal.x}
                      onChange={(e) => setEditingObjectModal({ ...editingObjectModal, x: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Y Pos</label>
                    <input 
                      type="number"
                      value={editingObjectModal.y}
                      onChange={(e) => setEditingObjectModal({ ...editingObjectModal, y: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Color Accent Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Facility Color Theme</label>
                <div className="flex items-center gap-2">
                  {[
                    { label: "Pantry Yellow", hex: "#fef08a" },
                    { label: "Conference Blue", hex: "#bae6fd" },
                    { label: "Exit Red", hex: "#fca5a5" },
                    { label: "Executive Slate", hex: "#cbd5e1" },
                    { label: "Reception Amber", hex: "#fed7aa" },
                    { label: "Lounge Emerald", hex: "#a7f3d0" },
                    { label: "Restroom Violet", hex: "#ddd6fe" },
                    { label: "Cluster Pillar Slate", hex: "#64748b" },
                  ].map(c => (
                    <button 
                      key={c.hex}
                      type="button"
                      onClick={() => setEditingObjectModal({ ...editingObjectModal, color: c.hex })}
                      className={`w-7 h-7 rounded-lg border cursor-pointer transition-transform ${editingObjectModal.color === c.hex ? "ring-2 ring-purple-600 scale-110 border-purple-600" : "border-slate-200 hover:scale-105"}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input 
                    type="color"
                    value={editingObjectModal.color}
                    onChange={(e) => setEditingObjectModal({ ...editingObjectModal, color: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 ml-auto"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setEditingObjectModal(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  saveSnapshot();
                  const updated = layoutObjects.map(o => o.id === editingObjectModal.id ? editingObjectModal : o);
                  setLayoutObjects(updated);
                  if (onUpdateLayoutObjects) onUpdateLayoutObjects(updated);
                  setEditingObjectModal(null);
                  if (onAddAuditLog) onAddAuditLog("Edit Facility Properties", "Layout Object", `Updated facility "${editingObjectModal.name}" (${editingObjectModal.width}x${editingObjectModal.height}px)`);
                }}
                className="px-5 py-2 bg-purple-600 text-white text-xs rounded-xl font-bold hover:bg-purple-700 shadow-md shadow-purple-200 cursor-pointer"
              >
                Save Facility Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CAD ZONE PROPERTIES MODAL */}
      {editingZoneModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Layers size={20} className="text-blue-600" />
                <h3 className="text-base font-bold font-display">Edit CAD Zone Properties</h3>
              </div>
              <button 
                onClick={() => setEditingZoneModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Zone Name & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Zone Name</label>
                  <input 
                    type="text"
                    value={editingZoneModal.name}
                    onChange={(e) => setEditingZoneModal({ ...editingZoneModal, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Department</label>
                  <input 
                    type="text"
                    value={editingZoneModal.department}
                    onChange={(e) => setEditingZoneModal({ ...editingZoneModal, department: e.target.value })}
                    placeholder="e.g. Engineering, Sales"
                    className="w-full border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Capacity & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Capacity Limit</label>
                  <input 
                    type="number"
                    value={editingZoneModal.capacity}
                    onChange={(e) => setEditingZoneModal({ ...editingZoneModal, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Zone Color Accent</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color"
                      value={editingZoneModal.color}
                      onChange={(e) => setEditingZoneModal({ ...editingZoneModal, color: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-xs text-slate-600 uppercase font-semibold">{editingZoneModal.color}</span>
                  </div>
                </div>
              </div>

              {/* CAD Coordinates & Dimensions */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">CAD Canvas Position & Size</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">X Pos</label>
                    <input 
                      type="number"
                      value={editingZoneModal.x}
                      onChange={(e) => setEditingZoneModal({ ...editingZoneModal, x: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Y Pos</label>
                    <input 
                      type="number"
                      value={editingZoneModal.y}
                      onChange={(e) => setEditingZoneModal({ ...editingZoneModal, y: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Width</label>
                    <input 
                      type="number"
                      value={editingZoneModal.width}
                      onChange={(e) => setEditingZoneModal({ ...editingZoneModal, width: Math.max(80, parseInt(e.target.value) || 80) })}
                      className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Height</label>
                    <input 
                      type="number"
                      value={editingZoneModal.height}
                      onChange={(e) => setEditingZoneModal({ ...editingZoneModal, height: Math.max(60, parseInt(e.target.value) || 60) })}
                      className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Assigned Seats summary */}
              {(() => {
                const zoneSeats = seats.filter(s => s.zoneId === editingZoneModal.id);
                const occupiedCount = zoneSeats.filter(s => s.status === "Occupied").length;
                return (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-bold text-blue-900">
                      <span>Associated Seating Stats</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">{zoneSeats.length} seats</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Occupied: <strong>{occupiedCount}</strong> • Vacant: <strong>{zoneSeats.length - occupiedCount}</strong>
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button 
                onClick={() => {
                  fitZoneToEnclosedSeats(editingZoneModal);
                  const updatedModal = zones.find(z => z.id === editingZoneModal.id);
                  if (updatedModal) setEditingZoneModal(updatedModal);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Maximize size={13} />
                <span>Auto-Fit to Seats</span>
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingZoneModal(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    saveSnapshot();
                    const updated = zones.map(z => z.id === editingZoneModal.id ? editingZoneModal : z);
                    onUpdateZones(updated);
                    setEditingZoneModal(null);
                    if (onAddAuditLog) onAddAuditLog("Edit Zone Properties", "Zone/Seat", `Updated zone "${editingZoneModal.name}"`);
                  }}
                  className="px-5 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
                >
                  Save Zone Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP ITEM / GROUP DELETION CONFIRMATION MODAL */}
      {deleteConfirmData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle size={20} />
                <h3 className="text-base font-bold text-slate-800 font-display">{deleteConfirmData.title}</h3>
              </div>
              <button 
                onClick={() => setDeleteConfirmData(null)} 
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-900 text-xs font-medium leading-relaxed">
              {deleteConfirmData.message}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setDeleteConfirmData(null)} 
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteConfirmData.action();
                  setDeleteConfirmData(null);
                }} 
                className="px-5 py-2 bg-rose-600 text-white text-xs rounded-xl font-bold hover:bg-rose-700 shadow-md shadow-rose-200 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* RENAME FLOOR MODAL */}
      {showRenameFloorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="text-blue-600" size={18} />
                <h3 className="text-base font-bold text-slate-800 font-display">Rename Floor Level</h3>
              </div>
              <button onClick={() => setShowRenameFloorModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Update the official display name for floor level <strong>{currentFloor?.name}</strong>.
              </p>
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">New Floor Name</label>
                <input 
                  type="text"
                  value={renameFloorNameInput}
                  onChange={(e) => setRenameFloorNameInput(e.target.value)}
                  placeholder="e.g. 11 th Floor CRE, 12th Floor Executive Suite"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowRenameFloorModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!renameFloorNameInput.trim() || !selectedFloorId) return;
                  saveSnapshot();
                  const updatedName = renameFloorNameInput.trim();
                  const updatedFloors = floors.map(f => f.id === selectedFloorId ? { ...f, name: updatedName, lastModified: new Date().toISOString().split('T')[0] } : f);
                  if (onUpdateFloors) {
                    onUpdateFloors(updatedFloors);
                  }
                  setShowRenameFloorModal(false);
                  if (onAddAuditLog) {
                    onAddAuditLog("Rename Floor Level", "Floor Management", `Renamed floor ID ${selectedFloorId} to "${updatedName}"`);
                  }
                }}
                className="px-5 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
              >
                Save Floor Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DEPARTMENT & MANAGER ALLOCATION MODAL */}
      {showBulkDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-indigo-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="text-indigo-600" size={18} />
                <h3 className="text-base font-bold text-slate-800 font-display">Allocate Dept & Manager Block</h3>
              </div>
              <button onClick={() => setShowBulkDeptModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900">
                <span className="font-bold block text-[11px]">Direct Seat Slot Allocation</span>
                <p className="text-[10px] text-indigo-700 mt-0.5">
                  Assigning fixed department slots to <strong>{selectedSeatIds.length} selected seats</strong> on {currentFloor?.name}.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Department Name</label>
                <input 
                  type="text"
                  value={bulkDeptInput}
                  onChange={(e) => setBulkDeptInput(e.target.value)}
                  placeholder="e.g. Engineering, Operations, Human Resources"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">Manager Name</label>
                <input 
                  type="text"
                  value={bulkManagerInput}
                  onChange={(e) => setBulkManagerInput(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Engineering Manager)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-1">
                <label className="text-[11px] font-bold text-indigo-900 cursor-pointer flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={bulkIsFixedSlot}
                    onChange={(e) => setBulkIsFixedSlot(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Lock as Fixed Slot for Department</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowBulkDeptModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (selectedSeatIds.length === 0) return;
                  saveSnapshot();
                  const updated = seats.map(s => {
                    if (selectedSeatIds.includes(s.id)) {
                      return {
                        ...s,
                        allocatedDepartment: bulkDeptInput,
                        department: bulkDeptInput,
                        allocatedManager: bulkManagerInput || s.allocatedManager || s.managerName,
                        managerName: bulkManagerInput || s.managerName,
                        isFixedSlot: bulkIsFixedSlot,
                        status: bulkIsFixedSlot ? ("Reserved" as const) : s.status
                      };
                    }
                    return s;
                  });
                  onUpdateSeats(updated);
                  setShowBulkDeptModal(false);
                  if (onAddAuditLog) {
                    onAddAuditLog("Bulk Allocate Seats to Dept/Manager", "Seat Allocation", `Allocated ${selectedSeatIds.length} seats to ${bulkDeptInput} under ${bulkManagerInput || "Unassigned Manager"} (Fixed Slot: ${bulkIsFixedSlot})`);
                  }
                }}
                className="px-5 py-2 bg-indigo-600 text-white text-xs rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 cursor-pointer"
              >
                Apply Direct Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPLACE OR CREATE NEW FLOOR MODAL */}
      <ReplaceOrCreateFloorModal
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        fileName={pendingUploadData?.fileName || "Floor_Layout.json"}
        extractedStats={{
          zonesCount: pendingUploadData?.zones.length || 0,
          seatsCount: pendingUploadData?.seats.length || 0,
          facilitiesCount: pendingUploadData?.objects?.length || 0
        }}
        buildings={buildings}
        floors={floors}
        sites={sites}
        activeSiteId={activeSiteId}
        activeBuildingId={selectedBuildingId}
        activeFloorId={selectedFloorId}
        onConfirm={(choice) => {
          if (!pendingUploadData) return;
          if (onCommitExtractedFloor) {
            onCommitExtractedFloor({
              ...choice,
              extractedZones: pendingUploadData.zones,
              extractedSeats: pendingUploadData.seats,
              layoutObjects: pendingUploadData.objects,
              fileName: pendingUploadData.fileName
            });
          } else {
            saveSnapshot();
            const targetFloorId = choice.targetFloorId || selectedFloorId;
            onUpdateZones([...zones.filter(z => z.floorId !== targetFloorId), ...pendingUploadData.zones.map(z => ({ ...z, floorId: targetFloorId }))]);
            onUpdateSeats([...seats.filter(s => s.floorId !== targetFloorId), ...pendingUploadData.seats.map(s => ({ ...s, floorId: targetFloorId }))]);
            if (pendingUploadData.objects) {
              const nextObjects = [...layoutObjects.filter(o => o.floorId !== targetFloorId), ...pendingUploadData.objects!.map(o => ({ ...o, floorId: targetFloorId }))];
              setLayoutObjects(nextObjects);
              if (onUpdateLayoutObjects) onUpdateLayoutObjects(nextObjects);
            }
          }
          setIsReplaceModalOpen(false);
          setPendingUploadData(null);
        }}
      />
      {/* ALL MANAGERS & FLOOR ALLOCATIONS DIRECTORY MODAL */}
      {showManagerListModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex justify-between items-start shrink-0 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded border border-amber-400/30">
                    Floor Map Directory
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {managerList.length} Active Managers
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display mt-1 text-white flex items-center gap-2">
                  <Users size={20} className="text-amber-400" />
                  <span>All Managers & Floor Distributions</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Complete list of managers, allocated seat capacity, and floor breakdown across all buildings.
                </p>
              </div>
              <button
                onClick={() => setShowManagerListModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Controls Bar: Search & Stats */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type="text"
                  placeholder="Search manager name or department..."
                  value={managerSearchQuery}
                  onChange={(e) => setManagerSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {managerSearchQuery && (
                  <button
                    onClick={() => setManagerSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold">
                  {managerList.length} Total Managers
                </span>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-200 rounded-lg font-bold">
                  {managerSummaryData.reduce((acc, m) => acc + m.totalSeats, 0)} Total Allocated Desks
                </span>
              </div>
            </div>

            {/* Manager Directory List Grid */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {managerSummaryData.filter(m => 
                !managerSearchQuery || 
                m.managerName.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
                m.departments.toLowerCase().includes(managerSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Users size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No managers found matching "{managerSearchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {managerSummaryData
                    .filter(m => 
                      !managerSearchQuery || 
                      m.managerName.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
                      m.departments.toLowerCase().includes(managerSearchQuery.toLowerCase())
                    )
                    .map((m) => {
                      const isSelected = selectedManagerFilter.toLowerCase() === m.managerName.toLowerCase();
                      return (
                        <div
                          key={m.managerName}
                          className={`p-4 rounded-xl border transition-all space-y-3 ${
                            isSelected 
                              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-300 shadow-md"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {m.managerName.charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <h4 className="font-bold text-slate-900 text-sm">{m.managerName}</h4>
                                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]" title={m.departments}>
                                    Dept: {m.departments}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="text-right font-mono shrink-0">
                              <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                {m.totalSeats} Desks
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                Across <b className="text-amber-700">{m.distinctFloorsCount} Floor(s)</b>
                              </div>
                            </div>
                          </div>

                          {/* Floor-wise Distribution Badges */}
                          <div className="space-y-1.5 pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Floor Breakdown ({m.floorList.length} floor locations):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {m.floorList.map((fl) => {
                                const isCurrent = fl.floorId === selectedFloorId;
                                return (
                                  <button
                                    key={fl.floorId}
                                    onClick={() => {
                                      if (fl.floorId !== selectedFloorId) {
                                        setSelectedFloorId(fl.floorId);
                                      }
                                      setSelectedManagerFilter(m.managerName);
                                      setShowManagerListModal(false);
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                                      isCurrent
                                        ? "bg-amber-500 text-white border-amber-600 font-bold shadow-xs"
                                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                    }`}
                                    title={`Click to view ${fl.floorName} and highlight ${m.managerName}'s team`}
                                  >
                                    <Building2 size={10} />
                                    <span>{fl.floorName}:</span>
                                    <strong className="font-mono">{fl.seatCount} seats</strong>
                                    {isCurrent && <span className="text-[9px] bg-white/30 px-1 rounded ml-0.5">Active</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Action Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[11px] text-slate-500 font-mono">
                              Seats on active map: <b className="text-amber-700">{m.currentFloorSeats}</b>
                            </span>
                            <button
                              onClick={() => {
                                setSelectedManagerFilter(m.managerName);
                                setShowManagerListModal(false);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? "bg-amber-600 text-white hover:bg-amber-700"
                                  : "bg-slate-800 text-white hover:bg-slate-900"
                              }`}
                            >
                              <Users size={12} />
                              <span>{isSelected ? "Filter Active" : "Highlight on Map"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500 font-mono">
                Click any manager floor badge to navigate directly to that floor map.
              </span>
              <button
                onClick={() => setShowManagerListModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
