import React, { useState } from "react";
import { UserAccount, Seat, SeatRequest, ITAsset } from "../types";
import { 
  Smartphone, 
  Wifi, 
  Battery, 
  Bell, 
  QrCode, 
  MapPin, 
  Send, 
  History, 
  User, 
  Monitor, 
  Grid,
  CheckCircle,
  HelpCircle,
  LogOut,
  Sparkles
} from "lucide-react";

interface MobileSimulatorProps {
  seats: Seat[];
  currentUser?: UserAccount | null;
  onAddRequest: (req: SeatRequest) => void;
  onCheckIn: (seatId: string, employeeName: string) => void;
  onCheckOut: (seatId: string) => void;
}

export default function MobileSimulator({ seats, currentUser, onAddRequest, onCheckIn, onCheckOut }: MobileSimulatorProps) {
  // Mobile app navigation
  const [activeTab, setActiveTab] = useState<"home" | "request" | "scan" | "assets">("home");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>(currentUser?.email || "palagiriravireddy@gmail.com");
  const [userName, setUserName] = useState<string>(currentUser?.name || "Ravi Teja Reddy");
  
  // Custom request form
  const [buildingScope, setBuildingScope] = useState<string>("Newmark _Hyderabad");
  const [floorScope, setFloorScope] = useState<string>("11 th Floor CRE");
  const [reasonText, setReasonText] = useState<string>("");

  // Scan simulation
  const [selectedScanSeatId, setSelectedScanSeatId] = useState<string>("s3");
  const [scanMessage, setScanMessage] = useState<string>("");

  // Simulated push notifications list
  const [notifications, setNotifications] = useState<string[]>([
    "Push Alert: Seat A-101 allocated by Sarah Connor.",
    "Reminder: Checkout mandated before 07:00 PM tonight."
  ]);

  // Find user's seat if assigned
  const effectiveName = currentUser?.name || userName;
  const effectiveEmail = currentUser?.email || userEmail;
  const effectiveDept = currentUser?.department || "Operations";
  const userSeat = seats.find(s => s.employeeName === effectiveName || (s.employeeEmail && s.employeeEmail.toLowerCase() === effectiveEmail.toLowerCase()));

  const handleMobileSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonText) return;

    const newReq: SeatRequest = {
      id: `req-mobile-${Date.now()}`,
      employeeName: effectiveName,
      employeeEmail: effectiveEmail,
      department: effectiveDept,
      buildingId: "b1",
      floorId: "f1",
      reason: reasonText,
      status: "Pending",
      requestedAt: new Date().toISOString()
    };

    onAddRequest(newReq);
    setNotifications(prev => [`Request submitted successfully!`, ...prev]);
    setReasonText("");
    alert("Desk Petition Sent: Request successfully pushed to Admin Queue.");
    setActiveTab("home");
  };

  const handleMobileScan = () => {
    const targetSeat = seats.find(s => s.id === selectedScanSeatId);
    if (!targetSeat) return;

    if (targetSeat.status === "Occupied" && targetSeat.employeeName !== userName) {
      setScanMessage("Access Denied: Seat claimed by another employee.");
      return;
    }

    if (targetSeat.status === "Occupied") {
      onCheckOut(targetSeat.id);
      setScanMessage(`Logged out from Desk ${targetSeat.seatNumber}.`);
    } else {
      onCheckIn(targetSeat.id, userName);
      setScanMessage(`Success: Claimed Desk ${targetSeat.seatNumber}!`);
    }
    
    setTimeout(() => {
      setScanMessage("");
    }, 4000);
  };

  // Mock Assets linked to employee
  const mockUserAssets: ITAsset[] = [
    { id: "ma-1", name: "MacBook Pro 16 M3", type: "Laptop", assetTag: "EQ-LP-5522", serialNumber: "SN552200", warrantyExpiry: "2029-02-14", status: "Assigned" },
    { id: "ma-2", name: "Dell 32 UHD Monitor", type: "Monitor", assetTag: "EQ-MN-1122", serialNumber: "SN112299", warrantyExpiry: "2028-09-01", status: "Assigned" },
    { id: "ma-3", name: "Anker USB-C Dock", type: "Dock", assetTag: "EQ-DK-9002", serialNumber: "SN900211", warrantyExpiry: "2027-10-15", status: "Assigned" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" id="mobile-module">
      {/* LEFT DESCRIPTION PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4" id="mobile-explainer">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
          <Smartphone className="text-blue-600 animate-pulse" size={17} />
          <span>Mobile App Companion Sim</span>
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          The cross-platform iOS & Android mobile package is developed in React Native and Flutter. It connects to the core ASP.NET / Node REST API to facilitate instant QR check-ins, push alerts, and desk configuration sweeps.
        </p>

        {/* Sync panel status */}
        <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2.5 text-xs text-slate-600" id="mobile-sync-status">
          <span className="font-bold text-[9px] uppercase tracking-wider text-blue-700 block">Simulation Profile Link</span>
          
          <div className="space-y-1">
            <label className="text-[9px] text-slate-400 font-bold uppercase">Simulator User Identity</label>
            <input 
              type="text" 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-white border border-slate-200 p-1.5 text-xs font-semibold rounded-lg focus:outline-none"
            />
          </div>

          <p className="text-[11px] leading-relaxed">
            *Modifying the user identity on this panel updates the logged-in mobile state in real-time. Try creating seat requests inside the phone to see them instantly queue in the Admin Panel!
          </p>
        </div>

        {/* Live Push Log Notifications */}
        <div className="bg-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-300 space-y-3 shadow-md" id="mobile-push-logs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <Bell size={12} className="text-amber-400 animate-bounce" />
            Push Dispatch Queue
          </span>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto" id="push-logs-list">
            {notifications.map((notif, idx) => (
              <p key={idx} className="text-[10px] text-slate-300 border-b border-slate-800 pb-1.5 leading-normal">{notif}</p>
            ))}
          </div>
        </div>
      </div>

      {/* CORE DEVICE PHONE CONTAINER */}
      <div className="lg:col-span-3 flex justify-center py-4" id="phone-frame-align">
        {/* Visual Phone Frame */}
        <div className="w-[300px] h-[580px] bg-slate-950 rounded-[40px] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col" id="iphone-device-body">
          {/* Top Notch Area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-800 w-[120px] h-[22px] rounded-b-2xl z-50 flex items-center justify-center">
            {/* Camera dot & speaker */}
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mr-2"></span>
            <span className="w-8 h-1 bg-slate-900 rounded-full"></span>
          </div>

          {/* Status Bar */}
          <div className="bg-slate-900 h-[38px] px-5 pt-3.5 flex justify-between items-center text-white text-[10px] font-medium tracking-tight select-none z-40">
            <span>14:11</span>
            <div className="flex items-center gap-1.5">
              <Wifi size={10} />
              <Battery size={12} />
            </div>
          </div>

          {/* APP SCREEN CONTAINER */}
          <div className="flex-1 bg-slate-50 flex flex-col overflow-y-auto text-slate-800 text-xs p-4 relative" id="mobile-screen-workspace">
            {isLoggedIn ? (
              <>
                {/* Dynamic Screen Contents */}
                {activeTab === "home" && (
                  <div className="space-y-4" id="screen-home">
                    {/* Welcome Header */}
                    <div className="flex justify-between items-center bg-blue-900 text-white p-3 rounded-xl shadow-xs" id="screen-welcome-card">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-blue-200">Roster Employee</span>
                        <h5 className="font-bold font-sans">{userName}</h5>
                        <p className="text-[9px] text-blue-100 font-sans">Corporate ID: PR-2026</p>
                      </div>
                      <button onClick={() => setIsLoggedIn(false)} className="text-white hover:text-red-300"><LogOut size={14} /></button>
                    </div>

                    {/* Active Desk Assignment status */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-700 space-y-2 shadow-2xs" id="screen-desk-status">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Your Assigned Seat</span>
                      {userSeat ? (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-800 text-base font-mono">{userSeat.seatNumber}</p>
                            <p className="text-[10px] text-slate-400">HQ • 11 th Floor CRE</p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px] font-sans uppercase">Active</span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] text-slate-500 font-medium">No desk assigned for today's roster yet.</p>
                          <button 
                            onClick={() => setActiveTab("request")}
                            className="text-blue-600 font-bold hover:underline mt-1 bg-blue-50 px-2 py-1 rounded text-[10px] font-sans"
                          >
                            + Request Desk Block
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick scan invitation */}
                    <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-4 rounded-xl text-center shadow-xs space-y-2.5" id="screen-scan-banner">
                      <QrCode className="mx-auto" size={28} />
                      <div>
                        <h6 className="font-bold font-sans">Desk Check-In</h6>
                        <p className="text-[9px] text-blue-200 leading-relaxed mt-0.5">Scan desk QR labels to claim standard or hot-desk blocks instantly.</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab("scan")}
                        className="bg-white text-blue-800 font-bold px-3 py-1.5 rounded-lg text-[10px] w-full font-sans transition-transform hover:scale-102"
                      >
                        Launch Scanner Camera
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "request" && (
                  <form onSubmit={handleMobileSubmitRequest} className="space-y-3.5" id="screen-request">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Desk allocation petition</span>
                      <h5 className="font-bold text-slate-800 mt-0.5">Submit Seat Request</h5>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Preferred Building</label>
                      <select 
                        value={buildingScope}
                        onChange={(e) => setBuildingScope(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg"
                      >
                        <option value="Newmark _Hyderabad">Newmark _Hyderabad (IN)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Floor Section</label>
                      <select 
                        value={floorScope}
                        onChange={(e) => setFloorScope(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg"
                      >
                        <option value="11 th Floor CRE">11 th Floor CRE</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Allocation Reason</label>
                      <textarea 
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        placeholder="Detail seating proximity parameters (e.g. need closeness to server testing grid)..."
                        rows={3}
                        className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg focus:outline-none"
                        required
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 font-sans shadow-2xs"
                    >
                      <Send size={12} />
                      <span>Transmit Request</span>
                    </button>
                  </form>
                )}

                {activeTab === "scan" && (
                  <div className="space-y-4 text-center" id="screen-scan">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Mobile Scanner Engine</span>
                      <h5 className="font-bold text-slate-800 text-left mt-0.5">Scan Desk Label</h5>
                    </div>

                    {/* Camera view simulation box */}
                    <div className="border-2 border-dashed border-blue-400 bg-slate-900 rounded-xl p-6 text-white space-y-3 min-h-[160px] flex flex-col justify-center" id="mock-camera-viewport">
                      <QrCode size={40} className="mx-auto text-blue-400 animate-pulse" />
                      <p className="text-[10px] font-mono text-slate-300">Point phone at physical desk label QR...</p>
                      
                      <select 
                        value={selectedScanSeatId}
                        onChange={(e) => setSelectedScanSeatId(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-[10px] p-1.5 rounded-md mx-auto focus:outline-none text-slate-200"
                      >
                        {seats.map(s => (
                          <option key={s.id} value={s.id}>Scan {s.seatNumber} ({s.status})</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      onClick={handleMobileScan}
                      className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl text-xs font-sans"
                    >
                      Trigger Optical Capture
                    </button>

                    {scanMessage && (
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-[10px] font-mono text-slate-700" id="scan-message-display">
                        {scanMessage}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "assets" && (
                  <div className="space-y-3.5" id="screen-assets">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned hardware inventory</span>
                      <h5 className="font-bold text-slate-800 mt-0.5">Desk Assets</h5>
                    </div>

                    <div className="space-y-2" id="employee-assets-list">
                      {mockUserAssets.map((asset) => (
                        <div key={asset.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between" id={`asset-item-${asset.id}`}>
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                              <Monitor size={14} />
                            </div>
                            <div className="text-[11px]">
                              <p className="font-bold text-slate-800">{asset.type}</p>
                              <p className="text-[9px] text-slate-400 font-mono">Tag: {asset.assetTag}</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                            Verified
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Login view
              <div className="space-y-4 pt-12 text-center" id="screen-login">
                <Sparkles size={36} className="mx-auto text-blue-600" />
                <div>
                  <h5 className="font-bold text-slate-800 text-sm font-sans">Seating Companion ID Link</h5>
                  <p className="text-[10px] text-slate-400">Input corporate email to activate roster synchronization</p>
                </div>

                <div className="space-y-2 text-left" id="login-inputs">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Corporate Email</label>
                    <input 
                      type="email" 
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Roster Token / Password</label>
                    <input 
                      type="password" 
                      defaultValue="••••••••"
                      className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setIsLoggedIn(true)}
                  className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl text-xs font-sans shadow-2xs"
                >
                  Verify Tenant Entra ID
                </button>
              </div>
            )}
          </div>

          {/* BOTTOM NAVIGATION TAB BAR */}
          {isLoggedIn && (
            <div className="bg-white border-t border-slate-200 h-[52px] grid grid-cols-4 items-center text-center text-[9px] text-slate-400 font-sans font-semibold select-none z-40" id="phone-nav-tabs">
              <button 
                onClick={() => setActiveTab("home")}
                className={`py-1.5 flex flex-col items-center gap-0.5 ${activeTab === "home" ? "text-blue-600" : "hover:text-slate-600"}`}
              >
                <Grid size={14} />
                <span>Portal</span>
              </button>

              <button 
                onClick={() => setActiveTab("request")}
                className={`py-1.5 flex flex-col items-center gap-0.5 ${activeTab === "request" ? "text-blue-600" : "hover:text-slate-600"}`}
              >
                <Send size={14} />
                <span>Petition</span>
              </button>

              <button 
                onClick={() => setActiveTab("scan")}
                className={`py-1.5 flex flex-col items-center gap-0.5 ${activeTab === "scan" ? "text-blue-600" : "hover:text-slate-600"}`}
              >
                <QrCode size={14} />
                <span>Scan Desk</span>
              </button>

              <button 
                onClick={() => setActiveTab("assets")}
                className={`py-1.5 flex flex-col items-center gap-0.5 ${activeTab === "assets" ? "text-blue-600" : "hover:text-slate-600"}`}
              >
                <Monitor size={14} />
                <span>Hardware</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
