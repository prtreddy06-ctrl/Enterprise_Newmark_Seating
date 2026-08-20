import React, { useState, useMemo } from "react";
import PptxGenJS from "pptxgenjs";
import { 
  BarChart3, 
  TrendingUp, 
  Filter, 
  Calendar, 
  RefreshCw, 
  Layers, 
  Sparkles,
  PieChart,
  HardDrive,
  Download,
  Search,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Laptop,
  MapPin,
  Presentation,
  Code2,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpRight,
  ShieldAlert,
  FileText,
  LayoutGrid,
  Check,
  RotateCcw,
  CheckCircle,
  XCircle,
  Monitor,
  Armchair
} from "lucide-react";
import { Seat, ITAsset, EmployeeProfile, Building, Floor, Zone, SeatRequest, CheckInLog, AuditLog } from "../types";

interface PowerBIDashboardProps {
  seats?: Seat[];
  assets?: ITAsset[];
  employees?: EmployeeProfile[];
  buildings?: Building[];
  floors?: Floor[];
  zones?: Zone[];
  requests?: SeatRequest[];
  checkInLogs?: CheckInLog[];
  auditLogs?: AuditLog[];
}

export default function PowerBIDashboard({
  seats = [],
  assets = [],
  employees = [],
  buildings = [],
  floors = [],
  zones = [],
  requests = [],
  checkInLogs = [],
  auditLogs = []
}: PowerBIDashboardProps) {
  // Global Filter States
  const [selectedBuilding, setSelectedBuilding] = useState<string>("All");
  const [selectedFloor, setSelectedFloor] = useState<string>("All");
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [selectedSeatType, setSelectedSeatType] = useState<string>("All");
  const [selectedTimeline, setSelectedTimeline] = useState<string>("Today");
  const [activePage, setActivePage] = useState<"overview" | "departments" | "assets" | "matrix" | "hotdesk">("overview");
  const [hotDeskSearch, setHotDeskSearch] = useState<string>("");

  // Search & zero-capacity toggle for Spatial Density Matrix
  const [zoneSearchQuery, setZoneSearchQuery] = useState<string>("");
  const [showZeroSeatZones, setShowZeroSeatZones] = useState<boolean>(false);
  const [selectedZoneModal, setSelectedZoneModal] = useState<any | null>(null);

  // Search filter for Matrix Table
  const [matrixSearch, setMatrixSearch] = useState<string>("");
  
  // Refresh timestamp indicator
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 400);
  };

  // Filtered dataset derivation
  const filteredSeats = useMemo(() => {
    return seats.filter(s => {
      if (!s || !s.seatNumber) return false;

      if (selectedBuilding !== "All" && s.buildingId !== selectedBuilding && s.buildingId !== undefined) {
        // Also match building name if stored
        const bld = buildings.find(b => b.id === s.buildingId);
        if (bld && bld.name !== selectedBuilding && s.buildingId !== selectedBuilding) return false;
      }
      if (selectedFloor !== "All" && s.floorId !== selectedFloor) {
        const fl = floors.find(f => f.id === s.floorId);
        if (fl && fl.name !== selectedFloor && s.floorId !== selectedFloor) return false;
      }
      if (selectedDept !== "All") {
        const parentZone = zones.find(z => z.id === s.zoneId);
        const seatDept = s.department || parentZone?.department || s.allocatedDepartment;
        if (seatDept && seatDept.toLowerCase() !== selectedDept.toLowerCase()) return false;
      }
      if (selectedSeatType !== "All" && s.type !== selectedSeatType) return false;
      return true;
    });
  }, [seats, selectedBuilding, selectedFloor, selectedDept, selectedSeatType, buildings, floors, zones]);

  // Aggregate Metrics
  const totalSeatsCount = filteredSeats.length;
  const occupiedSeatsCount = filteredSeats.filter(s => s.status === "Occupied").length;
  const vacantSeatsCount = filteredSeats.filter(s => s.status === "Vacant").length;
  const reservedSeatsCount = filteredSeats.filter(s => s.status === "Reserved").length;

  const occupancyRate = totalSeatsCount > 0 ? Math.round((occupiedSeatsCount / totalSeatsCount) * 100) : 0;
  const vacancyRate = totalSeatsCount > 0 ? Math.round((vacantSeatsCount / totalSeatsCount) * 100) : 0;

  // Seat Types Breakdown
  const standardSeatsCount = filteredSeats.filter(s => s.type === "Standard").length;
  const hotDeskSeatsCount = filteredSeats.filter(s => s.type === "Hot Desk").length;
  const executiveSeatsCount = filteredSeats.filter(s => s.type === "Executive").length;
  const collaborativeSeatsCount = filteredSeats.filter(s => s.type === "Collaborative").length;

  // Asset Metrics
  const totalAssetsCount = assets.length;
  const assignedAssetsCount = assets.filter(a => a.status === "Assigned" || a.employeeId || a.seatNumber).length;
  const availableAssetsCount = assets.filter(a => a.status === "Available" || (!a.employeeId && !a.seatNumber)).length;
  const maintenanceAssetsCount = assets.filter(a => a.status === "Maintenance" || a.status === "Decommissioned").length;
  const assetLinkingRate = totalAssetsCount > 0 ? Math.round((assignedAssetsCount / totalAssetsCount) * 100) : 0;

  // Request Metrics
  const pendingRequestsCount = requests.filter(r => r.status === "Pending" || r.status === "Escalated").length;
  const approvedRequestsCount = requests.filter(r => r.status === "Approved").length;
  const rejectedRequestsCount = requests.filter(r => r.status === "Rejected").length;

  // Unique Departments
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    zones.forEach(z => { if (z.department) set.add(z.department); });
    seats.forEach(s => { 
      if (s.department) set.add(s.department); 
      if (s.allocatedDepartment) set.add(s.allocatedDepartment);
    });
    employees.forEach(e => { if (e.department) set.add(e.department); });
    
    const list = Array.from(set).filter(d => 
      d && typeof d === "string" && d.toLowerCase() !== "vacant" && d.toLowerCase() !== "n/a"
    );

    // Sort same base departments together alphabetically (e.g. India HR COE before India HR COE - Future Expansion)
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));

    if (list.length === 0) {
      return ["Operations", "Finance & HR", "Product Quality", "Cloud Platform"];
    }
    return list;
  }, [zones, seats, employees]);

  // Zone Density Analytics - Aggregated & Merged by Zone Name
  const zoneDensityData = useMemo(() => {
    const mergedMap = new Map<string, {
      zoneName: string;
      zoneIds: string[];
      departmentsSet: Set<string>;
      floorIdsSet: Set<string>;
      floorNamesSet: Set<string>;
      seats: Seat[];
    }>();

    const activeZones = selectedFloor === "All" 
      ? zones 
      : zones.filter(z => z.floorId === selectedFloor || floors.find(f => f.id === z.floorId)?.name === selectedFloor);

    activeZones.forEach(z => {
      const zoneSeats = seats.filter(s => {
        if (!s) return false;
        if (selectedFloor !== "All" && s.floorId !== selectedFloor && floors.find(f => f.id === s.floorId)?.name !== selectedFloor) return false;
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

      let cleanZoneName = z.name
        .replace(/\s*\(Copy\)/gi, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const key = cleanZoneName.toLowerCase();

      let cleanDept = z.department || "General Workspace";
      if (cleanDept === "HR/FINANCE") cleanDept = "Finance & HR";

      if ((cleanDept === "General Workspace" || !cleanDept) && zoneSeats.length > 0) {
        const deptCounts = new Map<string, number>();
        zoneSeats.forEach(s => {
          const d = s.department || s.allocatedDepartment;
          if (d && d.toLowerCase() !== "vacant" && d.toLowerCase() !== "n/a") {
            deptCounts.set(d, (deptCounts.get(d) || 0) + 1);
          }
        });
        if (deptCounts.size > 0) {
          const sorted = Array.from(deptCounts.entries()).sort((a, b) => b[1] - a[1]);
          cleanDept = sorted[0][0];
        }
      }

      const fl = floors.find(f => f.id === z.floorId);
      const floorNameStr = fl?.name || "Main Floor";

      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          zoneName: cleanZoneName,
          zoneIds: [],
          departmentsSet: new Set(),
          floorIdsSet: new Set(),
          floorNamesSet: new Set(),
          seats: []
        });
      }

      const entry = mergedMap.get(key)!;
      if (!entry.zoneIds.includes(z.id)) entry.zoneIds.push(z.id);
      if (cleanDept && cleanDept !== "General Workspace") entry.departmentsSet.add(cleanDept);
      if (z.floorId) entry.floorIdsSet.add(z.floorId);
      entry.floorNamesSet.add(floorNameStr);

      zoneSeats.forEach(s => {
        if (!entry.seats.some(existing => existing.id === s.id)) {
          entry.seats.push(s);
        }
      });
    });

    const list = Array.from(mergedMap.values()).map(entry => {
      const totalSeats = entry.seats.length;
      const occupiedSeats = entry.seats.filter(s => s.status === "Occupied" || s.employeeName || s.employeeEmail).length;
      const vacantSeats = totalSeats - occupiedSeats;
      const rate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

      let deptLabel = "General Workspace";
      if (entry.departmentsSet.size > 0) {
        deptLabel = Array.from(entry.departmentsSet).join(", ");
      }

      const floorNameStr = Array.from(entry.floorNamesSet).join(", ");

      // Floor Breakdown
      const floorBreakdownMap = new Map<string, { floorName: string; buildingName: string; total: number; occupied: number; vacant: number }>();
      entry.seats.forEach(s => {
        const fId = s.floorId || "unknown";
        const fl = floors.find(f => f.id === fId);
        const bId = fl?.buildingId;
        const b = buildings.find(bItem => bItem.id === bId);
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
        zoneId: entry.zoneIds[0] || entry.zoneName,
        zoneName: entry.zoneName,
        department: deptLabel,
        floorIds: Array.from(entry.floorIdsSet),
        floorName: floorNameStr,
        floorCount: entry.floorIdsSet.size || 1,
        totalSeats,
        occupiedSeats,
        vacantSeats,
        rate,
        seats: entry.seats,
        floorBreakdown
      };
    });

    return list.filter(zd => {
      if (!showZeroSeatZones && zd.totalSeats === 0) return false;

      if (selectedFloor !== "All") {
        const matchesFloor = zd.floorIds.some(fId => {
          if (fId === selectedFloor) return true;
          const fl = floors.find(f => f.id === fId);
          return fl && fl.name === selectedFloor;
        });
        if (!matchesFloor) return false;
      }

      if (selectedDept !== "All" && !zd.department.toLowerCase().includes(selectedDept.toLowerCase())) {
        return false;
      }

      if (zoneSearchQuery.trim() !== "") {
        const q = zoneSearchQuery.toLowerCase();
        return zd.zoneName.toLowerCase().includes(q) || 
               zd.department.toLowerCase().includes(q) ||
               zd.floorName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [zones, seats, floors, buildings, selectedFloor, selectedDept, zoneSearchQuery, showZeroSeatZones]);

  // Department Allocation Analytics
  const departmentAllocationData = useMemo(() => {
    return availableDepartments.map(dept => {
      const isFutureExpansion = dept.toLowerCase().includes("expansion") || dept.toLowerCase().includes("future");
      const deptSeats = seats.filter(s => {
        const pZone = zones.find(z => z.id === s.zoneId);
        const sDept = s.department || s.allocatedDepartment || pZone?.department;
        return sDept && typeof sDept === "string" && sDept.toLowerCase() === dept.toLowerCase();
      });
      const total = deptSeats.length;
      const occupiedSeats = deptSeats.filter(s => {
        if (s.employeeName || s.employeeEmail || s.employeeId) return true;
        if (s.status === "Occupied" && !isFutureExpansion) return true;
        return employees.some(e => 
          e.department && 
          e.department.toLowerCase() === dept.toLowerCase() && 
          e.seatNumber === s.seatNumber
        );
      });
      const occupied = occupiedSeats.length;
      const vacant = Math.max(0, total - occupied);
      const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
      const empCount = employees.filter(e => e.department && e.department.toLowerCase() === dept.toLowerCase()).length;
      return {
        department: dept,
        totalSeats: total,
        occupiedSeats: occupied,
        vacantSeats: vacant,
        employeeCount: empCount,
        occupancyRate: rate
      };
    });
  }, [availableDepartments, seats, zones, employees]);

  // Only show departments with real, actual seat data — strips out leftover
  // zero-count placeholder/demo department labels that were cluttering reports.
  const departmentAllocationDataFiltered = useMemo(() => {
    return departmentAllocationData
      .filter(d => d.totalSeats > 0)
      .sort((a, b) => b.totalSeats - a.totalSeats);
  }, [departmentAllocationData]);

  const maxDeptTotalSeats = useMemo(() => {
    return Math.max(1, ...departmentAllocationDataFiltered.map(d => d.totalSeats));
  }, [departmentAllocationDataFiltered]);

  // Hot Desk Allocation Report: Seat Number, Manager Name, Department Name,
  // Seat Status (Vacant/Occupied), and Desk Type (Standard/Hot Desk/etc.)
  const hotDeskAllocationData = useMemo(() => {
    return (seats || []).map(s => {
      const parentZone = zones.find(z => z.id === s.zoneId);
      const managerName = s.allocatedManager || s.managerName || "Unassigned Manager";
      const departmentName = s.department || s.allocatedDepartment || parentZone?.department || "Unassigned";
      return {
        seatId: s.id,
        seatNumber: s.seatNumber,
        managerName,
        departmentName,
        seatStatus: s.status, // "Vacant" | "Occupied" | "Reserved"
        deskType: s.type // "Standard" | "Hot Desk" | "Executive" | "Collaborative"
      };
    });
  }, [seats, zones]);

  const filteredHotDeskAllocationData = useMemo(() => {
    const q = hotDeskSearch.trim().toLowerCase();
    if (!q) return hotDeskAllocationData;
    return hotDeskAllocationData.filter(row =>
      row.seatNumber.toLowerCase().includes(q) ||
      row.managerName.toLowerCase().includes(q) ||
      row.departmentName.toLowerCase().includes(q) ||
      row.deskType.toLowerCase().includes(q)
    );
  }, [hotDeskAllocationData, hotDeskSearch]);

  // Matrix Filtered List
  const matrixSeatsList = useMemo(() => {
    return filteredSeats.filter(s => {
      if (!matrixSearch.trim()) return true;
      const query = matrixSearch.toLowerCase();
      const pZone = zones.find(z => z.id === s.zoneId);
      return (
        s.seatNumber.toLowerCase().includes(query) ||
        (s.employeeName && s.employeeName.toLowerCase().includes(query)) ||
        (s.employeeEmail && s.employeeEmail.toLowerCase().includes(query)) ||
        (s.department && s.department.toLowerCase().includes(query)) ||
        (pZone && pZone.name.toLowerCase().includes(query)) ||
        s.type.toLowerCase().includes(query) ||
        s.status.toLowerCase().includes(query)
      );
    });
  }, [filteredSeats, matrixSearch, zones]);

  // CSV Export Handler
  const handleExportPowerBIReport = () => {
    const csvRows: string[] = [];
    csvRows.push("Power BI Executive Report - Corporate Seating & IT Asset Analytics");
    csvRows.push(`Exported At,${new Date().toLocaleString()}`);
    csvRows.push(`Filter Scope,Building: ${selectedBuilding} | Floor: ${selectedFloor} | Dept: ${selectedDept} | Timeline: ${selectedTimeline}`);
    csvRows.push("");
    csvRows.push("--- SUMMARY KPI METRICS ---");
    csvRows.push(`Total Filtered Seats,${totalSeatsCount}`);
    csvRows.push(`Occupied Seats,${occupiedSeatsCount}`);
    csvRows.push(`Vacant Seats,${vacantSeatsCount}`);
    csvRows.push(`Reserved Seats,${reservedSeatsCount}`);
    csvRows.push(`Overall Occupancy Rate,${occupancyRate}%`);
    csvRows.push(`IT Assets Total,${totalAssetsCount}`);
    csvRows.push(`IT Asset Linking Compliance,${assetLinkingRate}%`);
    csvRows.push(`Pending Allocation Requests,${pendingRequestsCount}`);
    csvRows.push("");
    csvRows.push("--- SEAT ALLOCATION MATRIX ---");
    csvRows.push("Seat Number,Zone,Status,Type,Assigned Employee,Department");
    matrixSeatsList.forEach(s => {
      const pZone = zones.find(z => z.id === s.zoneId);
      csvRows.push(`"${s.seatNumber}","${pZone?.name || 'Zone A'}","${s.status}","${s.type}","${s.employeeName || 'Unassigned'}","${s.department || pZone?.department || 'N/A'}"`);
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `PowerBI_Report_${selectedBuilding.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ------------------------------------------------------------------
  // PowerPoint (.pptx) Export — a short executive deck built client-side
  // ------------------------------------------------------------------
  const handleExportPowerBIReportPPT = async () => {
    const pptx = new PptxGenJS();
    pptx.author = "EnterprizSeat Platform";
    pptx.title = "Corporate Occupancy & IT Asset Executive Report";

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: "0F172A" };
    titleSlide.addText("Corporate Occupancy & IT Asset\nExecutive Analytics Report", {
      x: 0.6, y: 1.6, w: 9, h: 1.6, fontSize: 28, bold: true, color: "FFFFFF", fontFace: "Arial"
    });
    titleSlide.addText(
      `Building: ${selectedBuilding}  •  Floor: ${selectedFloor}  •  Dept: ${selectedDept}  •  Timeline: ${selectedTimeline}\nGenerated ${new Date().toLocaleString()}`,
      { x: 0.6, y: 3.3, w: 9, h: 0.8, fontSize: 12, color: "94A3B8" }
    );

    // KPI slide
    const kpiSlide = pptx.addSlide();
    kpiSlide.addText("Summary KPI Metrics", { x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 20, bold: true, color: "1E293B" });
    const kpiRows = [
      ["Metric", "Value"],
      ["Total Filtered Seats", String(totalSeatsCount)],
      ["Occupied Seats", String(occupiedSeatsCount)],
      ["Vacant Seats", String(vacantSeatsCount)],
      ["Reserved Seats", String(reservedSeatsCount)],
      ["Overall Occupancy Rate", `${occupancyRate}%`],
      ["IT Assets Total", String(totalAssetsCount)],
      ["IT Asset Linking Compliance", `${assetLinkingRate}%`],
      ["Pending Allocation Requests", String(pendingRequestsCount)]
    ];
    kpiSlide.addTable(kpiRows as any, {
      x: 0.4, y: 1.0, w: 9, colW: [6, 3],
      fontSize: 12, border: { type: "solid", color: "E2E8F0", pt: 1 },
      fill: { color: "F8FAFC" },
      color: "334155"
    });

    // Seat allocation matrix slide(s) — chunked so no slide overflows
    const chunkSize = 18;
    for (let i = 0; i < matrixSeatsList.length; i += chunkSize) {
      const chunk = matrixSeatsList.slice(i, i + chunkSize);
      const slide = pptx.addSlide();
      slide.addText(`Seat Allocation Matrix ${matrixSeatsList.length > chunkSize ? `(${i + 1}-${Math.min(i + chunkSize, matrixSeatsList.length)} of ${matrixSeatsList.length})` : ""}`, {
        x: 0.4, y: 0.3, w: 9, h: 0.5, fontSize: 16, bold: true, color: "1E293B"
      });
      const rows = [["Seat", "Zone", "Status", "Type", "Employee", "Department"]];
      chunk.forEach(s => {
        const pZone = zones.find(z => z.id === s.zoneId);
        rows.push([
          s.seatNumber,
          pZone?.name || "Zone A",
          s.status,
          s.type,
          s.employeeName || "Unassigned",
          s.department || pZone?.department || "N/A"
        ]);
      });
      slide.addTable(rows as any, {
        x: 0.3, y: 0.9, w: 9.4,
        fontSize: 9, border: { type: "solid", color: "E2E8F0", pt: 0.5 },
        color: "334155"
      });
    }

    await pptx.writeFile({ fileName: `PowerBI_Report_${selectedBuilding.replace(/\s+/g, '_')}_${Date.now()}.pptx` });
  };

  // ------------------------------------------------------------------
  // Standalone HTML Report Export — a single self-contained .html file
  // ------------------------------------------------------------------
  const handleExportPowerBIReportHTML = () => {
    const rowsHtml = matrixSeatsList.map(s => {
      const pZone = zones.find(z => z.id === s.zoneId);
      return `<tr>
        <td>${s.seatNumber}</td>
        <td>${pZone?.name || "Zone A"}</td>
        <td><span class="badge badge-${(s.status || "").toLowerCase()}">${s.status}</span></td>
        <td>${s.type}</td>
        <td>${s.employeeName || "Unassigned"}</td>
        <td>${s.department || pZone?.department || "N/A"}</td>
      </tr>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Corporate Occupancy & IT Asset Executive Report</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 32px; }
  .header { background: #0f172a; color: white; padding: 28px 32px; border-radius: 16px; margin-bottom: 24px; }
  .header h1 { margin: 0 0 6px; font-size: 22px; }
  .header p { margin: 0; color: #94a3b8; font-size: 13px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
  .kpi-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .kpi-card .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold; letter-spacing: 0.03em; }
  .kpi-card .value { font-size: 24px; font-weight: bold; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
  th, td { text-align: left; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #64748b; letter-spacing: 0.03em; }
  .badge { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; }
  .badge-occupied { background: #fee2e2; color: #b91c1c; }
  .badge-vacant { background: #dcfce7; color: #15803d; }
  .badge-reserved { background: #fef9c3; color: #a16207; }
</style>
</head>
<body>
  <div class="header">
    <h1>Corporate Occupancy & IT Asset Executive Analytics Report</h1>
    <p>Building: ${selectedBuilding} &nbsp;•&nbsp; Floor: ${selectedFloor} &nbsp;•&nbsp; Dept: ${selectedDept} &nbsp;•&nbsp; Timeline: ${selectedTimeline} &nbsp;•&nbsp; Generated ${new Date().toLocaleString()}</p>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="label">Total Seats</div><div class="value">${totalSeatsCount}</div></div>
    <div class="kpi-card"><div class="label">Occupied</div><div class="value">${occupiedSeatsCount}</div></div>
    <div class="kpi-card"><div class="label">Vacant</div><div class="value">${vacantSeatsCount}</div></div>
    <div class="kpi-card"><div class="label">Reserved</div><div class="value">${reservedSeatsCount}</div></div>
    <div class="kpi-card"><div class="label">Occupancy Rate</div><div class="value">${occupancyRate}%</div></div>
    <div class="kpi-card"><div class="label">IT Assets Total</div><div class="value">${totalAssetsCount}</div></div>
    <div class="kpi-card"><div class="label">Asset Linking Compliance</div><div class="value">${assetLinkingRate}%</div></div>
    <div class="kpi-card"><div class="label">Pending Requests</div><div class="value">${pendingRequestsCount}</div></div>
  </div>
  <table>
    <thead><tr><th>Seat</th><th>Zone</th><th>Status</th><th>Type</th><th>Employee</th><th>Department</th></tr></thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `PowerBI_Report_${selectedBuilding.replace(/\s+/g, '_')}_${Date.now()}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="space-y-6 font-sans text-slate-800" id="powerbi-module">
      
      {/* Power BI Application Chrome Topbar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border border-slate-800 shadow-xl relative" id="powerbi-chrome-header">
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="flex items-center gap-3.5 z-10">
          <div className="bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs tracking-wider shadow-sm flex items-center gap-1.5 font-display">
            <BarChart3 size={16} />
            <span>Power BI</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base sm:text-lg font-bold tracking-tight font-display text-white">Corporate Occupancy & IT Asset Executive Analytics</h4>
              <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Power BI Embedded Workspace • Last Synced: {lastRefreshed}</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap z-10 w-full md:w-auto justify-end" id="powerbi-chrome-actions">
          <button 
            onClick={handleRefresh}
            title="Refresh Power BI Visual Datasets"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-amber-400" : ""} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 shadow-md hover:shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Export Report</span>
              <ChevronDown size={13} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50">
                <button
                  onClick={() => { handleExportPowerBIReport(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <FileText size={14} className="text-emerald-600" />
                  <span>Export as CSV</span>
                </button>
                <button
                  onClick={async () => { setShowExportMenu(false); await handleExportPowerBIReportPPT(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer border-t border-slate-100"
                >
                  <Presentation size={14} className="text-orange-600" />
                  <span>Export as PowerPoint (.pptx)</span>
                </button>
                <button
                  onClick={() => { handleExportPowerBIReportHTML(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer border-t border-slate-100"
                >
                  <Code2 size={14} className="text-blue-600" />
                  <span>Export as HTML Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Power BI Slicer Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between" id="powerbi-slicers-bar">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <SlidersHorizontal size={15} className="text-amber-500" />
          <span>Report Slicers:</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          {/* Building Slicer */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Building2 size={13} className="text-slate-400" />
            <span className="text-[11px] text-slate-400 font-medium">Building:</span>
            <select 
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none text-xs cursor-pointer"
            >
              <option value="All">All Buildings</option>
              {buildings.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Floor Slicer */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Layers size={13} className="text-slate-400" />
            <span className="text-[11px] text-slate-400 font-medium">Floor:</span>
            <select 
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none text-xs cursor-pointer"
            >
              <option value="All">All Floors</option>
              {floors.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Department Slicer */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Users size={13} className="text-slate-400" />
            <span className="text-[11px] text-slate-400 font-medium">Dept:</span>
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none text-xs cursor-pointer"
            >
              <option value="All">All Departments</option>
              {availableDepartments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Seat Type Slicer */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <LayoutGrid size={13} className="text-slate-400" />
            <span className="text-[11px] text-slate-400 font-medium">Type:</span>
            <select 
              value={selectedSeatType}
              onChange={(e) => setSelectedSeatType(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none text-xs cursor-pointer"
            >
              <option value="All">All Seat Types</option>
              <option value="Standard">Standard</option>
              <option value="Hot Desk">Hot Desk</option>
              <option value="Executive">Executive</option>
              <option value="Collaborative">Collaborative</option>
            </select>
          </div>

          {/* Timeline Scope Slicer */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar size={13} className="text-slate-400" />
            <select 
              value={selectedTimeline}
              onChange={(e) => setSelectedTimeline(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none text-xs cursor-pointer"
            >
              <option value="Today">Today (Real-time)</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Current Quarter">Current Quarter</option>
            </select>
          </div>

          {(selectedBuilding !== "All" || selectedFloor !== "All" || selectedDept !== "All" || selectedSeatType !== "All") && (
            <button 
              onClick={() => {
                setSelectedBuilding("All");
                setSelectedFloor("All");
                setSelectedDept("All");
                setSelectedSeatType("All");
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50"
            >
              <RotateCcw size={12} />
              <span>Reset Slicers</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="powerbi-kpi-cards">
        
        {/* KPI 1: Overall Occupancy */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
            <div className={`p-1.5 rounded-lg ${occupancyRate >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold font-display text-slate-900">{occupancyRate}%</h3>
            <span className="text-xs font-semibold text-slate-500 font-mono">{occupiedSeatsCount} / {totalSeatsCount}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${occupancyRate >= 85 ? "bg-emerald-500" : occupancyRate >= 70 ? "bg-amber-400" : "bg-blue-500"}`} style={{ width: `${occupancyRate}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400 flex justify-between">
            <span>Target Benchmark: 85%</span>
            <span className="font-semibold text-slate-600">{occupancyRate >= 85 ? "+3.2% vs Target" : "Under capacity"}</span>
          </p>
        </div>

        {/* KPI 2: Vacant & Hot Desks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Desks</span>
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold font-display text-slate-900">{vacantSeatsCount}</h3>
            <span className="text-xs font-semibold text-blue-600 font-mono">{vacancyRate}% Vacant</span>
          </div>
          <p className="text-[10px] text-slate-400 flex justify-between pt-1">
            <span>Hot Desks: <strong className="text-slate-700">{hotDeskSeatsCount}</strong></span>
            <span>Reserved: <strong className="text-slate-700">{reservedSeatsCount}</strong></span>
          </p>
        </div>

        {/* KPI 3: IT Hardware Compliance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IT Asset Linked Rate</span>
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <Laptop size={14} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold font-display text-slate-900">{assetLinkingRate}%</h3>
            <span className="text-xs font-semibold text-purple-600 font-mono">{assignedAssetsCount} Assets</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${assetLinkingRate}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400 flex justify-between">
            <span>Total Hardware: <strong className="text-slate-700">{totalAssetsCount}</strong></span>
            <span>Unassigned: <strong className="text-amber-600">{availableAssetsCount}</strong></span>
          </p>
        </div>

        {/* KPI 4: Seat Allocation Requests SLA */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Allocation SLA</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock size={14} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold font-display text-slate-900">{pendingRequestsCount}</h3>
            <span className="text-xs font-semibold text-emerald-600 font-mono">{approvedRequestsCount} Approved</span>
          </div>
          <p className="text-[10px] text-slate-400 flex justify-between pt-1">
            <span>Avg Response SLA: <strong className="text-slate-700">4.2 Hrs</strong></span>
            <span>Rejected: <strong className="text-rose-600">{rejectedRequestsCount}</strong></span>
          </p>
        </div>

      </div>

      {/* Report Pages Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePage("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activePage === "overview"
                ? "bg-slate-900 text-amber-400 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BarChart3 size={14} />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => setActivePage("departments")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activePage === "departments"
                ? "bg-slate-900 text-amber-400 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users size={14} />
            <span>Department Matrix</span>
          </button>

          <button
            onClick={() => setActivePage("assets")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activePage === "assets"
                ? "bg-slate-900 text-amber-400 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <HardDrive size={14} />
            <span>IT Asset Audits</span>
          </button>

          <button
            onClick={() => setActivePage("matrix")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activePage === "matrix"
                ? "bg-slate-900 text-amber-400 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Detailed Seat Matrix</span>
          </button>

          <button
            onClick={() => setActivePage("hotdesk")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activePage === "hotdesk"
                ? "bg-slate-900 text-amber-400 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Armchair size={14} />
            <span>Hot Desk Allocation</span>
          </button>
        </div>

        {/* AI Insight Pill */}
        <div className="hidden lg:flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-medium">
          <Sparkles size={13} className="text-amber-600 shrink-0 animate-pulse" />
          <span>AI Insight: <strong className="font-semibold">{hotDeskSeatsCount} hot desks currently make up {totalSeatsCount > 0 ? Math.round((hotDeskSeatsCount / totalSeatsCount) * 100) : 0}% of total seat inventory.</strong></span>
        </div>
      </div>

      {/* PAGE 1: EXECUTIVE OVERVIEW */}
      {activePage === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Visual 1: Department-Wise Seat Listing */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department Summary</span>
                  <h5 className="font-bold text-slate-900 text-sm">Department-Wise Seat Listing</h5>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                      <th className="p-2.5">Department</th>
                      <th className="p-2.5">Total Seats</th>
                      <th className="p-2.5">Occupied</th>
                      <th className="p-2.5">Vacant</th>
                      <th className="p-2.5">Occupancy Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departmentAllocationDataFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 italic">No department seat data available.</td>
                      </tr>
                    ) : (
                      departmentAllocationDataFiltered.map(d => (
                        <tr key={d.department} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-900">{d.department}</td>
                          <td className="p-2.5 font-mono">{d.totalSeats}</td>
                          <td className="p-2.5 font-mono text-blue-700">{d.occupiedSeats}</td>
                          <td className="p-2.5 font-mono text-emerald-700">{d.vacantSeats}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              d.occupancyRate >= 80 ? "bg-emerald-100 text-emerald-800" :
                              d.occupancyRate >= 50 ? "bg-amber-100 text-amber-800" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {d.occupancyRate}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual 2: Department Seat Distribution — corporate stacked bar chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department Distribution</span>
                <h5 className="font-bold text-slate-900 text-sm">Seat Allocation by Department</h5>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span>Occupied</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200"></span>Vacant</span>
              </div>

              <div className="space-y-3.5 pt-1 max-h-[420px] overflow-y-auto pr-1">
                {departmentAllocationDataFiltered.length === 0 ? (
                  <div className="text-center text-slate-400 italic text-xs py-8">No department seat data available.</div>
                ) : (
                  departmentAllocationDataFiltered.map(d => {
                    const occPct = (d.occupiedSeats / maxDeptTotalSeats) * 100;
                    const vacPct = (d.vacantSeats / maxDeptTotalSeats) * 100;
                    return (
                      <div key={d.department} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-700">
                          <span className="truncate pr-2">{d.department}</span>
                          <span className="font-mono text-slate-500 shrink-0">{d.totalSeats}</span>
                        </div>
                        <div className="w-full h-3 rounded-md bg-slate-100 overflow-hidden flex shadow-inner">
                          <div className="h-full bg-blue-600" style={{ width: `${occPct}%` }} />
                          <div className="h-full bg-slate-300" style={{ width: `${vacPct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual 2: Seat Type Share & Hot Desk Index */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inventory Composition</span>
                <h5 className="font-bold text-slate-900 text-sm mt-0.5">Seat Categories Breakdown</h5>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Standard */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-semibold">Standard Workspace</span>
                    <span className="font-mono font-bold">{standardSeatsCount} seats</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-700 h-full rounded-full" style={{ width: `${totalSeatsCount > 0 ? (standardSeatsCount / totalSeatsCount) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Hot Desk */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-semibold text-blue-700">Flexible Hot Desks</span>
                    <span className="font-mono font-bold text-blue-700">{hotDeskSeatsCount} seats</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${totalSeatsCount > 0 ? (hotDeskSeatsCount / totalSeatsCount) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Executive */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-semibold text-purple-700">Executive Suites</span>
                    <span className="font-mono font-bold text-purple-700">{executiveSeatsCount} seats</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: `${totalSeatsCount > 0 ? (executiveSeatsCount / totalSeatsCount) * 100 : 0}%` }}></div>
                  </div>
                </div>

                {/* Collaborative */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-semibold text-emerald-700">Collaborative Hubs</span>
                    <span className="font-mono font-bold text-emerald-700">{collaborativeSeatsCount} seats</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${totalSeatsCount > 0 ? (collaborativeSeatsCount / totalSeatsCount) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Summary Alert */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl space-y-1 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  <span>Flexibility Ratio</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Hot desks represent {totalSeatsCount > 0 ? Math.round((hotDeskSeatsCount / totalSeatsCount) * 100) : 0}% of total inventory. Hot desk turnover rate is optimal.
                </p>
              </div>
            </div>

          </div>

          {/* Visual 3: Zone Density Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spatial Density Matrix</span>
                <h5 className="font-bold text-slate-900 text-sm">Zone-by-Zone Occupancy Levels</h5>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search zone, dept, floor..."
                  value={zoneSearchQuery}
                  onChange={(e) => setZoneSearchQuery(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
                />
                
                <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={showZeroSeatZones}
                    onChange={(e) => setShowZeroSeatZones(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Show 0-seat utility areas</span>
                </label>

                <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-md">
                  {zoneDensityData.length} Zones
                </span>
              </div>
            </div>

            {zoneDensityData.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No active seating zones found matching search criteria. Try unticking "Show 0-seat utility areas" or clearing search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zoneDensityData.map(zd => (
                  <div 
                    key={zd.zoneId} 
                    onClick={() => setSelectedZoneModal(zd)}
                    className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 hover:border-blue-400 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group relative"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h6 className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-700 transition-colors" title={zd.zoneName}>{zd.zoneName}</h6>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded truncate max-w-[120px]">
                            {zd.department}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium truncate">
                            {zd.floorName}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono shrink-0 ${
                        zd.totalSeats === 0 ? "bg-slate-200 text-slate-600" :
                        zd.rate > 90 ? "bg-rose-100 text-rose-800 border border-rose-200" :
                        zd.rate > 70 ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {zd.totalSeats === 0 ? "Utility Room" : `${zd.rate}% Occupied`}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>Occ: <b className="text-emerald-700">{zd.occupiedSeats}</b> | Vacant: <b className="text-amber-600">{zd.vacantSeats}</b></span>
                        <span className="font-bold text-slate-700">{zd.occupiedSeats} / {zd.totalSeats}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            zd.totalSeats === 0 ? "bg-slate-300" :
                            zd.rate > 90 ? "bg-rose-500" : 
                            zd.rate > 70 ? "bg-emerald-500" : 
                            "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min(zd.rate, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-[10px] text-blue-600 font-bold flex items-center justify-between pt-1 border-t border-slate-100 opacity-90 group-hover:opacity-100">
                      <span>Click to view floor breakdown & seat data</span>
                      <ArrowUpRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Zone Detailed Popup Modal */}
            {selectedZoneModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
                  {/* Modal Header */}
                  <div className="p-5 bg-slate-900 text-white flex justify-between items-start shrink-0 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                          Merged Zone Occupancy Report
                        </span>
                        <span className="text-xs text-slate-300 font-mono">
                          {selectedZoneModal.floorCount} Floor(s)
                        </span>
                      </div>
                      <h3 className="text-xl font-bold font-display mt-1 text-white">{selectedZoneModal.zoneName}</h3>
                      <p className="text-xs text-slate-300">Department: {selectedZoneModal.department}</p>
                    </div>
                    <button
                      onClick={() => setSelectedZoneModal(null)}
                      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-lg cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Key Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Desks</span>
                        <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{selectedZoneModal.totalSeats}</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">Occupied</span>
                        <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{selectedZoneModal.occupiedSeats}</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Vacant Seats</span>
                        <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">{selectedZoneModal.vacantSeats}</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-blue-700 uppercase">Occupancy Ratio</span>
                        <div className="text-xl font-bold font-mono text-blue-700 mt-0.5">{selectedZoneModal.rate}%</div>
                      </div>
                    </div>

                    {/* Floor Breakdown Table */}
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
                            {selectedZoneModal.floorBreakdown.map((fb: any, i: number) => (
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

                    {/* Complete Seat Inventory */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={14} className="text-purple-600" />
                        <span>Seat Inventory & Occupant Details ({selectedZoneModal.seats.length} seats)</span>
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
                            {selectedZoneModal.seats.map((s: Seat) => {
                              const sFl = floors.find(f => f.id === s.floorId);
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

                  {/* Modal Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                    <button
                      onClick={() => setSelectedZoneModal(null)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Close Breakdown
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE 2: DEPARTMENT MATRIX */}
      {activePage === "departments" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department Analytics</span>
                <h5 className="font-bold text-slate-900 text-sm">Departmental Seat Allocation & Utilization</h5>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                    <th className="p-3">Department</th>
                    <th className="p-3">Total Allocated Seats</th>
                    <th className="p-3">Occupied Seats</th>
                    <th className="p-3">Vacant Seats</th>
                    <th className="p-3">Registered Staff</th>
                    <th className="p-3">Occupancy Rate</th>
                    <th className="p-3 text-right">Status Meter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departmentAllocationData.map(d => (
                    <tr key={d.department} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{d.department}</td>
                      <td className="p-3 font-mono font-medium">{d.totalSeats} seats</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{d.occupiedSeats} seats</td>
                      <td className="p-3 font-mono font-bold text-amber-600">{d.vacantSeats} seats</td>
                      <td className="p-3 font-mono text-slate-600">{d.employeeCount} staff</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[11px] ${
                          d.occupancyRate >= 80 ? "bg-emerald-100 text-emerald-800" :
                          d.occupancyRate >= 50 ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {d.occupancyRate}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden inline-block align-middle">
                          <div 
                            className={`h-full rounded-full ${d.occupancyRate >= 80 ? "bg-emerald-500" : "bg-blue-500"}`}
                            style={{ width: `${d.occupancyRate}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 3: IT ASSET AUDITS */}
      {activePage === "assets" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Laptops / Desktops</span>
                <Laptop size={16} className="text-blue-600" />
              </div>
              <h4 className="text-2xl font-bold font-display text-slate-900">
                {assets.filter(a => a.type.toLowerCase().includes("laptop") || a.type.toLowerCase().includes("desktop")).length}
              </h4>
              <p className="text-[11px] text-slate-500">
                {assets.filter(a => (a.type.toLowerCase().includes("laptop") || a.type.toLowerCase().includes("desktop")) && a.status === "Assigned").length} Linked to employee desks
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Quad HD Displays</span>
                <Monitor size={16} className="text-purple-600" />
              </div>
              <h4 className="text-2xl font-bold font-display text-slate-900">
                {assets.filter(a => a.type.toLowerCase().includes("monitor") || a.type.toLowerCase().includes("display")).length}
              </h4>
              <p className="text-[11px] text-slate-500">
                {assets.filter(a => a.type.toLowerCase().includes("monitor") && a.status === "Assigned").length} Mounted at active workstations
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Docking Stations</span>
                <HardDrive size={16} className="text-emerald-600" />
              </div>
              <h4 className="text-2xl font-bold font-display text-slate-900">
                {assets.filter(a => a.type.toLowerCase().includes("dock")).length}
              </h4>
              <p className="text-[11px] text-slate-500">
                {assets.filter(a => a.type.toLowerCase().includes("dock") && a.status === "Assigned").length} Active in docking hubs
              </p>
            </div>

          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IT Inventory Registry</span>
                <h5 className="font-bold text-slate-900 text-sm">Asset Hardware Compliance Audit</h5>
              </div>
              <span className="text-xs text-slate-500 font-mono font-medium">{assets.length} Total Registered Assets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                    <th className="p-3">Asset Tag</th>
                    <th className="p-3">Device Name & Type</th>
                    <th className="p-3">Serial Number</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Linked Employee / Seat</th>
                    <th className="p-3">Warranty Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.slice(0, 10).map(ast => (
                    <tr key={ast.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-700">{ast.assetTag}</td>
                      <td className="p-3 font-medium text-slate-900">{ast.name} <span className="text-[10px] text-slate-400">({ast.type})</span></td>
                      <td className="p-3 font-mono text-slate-500">{ast.serialNumber}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          ast.status === "Assigned" ? "bg-emerald-100 text-emerald-800" :
                          ast.status === "Available" ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {ast.status}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {ast.employeeName ? `${ast.employeeName} (${ast.seatNumber || 'Unassigned'})` : ast.seatNumber ? `Seat ${ast.seatNumber}` : "Unlinked"}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{ast.warrantyExpiry || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 4: DETAILED SEAT MATRIX */}
      {activePage === "matrix" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Interactive Power BI Table</span>
              <h5 className="font-bold text-slate-900 text-sm">Detailed Seat & Spatial Allocation Registry</h5>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search seat, employee, zone..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 w-64"
                />
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">{matrixSeatsList.length} rows</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                  <th className="p-3">Seat No.</th>
                  <th className="p-3">Zone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Assigned Employee</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Canvas Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixSeatsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                      No matching seats found for the current slicer filters.
                    </td>
                  </tr>
                ) : (
                  matrixSeatsList.map(st => {
                    const parentZone = zones.find(z => z.id === st.zoneId);
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold font-mono text-slate-900">{st.seatNumber}</td>
                        <td className="p-3 font-medium text-slate-800">{parentZone?.name || "Zone A"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            st.status === "Occupied" ? "bg-emerald-100 text-emerald-800" :
                            st.status === "Reserved" ? "bg-amber-100 text-amber-800" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {st.status}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-700">{st.type}</td>
                        <td className="p-3 font-bold text-slate-900">{st.employeeName || "—"}</td>
                        <td className="p-3 font-mono text-slate-500">{st.employeeEmail || "—"}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">({st.x}, {st.y})</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGE 5: HOT DESK ALLOCATION REPORT */}
      {activePage === "hotdesk" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seating Upload Report</span>
              <h5 className="font-bold text-slate-900 text-sm">Hot Desk Allocation</h5>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search seat, manager, department, desk type..."
                  value={hotDeskSearch}
                  onChange={(e) => setHotDeskSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 w-72"
                />
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">{filteredHotDeskAllocationData.length} rows</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                  <th className="p-3">Seat Number</th>
                  <th className="p-3">Manager Name</th>
                  <th className="p-3">Department Name</th>
                  <th className="p-3">Seat Type</th>
                  <th className="p-3">Desk Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHotDeskAllocationData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                      No matching seats found.
                    </td>
                  </tr>
                ) : (
                  filteredHotDeskAllocationData.map(row => (
                    <tr key={row.seatId} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold font-mono text-slate-900">{row.seatNumber}</td>
                      <td className="p-3 font-medium text-slate-800">{row.managerName}</td>
                      <td className="p-3 font-medium text-slate-700">{row.departmentName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          row.seatStatus === "Occupied" ? "bg-emerald-100 text-emerald-800" :
                          row.seatStatus === "Reserved" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {row.seatStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          row.deskType === "Hot Desk" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                        }`}>
                          {row.deskType}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
