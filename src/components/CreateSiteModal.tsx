import React, { useState } from "react";
import { MapPin, Globe, Plus, X, Building2, CheckCircle2 } from "lucide-react";
import { LocationSite } from "../types";

interface CreateSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSite: (newSite: LocationSite, initialBuildingName?: string) => void;
}

export default function CreateSiteModal({
  isOpen,
  onClose,
  onAddSite
}: CreateSiteModalProps) {
  if (!isOpen) return null;

  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [country, setCountry] = useState("India");
  const [address, setAddress] = useState("");
  const [timeZone, setTimeZone] = useState("IST (UTC+5:30)");
  const [buildingName, setBuildingName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      alert("Please enter a Location Site Name.");
      return;
    }

    const code = siteCode.trim().toUpperCase() || siteName.trim().substring(0, 3).toUpperCase();
    const newSite: LocationSite = {
      id: `site-${Date.now()}`,
      name: siteName.trim(),
      code,
      country,
      address: address.trim() || `${siteName.trim()} Corporate Park, ${country}`,
      timeZone
    };

    onAddSite(newSite, buildingName.trim() || `${siteName.trim()} Primary Tower`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[120] p-4 font-sans">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Globe className="text-blue-600" size={20} />
            <h3 className="text-base font-bold text-slate-900 font-display">
              Create Location Site Environment
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
              Site / Campus Name *
            </label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => {
                setSiteName(e.target.value);
                if (!siteCode) {
                  setSiteCode(e.target.value.substring(0, 3).toUpperCase());
                }
              }}
              placeholder="e.g. Pune Cyber City Campus, Tokyo Ginza Hub"
              className="w-full border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Site Code (3-4 Letters)
              </label>
              <input
                type="text"
                maxLength={5}
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value.toUpperCase())}
                placeholder="PNE"
                className="w-full border border-slate-200 rounded-lg p-2 font-mono uppercase font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. India, USA, Japan"
                className="w-full border border-slate-200 rounded-lg p-2 font-semibold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
              Street Address / Landmark
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Tower 4, Magarpatta City, Hadapsar, Pune, MH 411028"
              className="w-full border border-slate-200 rounded-lg p-2 text-slate-700"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
              Initial Building / Tower Name
            </label>
            <input
              type="text"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="e.g. Cyber City Tower A"
              className="w-full border border-slate-200 rounded-lg p-2 font-semibold text-slate-800"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
            <span>
              Creating this site creates an isolated location site environment for buildings, floors, seats, assets, and floor designer maps.
            </span>
          </div>

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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-bold shadow-md shadow-blue-200 cursor-pointer"
            >
              Create Site Environment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
