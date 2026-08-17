import React, { useState, useEffect, useMemo } from "react";
import { Seat, Zone, SeatRequest, ITAsset, Building, Floor, EmployeeProfile, UserRole, LocationSite, CheckInLog } from "../types";
import { downloadMobileAPK, downloadMobileIPA } from "../utils/emailAndDownloadService";
import AppDownloadModal from "./AppDownloadModal";
import { 
  Users, 
  Layers, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity, 
  HelpCircle,
  TrendingUp, 
  Map as MapIcon, 
  Grid,
  AlertTriangle,
  HardDrive,
  Settings,
  Smartphone,
  QrCode,
  Download,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Palette,
  RotateCcw,
  Save,
  Check,
  Building2,
  Sparkles,
  Globe
} from "lucide-react";

interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  size: "full" | "half";
  order: number;
}

interface DashboardThemeConfig {
  campusName: string;
  buildingName: string;
  floorName: string;
  companyLogoUrl: string;
  bannerTitle: string;
  bannerSubtitle: string;
  themeColor: "blue" | "emerald" | "slate" | "purple";
  welcomeMessage: string;
}

interface DashboardViewProps {
  seats: Seat[];
  zones: Zone[];
  requests: SeatRequest[];
  buildings?: Building[];
  floors?: Floor[];
  sites?: LocationSite[];
  activeSiteId?: string;
  onSelectSite?: (siteId: string) => void;
  employees?: EmployeeProfile[];
  checkInLogs?: CheckInLog[];
  onNavigateToRequests: () => void;
  onNavigateToFloorMap: () => void;
  activeRole?: string;
  onAddAuditLog?: (action: string, category: any, details: string) => void;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "banner", title: "Welcome Executive Banner", visible: true, size: "full", order: 0 },
  { id: "kpi", title: "KPI Metrics Overview", visible: true, size: "full", order: 1 },
  { id: "heatmap", title: "Spatial Heatmap & Load Ratio", visible: true, size: "half", order: 2 },
  { id: "department_budgets", title: "Department Seat Budgets", visible: true, size: "half", order: 3 },
  { id: "mobile_download", title: "Mobile Companion App Links & QR", visible: true, size: "full", order: 4 },
  { id: "pending_requests", title: "Pending Workspace Requests", visible: true, size: "half", order: 5 },
  { id: "iot_stream", title: "IoT Live Check-In Stream", visible: true, size: "half", order: 6 }
];

const DEFAULT_THEME: DashboardThemeConfig = {
  campusName: "Hyderabad Mindspace Campus",
  buildingName: "Newmark _Hyderabad",
  floorName: "11 th Floor CRE",
  companyLogoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80",
  bannerTitle: "Corporate Seating & IT Command Center",
  bannerSubtitle: "Real-time spatial metrics across registered campus, floors, and employees.",
  themeColor: "blue",
  welcomeMessage: "Welcome back, Executive Administrator. All spatial systems operating normally."
};

