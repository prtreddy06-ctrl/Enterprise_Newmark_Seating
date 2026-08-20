import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Download,
  Database,
  FileText,
  RefreshCw,
  Link as LinkIcon,
  XCircle,
  Clock,
  ShieldAlert,
  Laptop,
  Building2,
  Layers,
  RotateCcw
} from "lucide-react";
import * as XLSX from "xlsx";
import { ITAsset, Seat, EmployeeProfile, AssetExcelImportResult, Floor, Building, Zone } from "../types";
import { downloadDepartmentSeatTemplate } from "../utils/excelTemplates";

/**
 * Safely extracts a cell value from an Excel row matching candidate field keys,
 * supporting exact matches, normalized case-insensitive keys, and numeric values.
 */
function getFieldValue(row: Record<string, any>, candidateKeys: string[]): string {
  if (!row || typeof row !== "object") return "";

  // 1. Direct key match (preserving numeric values like seat number 1, 2, 3...)
  for (const key of candidateKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      const val = String(row[key]).trim();
      if (val !== "") return val;
    }
  }

  // 2. Normalized key match (lowercase, removing all punctuation/spaces)
  const rowKeys = Object.keys(row);
  const normalizedCandidates = candidateKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ""));

  for (const rKey of rowKeys) {
    const normRKey = rKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedCandidates.includes(normRKey)) {
      if (row[rKey] !== undefined && row[rKey] !== null) {
        const val = String(row[rKey]).trim();
        if (val !== "") return val;
      }
    }
  }

  // 3. Substring match for compound header names like "Seat Allocated Department"
  for (const rKey of rowKeys) {
    const normRKey = rKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const cand of candidateKeys) {
      const normCand = cand.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normCand.length >= 4 && (normRKey.includes(normCand) || normCand.includes(normRKey))) {
        if (row[rKey] !== undefined && row[rKey] !== null) {
          const val = String(row[rKey]).trim();
          if (val !== "") return val;
        }
      }
    }
  }

  return "";
}

interface ExcelUploadProps {
  onCommitBulkAssets: (newAssets: ITAsset[]) => void;
  onCommitBulkSeats?: (newSeats: Seat[], targetFloorId?: string) => void;
  existingAssets: ITAsset[];
  existingSeats: Seat[];
  employees: EmployeeProfile[];
  activeRole: string;
  onAddAuditLog: (action: string, category: any, details: string) => void;
  floors?: Floor[];
  buildings?: Building[];
  zones?: Zone[];
}

interface RawAssetRow {
  "Asset ID"?: string;
  "Asset Tag"?: string;
  "Asset Name"?: string;
  "Asset Type"?: string;
  "Asset Category"?: string;
  "Manufacturer"?: string;
  "Model"?: string;
  "Serial Number"?: string;
  "Warranty Expiry Date"?: string;
  "Asset Status"?: string;
  "Employee ID"?: string;
  "Employee Name"?: string;
  "Department"?: string;
  "Company"?: string;
  "Business Head"?: string;
  "Manager (Member)"?: string;
  "Building"?: string;
  "Floor"?: string;
  "Zone"?: string;
  "Seat Number"?: string;
  "Remarks"?: string;
  [key: string]: any;
}

interface SeatExcelImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  duplicateInFileCount?: number;
  importedSeats: Seat[];
  errorReport: {
    rowNumber: number;
    seatNumber: string;
    department: string;
    businessLead: string;
    reason: string;
  }[];
}

