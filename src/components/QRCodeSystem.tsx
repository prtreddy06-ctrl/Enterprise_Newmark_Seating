import React, { useState } from "react";
import JSZip from "jszip";
import { Seat, CheckInLog } from "../types";
import { downloadFile } from "../utils/emailAndDownloadService";
import { 
  QrCode, 
  Printer, 
  Download, 
  Camera, 
  Calendar, 
  Clock, 
  User, 
  Search,
  CheckCircle,
  HelpCircle,
  CheckSquare,
  Square,
  FileArchive,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface QRCodeSystemProps {
  seats: Seat[];
  checkInLogs: CheckInLog[];
  onCheckIn: (seatId: string, employeeName: string) => void;
  onCheckOut: (seatId: string) => void;
}

// SVG QR Generator Helper Function for a seat
export function generateDeskQrSvg(seat: Seat): string {
  const isOccupied = seat.status === "Occupied";
  const statusLabel = seat.status || "Vacant";
  const empName = seat.employeeName ? seat.employeeName.toUpperCase() : "VACANT";
  const seatNum = seat.seatNumber || "S101";
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#ffffff" rx="4"/>
  <rect x="2" y="2" width="96" height="96" fill="none" stroke="#cbd5e1" stroke-width="1.5" rx="3"/>
  <text x="50" y="11" font-family="sans-serif" font-size="4.5" font-weight="bold" text-anchor="middle" fill="#0f172a" letter-spacing="0.5">ENTERPRIZSEAT WORKSPACE</text>
  
  <!-- Anchor 1: Top Left -->
  <rect x="12" y="16" width="22" height="22" fill="#0f172a" rx="2"/>
  <rect x="15" y="19" width="16" height="16" fill="#ffffff" rx="1"/>
  <rect x="18" y="22" width="10" height="10" fill="#0f172a"/>

  <!-- Anchor 2: Top Right -->
  <rect x="66" y="16" width="22" height="22" fill="#0f172a" rx="2"/>
  <rect x="69" y="19" width="16" height="16" fill="#ffffff" rx="1"/>
  <rect x="72" y="22" width="10" height="10" fill="#0f172a"/>

  <!-- Anchor 3: Bottom Left -->
  <rect x="12" y="62" width="22" height="22" fill="#0f172a" rx="2"/>
  <rect x="15" y="65" width="16" height="16" fill="#ffffff" rx="1"/>
  <rect x="18" y="68" width="10" height="10" fill="#0f172a"/>

  <!-- QR Matrix Data Simulation -->
  <rect x="42" y="18" width="6" height="6" fill="#0f172a"/>
  <rect x="52" y="22" width="10" height="6" fill="#0f172a"/>
  <rect x="40" y="32" width="6" height="12" fill="#0f172a"/>
  <rect x="52" y="32" width="10" height="6" fill="#0f172a"/>
  <rect x="68" y="44" width="14" height="6" fill="#0f172a"/>
  <rect x="16" y="44" width="12" height="6" fill="#0f172a"/>
  <rect x="42" y="64" width="12" height="6" fill="#0f172a"/>
  <rect x="58" y="68" width="6" height="12" fill="#0f172a"/>
  <rect x="68" y="66" width="14" height="10" fill="#0f172a"/>

  <!-- Center Identity Badge -->
  <circle cx="50" cy="50" r="12" fill="${isOccupied ? '#2563eb' : '#10b981'}"/>
  <text x="50" y="52" font-family="sans-serif" font-size="4.5" font-weight="bold" text-anchor="middle" fill="#ffffff">${seatNum}</text>

  <!-- Footer Label Text -->
  <text x="50" y="89" font-family="sans-serif" font-size="5" font-weight="bold" text-anchor="middle" fill="#0f172a">DESK: ${seatNum}</text>
  <text x="50" y="94" font-family="sans-serif" font-size="3.5" font-weight="medium" text-anchor="middle" fill="#64748b">${empName} • ${statusLabel}</text>
</svg>`;
}

// Printable HTML Label Sheet Generator
export function generateBulkQrHtmlSheet(seats: Seat[]): string {
  const cardsHtml = seats.map(seat => `
    <div class="qr-card">
      <div class="workspace-header">NEWMARK HYDERABAD</div>
      <div class="qr-svg-wrapper">
        ${generateDeskQrSvg(seat)}
      </div>
      <div class="desk-number">DESK ${seat.seatNumber}</div>
      <div class="seat-status">${seat.employeeName ? seat.employeeName : seat.status}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Desk QR Codes Label Sheet (${seats.length} Desks)</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .header { text-align: center; margin-bottom: 24px; padding: 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #64748b; }
    .print-btn { display: inline-flex; align-items: center; gap: 8px; background: #2563eb; color: #ffffff; padding: 10px 24px; font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 13px; margin-top: 12px; cursor: pointer; border: none; shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .print-btn:hover { background: #1d4ed8; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 900px; margin: 0 auto; }
    .qr-card { background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .workspace-header { font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px; font-family: monospace; }
    .qr-svg-wrapper svg { width: 100%; height: auto; max-width: 150px; display: block; margin: 0 auto; }
    .desk-number { font-size: 14px; font-weight: 800; margin-top: 6px; font-family: monospace; color: #0f172a; }
    .seat-status { font-size: 10px; font-weight: 600; color: #475569; margin-top: 2px; }
    @media print {
      .no-print { display: none !important; }
      body { background: #ffffff; padding: 0; }
      .grid { gap: 12px; grid-template-columns: repeat(3, 1fr); }
      .qr-card { border: 1px solid #cbd5e1; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="header no-print">
    <h1>EnterprizSeat Bulk Desk QR Code Label Sheet</h1>
    <p>Generated ${seats.length} desk QR labels. Ready for printing onto label sticker sheets.</p>
    <button class="print-btn" onclick="window.print()">
      🖨️ Print Label Stickers
    </button>
  </div>
  <div class="grid">
    ${cardsHtml}
  </div>
</body>
</html>`;
}

export default function QRCodeSystem({ seats, checkInLogs, onCheckIn, onCheckOut }: QRCodeSystemProps) {
  const [selectedSeatId, setSelectedSeatId] = useState<string>("s1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Selection state for batch downloading
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set(seats.map(s => s.id)));
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipMessage, setZipMessage] = useState<string>("");

  // Custom manual QR scan emulator state
  const [scanEmployeeName, setScanEmployeeName] = useState<string>("Bjarne Stroustrup");
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [scanStatusMsg, setScanStatusMsg] = useState<string>("");

  const activeSeat = seats.find(s => s.id === selectedSeatId);
  
  const filteredSeats = seats.filter(s => 
    s.seatNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.employeeName && s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Toggle single seat selection for bulk download
  const toggleSelectSeat = (seatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSeatIds(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        next.add(seatId);
      }
      return next;
    });
  };

  // Toggle select all filtered seats
  const handleSelectAll = () => {
    if (selectedSeatIds.size === filteredSeats.length) {
      setSelectedSeatIds(new Set());
    } else {
      setSelectedSeatIds(new Set(filteredSeats.map(s => s.id)));
    }
  };

  // Batch Download as ZIP Archive
  const handleDownloadAllZip = async () => {
    const seatsToDownload = seats.filter(s => selectedSeatIds.has(s.id));
    if (seatsToDownload.length === 0) {
      setZipMessage("Please select at least one seat to download.");
      setTimeout(() => setZipMessage(""), 3000);
      return;
    }

    setIsZipping(true);
    setZipMessage(`Packaging ${seatsToDownload.length} Desk QR Codes into ZIP archive...`);

    try {
      const zip = new JSZip();
      const folder = zip.folder("Desk_QR_Codes");

      seatsToDownload.forEach(seat => {
        const svgContent = generateDeskQrSvg(seat);
        folder?.file(`Desk_QR_${seat.seatNumber}.svg`, svgContent);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      downloadFile(
        `Desk_QR_Codes_Batch_${seatsToDownload.length}_Seats.zip`,
        blob,
        "application/zip"
      );

      setZipMessage(`Successfully downloaded ${seatsToDownload.length} QR code SVG files in ZIP archive!`);
      setTimeout(() => setZipMessage(""), 4000);
    } catch (err) {
      setZipMessage("Failed to generate ZIP archive. Please try again.");
      setTimeout(() => setZipMessage(""), 4000);
    } finally {
      setIsZipping(false);
    }
  };

  // Download printable HTML Label Sheet
  const handleDownloadLabelSheet = () => {
    const seatsToDownload = seats.filter(s => selectedSeatIds.has(s.id));
    if (seatsToDownload.length === 0) {
      setZipMessage("Please select at least one seat to generate label sheet.");
      setTimeout(() => setZipMessage(""), 3000);
      return;
    }

    const htmlContent = generateBulkQrHtmlSheet(seatsToDownload);
    downloadFile(
      `Desk_QR_Labels_Sheet_${seatsToDownload.length}_Desks.html`,
      htmlContent,
      "text/html"
    );
    setZipMessage(`Downloaded printable HTML Label Sheet for ${seatsToDownload.length} desks.`);
    setTimeout(() => setZipMessage(""), 4000);
  };

  // Open Direct Print View for selected
  const handlePrintBulk = () => {
    const seatsToDownload = seats.filter(s => selectedSeatIds.has(s.id));
    if (seatsToDownload.length === 0) return;

    const htmlContent = generateBulkQrHtmlSheet(seatsToDownload);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const triggerScanSimulate = () => {
    if (!activeSeat) return;
    setScannerActive(true);
    setScanStatusMsg("Initializing optical sensor, mapping alignment guides...");

    setTimeout(() => {
      setScanStatusMsg(`QR payload decrypted: 'NMK-HYD-F3-${activeSeat.seatNumber}'...`);
    }, 1000);

    setTimeout(() => {
      if (activeSeat.status === "Occupied" && activeSeat.employeeName !== scanEmployeeName) {
        setScanStatusMsg("ACCESS DENIED: Desk already claimed by another active session.");
        setScannerActive(false);
      } else {
        if (activeSeat.status === "Occupied") {
          onCheckOut(activeSeat.id);
          setScanStatusMsg(`Success: Checked OUT ${scanEmployeeName} from ${activeSeat.seatNumber}`);
        } else {
          onCheckIn(activeSeat.id, scanEmployeeName);
          setScanStatusMsg(`Success: Checked IN ${scanEmployeeName} to ${activeSeat.seatNumber}`);
        }
        setScannerActive(false);
      }
    }, 2500);
  };

  const selectedCount = seats.filter(s => selectedSeatIds.has(s.id)).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="qr-module">
      {/* SEATS GRID & SEARCH */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4" id="qr-desk-explorer">
        
        {/* Header & Bulk Actions Bar */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <QrCode className="text-blue-600 animate-pulse" size={17} />
              <span>Desk QR Generator & Label Matrix</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Generate, print, and bulk download QR label tags for all workstation seats</p>
          </div>

          {/* Download All QR Codes primary trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isZipping || selectedCount === 0}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="Download all selected desk QR codes as SVG vector files inside a ZIP archive"
            >
              <FileArchive size={14} />
              <span>{isZipping ? "Packaging ZIP..." : `Download All QR Codes (.ZIP)`}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadLabelSheet}
              disabled={selectedCount === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download standalone printable HTML sticker label sheet"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Label Sheet</span>
            </button>
          </div>
        </div>

        {zipMessage && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            zipMessage.includes("Failed") || zipMessage.includes("Please select")
              ? "bg-rose-50 border border-rose-200 text-rose-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium"
          }`}>
            {zipMessage.includes("Failed") ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{zipMessage}</span>
          </div>
        )}

        {/* Filter / Search & Multi-select Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="relative flex-1" id="qr-search">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search desk numbers, zones, or occupied team members..."
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {selectedSeatIds.size === filteredSeats.length ? (
                <CheckSquare size={14} className="text-blue-600" />
              ) : (
                <Square size={14} className="text-slate-400" />
              )}
              <span>{selectedSeatIds.size === filteredSeats.length ? "Deselect All" : "Select All"}</span>
            </button>

            <span className="text-[11px] font-bold text-slate-500 font-mono bg-white border border-slate-200 px-2 py-1 rounded-lg">
              {selectedCount}/{seats.length} Selected
            </span>
          </div>
        </div>

        {/* Desks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto pr-1" id="qr-desks-scroller">
          {filteredSeats.map((seat) => {
            const isSelected = selectedSeatId === seat.id;
            const isCheckedForBatch = selectedSeatIds.has(seat.id);

            let statusColor = "bg-emerald-500";
            if (seat.status === "Occupied") statusColor = "bg-blue-600";
            if (seat.status === "Reserved") statusColor = "bg-purple-600";

            return (
              <div 
                key={seat.id}
                onClick={() => setSelectedSeatId(seat.id)}
                className={`p-3 border rounded-xl cursor-pointer text-center relative transition-all group ${
                  isSelected 
                    ? "border-blue-500 bg-blue-50/30 shadow-xs scale-102" 
                    : isCheckedForBatch 
                      ? "border-blue-300 bg-white" 
                      : "border-slate-100 hover:border-slate-200 bg-slate-50/40"
                }`}
                id={`qr-desk-card-${seat.id}`}
              >
                {/* Status Dot */}
                <div className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${statusColor}`} title={seat.status} />
                
                {/* Checkbox for Batch Selection */}
                <button
                  type="button"
                  onClick={(e) => toggleSelectSeat(seat.id, e)}
                  className="absolute top-2 left-2 p-0.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Toggle for Batch QR Download"
                >
                  {isCheckedForBatch ? (
                    <CheckSquare size={14} className="text-blue-600" />
                  ) : (
                    <Square size={14} className="text-slate-300 group-hover:text-slate-400" />
                  )}
                </button>

                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Desk</span>
                  <span className="text-base font-bold text-slate-800 font-mono tracking-tight">{seat.seatNumber}</span>
                  <span className="text-[9px] text-slate-400 block mt-1 truncate">{seat.employeeName || "Vacant"}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Batch Control Banner */}
        {selectedCount > 0 && (
          <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between flex-wrap gap-3 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center font-mono">
                {selectedCount}
              </span>
              <span className="text-xs font-medium text-slate-200">
                Seats selected for bulk QR code export
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadAllZip}
                disabled={isZipping}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileArchive size={13} />
                <span>Download ZIP ({selectedCount})</span>
              </button>

              <button
                type="button"
                onClick={handlePrintBulk}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer size={13} />
                <span>Bulk Print</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* LABELS PREVIEW & SCANS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-5" id="qr-inspector">
        {activeSeat ? (
          <div className="space-y-4 text-center" id="qr-labels-active">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Vector Label Preview</span>

            {/* Generated QR container */}
            <div className="bg-slate-50 p-6 border border-slate-200 rounded-2xl inline-block w-full text-center space-y-4" id="qr-label-box">
              <h5 className="text-xs font-bold text-slate-700 tracking-wider font-mono">NEWMARK-HYDERABAD</h5>
              
              {/* High-contrast SVG simulated QR code */}
              <div 
                className="bg-white border border-slate-200 p-4 rounded-xl inline-block mx-auto shadow-2xs"
                id="desk-qr-art"
                dangerouslySetInnerHTML={{ __html: generateDeskQrSvg(activeSeat) }}
              />

              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Desk Number</span>
                <p className="text-lg font-bold text-slate-800 font-mono tracking-tight">{activeSeat.seatNumber}</p>
                <p className="text-[10px] text-slate-500 font-sans">Verification: Secure MD5 Hash Sync</p>
              </div>
            </div>

            {/* Export and Print actions */}
            <div className="flex gap-2.5" id="qr-label-actions">
              <button 
                onClick={() => {
                  const htmlContent = generateBulkQrHtmlSheet([activeSeat]);
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    printWindow.document.write(htmlContent);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 300);
                  }
                }}
                className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5 text-slate-700 transition-all font-sans cursor-pointer"
              >
                <Printer size={13} />
                <span>Print Sticker</span>
              </button>

              <button 
                onClick={() => {
                  const svgContent = generateDeskQrSvg(activeSeat);
                  downloadFile(`Desk_QR_Label_${activeSeat.seatNumber}.svg`, svgContent, "image/svg+xml");
                }}
                className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5 text-slate-700 transition-all font-sans cursor-pointer"
              >
                <Download size={13} />
                <span>Export SVG</span>
              </button>
            </div>

            {/* Simulated scanning device input */}
            <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-3.5 text-left" id="qr-scan-simulator">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Local QR Scan Emulator</span>
              
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase">Simulation User Name</label>
                <input 
                  type="text" 
                  value={scanEmployeeName}
                  onChange={(e) => setScanEmployeeName(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 text-xs font-semibold rounded-lg text-slate-700 focus:outline-none"
                />
              </div>

              <button 
                onClick={triggerScanSimulate}
                disabled={scannerActive}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors font-sans shadow-2xs"
              >
                <Camera size={13} />
                <span>Simulate Desk Scan</span>
              </button>

              {scanStatusMsg && (
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600 leading-normal" id="scan-feedback">
                  {scanStatusMsg}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400" id="qr-inspector-empty">
            <QrCode size={32} className="mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 font-sans">No seat selected</p>
            <p className="text-[10px] text-slate-400">Click any desk tag inside the label matrix to view options.</p>
          </div>
        )}
      </div>
    </div>
  );
}

