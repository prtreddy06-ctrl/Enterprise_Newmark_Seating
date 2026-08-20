import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { Floor, Building } from "../types";

/**
 * Downloads the standardized Bulk Department Seat Allocation Excel template.
 * Uses ExcelJS (not the plain xlsx writer) specifically because it can write
 * real in-cell dropdown validation lists — the base "xlsx" package can only
 * read data validation, not write it.
 *
 * Floor names are pulled from the workspace's ACTUAL current floors (so a
 * floor renamed to something like "11th Floor CRE 3 Days" shows up correctly
 * in the dropdown) instead of a hardcoded sample name.
 */
export async function downloadDepartmentSeatTemplate(
  onAddAuditLog?: (action: string, category: any, details: string) => void,
  floors: Floor[] = [],
  buildings: Building[] = []
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Department_Seats");

  const floorNameOf = (f: Floor) => {
    const bld = buildings.find(b => b.id === f.buildingId);
    return bld ? `${f.name} (${bld.name})` : f.name;
  };

  const floorNames = floors.length > 0 ? floors.map(floorNameOf) : ["11 th Floor CRE"];
  const seatStatusOptions = ["Vacant", "Occupied", "Reserved"];
  const deskTypeOptions = ["Standard", "Hot Desk", "Executive", "Collaborative"];

  const firstFloorName = floorNames[0];
  const firstBuildingName = buildings.length > 0 ? buildings[0].name : "Newmark _Hyderabad";

  sheet.columns = [
    { header: "Seat Number", key: "seatNumber", width: 16 },
    { header: "Department", key: "department", width: 24 },
    { header: "Business Lead Name", key: "businessLead", width: 26 },
    { header: "Building", key: "building", width: 22 },
    { header: "Floor", key: "floor", width: 30 },
    { header: "Zone", key: "zone", width: 22 },
    { header: "Seat Status", key: "seatStatus", width: 16 },
    { header: "Desk Type", key: "deskType", width: 16 }
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; });

  const sampleRows: any[] = [
    { seatNumber: "101", department: "Engineering", businessLead: "Raviteja Reddy palagiri", building: firstBuildingName, floor: firstFloorName, zone: "Workstation Zone 1", seatStatus: "Occupied", deskType: "Standard" },
    { seatNumber: "102", department: "Engineering", businessLead: "Raviteja Reddy palagiri", building: firstBuildingName, floor: firstFloorName, zone: "Workstation Zone 1", seatStatus: "Occupied", deskType: "Standard" },
    { seatNumber: "201", department: "Operations", businessLead: "Executive Board", building: firstBuildingName, floor: firstFloorName, zone: "Workstation Zone 2", seatStatus: "Vacant", deskType: "Hot Desk" },
    { seatNumber: "202", department: "Operations", businessLead: "Executive Board", building: firstBuildingName, floor: firstFloorName, zone: "Workstation Zone 2", seatStatus: "Reserved", deskType: "Standard" },
    { seatNumber: "301", department: "Finance & HR", businessLead: "Executive Board", building: firstBuildingName, floor: firstFloorName, zone: "Workstation Zone 7", seatStatus: "Vacant", deskType: "Executive" }
  ];
  sampleRows.forEach(r => sheet.addRow(r));

  // Apply dropdown validation to a generous range of rows (2-500) so this
  // works for large bulk uploads, not just the 5 sample rows.
  const lastValidationRow = 500;
  const applyDropdown = (columnLetter: string, options: string[]) => {
    for (let row = 2; row <= lastValidationRow; row++) {
      sheet.getCell(`${columnLetter}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${options.join(",")}"`],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Invalid entry",
        error: `Please choose one of: ${options.join(", ")}`
      };
    }
  };

  applyDropdown("E", floorNames);        // Floor
  applyDropdown("G", seatStatusOptions); // Seat Status
  applyDropdown("H", deskTypeOptions);   // Desk Type

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Bulk_Department_Seat_Allocation_Template.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (onAddAuditLog) {
    onAddAuditLog(
      "Download Template",
      "Excel Ingest",
      "Downloaded Bulk Department Seat Allocation Excel template with Floor/Seat Status/Desk Type dropdowns."
    );
  }
}


/**
 * Downloads the full Floor CAD Layout Excel template.
 */
export function downloadFullFloorLayoutTemplate(
  onAddAuditLog?: (action: string, category: any, details: string) => void
) {
  const templateRows = [
    {
      "Building": "Building Alpha",
      "Floor": "Floor 1",
      "Zone": "Zone Alpha",
      "Seat Number": "A-101",
      "Department": "Engineering",
      "Object Type": "Seat",
      "X Position": 120,
      "Y Position": 150
    },
    {
      "Building": "Building Alpha",
      "Floor": "Floor 1",
      "Zone": "Zone Alpha",
      "Seat Number": "A-102",
      "Department": "Engineering",
      "Object Type": "Seat",
      "X Position": 200,
      "Y Position": 150
    },
    {
      "Building": "Building Alpha",
      "Floor": "Floor 1",
      "Zone": "Zone Beta",
      "Seat Number": "B-201",
      "Department": "Sales & Marketing",
      "Object Type": "Seat",
      "X Position": 350,
      "Y Position": 180
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Floor_Layout_CAD");
  XLSX.writeFile(workbook, "Floor_Map_CAD_Layout_Template.xlsx");

  if (onAddAuditLog) {
    onAddAuditLog(
      "Download Layout Template",
      "Floor Designer",
      "Downloaded Floor Map CAD Layout Excel template."
    );
  }
}