export default function ExcelUpload({ 
  onCommitBulkAssets, 
  onCommitBulkSeats,
  existingAssets, 
  existingSeats, 
  employees, 
  activeRole,
  onAddAuditLog,
  floors = [],
  buildings = [],
  zones = []
}: ExcelUploadProps) {
  const [activeTab, setActiveTab] = useState<"IT_ASSETS" | "DEPT_SEATS">("IT_ASSETS");
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>("");
  
  // Floor destination selector for appending seats
  const [targetFloorId, setTargetFloorId] = useState<string>(() => {
    return floors && floors.length > 0 ? floors[0].id : "f1";
  });

  useEffect(() => {
    if (floors && floors.length > 0 && !floors.some(f => f.id === targetFloorId)) {
      setTargetFloorId(floors[0].id);
    }
  }, [floors]);
  
  // Results of import analysis
  const [importResult, setImportResult] = useState<AssetExcelImportResult | null>(null);
  const [seatImportResult, setSeatImportResult] = useState<SeatExcelImportResult | null>(null);

  // Authorized roles check
  const isAuthorized = ["Super User", "Admin", "IT Administrator", "Member (Dept Head)"].includes(activeRole);

  // Download Bulk Department Seat Allocation Template (Seat Number, Department, Business Lead Name, Building, Floor, Zone)
  const handleDownloadSeatTemplate = () => {
    downloadDepartmentSeatTemplate(onAddAuditLog, floors, buildings);
  };

  // Sample Scenarios Loader for Department Seat Allocation
  const loadMockSeatScenario = () => {
    setIsProcessing(true);
    setProgress(15);
    setProgressStage("Reading Bulk Department Seat Excel file...");
    setFileName("Department_Seat_Allocations_Batch.xlsx");

    setTimeout(() => {
      setProgress(60);
      setProgressStage("Validating Seat Numbers and Department Lead names against workspace...");

      setTimeout(() => {
        setProgress(100);
        setIsProcessing(false);

        const mockSeats: Seat[] = [
          {
            id: "seat-mock-1",
            seatNumber: "A-101",
            buildingId: "b1",
            floorId: "f1",
            zoneId: "z1",
            type: "Standard",
            status: "Occupied",
            department: "Engineering",
            allocatedDepartment: "Engineering",
            allocatedManager: "Marcus Wright",
            managerName: "Marcus Wright",
            employeeName: "Marcus Wright (Lead)",
            x: 10,
            y: 20
          },
          {
            id: "seat-mock-2",
            seatNumber: "A-102",
            buildingId: "b1",
            floorId: "f1",
            zoneId: "z1",
            type: "Standard",
            status: "Occupied",
            department: "Engineering",
            allocatedDepartment: "Engineering",
            allocatedManager: "Marcus Wright",
            managerName: "Marcus Wright",
            employeeName: "Marcus Wright (Lead)",
            x: 15,
            y: 20
          },
          {
            id: "seat-mock-3",
            seatNumber: "B-201",
            buildingId: "b1",
            floorId: "f1",
            zoneId: "z2",
            type: "Standard",
            status: "Occupied",
            department: "Sales & Marketing",
            allocatedDepartment: "Sales & Marketing",
            allocatedManager: "Sarah Connor",
            managerName: "Sarah Connor",
            employeeName: "Sarah Connor (Lead)",
            x: 40,
            y: 30
          },
          {
            id: "seat-mock-4",
            seatNumber: "C-301",
            buildingId: "b1",
            floorId: "f1",
            zoneId: "z3",
            type: "Executive",
            status: "Reserved",
            department: "Finance & Operations",
            allocatedDepartment: "Finance & Operations",
            allocatedManager: "John Reese",
            managerName: "John Reese",
            employeeName: "John Reese (Lead)",
            x: 70,
            y: 60
          }
        ];

        setSeatImportResult({
          totalRows: 4,
          successCount: 4,
          failedCount: 0,
          importedSeats: mockSeats,
          errorReport: []
        });
      }, 300);
    }, 300);
  };

  // Template Download
  const handleDownloadAssetTemplate = () => {
    const templateRows = [
      {
        "Asset ID": "AST-2001",
        "Asset Tag": "EQ-LP-9011",
        "Asset Name": "MacBook Pro 16 M3 Pro",
        "Asset Type": "Laptop",
        "Asset Category": "Hardware / Compute",
        "Manufacturer": "Apple",
        "Model": "A2992",
        "Serial Number": "SN9011223",
        "Warranty Expiry Date": "2028-12-31",
        "Asset Status": "Assigned",
        "Employee ID": "emp-001",
        "Employee Name": "Sarah Connor",
        "Department": "Engineering",
        "Company": "Global Cyber Systems",
        "Business Head": "Marcus Wright",
        "Manager (Member)": "Pratyush Reddy",
        "Building": "Newmark _Hyderabad",
        "Floor": "11 th Floor CRE",
        "Zone": "Zone A (Cloud Platform)",
        "Seat Number": "A-101",
        "Remarks": "Standard high-performance developer laptop"
      },
      {
        "Asset ID": "AST-2002",
        "Asset Tag": "EQ-MN-8840",
        "Asset Name": "Dell UltraSharp 32 4K USB-C",
        "Asset Type": "Monitor",
        "Asset Category": "Peripherals / Displays",
        "Manufacturer": "Dell",
        "Model": "U3223QE",
        "Serial Number": "SN8840112",
        "Warranty Expiry Date": "2027-10-15",
        "Asset Status": "Assigned",
        "Employee ID": "emp-002",
        "Employee Name": "David Lightman",
        "Department": "Engineering",
        "Company": "Global Cyber Systems",
        "Business Head": "Marcus Wright",
        "Manager (Member)": "Sarah Connor",
        "Building": "Newmark _Hyderabad",
        "Floor": "11 th Floor CRE",
        "Zone": "Zone A (Cloud Platform)",
        "Seat Number": "A-102",
        "Remarks": "Dual 4K workstation monitor"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "IT_Assets_Template");
    XLSX.writeFile(workbook, "IT_Assets_Import_Template.xlsx");
    
    onAddAuditLog("Download Template", "Excel Ingest", "Downloaded IT Asset Excel import template.");
  };

  // Sample Scenarios Loader
  const loadMockScenario = (scenarioType: "CLEAN" | "WITH_ERRORS") => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, or IT Administrator can import IT assets.");
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setProgressStage("Reading Excel sheet structure...");
    setFileName(scenarioType === "CLEAN" ? "IT_Assets_Quarterly_Onboarding.xlsx" : "IT_Assets_Import_Conflict_Batch.xlsx");

    setTimeout(() => {
      setProgress(40);
      setProgressStage("Validating Asset IDs & Serial Numbers against live database...");
      
      setTimeout(() => {
        setProgress(75);
        setProgressStage("Auto-linking matches to employee profiles and seats...");

        setTimeout(() => {
          setProgress(100);
          setIsProcessing(false);

          if (scenarioType === "CLEAN") {
            const cleanAssets: ITAsset[] = [
              {
                id: "AST-3001",
                assetTag: "EQ-LP-9901",
                name: "Lenovo ThinkPad P1 Gen 6",
                type: "Laptop",
                category: "Hardware / Compute",
                manufacturer: "Lenovo",
                model: "ThinkPad P1",
                serialNumber: "SN9901881",
                warrantyExpiry: "2028-11-30",
                status: "Assigned",
                employeeId: "emp-001",
                employeeName: "Sarah Connor",
                department: "Engineering",
                company: "Global Cyber Systems",
                businessHead: "Marcus Wright",
                manager: "Pratyush Reddy",
                building: "Newmark _Hyderabad",
                floor: "11 th Floor CRE",
                zone: "Zone A (Cloud Platform)",
                seatNumber: "A-101",
                seatId: "s1",
                assignmentDate: new Date().toISOString().split("T")[0],
                remarks: "Clean batch import item 1"
              },
              {
                id: "AST-3002",
                assetTag: "EQ-DK-7712",
                name: "Anker 13-in-1 USB-C Dock",
                type: "Docking Station",
                category: "Peripherals",
                manufacturer: "Anker",
                model: "A8396",
                serialNumber: "SN7712330",
                warrantyExpiry: "2027-08-20",
                status: "Assigned",
                employeeId: "emp-002",
                employeeName: "David Lightman",
                department: "Engineering",
                company: "Global Cyber Systems",
                businessHead: "Marcus Wright",
                manager: "Sarah Connor",
                building: "Newmark _Hyderabad",
                floor: "11 th Floor CRE",
                zone: "Zone A (Cloud Platform)",
                seatNumber: "A-102",
                seatId: "s2",
                assignmentDate: new Date().toISOString().split("T")[0],
                remarks: "Clean batch import item 2"
              },
              {
                id: "AST-3003",
                assetTag: "EQ-PH-5541",
                name: "Poly VVX 450 IP Phone",
                type: "Telephone",
                category: "Telecommunications",
                manufacturer: "Polycom",
                model: "VVX 450",
                serialNumber: "SN5541900",
                warrantyExpiry: "2028-05-15",
                status: "Available",
                building: "Newmark _Hyderabad",
                floor: "11 th Floor CRE",
                zone: "IT Storage Locker 1",
                remarks: "Unassigned spare phone in locker"
              }
            ];

            setImportResult({
              totalRows: 3,
              successCount: 3,
              failedCount: 0,
              skippedCount: 0,
              importedAssets: cleanAssets,
              errorReport: []
            });
          } else {
            // Conflicts / Duplicate scenario
            const validAssets: ITAsset[] = [
              {
                id: "AST-4001",
                assetTag: "EQ-KB-1122",
                name: "Keychron K8 Wireless Keyboard",
                type: "Keyboard",
                category: "Input Devices",
                manufacturer: "Keychron",
                model: "K8 Pro",
                serialNumber: "SN1122998",
                warrantyExpiry: "2029-01-01",
                status: "Assigned",
                employeeId: "emp-u-1784665865597",
                employeeName: "Ravi Teja Reddy",
                department: "Engineering",
                building: "Newmark _Hyderabad",
                floor: "11 th Floor CRE",
                seatNumber: "B-201",
                seatId: "s7",
                assignmentDate: new Date().toISOString().split("T")[0]
              }
            ];

            setImportResult({
              totalRows: 4,
              successCount: 1,
              failedCount: 2,
              skippedCount: 1,
              importedAssets: validAssets,
              errorReport: [
                {
                  rowNumber: 2,
                  assetId: "AST-1001", // Duplicate existing ID
                  serialNumber: "SN8842911", // Duplicate existing Serial
                  reason: "Duplicate Asset ID & Serial Number already exist in central database.",
                  fieldInError: "Asset ID / Serial Number",
                  rawData: { "Asset ID": "AST-1001", "Serial Number": "SN8842911", "Asset Name": "MacBook Pro 16" }
                },
                {
                  rowNumber: 3,
                  assetId: "", // Missing mandatory Asset ID
                  serialNumber: "SN9900112",
                  reason: "Mandatory field 'Asset ID' is missing or blank.",
                  fieldInError: "Asset ID",
                  rawData: { "Asset ID": "", "Serial Number": "SN9900112", "Asset Name": "Dell Monitor" }
                },
                {
                  rowNumber: 4,
                  assetId: "AST-1002",
                  serialNumber: "SN2034102",
                  reason: "Skipped: Record identically matches active record with no changes.",
                  fieldInError: "Row duplicate",
                  rawData: { "Asset ID": "AST-1002", "Serial Number": "SN2034102" }
                }
              ]
            });
          }
        }, 300);
      }, 300);
    }, 400);
  };

  // Real File Upload Handler (Parses .xlsx / .xls / .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, IT Administrator, or Dept Head can upload files.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setProgress(15);
    setProgressStage("Reading uploaded file contents...");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        setProgress(40);
        setProgressStage("Parsing sheet matrix...");
        
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "", raw: false });

        setProgress(70);

        const firstRow = jsonRows[0] || {};
        const detectedSeatHeader = getFieldValue(firstRow, [
          "Seat Number", "Seat", "SeatNo", "Seat No", "Seat #", "Seat ID", "SeatId", "Seat_Number"
        ]);
        const detectedDeptHeader = getFieldValue(firstRow, [
          "Department", "Allocated Department", "Seat Allocated Department", "Dept", "Dept Name", "Department Name"
        ]);

        const isSeatFile = activeTab === "DEPT_SEATS" || Boolean(detectedSeatHeader || detectedDeptHeader);

        if (isSeatFile) {
          setProgressStage("Validating Seat Numbers, Departments, and Business Leads...");
          
          const successSeats: Seat[] = [];
          const reports: SeatExcelImportResult["errorReport"] = [];
          let successCount = 0;
          let failedCount = 0;
          let duplicateInFileCount = 0;

          jsonRows.forEach((row, idx) => {
            const rowNum = idx + 2;
            const seatNum = getFieldValue(row, [
              "Seat Number", "Seat", "SeatNo", "Seat No", "Seat #", 
              "Seat ID", "SeatId", "Seat_Number", "SeatNo.", "Seat Number/ID", "Seat Code"
            ]);
            
            const dept = getFieldValue(row, [
              "Department", "Allocated Department", "Seat Allocated Department", 
              "Dept", "Dept Name", "Department Name", "AllocatedDept", 
              "Allocated Dept", "Allocated_Department", "Department Allocated"
            ]);

            const leadName = getFieldValue(row, [
              "Business Lead Name", "Business Lead", "Bussiness lead Name", 
              "Bussiness Lead Name", "Business Head", "Manager Name", 
              "Manager", "Lead Name", "Lead", "Dept Lead", "Department Head",
              "Admin Control"
            ]);

            const statusVal = getFieldValue(row, [
              "Status", "Seat Status", "Occupancy Status", "Occupancy"
            ]);

            const deskTypeVal = getFieldValue(row, [
              "Desk Type", "Seat Type", "DeskType", "SeatType", "Desk_Type"
            ]);
            const normalizedDeskType = (() => {
              const v = deskTypeVal.toLowerCase().trim();
              if (v.includes("hot")) return "Hot Desk";
              if (v.includes("exec")) return "Executive";
              if (v.includes("collab")) return "Collaborative";
              if (v.includes("standard")) return "Standard";
              return null; // unspecified — keep whatever the matched seat already had, or default
            })();

            if (!seatNum) {
              failedCount++;
              reports.push({
                rowNumber: rowNum,
                seatNumber: "N/A",
                department: dept || "N/A",
                businessLead: leadName || "N/A",
                reason: "Mandatory column 'Seat' or 'Seat Number' (e.g. 1, 2, A-101) is missing or blank."
              });
              return;
            }

            const isDeptVacant = dept.trim().toLowerCase() === "vacant" || statusVal.trim().toLowerCase() === "vacant";

            // Only the Seat Number is truly mandatory. A row with no
            // Department and no Status isn't invalid data — it just means
            // "this seat exists, nothing allocated yet" (equivalent to
            // Vacant), so every row with a real seat number now gets read
            // and applied instead of being silently rejected.
            const cleanSeatNum = seatNum.toLowerCase().trim();
            const normClean = cleanSeatNum.replace(/^s[-_\s]*/i, "").replace(/^seat[-_\s]*/i, "").trim();

            const selectedFloorObj = floors.find(f => f.id === targetFloorId);
            const rowFloorVal = getFieldValue(row, ["Floor", "Floor Name", "Floor ID", "Building Floor"]);
            const rowBuildingVal = getFieldValue(row, ["Building", "Building Name", "Building ID"]);
            let effectiveFloorId = targetFloorId;
            let effectiveBuildingId = selectedFloorObj?.buildingId || "b1";

            if (rowFloorVal && floors.length > 0) {
              const normalizedRowFloor = rowFloorVal.toLowerCase().trim();
              // Our own template appends "(Building Name)" after the floor
              // name — strip that back off before comparing so a value the
              // app itself generated always matches exactly.
              const rowFloorCore = normalizedRowFloor.replace(/\s*\([^)]*\)\s*$/, "").trim();

              // Prefer an EXACT match (optionally narrowed by a Building
              // column) over a fuzzy "includes" match, so e.g. "Floor 1"
              // never accidentally matches "Floor 10" or vice versa.
              const candidateFloors = rowBuildingVal
                ? floors.filter(f => {
                    const bld = buildings.find(b => b.id === f.buildingId);
                    return bld && bld.name.toLowerCase().trim() === rowBuildingVal.toLowerCase().trim();
                  })
                : floors;
              const searchIn = candidateFloors.length > 0 ? candidateFloors : floors;

              const exactMatch = searchIn.find(f =>
                f.name.toLowerCase().trim() === normalizedRowFloor ||
                f.name.toLowerCase().trim() === rowFloorCore ||
                f.id.toLowerCase() === normalizedRowFloor
              );
              const fuzzyMatch = !exactMatch ? searchIn.find(f =>
                f.name.toLowerCase().includes(normalizedRowFloor) || f.name.toLowerCase().includes(rowFloorCore)
              ) : undefined;

              const matchedFl = exactMatch || fuzzyMatch;
              if (matchedFl) {
                effectiveFloorId = matchedFl.id;
                effectiveBuildingId = matchedFl.buildingId;
              }
            }

            const allCurrentSeats = [...existingSeats, ...successSeats];
            // Match seat prioritizing target floor first
            const matchedSeat = allCurrentSeats.find(s => {
              if (!s || !s.seatNumber || s.floorId !== effectiveFloorId) return false;
              const existingNum = s.seatNumber.toLowerCase().trim();
              const normExisting = existingNum.replace(/^s[-_\s]*/i, "").replace(/^seat[-_\s]*/i, "").trim();
              return (
                existingNum === cleanSeatNum ||
                (normClean !== "" && normExisting === normClean) ||
                existingNum === `s-${cleanSeatNum}` ||
                existingNum === `seat-${cleanSeatNum}` ||
                existingNum === `a-${cleanSeatNum}` ||
                s.id.toLowerCase() === cleanSeatNum
              );
            }) || allCurrentSeats.find(s => {
              if (!s || !s.seatNumber) return false;
              const existingNum = s.seatNumber.toLowerCase().trim();
              const normExisting = existingNum.replace(/^s[-_\s]*/i, "").replace(/^seat[-_\s]*/i, "").trim();
              return (
                existingNum === cleanSeatNum ||
                (normClean !== "" && normExisting === normClean) ||
                existingNum === `s-${cleanSeatNum}` ||
                existingNum === `seat-${cleanSeatNum}` ||
                existingNum === `a-${cleanSeatNum}` ||
                s.id.toLowerCase() === cleanSeatNum
              );
            });

            // ------------------------------------------------------------------
            // Auto-assign a zone by seat number — the "Zone" column in the sheet
            // is optional. If the seat already exists we keep its current zone
            // untouched. For a brand-new seat, we find the numerically closest
            // seat already placed on this floor and adopt its zone (seats with
            // nearby numbers are almost always grouped in the same zone), only
            // falling back to an explicit "Zone" column value or the floor's
            // first zone if there's nothing nearby to go on.
            const extractSeatDigits = (num: string): number | null => {
              const match = num.match(/(\d+)/);
              return match ? parseInt(match[1], 10) : null;
            };
            const rowZoneVal = getFieldValue(row, ["Zone", "Zone Name", "Zone ID"]);
            const computeAutoZoneId = (): string => {
              if (rowZoneVal) {
                const matchedZone = zones.find(z =>
                  z.floorId === effectiveFloorId &&
                  (z.name.toLowerCase() === rowZoneVal.toLowerCase() || z.id.toLowerCase() === rowZoneVal.toLowerCase())
                );
                if (matchedZone) return matchedZone.id;
              }

              const targetDigits = extractSeatDigits(cleanSeatNum);
              if (targetDigits !== null) {
                const floorSeats = allCurrentSeats.filter(s => s.floorId === effectiveFloorId && s.zoneId);
                let closestSeat: Seat | null = null;
                let closestDistance = Infinity;
                floorSeats.forEach(s => {
                  const seatDigits = extractSeatDigits(s.seatNumber);
                  if (seatDigits === null) return;
                  const distance = Math.abs(seatDigits - targetDigits);
                  if (distance < closestDistance) {
                    closestDistance = distance;
                    closestSeat = s;
                  }
                });
                if (closestSeat) return (closestSeat as Seat).zoneId;
              }

              const firstFloorZone = zones.find(z => z.floorId === effectiveFloorId);
              return firstFloorZone?.id || "z1";
            };

            const effectiveDept = isDeptVacant ? "" : dept;
            // A row explicitly marked Vacant means "nobody is assigned here" —
            // don't carry over a Business Lead Name or a previously matched
            // seat's manager/employee, or this seat would still look reserved
            // for a department even though it's supposed to be open.
            const effectiveManager = isDeptVacant ? "" : (leadName || (matchedSeat ? matchedSeat.allocatedManager || matchedSeat.managerName : "Department Head"));

            const isFutureExpansion = dept.toLowerCase().includes("expansion") || dept.toLowerCase().includes("future");
            const hasAssignedPerson = Boolean(getFieldValue(row, ["Employee", "Employee Name", "Employee ID", "Occupant", "Assigned To"]));
            const explicitOccupied = statusVal.toLowerCase() === "occupied" || statusVal.toLowerCase() === "assigned";
            const explicitVacant = statusVal.toLowerCase() === "vacant" || statusVal.toLowerCase() === "available" || statusVal.toLowerCase() === "unallocated";

            let effectiveStatus: "Vacant" | "Occupied" | "Reserved" = "Vacant";
            if (isDeptVacant || explicitVacant) {
              effectiveStatus = "Vacant";
            } else if (isFutureExpansion) {
              effectiveStatus = "Reserved";
            } else if (explicitOccupied || hasAssignedPerson) {
              effectiveStatus = "Occupied";
            } else if (matchedSeat && (matchedSeat.employeeName || matchedSeat.employeeEmail)) {
              effectiveStatus = "Occupied";
            } else {
              effectiveStatus = (matchedSeat?.status && matchedSeat.status !== "Occupied") ? matchedSeat.status : "Vacant";
            }

            const updatedSeat: Seat = matchedSeat ? {
              ...matchedSeat,
              floorId: effectiveFloorId,
              buildingId: effectiveBuildingId,
              department: effectiveDept,
              allocatedDepartment: effectiveDept,
              allocatedManager: effectiveManager,
              managerName: effectiveManager,
              status: effectiveStatus,
              type: (normalizedDeskType as Seat["type"]) || matchedSeat.type,
              // Clearing a seat back to Vacant also clears whoever it was
              // fixed/locked to, and any leftover employee/occupant fields.
              ...(isDeptVacant ? { isFixedSlot: false, employeeName: undefined, employeeId: undefined, employeeEmail: undefined } : {})
            } : {
              id: `seat-bulk-${Date.now()}-${idx}`,
              seatNumber: seatNum,
              buildingId: effectiveBuildingId,
              floorId: effectiveFloorId,
              zoneId: computeAutoZoneId(),
              type: (normalizedDeskType as Seat["type"]) || "Standard",
              status: effectiveStatus,
              department: effectiveDept,
              allocatedDepartment: effectiveDept,
              allocatedManager: effectiveManager,
              managerName: effectiveManager,
              x: 10 + (idx * 5) % 80,
              y: 10 + (idx * 3) % 80
            };

            const existingIndex = successSeats.findIndex(s => s.id === updatedSeat.id);
            if (existingIndex !== -1) {
              successSeats[existingIndex] = updatedSeat;
              duplicateInFileCount++;
            } else {
              successSeats.push(updatedSeat);
              successCount++;
            }
          });

          setProgress(100);
          setIsProcessing(false);

          setSeatImportResult({
            totalRows: jsonRows.length,
            successCount,
            failedCount,
            duplicateInFileCount,
            importedSeats: successSeats,
            errorReport: reports
          });

          onAddAuditLog(
            "Bulk Seat Excel Processed",
            "Excel Ingest",
            `Uploaded '${file.name}': ${successCount} seats parsed and ready for bulk department allocation.`
          );
          return;
        }

        setProgressStage("Running database uniqueness checks & profile auto-link...");

        const successAssets: ITAsset[] = [];
        const errorReports: AssetExcelImportResult["errorReport"] = [];
        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        const seenInFileIds = new Set<string>();
        const seenInFileSerials = new Set<string>();

        jsonRows.forEach((row, index) => {
          const rowNum = index + 2; // 1-indexed row header offset
          const assetId = (row["Asset ID"] || row["assetId"] || row["id"] || "").toString().trim();
          const assetTag = (row["Asset Tag"] || row["assetTag"] || "").toString().trim();
          const assetName = (row["Asset Name"] || row["name"] || "").toString().trim();
          const assetType = (row["Asset Type"] || row["type"] || "Laptop").toString().trim();
          const serialNumber = (row["Serial Number"] || row["serialNumber"] || "").toString().trim();
          const warrantyExpiry = (row["Warranty Expiry Date"] || row["warrantyExpiry"] || "2028-12-31").toString().trim();
          const empId = (row["Employee ID"] || row["employeeId"] || "").toString().trim();
          const empName = (row["Employee Name"] || row["employeeName"] || "").toString().trim();
          const seatNum = (row["Seat Number"] || row["seatNumber"] || "").toString().trim();

          // Validation rules
          if (!assetId) {
            failedCount++;
            errorReports.push({
              rowNumber: rowNum,
              assetId: "N/A",
              serialNumber: serialNumber || "N/A",
              reason: "Mandatory field 'Asset ID' is missing.",
              fieldInError: "Asset ID",
              rawData: row
            });
            return;
          }

          if (!serialNumber) {
            failedCount++;
            errorReports.push({
              rowNumber: rowNum,
              assetId,
              serialNumber: "N/A",
              reason: "Mandatory field 'Serial Number' is missing.",
              fieldInError: "Serial Number",
              rawData: row
            });
            return;
          }

          // Check duplicate in database
          const existsDbId = existingAssets.some(a => a.id === assetId);
          const existsDbSerial = existingAssets.some(a => a.serialNumber === serialNumber);

          if (existsDbId || existsDbSerial) {
            failedCount++;
            errorReports.push({
              rowNumber: rowNum,
              assetId,
              serialNumber,
              reason: `Duplicate detected: ${existsDbId ? "Asset ID '" + assetId + "' exists." : ""} ${existsDbSerial ? "Serial '" + serialNumber + "' exists." : ""}`,
              fieldInError: existsDbId ? "Asset ID" : "Serial Number",
              rawData: row
            });
            return;
          }

          // Check duplicate in same file
          if (seenInFileIds.has(assetId) || seenInFileSerials.has(serialNumber)) {
            skippedCount++;
            errorReports.push({
              rowNumber: rowNum,
              assetId,
              serialNumber,
              reason: "Skipped: File contains duplicate row for same Asset ID or Serial.",
              fieldInError: "Duplicate row",
              rawData: row
            });
            return;
          }

          seenInFileIds.add(assetId);
          seenInFileSerials.add(serialNumber);

          // Find seat auto-link match
          const matchedSeat = existingSeats.find(s => s.seatNumber.toLowerCase() === seatNum.toLowerCase());
          
          // Find employee auto-link match
          const matchedEmp = employees.find(e => e.id.toLowerCase() === empId.toLowerCase() || e.name.toLowerCase() === empName.toLowerCase());

          const newAsset: ITAsset = {
            id: assetId,
            assetTag: assetTag || `EQ-${assetType.substring(0,2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            name: assetName || `${assetType} Hardware Unit`,
            type: assetType,
            category: row["Asset Category"] || "Hardware",
            manufacturer: row["Manufacturer"] || "Enterprise Supplier",
            model: row["Model"] || "Standard Issue",
            serialNumber,
            warrantyExpiry,
            status: (row["Asset Status"] as any) || (matchedEmp || matchedSeat ? "Assigned" : "Available"),
            employeeId: matchedEmp?.id || empId,
            employeeName: matchedEmp?.name || empName,
            department: row["Department"] || matchedEmp?.department || matchedSeat?.department,
            company: row["Company"] || "Global Enterprise Corp",
            businessHead: row["Business Head"] || "Marcus Wright",
            manager: row["Manager (Member)"] || matchedEmp?.manager,
            building: row["Building"] || matchedSeat?.buildingId || "Newmark _Hyderabad",
            floor: row["Floor"] || matchedSeat?.floorId || "11 th Floor CRE",
            zone: row["Zone"] || matchedSeat?.zoneId,
            seatNumber: matchedSeat?.seatNumber || seatNum,
            seatId: matchedSeat?.id,
            assignmentDate: (matchedEmp || matchedSeat) ? new Date().toISOString().split("T")[0] : undefined,
            remarks: row["Remarks"] || "Uploaded via Excel Importer"
          };

          successAssets.push(newAsset);
          successCount++;
        });

        setProgress(100);
        setIsProcessing(false);

        setImportResult({
          totalRows: jsonRows.length,
          successCount,
          failedCount,
          skippedCount,
          importedAssets: successAssets,
          errorReport: errorReports
        });

        onAddAuditLog(
          "Excel IT Asset Processed",
          "Excel Ingest",
          `Uploaded '${file.name}': ${successCount} successful, ${failedCount} failed, ${skippedCount} skipped.`
        );

      } catch (err: any) {
        setIsProcessing(false);
        alert("File Import Error: Unable to parse Excel structure. Please ensure valid .xlsx/.xls format.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Commit valid seats into central state
  const handleCommitSeats = () => {
    if (!isAuthorized) {
      alert("Permission Denied: Super User, Admin, or IT Administrator required to write seat allocations.");
      return;
    }

    if (!seatImportResult || seatImportResult.importedSeats.length === 0) {
      alert("No valid department seat allocations ready to commit.");
      return;
    }

    if (onCommitBulkSeats) {
      onCommitBulkSeats(seatImportResult.importedSeats, targetFloorId);
    }

    onAddAuditLog(
      "Commit Bulk Department Seats",
      "Seat Allocation",
      `Committed ${seatImportResult.importedSeats.length} department seat allocations to central system.`
    );

    alert(`Success: Successfully allocated ${seatImportResult.importedSeats.length} seats to departments!`);
    setSeatImportResult(null);
    setFileName("");
  };

  // Download Error Report
  const handleDownloadErrorReport = () => {
    if (!importResult || importResult.errorReport.length === 0) return;

    const errorRows = importResult.errorReport.map(err => ({
      "Row Number": err.rowNumber,
      "Asset ID": err.assetId,
      "Serial Number": err.serialNumber,
      "Field in Error": err.fieldInError || "General",
      "Failure Reason": err.reason,
      "Raw Data Dump": JSON.stringify(err.rawData)
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import_Failures");
    XLSX.writeFile(workbook, `IT_Asset_Import_Error_Report_${Date.now()}.xlsx`);

    onAddAuditLog("Download Error Report", "Excel Ingest", `Downloaded error report containing ${errorRows.length} failed rows.`);
  };

  // Commit valid assets into central state
  const handleCommitAssets = () => {
    if (!isAuthorized) {
      alert("Permission Denied: Super User, Admin, or IT Administrator required to write asset records.");
      return;
    }

    if (!importResult || importResult.importedAssets.length === 0) {
      alert("No valid IT assets ready to commit.");
      return;
    }

    onCommitBulkAssets(importResult.importedAssets);
    onAddAuditLog(
      "Commit IT Asset Batch",
      "IT Asset",
      `Committed ${importResult.importedAssets.length} verified IT assets to central inventory.`
    );

    alert(`Success: Successfully committed ${importResult.importedAssets.length} IT assets into central database!`);
    setImportResult(null);
    setFileName("");
  };

  return (
    <div className="space-y-6" id="excel-import-container">
      {/* Role Restriction Warning Banner if not authorized */}
      {!isAuthorized && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-900 text-xs font-sans">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <div>
            <strong className="font-bold">Role Access Restriction:</strong> Your active role ({activeRole}) does not have permission to upload or commit IT assets. Switch role to <strong>Super User</strong>, <strong>Admin</strong>, or <strong>IT Administrator</strong> to access import tools.
          </div>
        </div>
      )}

      {/* Top Bar Header & Ingest Mode Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="excel-header">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-display flex items-center gap-2">
              <FileSpreadsheet className="text-blue-600" size={20} />
              <span>Enterprise Excel Batch Processor</span>
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Batch process IT asset inventories or bulk allocate seats to departments with instant validation.
            </p>
          </div>

          <div className="flex gap-2">
            {activeTab === "IT_ASSETS" ? (
              <button
                onClick={handleDownloadAssetTemplate}
                className="text-xs font-bold text-slate-700 border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors font-sans"
              >
                <Download size={14} className="text-blue-600" />
                <span>Download IT Asset Template (.xlsx)</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadSeatTemplate}
                className="text-xs font-bold text-emerald-800 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors font-sans"
              >
                <Download size={14} className="text-emerald-600" />
                <span>Download Seat Allocation Template (with Dropdowns)</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 gap-6 pt-1">
          <button
            onClick={() => {
              setActiveTab("IT_ASSETS");
              setFileName("");
              setImportResult(null);
              setSeatImportResult(null);
            }}
            className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === "IT_ASSETS" 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Laptop size={15} />
            <span>IT Asset Inventory Ingest</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("DEPT_SEATS");
              setFileName("");
              setImportResult(null);
              setSeatImportResult(null);
            }}
            className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === "DEPT_SEATS" 
                ? "text-emerald-700 border-b-2 border-emerald-600" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 size={15} />
            <span>Bulk Department Seat Allocation (Excel)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold">
              Floor/Status/Type Dropdowns
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="excel-workspace">
        {/* LEFT DOCK: Upload controls & Sample Scenarios */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5" id="excel-dock-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
            {activeTab === "IT_ASSETS" ? "Asset File Importer" : "Department Seat Allocation Importer"}
          </span>

          {/* TARGET FLOOR SELECTOR (asks user which floor seats are being uploaded/appended to) */}
          {floors && floors.length > 0 && (
            <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl space-y-2 font-sans">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers size={16} className="text-blue-600" />
                  <span>Target Floor Destination</span>
                </label>
                {floors.length > 1 ? (
                  <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                    {floors.length} Floors
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono">
                    Active Floor
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-tight">
                {floors.length > 1 
                  ? "Select which floor you are appending / mapping these Excel seats to:"
                  : "Uploaded seats will be appended and assigned to this floor:"}
              </p>

              <select
                value={targetFloorId}
                onChange={(e) => setTargetFloorId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {floors.map((f) => {
                  const bld = buildings?.find((b) => b.id === f.buildingId);
                  return (
                    <option key={f.id} value={f.id}>
                      {f.name} {bld ? `(${bld.name})` : ""} - Capacity: {f.capacity || "N/A"}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Upload Area */}
          <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative ${
            isAuthorized 
              ? activeTab === "DEPT_SEATS"
                ? "border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/50"
                : "border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20" 
              : "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
          }`}>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv"
              disabled={!isAuthorized || isProcessing}
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
            />
            <Upload className={`mx-auto mb-2 ${activeTab === "DEPT_SEATS" ? "text-emerald-600" : "text-slate-400"}`} size={30} />
            <p className="text-xs font-bold text-slate-800 font-sans">
              Upload Excel File (.xlsx / .xls)
            </p>
            <p className="text-[10px] text-slate-400 font-sans mt-1">
              {activeTab === "IT_ASSETS" 
                ? "Supports up to 5,000 asset rows per batch"
                : "Requires columns: Seat Number, Department, Business Lead Name"}
            </p>
          </div>

          {/* Preset Sample Scenarios */}
          <div className="space-y-2 font-sans">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sample Data Test Sandbox
            </span>

            {activeTab === "IT_ASSETS" ? (
              <>
                <button
                  onClick={() => loadMockScenario("CLEAN")}
                  disabled={!isAuthorized || isProcessing}
                  className="w-full p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all disabled:opacity-50"
                >
                  <span>Load 100% Valid Excel Batch</span>
                  <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded text-[9px] uppercase">
                    Clean
                  </span>
                </button>

                <button
                  onClick={() => loadMockScenario("WITH_ERRORS")}
                  disabled={!isAuthorized || isProcessing}
                  className="w-full p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all disabled:opacity-50"
                >
                  <span>Load Conflict Batch (Duplicates)</span>
                  <span className="bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded text-[9px] uppercase">
                    Has Errors
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={loadMockSeatScenario}
                disabled={!isAuthorized || isProcessing}
                className="w-full p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all shadow-xs disabled:opacity-50"
              >
                <span>Load Sample Dept Seat Batch</span>
                <span className="bg-emerald-800 text-emerald-100 px-1.5 py-0.5 rounded text-[9px] uppercase">
                  Dropdown-Ready
                </span>
              </button>
            )}
          </div>

          {/* Validation Checklist Info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-sans text-slate-600">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase">
              <Info size={14} className="text-blue-600" />
              <span>{activeTab === "IT_ASSETS" ? "Supported Asset Fields" : "Template Columns"}</span>
            </h5>
            {activeTab === "IT_ASSETS" ? (
              <ul className="text-[10px] space-y-1 list-disc pl-3 text-slate-500">
                <li><strong>Mandatory:</strong> Asset ID, Serial Number, Asset Tag, Asset Name, Asset Type</li>
                <li><strong>Details:</strong> Category, Manufacturer, Model, Warranty Expiry, Status</li>
                <li><strong>Auto-Link:</strong> Employee ID/Name, Seat Number, Building, Floor, Zone</li>
              </ul>
            ) : (
              <ul className="text-[10px] space-y-1.5 list-disc pl-3 text-slate-600">
                <li><strong className="text-slate-900">1. Seat Number:</strong> E.g. A-101, B-202</li>
                <li><strong className="text-slate-900">2. Department:</strong> E.g. Engineering, Sales</li>
                <li><strong className="text-slate-900">3. Business Lead Name:</strong> E.g. Marcus Wright</li>
                <li><strong className="text-slate-900">4-5. Building / Floor:</strong> Floor column has a dropdown of your workspace's actual current floors</li>
                <li><strong className="text-slate-900">6. Zone:</strong> optional — leave blank and it's auto-assigned from nearby seat numbers already on that floor</li>
                <li><strong className="text-slate-900">7. Seat Status:</strong> dropdown — Vacant, Occupied, or Reserved</li>
                <li><strong className="text-slate-900">8. Desk Type:</strong> dropdown — Standard, Hot Desk, Executive, or Collaborative</li>
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT WORKSPACE: Progress & Preview & Error Reports */}
        <div className="bg-white border border-slate-200 rounded-2xl lg:col-span-3 p-5 flex flex-col justify-between min-h-[400px]" id="excel-workspace-right">
          {isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12" id="excel-progress-state">
              <RefreshCw className="animate-spin text-blue-600" size={36} />
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-slate-800 font-sans">
                  {activeTab === "IT_ASSETS" ? "Processing IT Asset Spreadsheet..." : "Processing Department Seat Spreadsheet..."}
                </h4>
                <p className="text-xs text-slate-400 font-sans">{progressStage}</p>
              </div>
              <div className="w-64 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div 
                  className={`h-full transition-all duration-300 ${activeTab === "DEPT_SEATS" ? "bg-emerald-600" : "bg-blue-600"}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : activeTab === "DEPT_SEATS" && seatImportResult ? (
            <div className="flex-1 flex flex-col space-y-4 font-sans" id="seat-excel-results-state">
              {/* Header result stats */}
              <div className="flex justify-between items-center flex-wrap gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                    <span>Parsed Seat Allocations File: {fileName}</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Validated seat numbers and mapped departments & business leads.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCommitSeats}
                    disabled={seatImportResult.successCount === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    <span>Commit Department Allocations ({seatImportResult.successCount})</span>
                  </button>
                </div>
              </div>

              {/* Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total File Rows</span>
                  <div className="text-lg font-extrabold text-slate-800 font-mono mt-0.5">{seatImportResult.totalRows}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>Valid Allocations</span>
                  </span>
                  <div className="text-lg font-extrabold text-emerald-800 font-mono mt-0.5">{seatImportResult.successCount}</div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1">
                    <XCircle size={12} />
                    <span>Invalid Rows</span>
                  </span>
                  <div className="text-lg font-extrabold text-rose-800 font-mono mt-0.5">{seatImportResult.failedCount}</div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1">
                    <RotateCcw size={12} />
                    <span>Duplicates in File</span>
                  </span>
                  <div className="text-lg font-extrabold text-amber-800 font-mono mt-0.5">{seatImportResult.duplicateInFileCount || 0}</div>
                </div>
              </div>

              {/* Table Preview */}
              {seatImportResult.importedSeats.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 size={14} className="text-emerald-600" />
                    <span>Bulk Seat Allocation Preview ({seatImportResult.importedSeats.length} Seats)</span>
                  </h5>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[220px]">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-sans">
                        <tr>
                          <th className="p-2.5 font-bold uppercase text-[9px]">Seat Number</th>
                          <th className="p-2.5 font-bold uppercase text-[9px]">Allocated Department</th>
                          <th className="p-2.5 font-bold uppercase text-[9px]">Business Lead Name</th>
                          <th className="p-2.5 font-bold uppercase text-[9px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {seatImportResult.importedSeats.map((st, i) => (
                          <tr key={st.id || i} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono font-bold text-blue-700">{st.seatNumber}</td>
                            <td className="p-2.5 font-bold text-slate-800">{st.allocatedDepartment || st.department}</td>
                            <td className="p-2.5 font-medium text-slate-700">{st.allocatedManager || st.managerName || "N/A"}</td>
                            <td className="p-2.5">
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                {st.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "IT_ASSETS" && importResult ? (
            <div className="flex-1 flex flex-col space-y-4 font-sans" id="excel-results-state">
              {/* Header result stats */}
              <div className="flex justify-between items-center flex-wrap gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                    <span>Parsed Spreadsheet: {fileName}</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Validated against live database and employee registry.
                  </p>
                </div>

                <div className="flex gap-2">
                  {importResult.errorReport.length > 0 && (
                    <button
                      onClick={handleDownloadErrorReport}
                      className="border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Download size={13} />
                      <span>Download Error Report ({importResult.errorReport.length})</span>
                    </button>
                  )}

                  <button
                    onClick={handleCommitAssets}
                    disabled={importResult.successCount === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Database size={13} />
                    <span>Commit Valid Assets ({importResult.successCount})</span>
                  </button>
                </div>
              </div>

              {/* Status Summary Counter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3" id="import-stats-cards">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</span>
                  <div className="text-lg font-extrabold text-slate-800 font-mono mt-0.5">{importResult.totalRows}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>Successful</span>
                  </span>
                  <div className="text-lg font-extrabold text-emerald-800 font-mono mt-0.5">{importResult.successCount}</div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1">
                    <XCircle size={12} />
                    <span>Failed / Invalid</span>
                  </span>
                  <div className="text-lg font-extrabold text-rose-800 font-mono mt-0.5">{importResult.failedCount}</div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1">
                    <Clock size={12} />
                    <span>Skipped</span>
                  </span>
                  <div className="text-lg font-extrabold text-amber-800 font-mono mt-0.5">{importResult.skippedCount}</div>
                </div>
              </div>

              {/* Success Records Preview */}
              {importResult.importedAssets.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-600" />
                    <span>Verified Assets Ready for Database Sync ({importResult.importedAssets.length})</span>
                  </h5>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[180px]">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-sans">
                        <tr>
                          <th className="p-2 font-bold uppercase text-[9px]">Asset ID</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Asset Tag</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Asset Name</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Type</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Serial Number</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Auto-Linked Employee</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Seat Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.importedAssets.map((asset) => (
                          <tr key={asset.id} className="hover:bg-slate-50/60">
                            <td className="p-2 font-mono font-bold text-slate-800">{asset.id}</td>
                            <td className="p-2 font-mono text-slate-600">{asset.assetTag}</td>
                            <td className="p-2 font-medium text-slate-800">{asset.name}</td>
                            <td className="p-2">{asset.type}</td>
                            <td className="p-2 font-mono text-slate-500">{asset.serialNumber}</td>
                            <td className="p-2">
                              {asset.employeeName ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                  <LinkIcon size={11} />
                                  {asset.employeeName}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="p-2 font-mono font-bold text-blue-700">{asset.seatNumber || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error & Warning Report Grid */}
              {importResult.errorReport.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <span>Failed / Invalid Rows ({importResult.errorReport.length})</span>
                  </h5>
                  <div className="overflow-x-auto border border-rose-200 rounded-xl max-h-[160px] bg-rose-50/20">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-rose-100/60 text-rose-900 font-sans">
                        <tr>
                          <th className="p-2 font-bold uppercase text-[9px]">Excel Row</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Asset ID</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Serial Number</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Field in Error</th>
                          <th className="p-2 font-bold uppercase text-[9px]">Failure Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {importResult.errorReport.map((err, idx) => (
                          <tr key={idx} className="hover:bg-rose-50/80 text-rose-950">
                            <td className="p-2 font-bold font-mono">Row {err.rowNumber}</td>
                            <td className="p-2 font-mono font-bold">{err.assetId}</td>
                            <td className="p-2 font-mono">{err.serialNumber}</td>
                            <td className="p-2 font-bold text-rose-700">{err.fieldInError || "Validation"}</td>
                            <td className="p-2 text-rose-800 font-medium">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400" id="excel-empty">
              <FileSpreadsheet size={56} className="mx-auto mb-3 text-slate-300" />
              <p className="text-xs font-bold text-slate-700 font-sans">
                {activeTab === "IT_ASSETS" ? "IT Asset Excel Importer Ready" : "Bulk Seat Allocation Importer Ready"}
              </p>
              <p className="text-[11px] max-w-sm mt-1 leading-relaxed font-sans">
                {activeTab === "IT_ASSETS"
                  ? "Upload an Excel file (.xlsx) or click one of the trial sample buttons on the left to validate duplicate Asset IDs, check warranty dates, and auto-link hardware to employee seats."
                  : "Upload an Excel file with columns: Seat Number, Department, Business Lead Name to allocate bulk seats directly to departments."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
