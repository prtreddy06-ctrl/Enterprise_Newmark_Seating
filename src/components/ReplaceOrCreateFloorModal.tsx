import React, { useState } from "react";
import { Layers, Plus, RefreshCw, Building2, MapPin, CheckCircle2, Sparkles, X, ArrowRight } from "lucide-react";
import { Building, Floor, LocationSite } from "../types";

interface ReplaceOrCreateFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  extractedStats?: {
    zonesCount: number;
    seatsCount: number;
    facilitiesCount?: number;
  };
  buildings: Building[];
  floors: Floor[];
  sites: LocationSite[];
  activeSiteId: string;
  activeBuildingId?: string;
  activeFloorId?: string;
  onConfirm: (data: {
    mode: "CREATE_NEW" | "REPLACE_EXISTING";
    targetFloorId?: string;
    newFloorName?: string;
    targetBuildingId: string;
    targetSiteId: string;
  }) => void;
}

export default function ReplaceOrCreateFloorModal({
  isOpen,
  onClose,
  fileName,
  extractedStats = { zonesCount: 0, seatsCount: 0, facilitiesCount: 0 },
  buildings,
  floors,
  sites,
  activeSiteId,
  activeBuildingId,
  activeFloorId,
  onConfirm
}: ReplaceOrCreateFloorModalProps) {
  if (!isOpen) return null;

  const [mode, setMode] = useState<"CREATE_NEW" | "REPLACE_EXISTING">("CREATE_NEW");
  
  // Site selection
  const [selectedSiteId, setSelectedSiteId] = useState<string>(activeSiteId || sites[0]?.id || "site-hyd");

  // Buildings filtered by site
  const siteBuildings = buildings.filter(b => !b.siteId || b.siteId === selectedSiteId);
  const defaultBuildingId = activeBuildingId && siteBuildings.some(b => b.id === activeBuildingId)
    ? activeBuildingId
    : siteBuildings[0]?.id || buildings[0]?.id || "b1";

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(defaultBuildingId);

  // Floors filtered by selected building
  const buildingFloors = floors.filter(f => f.buildingId === selectedBuildingId && !f.isArchived);
  const defaultFloorId = activeFloorId && buildingFloors.some(f => f.id === activeFloorId)
    ? activeFloorId
    : buildingFloors[0]?.id || floors[0]?.id || "";

  const [selectedFloorId, setSelectedFloorId] = useState<string>(defaultFloorId);

  // New floor name suggestion
  const suggestedName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || `Floor ${buildingFloors.length + 1} (Uploaded)`;
  const [newFloorName, setNewFloorName] = useState<string>(suggestedName);

  const activeSite = sites.find(s => s.id === selectedSiteId);
  const activeBuildingObj = buildings.find(b => b.id === selectedBuildingId);
  const activeFloorObj = floors.find(f => f.id === selectedFloorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "CREATE_NEW" && !newFloorName.trim()) {
      alert("Please enter a floor name for the new floor.");
      return;
    }
    if (mode === "REPLACE_EXISTING" && !selectedFloorId) {
      alert("Please select an existing floor to replace.");
      return;
    }

    onConfirm({
      mode,
      targetFloorId: mode === "REPLACE_EXISTING" ? selectedFloorId : undefined,
      newFloorName: mode === "CREATE_NEW" ? newFloorName.trim() : undefined,
      targetBuildingId: selectedBuildingId,
      targetSiteId: selectedSiteId
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[110] p-4 font-sans">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Floor Plan Blueprint Upload Detected
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                File: <strong className="text-slate-800 font-mono">{fileName}</strong> ({extractedStats.zonesCount} zones, {extractedStats.seatsCount} seats)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Choice Cards: Create New vs Replace Existing */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("CREATE_NEW")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                mode === "CREATE_NEW"
                  ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/30"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  mode === "CREATE_NEW" ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  <Plus size={18} />
                </div>
                {mode === "CREATE_NEW" && (
                  <CheckCircle2 size={18} className="text-purple-600" />
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900">Create New Floor</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Add a new floor layout to the selected site & building environment without affecting existing floors.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("REPLACE_EXISTING")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                mode === "REPLACE_EXISTING"
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/30"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  mode === "REPLACE_EXISTING" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  <RefreshCw size={18} />
                </div>
                {mode === "REPLACE_EXISTING" && (
                  <CheckCircle2 size={18} className="text-blue-600" />
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900">Replace Existing Floor</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Overwrite an existing floor layout with this newly imported blueprint data.
              </p>
            </button>
          </div>

          {/* Target Location Site & Building Environment */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Target Location Site Environment
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Location Site</label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => {
                    const nextSiteId = e.target.value;
                    setSelectedSiteId(nextSiteId);
                    const matchedBldgs = buildings.filter(b => !b.siteId || b.siteId === nextSiteId);
                    if (matchedBldgs.length > 0) {
                      setSelectedBuildingId(matchedBldgs[0].id);
                      const matchedFlrs = floors.filter(f => f.buildingId === matchedBldgs[0].id);
                      if (matchedFlrs.length > 0) setSelectedFloorId(matchedFlrs[0].id);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800"
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Building Tower</label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => {
                    const nextBldgId = e.target.value;
                    setSelectedBuildingId(nextBldgId);
                    const matchedFlrs = floors.filter(f => f.buildingId === nextBldgId);
                    if (matchedFlrs.length > 0) setSelectedFloorId(matchedFlrs[0].id);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800"
                >
                  {siteBuildings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mode Specific Input */}
            {mode === "CREATE_NEW" ? (
              <div className="pt-1">
                <label className="text-[10px] text-purple-900 font-bold uppercase block mb-1">
                  New Floor Designation Name
                </label>
                <input
                  type="text"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  placeholder="e.g. 12th Floor CRE, West Wing Executive Level"
                  className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ) : (
              <div className="pt-1">
                <label className="text-[10px] text-blue-900 font-bold uppercase block mb-1">
                  Select Existing Floor to Overwrite
                </label>
                <select
                  value={selectedFloorId}
                  onChange={(e) => setSelectedFloorId(e.target.value)}
                  className="w-full bg-white border border-blue-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {buildingFloors.length > 0 ? (
                    buildingFloors.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} (Capacity: {f.capacity} seats, {f.zonesCount} zones)
                      </option>
                    ))
                  ) : (
                    <option value="">No existing floors in this building (Switch to Create New)</option>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Real-Time Auto-Save Notice */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>
              <strong>Auto-Save Active:</strong> Blueprint layout will be directly stored to Firestore & local state, reflected instantly in Floor Designer, and backed up in AI Reader.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white text-xs rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                mode === "CREATE_NEW" 
                  ? "bg-purple-600 hover:bg-purple-700 shadow-purple-200" 
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              <span>{mode === "CREATE_NEW" ? "Create New Floor & Auto-Save" : "Replace Existing Floor & Auto-Save"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