export default function DashboardView({ 
  seats, 
  zones, 
  requests, 
  buildings = [],
  floors = [],
  sites = [],
  activeSiteId,
  onSelectSite,
  employees = [],
  checkInLogs = [],
  onNavigateToRequests, 
  onNavigateToFloorMap,
  activeRole = UserRole.USER,
  onAddAuditLog
}: DashboardViewProps) {
  // Customization State persisted in localStorage
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem("enterpriz_dashboard_widgets");
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  const [themeConfig, setThemeConfig] = useState<DashboardThemeConfig>(() => {
    const saved = localStorage.getItem("enterpriz_dashboard_theme");
    return saved ? JSON.parse(saved) : DEFAULT_THEME;
  });

  const [showCustomizerModal, setShowCustomizerModal] = useState<boolean>(false);
  const [showMobileAppModal, setShowMobileAppModal] = useState<boolean>(false);
  const [tempThemeConfig, setTempThemeConfig] = useState<DashboardThemeConfig>(themeConfig);
  const [tempWidgets, setTempWidgets] = useState<WidgetConfig[]>(widgets);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  // Heatmap & Occupancy Controls State
  const [selectedHeatmapFloorId, setSelectedHeatmapFloorId] = useState<string>("all");
  const [occupancyReportViewMode, setOccupancyReportViewMode] = useState<"department" | "floor">("department");
  const [selectedOccupancyFloorId, setSelectedOccupancyFloorId] = useState<string>("all");
  const [occupancySearchQuery, setOccupancySearchQuery] = useState<string>("");
  const [selectedDashboardZoneModal, setSelectedDashboardZoneModal] = useState<any | null>(null);

  // Identify active campus/site context
  const activeSite = sites.find(s => s.id === activeSiteId) || sites[0] || {
    id: "site-hyd",
    name: "Hyderabad Mindspace Campus",
    code: "HYD"
  };

  // Helper to filter valid seats
  const isObsoleteSeat = (s: Seat): boolean => {
    if (!s || !s.seatNumber) return true;
    return false;
  };

  const cleanAllSeats = seats.filter(s => !isObsoleteSeat(s));

  // Filter buildings, floors, zones, and seats by active site
  const siteBuildings = buildings.filter(b => b.siteId === activeSite.id || (!b.siteId && activeSite.id === "site-hyd"));
  const siteBuildingIds = new Set(siteBuildings.map(b => b.id));

  const siteFloors = floors.filter(f => siteBuildingIds.size === 0 || siteBuildingIds.has(f.buildingId));
  const siteFloorIds = new Set(siteFloors.map(f => f.id));

  const siteSeats = siteFloorIds.size > 0 ? cleanAllSeats.filter(s => siteFloorIds.has(s.floorId)) : cleanAllSeats;
  const siteZones = siteFloorIds.size > 0 ? zones.filter(z => siteFloorIds.has(z.floorId)) : zones;

  const regCampusCount = sites.length > 0 ? sites.length : 1;
  const regFloorsCount = siteFloors.length;
  const regEmpCount = employees.length;

  const dynamicBannerSubtitle = `Real-time spatial metrics for ${activeSite.name} across ${siteBuildings.length || 1} building(s), ${regFloorsCount} floor(s), and ${siteSeats.length} allocated desk seats.`;

  // Real campus metrics
  const totalSeatsCount = siteSeats.length;
  const occupiedCount = siteSeats.filter(s => s.status === "Occupied").length;
  const vacantCount = siteSeats.filter(s => s.status === "Vacant").length;
  const reservedCount = siteSeats.filter(s => s.status === "Reserved").length;
  const hotDeskCount = siteSeats.filter(s => s.type === "Hot Desk").length;
  
  const occupancyRate = totalSeatsCount > 0 ? ((occupiedCount / totalSeatsCount) * 100).toFixed(1) : "0.0";
  const pendingRequestsCount = requests.filter(r => r.status === "Pending" || r.status === "Escalated").length;

  // Filter & Merge Heatmap zones by selected floor and zone name
  const mergedHeatmapZones = useMemo(() => {
    const rawList = (selectedHeatmapFloorId === "all"
      ? siteZones
      : siteZones.filter(z => z.floorId === selectedHeatmapFloorId)
    ).filter(z => z && z.name && z.name.trim() !== "");

    const map = new Map<string, {
      zoneName: string;
      zoneIds: string[];
      department: string;
      floorNamesSet: Set<string>;
      floorIdsSet: Set<string>;
      seats: Seat[];
    }>();

    rawList.forEach(z => {
      let cleanZoneName = z.name
        .replace(/\s*\(Copy\)/gi, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const key = cleanZoneName.toLowerCase();

      const zoneSeats = siteSeats.filter(s => {
        if (!s) return false;
        if (selectedHeatmapFloorId !== "all" && s.floorId !== selectedHeatmapFloorId) return false;
        if (z.floorId && s.floorId && s.floorId !== z.floorId) return false;

        if (s.zoneId === z.id) return true;

        const isFacilityZone = (z.department && z.department.toLowerCase().includes("amenities")) ||
          (z.type && z.type.toLowerCase().includes("pantry")) ||
          z.name.toLowerCase().includes("cafeteria") ||
          z.name.toLowerCase().includes("pantry") ||
          z.name.toLowerCase().includes("reception") ||
          z.name.toLowerCase().includes("restroom");

        if ((!s.zoneId || s.zoneId === "") && !isFacilityZone) {
          if (s.floorId === z.floorId && typeof s.x === "number" && typeof s.y === "number") {
            return s.x >= z.x && s.x <= z.x + z.width && s.y >= z.y && s.y <= z.y + z.height;
          }
        }
        return false;
      });

      const fl = siteFloors.find(f => f.id === z.floorId);
      const fName = fl?.name || "Main Floor";

      if (!map.has(key)) {
        map.set(key, {
          zoneName: cleanZoneName,
          zoneIds: [],
          department: z.department || "General Workspace",
          floorNamesSet: new Set(),
          floorIdsSet: new Set(),
          seats: []
        });
      }

      const entry = map.get(key)!;
      if (!entry.zoneIds.includes(z.id)) entry.zoneIds.push(z.id);
      if (z.floorId) entry.floorIdsSet.add(z.floorId);
      entry.floorNamesSet.add(fName);

      zoneSeats.forEach(s => {
        if (!entry.seats.some(existing => existing.id === s.id)) {
          entry.seats.push(s);
        }
      });
    });

    return Array.from(map.values()).map(entry => {
      const total = entry.seats.length;
      const occupied = entry.seats.filter(s => s.status === "Occupied" || s.employeeName || s.employeeEmail).length;
      const vacant = total - occupied;
      const ratio = total > 0 ? occupied / total : 0;

      // Floor Breakdown
      const floorBreakdownMap = new Map<string, { floorName: string; buildingName: string; total: number; occupied: number; vacant: number }>();
      entry.seats.forEach(s => {
        const fId = s.floorId || "unknown";
        const fl = siteFloors.find(f => f.id === fId);
        const bId = fl?.buildingId;
        const b = siteBuildings.find(bItem => bItem.id === bId);
        const fName = fl?.name || "Main Floor";
        const bName = b?.name || "Main Building";

        if (!floorBreakdownMap.has(fId)) {
          floorBreakdownMap.set(fId, { floorName: fName, buildingName: bName, total: 0, occupied: 0, vacant: 0 });
        }
        const fb = floorBreakdownMap.get(fId)!;
        fb.total += 1;
        if (s.status === "Occupied" || s.employeeName || s.employeeEmail) {
          fb.occupied += 1;
        } else {
          fb.vacant += 1;
        }
      });

      const floorBreakdown = Array.from(floorBreakdownMap.values()).map(fb => ({
        ...fb,
        rate: fb.total > 0 ? Math.round((fb.occupied / fb.total) * 100) : 0
      }));

      return {
        id: entry.zoneIds[0] || entry.zoneName,
        zoneName: entry.zoneName,
        department: entry.department,
        floorNames: Array.from(entry.floorNamesSet).join(", "),
        floorCount: entry.floorIdsSet.size || 1,
        total,
        occupied,
        vacant,
        ratio,
        rate: Math.round(ratio * 100),
        seats: entry.seats,
        floorBreakdown
      };
    });
  }, [siteZones, siteSeats, siteFloors, siteBuildings, selectedHeatmapFloorId]);

  // Department-wise & Floor-wise Analytics calculations
  const filteredOccupancySeats = selectedOccupancyFloorId === "all"
    ? siteSeats
    : siteSeats.filter(s => s.floorId === selectedOccupancyFloorId);

  const seatDepts = filteredOccupancySeats.map(s => s.department || s.allocatedDepartment).filter(Boolean);
  const zoneDepts = siteZones
    .filter(z => selectedOccupancyFloorId === "all" || z.floorId === selectedOccupancyFloorId)
    .map(z => z.department).filter(Boolean);

  const rawDepartments = Array.from(new Set([...seatDepts, ...zoneDepts]))
    .filter(d => d && typeof d === "string" && d.toLowerCase() !== "vacant" && d.toLowerCase() !== "n/a");

  // Sort same base departments together alphabetically (e.g. India - Graphics & Marketing before India - Graphics & Marketing- Future Expansion)
  rawDepartments.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));

  const deptOccupancyData = rawDepartments.map(dept => {
    const deptSeats = filteredOccupancySeats.filter(s => {
      const z = siteZones.find(zone => zone.id === s.zoneId);
      const sDept = s.department || s.allocatedDepartment || z?.department;
      return sDept && typeof sDept === "string" && sDept.toLowerCase() === dept.toLowerCase();
    });

    const isFutureExpansion = dept.toLowerCase().includes("expansion") || dept.toLowerCase().includes("future");

    // Count occupied seats accurately based on occupant info / employee status
    const occupiedSeats = deptSeats.filter(s => {
      if (s.employeeName || s.employeeEmail || s.employeeId) return true;
      if (s.status === "Occupied" && !isFutureExpansion) return true;
      return employees.some(e => 
        e.department && 
        e.department.toLowerCase() === dept.toLowerCase() && 
        (e.seatNumber === s.seatNumber)
      );
    });

    const occ = occupiedSeats.length;
    const tot = deptSeats.length;
    const rate = tot > 0 ? ((occ / tot) * 100).toFixed(1) : "0.0";

    const floorCounts = siteFloors.map(fl => {
      const flSeats = deptSeats.filter(s => s.floorId === fl.id);
      return { floorName: fl.name, count: flSeats.length };
    }).filter(fc => fc.count > 0);

    return {
      name: dept,
      occupied: occ,
      vacant: Math.max(0, tot - occ),
      total: tot,
      rate,
      floors: floorCounts
    };
  }).filter(d => {
    if (d.total === 0) return false;
    if (occupancySearchQuery.trim() === "") return true;
    return d.name.toLowerCase().includes(occupancySearchQuery.toLowerCase());
  });

  const floorOccupancyData = siteFloors.map(fl => {
    const flSeats = cleanAllSeats.filter(s => s.floorId === fl.id);
    const flBldg = siteBuildings.find(b => b.id === fl.buildingId);
    const occ = flSeats.filter(s => s.status === "Occupied" || s.employeeName || s.employeeEmail).length;
    const reserved = flSeats.filter(s => s.status === "Reserved").length;
    const tot = flSeats.length;
    const vacant = Math.max(0, tot - occ);
    const rate = tot > 0 ? ((occ / tot) * 100).toFixed(1) : "0.0";

    const deptsOnFloorMap = new Map<string, number>();
    flSeats.forEach(s => {
      const d = s.department || s.allocatedDepartment || "General";
      if (d && d.toLowerCase() !== "vacant" && d.toLowerCase() !== "n/a") {
        deptsOnFloorMap.set(d, (deptsOnFloorMap.get(d) || 0) + 1);
      }
    });

    const topDepts = Array.from(deptsOnFloorMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      id: fl.id,
      name: fl.name,
      buildingName: flBldg?.name || "Main Building",
      total: tot,
      occupied: occ,
      vacant,
      reserved,
      rate,
      topDepts
    };
  }).filter(f => {
    if (selectedOccupancyFloorId !== "all" && f.id !== selectedOccupancyFloorId) return false;
    if (occupancySearchQuery.trim() === "") return true;
    return f.name.toLowerCase().includes(occupancySearchQuery.toLowerCase()) || 
           f.buildingName.toLowerCase().includes(occupancySearchQuery.toLowerCase());
  });

  // Save Dashboard Layout Customization
  const handleSaveDashboardCustomization = () => {
    setThemeConfig(tempThemeConfig);
    setWidgets(tempWidgets);
    localStorage.setItem("enterpriz_dashboard_theme", JSON.stringify(tempThemeConfig));
    localStorage.setItem("enterpriz_dashboard_widgets", JSON.stringify(tempWidgets));
    setShowCustomizerModal(false);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 4000);

    if (onAddAuditLog) {
      onAddAuditLog("Save Dashboard Layout", "Dashboard Customization", `Updated theme to ${tempThemeConfig.themeColor} and configured widget visibility.`);
    }
  };

  const handleRestoreDefaultLayout = () => {
    setTempThemeConfig(DEFAULT_THEME);
    setTempWidgets(DEFAULT_WIDGETS);
  };

  const toggleWidgetVisibility = (id: string) => {
    setTempWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= tempWidgets.length) return;
    const updated = [...tempWidgets];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setTempWidgets(updated.map((w, idx) => ({ ...w, order: idx })));
  };

  // Theme color maps
  const themeBgMap = {
    blue: "from-blue-900 to-slate-900",
    emerald: "from-emerald-900 to-slate-900",
    slate: "from-slate-800 to-slate-950",
    purple: "from-purple-900 to-slate-900"
  };

  const isWidgetVisible = (id: string) => {
    const w = widgets.find(item => item.id === id);
    return w ? w.visible : true;
  };

  return (
    <div className="space-y-6" id="dashboard-module">
      {/* Save Success Notice */}
      {saveSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="text-emerald-600" size={18} />
            <span>Dashboard Layout & Branding Saved Successfully! Preferences will persist across sessions.</span>
          </div>
          <button onClick={() => setSaveSuccessNotice(false)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* ADMIN / SUPER USER CUSTOMIZATION BUTTON (RESTRICTED TO SUPER USER AND ADMIN) */}
      {(activeRole === UserRole.SUPER_USER || activeRole === UserRole.ADMIN || activeRole === "Super User" || activeRole === "Admin") && (
        <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Settings className="text-blue-600" size={18} />
            <div>
              <span className="text-xs font-bold text-slate-800">Global Executive Dashboard Configurator</span>
              <p className="text-[10px] text-slate-400">Modify corporate campus branding, widget layouts, and theme styling</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setTempThemeConfig(themeConfig);
              setTempWidgets(widgets);
              setShowCustomizerModal(true);
            }}
            className="bg-slate-900 hover:bg-black text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Palette size={14} />
            <span>Customize Dashboard</span>
          </button>
        </div>
      )}

      {/* WIDGET 1: WELCOME BANNER */}
      {isWidgetVisible("banner") && (
        <div className={`bg-gradient-to-r ${themeBgMap[themeConfig.themeColor]} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`} id="welcome-banner">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-6 scale-150">
            <Layers size={240} />
          </div>
          <div className="relative z-10 max-w-3xl flex items-start gap-5">
            {themeConfig.companyLogoUrl && (
              <img 
                src={themeConfig.companyLogoUrl} 
                alt="Company Logo" 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md shrink-0 hidden sm:block" 
              />
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {sites.length > 0 && onSelectSite ? (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-3 py-1 rounded-xl border border-white/20">
                    <Globe size={13} className="text-blue-300 shrink-0" />
                    <span className="text-[10px] font-bold text-white/80 uppercase">Campus Environment:</span>
                    <select
                      value={activeSite.id}
                      onChange={(e) => onSelectSite(e.target.value)}
                      className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
                    >
                      {sites.map(s => (
                        <option key={s.id} value={s.id} className="text-slate-900 font-semibold">
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="bg-white/10 backdrop-blur-xs text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    {activeSite.name}
                  </span>
                )}
                <span className="bg-blue-500/30 text-blue-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold font-mono">
                  {siteBuildings.length} Building(s) • {siteFloors.length} Floor(s)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
                {themeConfig.bannerTitle}
              </h1>
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-sans max-w-2xl">
                {themeConfig.bannerSubtitle.includes("registered campus") || themeConfig.bannerSubtitle.includes("global campuses")
                  ? dynamicBannerSubtitle
                  : themeConfig.bannerSubtitle}
              </p>
              <p className="text-[11px] text-blue-200/80 font-medium italic pt-1">
                "{themeConfig.welcomeMessage}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WIDGET 2: KPI METRICS GRID */}
      {isWidgetVisible("kpi") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" id="kpi-grid">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 font-mono">{regEmpCount.toLocaleString()}</h3>
              <div className="flex items-center gap-1 text-emerald-600 text-xs mt-1.5">
                <TrendingUp size={14} />
                <span>Active Roster</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corporate Desks</span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 font-mono">{totalSeatsCount.toLocaleString()}</h3>
              <div className="flex items-center gap-1 text-slate-500 text-xs mt-1.5">
                <Layers size={14} />
                <span>{siteFloors.length} FLOOR(S) ACTIVE</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
              <Grid size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Occupancy</span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 font-mono">{occupancyRate}%</h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-slate-500 font-mono">{occupiedCount.toLocaleString()} occupied</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vacant / Reserved</span>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 font-mono">{vacantCount.toLocaleString()}</h3>
              <div className="flex items-center gap-1 text-amber-600 text-xs mt-1.5">
                <HelpCircle size={14} />
                <span>{reservedCount.toLocaleString()} reserved</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
      )}

      {/* WIDGET 3 & 4: HEATMAP & DEPARTMENT BUDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isWidgetVisible("heatmap") && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900 font-display">Spatial Heatmap & Load Ratio</h4>
                <p className="text-xs text-slate-400">Occupancy density ratio per zone in active floor maps</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedHeatmapFloorId}
                  onChange={(e) => setSelectedHeatmapFloorId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Active Floors ({siteZones.length} zones)</option>
                  {siteFloors.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({siteZones.filter(z => z.floorId === f.id).length} zones)
                    </option>
                  ))}
                </select>
                <button 
                  onClick={onNavigateToFloorMap}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <MapIcon size={14} />
                  <span>Floor Designer</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 min-h-[240px]">
              {mergedHeatmapZones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                  <Grid size={28} className="text-slate-300" />
                  <p className="text-xs font-medium">No layout zones found for the selected floor filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {mergedHeatmapZones.map((zone) => {
                    const occupied = zone.occupied;
                    const total = zone.total;
                    const ratio = zone.ratio;
                    
                    let heatColor = "bg-white border-slate-200 text-slate-800 hover:border-blue-400 hover:shadow-xs";
                    let badgeBg = "bg-slate-100 text-slate-600";
                    if (total === 0) {
                      heatColor = "bg-slate-50/60 border-slate-200/80 text-slate-400";
                      badgeBg = "bg-slate-100 text-slate-400";
                    } else if (ratio >= 0.75) {
                      heatColor = "bg-rose-50/80 border-rose-200 text-rose-900 shadow-2xs hover:border-rose-400";
                      badgeBg = "bg-rose-100 text-rose-800";
                    } else if (ratio >= 0.4) {
                      heatColor = "bg-amber-50/80 border-amber-200 text-amber-900 shadow-2xs hover:border-amber-400";
                      badgeBg = "bg-amber-100 text-amber-800";
                    } else if (ratio > 0) {
                      heatColor = "bg-blue-50/80 border-blue-200 text-blue-900 shadow-2xs hover:border-blue-400";
                      badgeBg = "bg-blue-100 text-blue-800";
                    }

                    return (
                      <div 
                        key={zone.id} 
                        onClick={() => setSelectedDashboardZoneModal(zone)}
                        title={`${zone.zoneName} (${zone.department || 'General'}) - ${occupied}/${total} occupied (${zone.rate}% load)`}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col justify-between min-h-[105px] cursor-pointer hover:scale-[1.02] group ${heatColor}`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-blue-700 transition-colors" title={zone.zoneName}>
                            {zone.zoneName}
                          </div>
                          {selectedHeatmapFloorId === "all" && zone.floorNames && (
                            <div className="text-[9px] text-slate-400 font-medium truncate mt-0.5">{zone.floorNames}</div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-center gap-1 font-mono">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${badgeBg}`}>
                              {zone.rate}% Load
                            </span>
                          </div>
                          <div className="text-[9px] text-slate-600 font-mono flex items-center justify-center gap-1">
                            <span className="text-emerald-700 font-bold">{occupied} Occ</span>
                            <span>|</span>
                            <span className="text-amber-600 font-bold">{zone.vacant} Vac</span>
                          </div>
                          {zone.department && (
                            <div className="text-[8px] font-semibold uppercase tracking-wider bg-white/80 border border-slate-200/60 px-1 py-0.5 rounded text-slate-600 truncate">
                              {zone.department}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dashboard Heatmap Zone Modal Popup */}
            {selectedDashboardZoneModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-left">
                  <div className="p-5 bg-slate-900 text-white flex justify-between items-start shrink-0 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                          Zone Breakdown
                        </span>
                        <span className="text-xs text-slate-300 font-mono">
                          {selectedDashboardZoneModal.floorCount} Floor(s)
                        </span>
                      </div>
                      <h3 className="text-xl font-bold font-display mt-1 text-white">{selectedDashboardZoneModal.zoneName}</h3>
                      <p className="text-xs text-slate-300">Department: {selectedDashboardZoneModal.department}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDashboardZoneModal(null)}
                      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-lg cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Desks</span>
                        <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{selectedDashboardZoneModal.total}</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Occupied</span>
                        <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{selectedDashboardZoneModal.occupied}</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Vacant Seats</span>
                        <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">{selectedDashboardZoneModal.vacant}</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-blue-700 uppercase">Occupancy Ratio</span>
                        <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">{selectedDashboardZoneModal.rate}%</div>
                      </div>
                    </div>

                    {/* Floor Breakdown */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={14} className="text-blue-600" />
                        <span>Floor-wise Occupancy Breakdown</span>
                      </h4>
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Floor Level</th>
                              <th className="p-2.5">Building</th>
                              <th className="p-2.5">Total Desks</th>
                              <th className="p-2.5 text-emerald-700">Occupied</th>
                              <th className="p-2.5 text-amber-700">Vacant Seats</th>
                              <th className="p-2.5">Ratio</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedDashboardZoneModal.floorBreakdown.map((fb: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold text-slate-800">{fb.floorName}</td>
                                <td className="p-2.5 text-slate-500">{fb.buildingName}</td>
                                <td className="p-2.5 font-mono">{fb.total}</td>
                                <td className="p-2.5 font-mono font-bold text-emerald-700">{fb.occupied}</td>
                                <td className="p-2.5 font-mono font-bold text-amber-600">{fb.vacant}</td>
                                <td className="p-2.5 font-mono">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">{fb.rate}%</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Complete Seat Directory */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={14} className="text-purple-600" />
                        <span>Seat Inventory & Occupant Details ({selectedDashboardZoneModal.seats.length} seats)</span>
                      </h4>
                      <div className="border border-slate-200 rounded-xl max-h-[220px] overflow-y-auto text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Seat #</th>
                              <th className="p-2.5">Floor</th>
                              <th className="p-2.5">Department</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5">Occupant / Manager</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {selectedDashboardZoneModal.seats.map((s: Seat) => {
                              const sFl = siteFloors.find(f => f.id === s.floorId);
                              const isOcc = s.status === "Occupied" || s.employeeName || s.employeeEmail;
                              return (
                                <tr key={s.id} className="hover:bg-slate-50">
                                  <td className="p-2.5 font-bold text-slate-900">{s.seatNumber}</td>
                                  <td className="p-2.5 text-slate-600">{sFl?.name || "Main Floor"}</td>
                                  <td className="p-2.5 text-slate-600">{s.department || s.allocatedDepartment || "General"}</td>
                                  <td className="p-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isOcc ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                    }`}>
                                      {isOcc ? "Occupied" : "Vacant"}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-slate-700 font-sans">
                                    {s.employeeName ? (
                                      <div className="font-semibold text-slate-900">{s.employeeName}</div>
                                    ) : s.allocatedManager ? (
                                      <div className="text-slate-500">Mgr: {s.allocatedManager}</div>
                                    ) : (
                                      <span className="text-slate-400 italic">Available for allocation</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                    <button
                      onClick={() => setSelectedDashboardZoneModal(null)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Close Breakdown
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isWidgetVisible("department_budgets") && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900 font-display">Occupancy Report</h4>
                <p className="text-xs text-slate-400">Desk budgets & occupancy analytics</p>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setOccupancyReportViewMode("department")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    occupancyReportViewMode === "department"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Department-wise
                </button>
                <button
                  onClick={() => setOccupancyReportViewMode("floor")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    occupancyReportViewMode === "floor"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Floor-wise
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
              <select
                value={selectedOccupancyFloorId}
                onChange={(e) => setSelectedOccupancyFloorId(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Floors ({siteFloors.length})</option>
                {siteFloors.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <div className="relative flex-1 min-w-[120px]">
                <input
                  type="text"
                  placeholder={occupancyReportViewMode === "department" ? "Search dept..." : "Search floor..."}
                  value={occupancySearchQuery}
                  onChange={(e) => setOccupancySearchQuery(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-2.5 pr-6 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {occupancySearchQuery && (
                  <button 
                    onClick={() => setOccupancySearchQuery("")}
                    className="absolute right-2 top-1 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* DEPARTMENT-WISE VIEW */}
            {occupancyReportViewMode === "department" && (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {deptOccupancyData.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No department capacity records found matching filter.
                  </div>
                ) : (
                  deptOccupancyData.map((dept, idx) => {
                    const colors = ["bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-indigo-600", "bg-cyan-600"];
                    const color = colors[idx % colors.length];
                    const numRate = parseFloat(dept.rate);

                    return (
                      <div key={dept.name} className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-1.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 font-sans truncate max-w-[65%]" title={dept.name}>
                            {dept.name}
                          </span>
                          <span className="font-mono font-semibold text-slate-700 text-[11px] flex items-center gap-1.5">
                            <span className="text-emerald-700 font-bold">{dept.occupied} Occ</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-amber-600 font-bold">{dept.vacant} Vacant</span>
                            <span className="text-slate-300">|</span>
                            <span>{dept.total} Total</span>
                            <span className="text-slate-400 font-normal">({dept.rate}%)</span>
                          </span>
                        </div>

                        <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${color} transition-all duration-300`} 
                            style={{ width: `${Math.min(numRate, 100)}%` }}
                          ></div>
                        </div>

                        {dept.floors.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {dept.floors.map(f => (
                              <span key={f.floorName} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                {f.floorName}: {f.count} desks
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* FLOOR-WISE VIEW */}
            {occupancyReportViewMode === "floor" && (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {floorOccupancyData.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No floor occupancy records found matching filter.
                  </div>
                ) : (
                  floorOccupancyData.map((fl) => {
                    const numRate = parseFloat(fl.rate);
                    let barColor = "bg-blue-600";
                    if (numRate >= 80) barColor = "bg-emerald-600";
                    else if (numRate < 30) barColor = "bg-amber-500";

                    return (
                      <div key={fl.id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Building2 size={13} className="text-blue-600" />
                              <span>{fl.name}</span>
                            </h5>
                            <p className="text-[10px] text-slate-400">{fl.buildingName}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold font-mono text-slate-800">{fl.rate}%</span>
                            <p className="text-[10px] text-slate-500 font-mono">{fl.occupied} / {fl.total} occupied</p>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${barColor} transition-all duration-300`} 
                            style={{ width: `${Math.min(numRate, 100)}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 font-mono flex-wrap gap-1">
                          <span>Occupied: <b className="text-emerald-700 font-bold">{fl.occupied}</b></span>
                          <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                            Vacant: {fl.vacant} Seats
                          </span>
                          <span>Reserved: <b className="text-amber-700 font-bold">{fl.reserved}</b></span>
                          <span>Total: <b className="text-slate-800 font-bold">{fl.total}</b></span>
                        </div>

                        {fl.topDepts.length > 0 && (
                          <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1">
                            {fl.topDepts.slice(0, 3).map(d => (
                              <span key={d.name} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-sans">
                                {d.name} ({d.count})
                              </span>
                            ))}
                            {fl.topDepts.length > 3 && (
                              <span className="text-[9px] text-slate-400 self-center">+{fl.topDepts.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* WIDGET 5: MOBILE COMPANION APP LINKS & DOWNLOADS */}
      {isWidgetVisible("mobile_download") && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="bg-blue-500/20 text-blue-300 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-blue-400/20">
              Native Android & iOS Mobile Ecosystem
            </span>
            <h3 className="text-xl font-bold font-display text-white">EnterprizSeat Mobile Companion</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Scan desk QR labels, check in instantly, view assigned IT hardware assets, submit seat change requests, and validate room occupancy on native Android & iOS devices.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button 
                onClick={() => {
                  downloadMobileAPK();
                  if (onAddAuditLog) onAddAuditLog("APK Download", "Mobile App", "Downloaded Android APK v2.4 from Dashboard.");
                }} 
                className="bg-white text-slate-900 hover:bg-slate-100 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Download size={14} className="text-blue-600" />
                <span>Download Android APK (v2.4)</span>
              </button>
              <button 
                onClick={() => {
                  downloadMobileIPA();
                  if (onAddAuditLog) onAddAuditLog("IPA Download", "Mobile App", "Downloaded iOS TestFlight IPA v2.4 from Dashboard.");
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Smartphone size={14} />
                <span>Download iOS IPA</span>
              </button>
              <button
                onClick={() => setShowMobileAppModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <QrCode size={14} />
                <span>Open Downloads & QR Portal</span>
              </button>
            </div>
          </div>

          <div 
            onClick={() => setShowMobileAppModal(true)}
            className="bg-white p-4 rounded-2xl text-slate-900 flex flex-col items-center justify-center shrink-0 border border-white/20 shadow-xl cursor-pointer hover:scale-102 transition-transform group"
            title="Click to open interactive QR camera scanner & download portal"
          >
            <QrCode size={110} className="text-slate-900 group-hover:text-blue-600 transition-colors" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mt-2 font-mono group-hover:underline">
              Click to Scan / Download App
            </span>
          </div>
        </div>
      )}

      {/* App Download Modal */}
      <AppDownloadModal
        isOpen={showMobileAppModal}
        onClose={() => setShowMobileAppModal(false)}
        userEmail="prtreddy06@gmail.com"
        onAddAuditLog={onAddAuditLog}
      />

      {/* WIDGET 6 & 7: REQUESTS & IOT STREAM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isWidgetVisible("pending_requests") && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-bold text-slate-900 font-display">Pending Workspace Requests</h4>
                <p className="text-xs text-slate-400">Awaiting Admin approval</p>
              </div>
              <button onClick={onNavigateToRequests} className="text-xs text-blue-600 hover:underline font-semibold">
                Manage ({pendingRequestsCount})
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {requests.filter(r => r.status === "Pending" || r.status === "Escalated").slice(0, 4).map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800">{req.employeeName}</span>
                    <p className="text-slate-500 line-clamp-1">{req.reason}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isWidgetVisible("iot_stream") && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h4 className="text-base font-bold text-slate-900 font-display">IoT Check-In Stream</h4>
              <p className="text-xs text-slate-400">Real-time mobile QR code scans</p>
            </div>

            <div className="space-y-3 text-xs">
              {checkInLogs && checkInLogs.length > 0 ? (
                checkInLogs.slice(0, 4).map(log => (
                  <div key={log.id} className="flex gap-3 items-start border-l-2 border-emerald-500 pl-4 relative">
                    <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                    <div>
                      <p className="font-semibold text-slate-800">{log.employeeName} scanned Desk {log.seatNumber}</p>
                      <p className="text-[11px] text-slate-400">{log.status} • {log.floorName || "11 th Floor CRE"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic">No recent QR check-ins recorded.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DASHBOARD CUSTOMIZER MODAL */}
      {showCustomizerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Palette className="text-blue-600" size={20} />
                <h3 className="text-lg font-bold text-slate-800 font-display">Configure Global Executive Dashboard</h3>
              </div>
              <button onClick={() => setShowCustomizerModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {/* Form Fields for Theme & Branding */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Campus Name</label>
                  <input 
                    type="text" 
                    value={tempThemeConfig.campusName}
                    onChange={(e) => setTempThemeConfig({ ...tempThemeConfig, campusName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Building Name</label>
                  <input 
                    type="text" 
                    value={tempThemeConfig.buildingName}
                    onChange={(e) => setTempThemeConfig({ ...tempThemeConfig, buildingName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Floor Level Title</label>
                  <input 
                    type="text" 
                    value={tempThemeConfig.floorName}
                    onChange={(e) => setTempThemeConfig({ ...tempThemeConfig, floorName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Company Logo Image URL</label>
                  <input 
                    type="text" 
                    value={tempThemeConfig.companyLogoUrl}
                    onChange={(e) => setTempThemeConfig({ ...tempThemeConfig, companyLogoUrl: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Dashboard Banner Main Title</label>
                <input 
                  type="text" 
                  value={tempThemeConfig.bannerTitle}
                  onChange={(e) => setTempThemeConfig({ ...tempThemeConfig, bannerTitle: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Banner Subtitle</label>
                <textarea 
                  rows={2}
                  value={tempThemeConfig.bannerSubtitle}
                  onChange={(e) => setTempThemeConfig({ ...tempThemeConfig, bannerSubtitle: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Theme Color Palette</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "blue", label: "Corporate Blue", color: "bg-blue-600" },
                    { id: "emerald", label: "Executive Emerald", color: "bg-emerald-600" },
                    { id: "slate", label: "Midnight Slate", color: "bg-slate-800" },
                    { id: "purple", label: "Royal Purple", color: "bg-purple-600" }
                  ].map((tc) => (
                    <button 
                      key={tc.id}
                      onClick={() => setTempThemeConfig({ ...tempThemeConfig, themeColor: tc.id as any })}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-[11px] font-semibold transition-all ${
                        tempThemeConfig.themeColor === tc.id 
                          ? "border-blue-600 bg-blue-50 text-blue-900 font-bold" 
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${tc.color}`}></span>
                      <span>{tc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Widget Rearrange and Show/Hide Manager */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 block text-xs">Manage Dashboard Component Widgets</span>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {tempWidgets.map((widget, idx) => (
                    <div key={widget.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleWidgetVisibility(widget.id)}
                          className={`p-1 rounded ${widget.visible ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-100"}`}
                        >
                          {widget.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <span className={`font-semibold ${widget.visible ? "text-slate-800" : "text-slate-400 line-through"}`}>
                          {widget.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => moveWidget(idx, "up")} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                          <MoveUp size={13} />
                        </button>
                        <button onClick={() => moveWidget(idx, "down")} disabled={idx === tempWidgets.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                          <MoveDown size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button 
                onClick={handleRestoreDefaultLayout}
                className="px-3.5 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 flex items-center gap-1"
              >
                <RotateCcw size={13} />
                <span>Restore Defaults</span>
              </button>

              <div className="flex gap-2">
                <button onClick={() => setShowCustomizerModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveDashboardCustomization} className="px-5 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-1.5">
                  <Save size={14} />
                  <span>Save Layout Globally</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
