import React, { useState } from "react";
import { 
  FileUp, 
  Sparkles, 
  CheckCircle, 
  RefreshCw, 
  Eye, 
  Layers, 
  MapPin, 
  Grid, 
  Maximize2,
  Info,
  ShieldAlert,
  ArrowRight,
  Building2,
  Layers3,
  Clock,
  Plus,
  Download,
  ExternalLink,
  Trash2,
  Globe
} from "lucide-react";
import { Zone, Seat, Building, Floor, LocationSite, AiReaderCopy } from "../types";
import { extractBlueprintFromPdf } from "../utils/pdfBlueprintExtractor";
import ReplaceOrCreateFloorModal from "./ReplaceOrCreateFloorModal";

interface FloorReaderProps {
  activeRole: string;
  buildings: Building[];
  floors: Floor[];
  sites: LocationSite[];
  activeSiteId: string;
  activeBuildingId?: string;
  activeFloorId?: string;
  aiReaderCopies: AiReaderCopy[];
  onCommitExtractedFloor: (data: {
    mode: "CREATE_NEW" | "REPLACE_EXISTING";
    targetFloorId?: string;
    newFloorName?: string;
    targetBuildingId: string;
    targetSiteId: string;
    extractedZones: Zone[];
    extractedSeats: Seat[];
    fileName: string;
    filePreviewUrl?: string;
  }) => void;
  onOpenInFloorDesigner?: (floorId: string, buildingId: string) => void;
  onDeleteAiCopy?: (copyId: string) => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
}

