import * as XLSX from "xlsx";

/**
 * Downloads the standardized Bulk Department Seat Allocation Excel template.
 */
export function downloadDepartmentSeatTemplate(
  onAddAuditLog?: (action: string, category: any, details: string) => void
) {
  const templateRows = [
    {
      "Seat Number": "101",
      "Department": "Engineering",
      "Business Lead Name": "Raviteja Reddy palagiri",
      "Building": "Newmark _Hyderabad",
      "Floor": "11 th Floor CRE",
      "Zone": "Workstation Zone 1"
    },
    {
      "Seat Number": "102",
      "Department": "Engineering",
      "Business Lead Name": "Raviteja Reddy palagiri",
      "Building": "Newmark _Hyderabad",
      "Floor": "11 th Floor CRE",
      "Zone": "Workstation Zone 1"
    },
    {
      "Seat Number": "201",
      "Department": "Operations",
      "Business Lead Name": "Executive Board",
      "Building": "Newmark _Hyderabad",
      "Floor": "11 th Floor CRE",
      "Zone": "Workstation Zone 2"
    },
    {
      "Seat Number": "202",
      "Department": "Operations",
      "Business Lead Name": "Executive Board",
      "Building": "Newmark _Hyderabad",
      "Floor": "11 th Floor CRE",
      "Zone": "Workstation Zone 2"
    },
    {
      "Seat Number": "301",
      "Department": "Finance & HR",
      "Business Lead Name": "Executive Board",
      "Building": "Newmark _Hyderabad",
      "Floor": "11 th Floor CRE",
      "Zone": "Workstation Zone 7"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Department_Seats");
  XLSX.writeFile(workbook, "Bulk_Department_Seat_Allocation_Template.xlsx");

  if (onAddAuditLog) {
    onAddAuditLog(
      "Download Template",
      "Excel Ingest",
      "Downloaded Bulk Department Seat Allocation Excel template."
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
