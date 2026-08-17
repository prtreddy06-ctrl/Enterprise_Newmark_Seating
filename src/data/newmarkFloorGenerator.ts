import { Zone, Seat } from "../types";

export interface NewmarkBlueprintData {
  zones: Zone[];
  seats: Seat[];
  stats: {
    totalSeats: number;
    totalZones: number;
    totalCabins: number;
  };
}

export function generateNewmarkBlueprintData(buildingId = "b1", floorId = "f1"): NewmarkBlueprintData {
  // 1. ZONES & ROOMS
  const zones: Zone[] = [
    {
      id: `nz-cafeteria-${floorId}`,
      floorId,
      name: "Cafeteria & Dining Bay",
      department: "Amenities & Common",
      color: "#f97316", // Orange
      x: 350,
      y: 120,
      width: 280,
      height: 160,
      capacity: 80
    },
    {
      id: `nz-boardroom-${floorId}`,
      floorId,
      name: "Board Room",
      department: "Executive & Board",
      color: "#8b5cf6", // Purple
      x: 650,
      y: 180,
      width: 140,
      height: 90,
      capacity: 20
    },
    {
      id: `nz-reception-${floorId}`,
      floorId,
      name: "RECEPTION",
      department: "Front Office",
      color: "#06b6d4", // Cyan
      x: 800,
      y: 200,
      width: 160,
      height: 70,
      capacity: 10
    },
    {
      id: `nz-tokyo-${floorId}`,
      floorId,
      name: "TOKYO & CABIN-8",
      department: "Executive Cabins",
      color: "#ec4899", // Pink
      x: 40,
      y: 300,
      width: 160,
      height: 120,
      capacity: 12
    },
    {
      id: `nz-singapore-${floorId}`,
      floorId,
      name: "SINGAPORE & SYDNEY (CABIN-7)",
      department: "Executive Cabins",
      color: "#3b82f6", // Blue
      x: 230,
      y: 380,
      width: 160,
      height: 110,
      capacity: 15
    },
    {
      id: `nz-paris-${floorId}`,
      floorId,
      name: "Paris & EMD Cabin",
      department: "Executive Cabins",
      color: "#10b981", // Emerald
      x: 520,
      y: 180,
      width: 110,
      height: 90,
      capacity: 10
    },
    {
      id: `nz-dubai-london-${floorId}`,
      floorId,
      name: "DUBAI, LONDON & CABIN-1",
      department: "Executive Cabins",
      color: "#6366f1", // Indigo
      x: 1140,
      y: 140,
      width: 220,
      height: 130,
      capacity: 25
    },
    {
      id: `nz-newyork-mumbai-${floorId}`,
      floorId,
      name: "NEW YORK, MUMBAI & IT Store",
      department: "Management & IT",
      color: "#f59e0b", // Amber
      x: 820,
      y: 30,
      width: 540,
      height: 90,
      capacity: 35
    },
    {
      id: `nz-einstein-${floorId}`,
      floorId,
      name: "Meeting Room (Einstein & Aryabhata)",
      department: "Conference",
      color: "#14b8a6", // Teal
      x: 1140,
      y: 280,
      width: 220,
      height: 90,
      capacity: 18
    },
    {
      id: `nz-wellness-${floorId}`,
      floorId,
      name: "Wellness Rooms (Male & Female)",
      department: "Facilities",
      color: "#a855f7",
      x: 410,
      y: 380,
      width: 110,
      height: 110,
      capacity: 8
    },
    {
      id: `nz-bms-electrical-${floorId}`,
      floorId,
      name: "BMS Room & Electrical Staff Room",
      department: "Facilities & Operations",
      color: "#64748b",
      x: 520,
      y: 280,
      width: 200,
      height: 80,
      capacity: 10
    },
    {
      id: `nz-pod1-${floorId}`,
      floorId,
      name: "Workstation Zone 1 (Desks 1-66)",
      department: "Engineering",
      color: "#3b82f6",
      x: 780,
      y: 520,
      width: 580,
      height: 240,
      capacity: 66
    },
    {
      id: `nz-pod2-${floorId}`,
      floorId,
      name: "Workstation Zone 2 (Desks 67-120)",
      department: "Operations",
      color: "#10b981",
      x: 460,
      y: 520,
      width: 300,
      height: 240,
      capacity: 54
    },
    {
      id: `nz-pod3-${floorId}`,
      floorId,
      name: "Workstation Zone 3 (Desks 121-172)",
      department: "Product Quality",
      color: "#ec4899",
      x: 40,
      y: 500,
      width: 400,
      height: 260,
      capacity: 52
    },
    {
      id: `nz-pod4-${floorId}`,
      floorId,
      name: "Workstation Zone 4 (Desks 173-238)",
      department: "Engineering & Architecture",
      color: "#f59e0b",
      x: 210,
      y: 200,
      width: 280,
      height: 280,
      capacity: 66
    },
    {
      id: `nz-pod5-${floorId}`,
      floorId,
      name: "Workstation Zone 5 (Desks 239-293)",
      department: "Corporate Infrastructure",
      color: "#eab308",
      x: 40,
      y: 120,
      width: 280,
      height: 170,
      capacity: 55
    },
    {
      id: `nz-pod6-${floorId}`,
      floorId,
      name: "Workstation Zone 6 (Desks 294-371)",
      department: "Data Engineering",
      color: "#8b5cf6",
      x: 350,
      y: 30,
      width: 450,
      height: 80,
      capacity: 78
    },
    {
      id: `nz-pod7-${floorId}`,
      floorId,
      name: "Workstation Zone 7 (Desks 372-502)",
      department: "Finance & HR",
      color: "#06b6d4",
      x: 820,
      y: 120,
      width: 300,
      height: 380,
      capacity: 131
    },
    {
      id: `nz-pod8-${floorId}`,
      floorId,
      name: "Workstation Zone 8 (Desks 503-555)",
      department: "Global Tech Services",
      color: "#10b981",
      x: 980,
      y: 380,
      width: 380,
      height: 130,
      capacity: 53
    }
  ];

  // 2. SEATS (Exact 1 to 555)
  const seats: Seat[] = [];

  // Helper to place seats cleanly in a row/grid
  const generateSeatCluster = (
    startNum: number,
    endNum: number,
    zoneId: string,
    dept: string,
    startX: number,
    startY: number,
    cols: number,
    stepX = 38,
    stepY = 32
  ) => {
    let index = 0;
    for (let num = startNum; num <= endNum; num++) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const isOccupied = num % 7 === 0 || num % 13 === 0;
      const isHotDesk = num % 5 === 0;

      seats.push({
        id: `ns-${floorId}-${num}`,
        seatNumber: `${num}`,
        zoneId,
        floorId,
        buildingId,
        type: isHotDesk ? "Hot Desk" : num % 11 === 0 ? "Executive" : "Standard",
        status: isOccupied ? "Occupied" : "Vacant",
        department: dept,
        x: Math.round(startX + col * stepX),
        y: Math.round(startY + row * stepY),
        rotation: 0
      });

      index++;
    }
  };

  // Block 1: Seats 1 to 10 (Bottom right strip)
  generateSeatCluster(1, 10, zones[11].id, "Engineering", 1320, 680, 2, 32, 30);

  // Block 2: Seats 11 to 35 (Bottom right grid)
  generateSeatCluster(11, 35, zones[11].id, "Engineering", 1020, 680, 7, 38, 30);

  // Block 3: Seats 36 to 66 (Bottom middle-right grid)
  generateSeatCluster(36, 66, zones[11].id, "Engineering", 800, 680, 8, 38, 30);

  // Block 4: Seats 67 to 120 (Lower center grid)
  generateSeatCluster(67, 120, zones[12].id, "Operations", 480, 600, 9, 36, 30);

  // Block 5: Seats 121 to 172 (Lower left Tokyo/Cabin-8 grid)
  generateSeatCluster(121, 172, zones[13].id, "Product Quality", 60, 520, 8, 38, 30);

  // Block 6: Seats 173 to 238 (Mid-left cluster)
  generateSeatCluster(173, 238, zones[14].id, "Engineering & Architecture", 220, 220, 8, 36, 30);

  // Block 7: Seats 239 to 293 (Yellow upper left cluster)
  generateSeatCluster(239, 293, zones[15].id, "Corporate Infrastructure", 50, 130, 7, 38, 30);

  // Block 8: Seats 294 to 300 (Shanghai / Singapore cluster)
  generateSeatCluster(294, 300, zones[4].id, "Executive Cabins", 240, 390, 4, 38, 30);

  // Block 9: Seats 301 to 326 (Paris / BMS bay)
  generateSeatCluster(301, 326, zones[5].id, "Executive Cabins", 530, 200, 5, 36, 30);

  // Block 10: Seats 327 to 371 (Cafeteria front & Boardroom row)
  generateSeatCluster(327, 371, zones[16].id, "Data Engineering", 360, 40, 9, 38, 30);

  // Block 11: Seats 372 to 418 (Reception / CC TV center cluster)
  generateSeatCluster(372, 418, zones[17].id, "Finance & HR", 810, 140, 7, 38, 30);

  // Block 12: Seats 419 to 470 (New York / Sharad Sharma / IT Store top cluster)
  generateSeatCluster(419, 470, zones[7].id, "Management & IT", 830, 40, 9, 38, 30);

  // Block 13: Seats 471 to 502 (London / Dubai / Server Room cluster)
  generateSeatCluster(471, 502, zones[6].id, "Executive Cabins", 1150, 150, 6, 36, 30);

  // Block 14: Seats 503 to 555 (Far right South-East cluster near Meeting Room)
  generateSeatCluster(503, 555, zones[18].id, "Global Tech Services", 1000, 400, 8, 38, 30);

  return {
    zones,
    seats,
    stats: {
      totalSeats: seats.length, // 555
      totalZones: zones.length,
      totalCabins: 16
    }
  };
}
