import React, { useState } from "react";
import { 
  Smartphone, 
  QrCode, 
  Download, 
  FileText, 
  Camera, 
  CheckCircle2, 
  X, 
  Mail, 
  Send, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles
} from "lucide-react";
import { 
  downloadMobileAPK, 
  downloadMobileIPA, 
  downloadUserGuidePDF, 
  dispatchEmailNotification 
} from "../utils/emailAndDownloadService";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onAddAuditLog?: (action: string, category: any, details: string) => void;
}

export default function AppDownloadModal({
  isOpen,
  onClose,
  userEmail = "prtreddy06@gmail.com",
  onAddAuditLog
}: AppDownloadModalProps) {
  const [activeTab, setActiveTab] = useState<"DOWNLOADS" | "SCANNER" | "GUIDE">("DOWNLOADS");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [dispatchEmail, setDispatchEmail] = useState(userEmail);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartScanSim = () => {
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      setScanResult("QR Payload Validated: 'EnterprizSeat Mobile Companion Binary Stream v2.4.0'");
      // Automatically trigger Android APK download after successful scan
      downloadMobileAPK();
      if (onAddAuditLog) {
        onAddAuditLog("Mobile QR Scan", "Mobile App", "Scanned mobile installation QR code via camera simulator.");
      }
    }, 2000);
  };

  const handleTriggerApk = () => {
    setDownloadProgress("Downloading EnterprizSeat_Companion_v2.4_release.apk (32.4 MB)...");
    downloadMobileAPK();
    if (onAddAuditLog) {
      onAddAuditLog("APK Download", "Mobile App", "Downloaded native Android companion APK v2.4.");
    }
    setTimeout(() => setDownloadProgress(null), 3000);
  };

  const handleTriggerIpa = () => {
    setDownloadProgress("Downloading EnterprizSeat_Companion_v2.4.ipa (iOS TestFlight)...");
    downloadMobileIPA();
    if (onAddAuditLog) {
      onAddAuditLog("IPA Download", "Mobile App", "Downloaded native iOS companion IPA v2.4.");
    }
    setTimeout(() => setDownloadProgress(null), 3000);
  };

  const handleTriggerPdf = () => {
    setDownloadProgress("Downloading EnterprizSeat_User_And_Admin_Guide_2026.pdf...");
    downloadUserGuidePDF();
    if (onAddAuditLog) {
      onAddAuditLog("User Guide Download", "Mobile App", "Downloaded Mobile User & Admin Guide PDF.");
    }
    setTimeout(() => setDownloadProgress(null), 3000);
  };

  const handleDispatchMobileEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchEmail) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://enterprizseat.corp';

    dispatchEmailNotification({
      toEmail: dispatchEmail,
      subject: "EnterprizSeat Mobile Companion App Direct Binary Downloads",
      bodyText: `Dear EnterprizSeat User,

Here are your hyperlinked direct mobile app installation options and portal links:

- Web Application & PWA Direct Companion: ${origin}
- Android Companion WebApp Installer: ${origin}/download/android-pwa-installer.html
- iOS TestFlight Companion Installer: ${origin}/download/ios-companion-installer.html
- Mobile User & Admin Guide (PDF): ${origin}/docs/user-guide.pdf

Login Email: ${dispatchEmail}
Super User / Owner: Raviteja Reddy palagiri
Campus: Newmark _Hyderabad
Temporary Mobile PIN: 882910

Scan desk QR labels directly using the mobile camera scanner once installed.`,
      category: "Mobile App Onboarding"
    });

    setEmailSentSuccess(true);
    if (onAddAuditLog) {
      onAddAuditLog("Email Mobile Links", "Mobile App", `Dispatched mobile download links to ${dispatchEmail}`);
    }
    setTimeout(() => setEmailSentSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full text-slate-900 shadow-2xl space-y-5 p-6 border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <Smartphone size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
                <span>Enterprise Mobile Downloads Portal</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  v2.4 Release
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Native Android APK, iOS TestFlight, and Optical Camera QR Scanner
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 font-bold">
            <X size={20} />
          </button>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab("DOWNLOADS")}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "DOWNLOADS" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Download size={14} />
            <span>Direct File Downloads</span>
          </button>

          <button
            onClick={() => setActiveTab("SCANNER")}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "SCANNER" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <QrCode size={14} />
            <span>Live Camera QR Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab("GUIDE")}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "GUIDE" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={14} />
            <span>Install Guide</span>
          </button>
        </div>

        {/* DOWNLOAD PROGRESS TOAST */}
        {downloadProgress && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <Download className="animate-bounce shrink-0 text-blue-600" size={16} />
            <span>{downloadProgress}</span>
          </div>
        )}

        {/* TAB 1: DOWNLOADS */}
        {activeTab === "DOWNLOADS" && (
          <div className="space-y-4">
            {/* PWA / Direct Mobile Web App Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-900 to-slate-900 border border-blue-500/40 rounded-2xl text-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
                  <Smartphone size={16} className="text-emerald-400" />
                  <span>Direct Web App (PWA) One-Click Installation</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                  NO APK PARSING ERRORS
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Install EnterprizSeat directly onto your Android or iOS Home Screen without unknown source permissions or APK parsing errors. Open in Chrome or Safari and tap <strong>"Add to Home Screen"</strong>.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={typeof window !== 'undefined' ? window.location.origin : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md"
                >
                  <ExternalLink size={13} />
                  <span>Launch PWA Mobile Companion</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Android Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                      Android Package (.HTML / .APK)
                    </span>
                    <span className="text-xs font-mono text-slate-400">32.4 MB</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mt-2">EnterprizSeat Mobile Package</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Direct Mobile Web App Installer package for Android 10+. Features camera QR desk check-in, BLE proximity, and IT asset scanning.
                  </p>
                </div>
                <button
                  onClick={handleTriggerApk}
                  className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Download size={15} />
                  <span>Download Android Mobile Package</span>
                </button>
              </div>

              {/* iOS Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono">
                      iOS TestFlight (.IPA)
                    </span>
                    <span className="text-xs font-mono text-slate-400">28.1 MB</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mt-2">EnterprizSeat iOS</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    iOS Enterprise distribution build. Includes Apple Wallet desk pass integration & FaceID biometric auth.
                  </p>
                </div>
                <button
                  onClick={handleTriggerIpa}
                  className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Smartphone size={15} />
                  <span>Download iOS TestFlight IPA</span>
                </button>
              </div>
            </div>

            {/* Admin Manual PDF Download */}
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <FileText className="text-purple-600 shrink-0" size={20} />
                <div>
                  <span className="font-bold text-purple-950 block">User & Administrator Operating Handbook (PDF)</span>
                  <span className="text-[11px] text-purple-700">Official 2026 Mobile Deployment & Safety Guide</span>
                </div>
              </div>
              <button
                onClick={handleTriggerPdf}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shrink-0 flex items-center gap-1.5 transition-all text-xs"
              >
                <Download size={14} />
                <span>PDF Guide</span>
              </button>
            </div>

            {/* Email Mobile Download Links Form */}
            <form onSubmit={handleDispatchMobileEmail} className="bg-slate-900 text-white p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs text-blue-300 font-bold uppercase tracking-wider">
                <Mail size={14} />
                <span>Send Mobile Download Links to Your Inbox</span>
              </div>
              <p className="text-xs text-slate-300">
                Receive an automated email containing APK & IPA download buttons, mobile credentials, and QR setup guide.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={dispatchEmail}
                  onChange={(e) => setDispatchEmail(e.target.value)}
                  placeholder="Enter corporate email address..."
                  required
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Send size={14} />
                  <span>Send Email</span>
                </button>
              </div>

              {emailSentSuccess && (
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={14} />
                  <span>Email dispatched! Check top right SMTP Relay Notification or your inbox.</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 2: OPTICAL CAMERA SCANNER */}
        {activeTab === "SCANNER" && (
          <div className="space-y-4 text-center">
            <p className="text-xs text-slate-500">
              Point your smartphone camera at this official QR matrix code to trigger instant mobile app download or simulate live optical camera scan below.
            </p>

            <div className="bg-slate-900 text-white p-6 rounded-3xl inline-block relative border border-slate-800 shadow-xl max-w-sm w-full mx-auto">
              
              {/* Scan viewport laser line overlay */}
              {isScanning && (
                <div className="absolute inset-x-6 top-10 h-0.5 bg-emerald-400 shadow-[0_0_15px_#10b981] animate-pulse z-20" />
              )}

              {/* Vector High-res QR artwork */}
              <div 
                onClick={() => {
                  handleTriggerApk();
                  handleTriggerIpa();
                  setScanResult("QR Code Clicked / Scanned: Dispatched Android APK (v2.4) & iOS IPA (v2.4) binaries to your device.");
                }}
                className="bg-white p-4 rounded-2xl inline-block mx-auto border border-slate-700 shadow-inner cursor-pointer hover:scale-105 hover:border-blue-400 transition-all group relative"
                title="Click QR Code to download Android APK & iOS IPA files directly"
              >
                <svg width="150" height="150" viewBox="0 0 100 100" className="mx-auto text-slate-900 group-hover:text-blue-600 transition-colors">
                  <rect x="0" y="0" width="28" height="28" fill="currentColor" rx="4" />
                  <rect x="4" y="4" width="20" height="20" fill="white" rx="2" />
                  <rect x="8" y="8" width="12" height="12" fill="currentColor" rx="1" />

                  <rect x="72" y="0" width="28" height="28" fill="currentColor" rx="4" />
                  <rect x="76" y="4" width="20" height="20" fill="white" rx="2" />
                  <rect x="80" y="8" width="12" height="12" fill="currentColor" rx="1" />

                  <rect x="0" y="72" width="28" height="28" fill="currentColor" rx="4" />
                  <rect x="4" y="76" width="20" height="20" fill="white" rx="2" />
                  <rect x="8" y="80" width="12" height="12" fill="currentColor" rx="1" />

                  <rect x="36" y="6" width="8" height="8" fill="currentColor" />
                  <rect x="48" y="16" width="16" height="8" fill="currentColor" />
                  <rect x="36" y="36" width="16" height="16" fill="currentColor" />
                  <rect x="56" y="36" width="16" height="8" fill="currentColor" />
                  <rect x="8" y="36" width="20" height="8" fill="currentColor" />
                  <rect x="76" y="36" width="20" height="8" fill="currentColor" />
                  <rect x="36" y="72" width="16" height="8" fill="currentColor" />
                  <rect x="56" y="84" width="8" height="16" fill="currentColor" />
                  <rect x="76" y="72" width="8" height="8" fill="currentColor" />
                  <rect x="84" y="84" width="12" height="12" fill="currentColor" />

                  <circle cx="50" cy="50" r="12" fill="currentColor" />
                  <circle cx="50" cy="50" r="6" fill="white" />
                </svg>
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tight block mt-1">
                  Click QR Code to Download Apps
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block font-mono">
                  NEWMARK-HYDERABAD-MOBILE-COMPANION-V2.4
                </span>
                <p className="text-xs text-slate-300">Target: Android & iOS Mobile Ecosystem</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={handleTriggerApk}
                  className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Android APK</span>
                </button>
                <button
                  onClick={handleTriggerIpa}
                  className="py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Smartphone size={14} />
                  <span>iOS IPA</span>
                </button>
              </div>

              <button
                onClick={handleStartScanSim}
                disabled={isScanning}
                className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Camera size={16} />
                <span>{isScanning ? "Simulating Optical Camera Scan..." : "Simulate Mobile Camera Scan"}</span>
              </button>
            </div>

            {scanResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-2 animate-in zoom-in-95">
                <div className="flex items-center justify-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>Optical Scan Completed & APK Download Triggered!</span>
                </div>
                <p className="font-mono text-[11px] text-emerald-700">{scanResult}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INSTALLATION GUIDE */}
        {activeTab === "GUIDE" && (
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Android APK Installation Guide</span>
              </h4>
              <ol className="list-disc list-inside space-y-1 pl-2 text-slate-600">
                <li>Click <strong>"Download Android APK"</strong> to save <code>EnterprizSeat_v2.4_release.apk</code>.</li>
                <li>On your Android phone, open <strong>Settings &gt; Security &gt; Install Unknown Apps</strong>.</li>
                <li>Allow your file manager or browser permission to install APK packages.</li>
                <li>Tap the downloaded APK file and select <strong>Install</strong>.</li>
              </ol>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                <span>iOS TestFlight / Enterprise Provisioning</span>
              </h4>
              <ol className="list-disc list-inside space-y-1 pl-2 text-slate-600">
                <li>Download the TestFlight application from the Apple App Store.</li>
                <li>Click <strong>"Download iOS TestFlight IPA"</strong> or accept the invitation sent to your corporate email.</li>
                <li>Go to <strong>Settings &gt; General &gt; VPN & Device Management</strong> and trust the <em>EnterprizSeat Enterprise Profile</em>.</li>
              </ol>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">
            Campus: Newmark _Hyderabad
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors"
          >
            Close Portal
          </button>
        </div>

      </div>
    </div>
  );
}