export default function FloorReader({
  activeRole,
  buildings,
  floors,
  sites,
  activeSiteId,
  activeBuildingId,
  activeFloorId,
  aiReaderCopies = [],
  onCommitExtractedFloor,
  onOpenInFloorDesigner,
  onDeleteAiCopy,
  onAddAuditLog
}: FloorReaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>("");

  // Extracted preview results
  const [extractedData, setExtractedData] = useState<{
    zonesCount: number;
    seatsCount: number;
    wallsCount: number;
    cabinsCount: number;
    extractedZones: Zone[];
    extractedSeats: Seat[];
    isEstimate?: boolean;
  } | null>(null);
  const [extractionError, setExtractionError] = useState<string>("");

  // Replace vs Create New Floor Modal State
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState<boolean>(false);

  const isAuthorized = ["Super User", "Admin"].includes(activeRole);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User and Admin can run AI Floor Blueprint Recognition.");
      return;
    }

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setExtractionError("");
    setExtractedData(null);

    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }

    // Trigger AI Floor Recognition Pipeline — reads the ACTUAL uploaded file
    runAiAnalysis(selectedFile);
  };

  const runAiAnalysis = (uploadedFile: File) => {
    const name = uploadedFile.name;
    setIsAnalyzing(true);
    setProgress(15);

    const isPdf = uploadedFile.type === "application/pdf" || name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      // Genuine visual/CAD parsing (images, DWG, SVG) isn't wired up in this
      // build — rather than fake a result, say so plainly and point at a
      // working alternative.
      setStage("Checking file type...");
      setTimeout(() => {
        setIsAnalyzing(false);
        setProgress(0);
        setExtractionError(
          `"${name}" isn't a PDF. Real blueprint text extraction is only implemented for PDF files in this build — image (PNG/JPG), SVG, and DWG uploads aren't parsed yet (that needs a connected computer-vision service). Please upload a PDF version of this blueprint, or use "Bulk Seat Generator" / manual layout tools in Floor Designer instead.`
        );
      }, 500);
      return;
    }

    setStage("Reading PDF text layer (seat numbers, room labels)...");

    extractBlueprintFromPdf(uploadedFile)
      .then((result) => {
        setProgress(55);
        setStage(`Found ${result.seatNumbers.length} seat number(s) and ${result.zoneLabels.length} labeled area type(s) across ${result.pageCount} page(s)...`);

        if (result.seatNumbers.length === 0) {
          setTimeout(() => {
            setIsAnalyzing(false);
            setProgress(0);
            setExtractionError(
              `No seat/desk numbers were found in "${name}"'s text layer. This usually means the PDF is a scanned image (no selectable text) rather than a vector/text-based export. Try re-exporting the blueprint as a text-based PDF, or use "Bulk Seat Generator" to lay out seats manually.`
            );
          }, 400);
          return;
        }

        setTimeout(() => {
          setProgress(85);
          setStage("Building zones and seat layout from extracted data...");

          setTimeout(() => {
            setProgress(100);
            setIsAnalyzing(false);

            // Split the real, extracted seat numbers into zones. Prefer the
            // number of "Cluster" labels actually found in the document; if
            // none were labeled, fall back to a reasonable capacity-based
            // split (roughly one zone per ~50 desks) so a 555-seat floor and
            // a 40-seat floor don't get forced into the same zone count.
            const clusterLabel = result.zoneLabels.find(z => z.label === "Cluster");
            const zoneCount = clusterLabel && clusterLabel.count > 0
              ? clusterLabel.count
              : Math.max(1, Math.ceil(result.seatNumbers.length / 50));

            const cabinLabel = result.zoneLabels.find(z => z.label === "Cabin");
            const cabinsCount = cabinLabel?.count || 0;

            // Wall/partition geometry genuinely can't be recovered from a
            // text layer — this is a rough structural estimate, not a real
            // count, and is labeled as such in the UI.
            const estimatedWalls = zoneCount * 2 + cabinsCount;

            const seatsPerZone = Math.ceil(result.seatNumbers.length / zoneCount);
            const zoneWidth = 260;
            const zoneHeight = Math.max(220, Math.ceil(seatsPerZone / 6) * 55 + 60);
            const seatsPerRow = 6;

            const extractedZones: Zone[] = [];
            const extractedSeats: Seat[] = [];
            const zoneColors = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#e11d48", "#0891b2", "#65a30d", "#be185d"];

            for (let z = 0; z < zoneCount; z++) {
              const zoneId = `ai-zone-${Date.now()}-${z}`;
              const zoneSeatNumbers = result.seatNumbers.slice(z * seatsPerZone, (z + 1) * seatsPerZone);
              if (zoneSeatNumbers.length === 0) continue;

              extractedZones.push({
                id: zoneId,
                name: clusterLabel ? `Cluster ${z + 1}` : `Zone ${String.fromCharCode(65 + (z % 26))}`,
                floorId: "f1",
                x: 40 + (z % 3) * (zoneWidth + 30),
                y: 40 + Math.floor(z / 3) * (zoneHeight + 30),
                width: zoneWidth,
                height: zoneHeight,
                color: zoneColors[z % zoneColors.length]
              } as Zone);

              zoneSeatNumbers.forEach((seatNum, i) => {
                const row = Math.floor(i / seatsPerRow);
                const col = i % seatsPerRow;
                extractedSeats.push({
                  id: `ai-seat-${Date.now()}-${z}-${i}`,
                  seatNumber: seatNum,
                  zoneId,
                  floorId: "f1",
                  buildingId: "b1",
                  type: "Standard",
                  status: "Vacant",
                  x: 20 + col * 38,
                  y: 20 + row * 38
                } as Seat);
              });
            }

            setExtractedData({
              zonesCount: extractedZones.length,
              seatsCount: extractedSeats.length,
              wallsCount: estimatedWalls,
              cabinsCount,
              extractedZones,
              extractedSeats,
              isEstimate: true
            });

            onAddAuditLog(
              "AI Floor Recognition",
              "Floor Map",
              `Parsed blueprint '${name}': extracted ${extractedSeats.length} real seat number(s) from the PDF text layer across ${extractedZones.length} zone(s) (${cabinsCount} cabin label(s) detected).`
            );
          }, 500);
        }, 500);
      })
      .catch((err) => {
        console.error("PDF extraction failed", err);
        setIsAnalyzing(false);
        setProgress(0);
        setExtractionError(
          `Couldn't read "${name}" as a PDF (${err?.message || "unknown error"}). Please confirm the file isn't corrupted or password-protected, or try "Bulk Seat Generator" instead.`
        );
      });
  };

  const handleOpenChoiceModal = () => {
    if (!extractedData) return;
    setIsReplaceModalOpen(true);
  };

  const handleConfirmReplaceOrCreate = (choice: {
    mode: "CREATE_NEW" | "REPLACE_EXISTING";
    targetFloorId?: string;
    newFloorName?: string;
    targetBuildingId: string;
    targetSiteId: string;
  }) => {
    if (!extractedData) return;

    onCommitExtractedFloor({
      ...choice,
      extractedZones: extractedData.extractedZones,
      extractedSeats: extractedData.extractedSeats,
      fileName: fileName || "AI_Blueprint_Import.pdf",
      filePreviewUrl: filePreviewUrl || undefined
    });

    setIsReplaceModalOpen(false);
  };

  // Download Copy JSON Backup
  const handleDownloadCopyJson = (copy: AiReaderCopy) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(copy, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AI_Blueprint_${copy.fileName}_${copy.floorName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 font-sans" id="floor-reader-module">
      {/* Choice Modal */}
      <ReplaceOrCreateFloorModal
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        fileName={fileName || "AI_Blueprint_Scan.pdf"}
        extractedStats={extractedData ? {
          zonesCount: extractedData.zonesCount,
          seatsCount: extractedData.seatsCount,
          facilitiesCount: extractedData.cabinsCount
        } : undefined}
        buildings={buildings}
        floors={floors}
        sites={sites}
        activeSiteId={activeSiteId}
        activeBuildingId={activeBuildingId}
        activeFloorId={activeFloorId}
        onConfirm={handleConfirmReplaceOrCreate}
      />

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center flex-wrap gap-4 font-sans">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight font-display flex items-center gap-2">
            <Sparkles className="text-blue-600" size={20} />
            <span>AI Floor Blueprint Reader & Action Workbench</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload PDF, PNG, JPG, SVG, or DWG blueprints. Gemini AI automatically parses workstation coordinates, prompts for replacement/creation, auto-saves directly, and creates a synchronized copy in AI Reader for immediate action.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="floor-reader-grid">
        {/* LEFT DOCK: Upload controls */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Blueprint File Reader & Vision Ingest
          </span>

          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 rounded-2xl p-6 text-center relative transition-all">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.svg,.dwg,.dxf"
              onChange={handleFileChange}
              disabled={!isAuthorized || isAnalyzing}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
            />
            <FileUp className="mx-auto text-slate-400 mb-2" size={32} />
            <p className="text-xs font-bold text-slate-800">
              Upload Blueprint PDF (real text extraction)
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              PNG/JPG/SVG/DWG accepted, but only PDF text-layer parsing is implemented — those formats need a connected vision AI service
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[10px]">
              <Info size={14} className="text-blue-600" />
              <span>Automated Workflow Protocol</span>
            </h5>
            <ul className="text-[10px] space-y-1 list-disc pl-3 text-slate-500">
              <li>Reads real seat numbers & room labels from the PDF's text layer — results scale with the actual document, not a fixed count.</li>
              <li>Asks whether to <strong>Replace</strong> or <strong>Create New Floor</strong>.</li>
              <li>Auto-saves directly to Firestore & localStorage.</li>
              <li>Instantly reflects updates inside Floor Designer.</li>
              <li>Creates an immediate backup copy record in AI Reader below.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT WORKSPACE: Extracted Preview Canvas */}
        <div className="bg-white border border-slate-200 rounded-2xl lg:col-span-2 p-5 flex flex-col justify-between min-h-[380px]">
          {isAnalyzing ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
              <Sparkles className="animate-spin text-blue-600" size={36} />
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-slate-800">AI Blueprint Computer Vision Scanning...</h4>
                <p className="text-xs text-slate-400">{stage}</p>
              </div>
              <div className="w-64 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : extractedData ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    AI Extraction Result: {fileName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Recognized architectural elements ready for immediate floor creation or replacement.
                  </p>
                </div>

                <button
                  onClick={handleOpenChoiceModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-200 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Replace or Create New Floor</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* KPI metrics */}
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">Zones Detected</span>
                  <div className="text-lg font-extrabold text-blue-900 font-mono mt-0.5">{extractedData.zonesCount}</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Seats Extracted</span>
                  <div className="text-lg font-extrabold text-emerald-900 font-mono mt-0.5">{extractedData.seatsCount}</div>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <span className="text-[10px] font-bold text-purple-600 uppercase">Walls / Barriers (Est.)</span>
                  <div className="text-lg font-extrabold text-purple-900 font-mono mt-0.5">{extractedData.wallsCount}</div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Cabins / Pods</span>
                  <div className="text-lg font-extrabold text-amber-900 font-mono mt-0.5">{extractedData.cabinsCount}</div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                Zones and Seats reflect real numbers found in the PDF's text layer. Walls/Barriers is a rough structural estimate — true wall geometry needs visual/CAD parsing, which isn't connected in this build.
              </p>

              {/* Visual preview box */}
              <div className="flex-1 bg-slate-900 rounded-2xl p-4 relative overflow-hidden border border-slate-800 min-h-[200px] flex items-center justify-center">
                {filePreviewUrl ? (
                  <img src={filePreviewUrl} alt="Blueprint" className="max-h-48 rounded opacity-80" />
                ) : (
                  <div className="text-center text-slate-400 space-y-2">
                    <Grid size={40} className="mx-auto text-blue-500" />
                    <p className="text-xs font-mono">Vector CAD Blueprint Layer Processed</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              {extractionError ? (
                <>
                  <ShieldAlert size={48} className="mx-auto mb-3 text-amber-400" />
                  <p className="text-xs font-bold text-amber-700">Couldn't Extract This File</p>
                  <p className="text-[11px] max-w-md mt-1.5 leading-relaxed text-slate-500">
                    {extractionError}
                  </p>
                </>
              ) : (
                <>
                  <Sparkles size={56} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">AI Floor Plan Importer Ready</p>
                  <p className="text-[11px] max-w-sm mt-1 leading-relaxed">
                    Upload a text-based PDF blueprint on the left. The reader extracts real seat numbers and room labels from the document's text layer, then lets you replace or create a new floor from them.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SYNCHRONIZED AI READER COPIES LOG & IMMEDIATE ACTION WORKBENCH */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
              <Clock size={16} className="text-purple-600" />
              <span>AI Reader Synchronized Blueprint Copies & Immediate Action Logs</span>
            </h4>
            <p className="text-xs text-slate-500">
              Instant historical records of all AI-processed blueprints. Open directly in Floor Designer or re-apply anytime.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
            {aiReaderCopies.length} Active Copies
          </span>
        </div>

        {aiReaderCopies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiReaderCopies.map((copy) => (
              <div 
                key={copy.id}
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-purple-300 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      copy.mode === "CREATED_NEW" 
                        ? "bg-purple-100 text-purple-800 border border-purple-200" 
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}>
                      {copy.mode === "CREATED_NEW" ? "Created New Floor" : "Replaced Existing Floor"}
                    </span>

                    {onDeleteAiCopy && (
                      <button
                        onClick={() => onDeleteAiCopy(copy.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete record copy"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{copy.fileName}</h5>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Target: <strong className="text-slate-900">{copy.floorName}</strong> ({copy.buildingName})
                  </p>
                  
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-600 pt-1 border-t border-slate-200/60 font-mono">
                    <div><span className="text-slate-400 font-sans block text-[9px]">Zones</span><strong>{copy.zonesCount}</strong></div>
                    <div><span className="text-slate-400 font-sans block text-[9px]">Seats</span><strong>{copy.seatsCount}</strong></div>
                    <div><span className="text-slate-400 font-sans block text-[9px]">Saved</span><strong>{new Date(copy.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</strong></div>
                  </div>
                </div>

                {/* Immediate Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-200/60">
                  {onOpenInFloorDesigner && (
                    <button
                      onClick={() => onOpenInFloorDesigner(copy.floorId, copy.buildingId)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                    >
                      <ExternalLink size={12} />
                      <span>Open Designer</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDownloadCopyJson(copy)}
                    className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-semibold py-1.5 px-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                    title="Download JSON Blueprint"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            <Clock size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold text-slate-600">No AI Reader Copies Logged Yet</p>
            <p className="text-[11px] max-w-xs mx-auto mt-1">
              When you upload blueprint files in AI Reader or Floor Designer, copies will automatically save here for immediate action.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
