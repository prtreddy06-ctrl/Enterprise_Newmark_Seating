import React, { useState } from "react";
import { 
  BookOpen, 
  User, 
  ShieldAlert, 
  Server, 
  HelpCircle,
  FileText,
  Activity,
  CheckCircle,
  QrCode
} from "lucide-react";

export default function ManualsView() {
  const [activeTab, setActiveTab] = useState<"user" | "admin" | "technical">("user");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="manuals-module">
      {/* LEFT NAVIGATION LINKS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="manuals-nav">
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
            <BookOpen className="text-blue-600 animate-pulse" size={17} />
            <span>Operational Handbooks</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">Quick references and technical design documents</p>
        </div>

        <div className="space-y-1.5" id="manuals-links">
          <button 
            onClick={() => setActiveTab("user")}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all ${
              activeTab === "user" ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <User size={14} />
              <span>User & Roster Guide</span>
            </span>
            <span className="text-[9px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">User</span>
          </button>

          <button 
            onClick={() => setActiveTab("admin")}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all ${
              activeTab === "admin" ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <ShieldAlert size={14} />
              <span>Administrator Protocol</span>
            </span>
            <span className="text-[9px] bg-purple-100 px-1.5 py-0.5 rounded text-purple-700">Admin</span>
          </button>

          <button 
            onClick={() => setActiveTab("technical")}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex justify-between items-center transition-all ${
              activeTab === "technical" ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <Server size={14} />
              <span>Technical Infrastructure</span>
            </span>
            <span className="text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700">Arch</span>
          </button>
        </div>
      </div>

      {/* CORE CONTENT PREVIEW */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-3 space-y-6" id="manuals-content">
        {activeTab === "user" && (
          <div className="space-y-4" id="manual-user-text">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Chapter 1</span>
              <h4 className="text-lg font-bold text-slate-800 tracking-tight">Roster Employee Seating Manual</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Welcome to the Enterprise Seating Management system. This platform enables seamless desk discovery, QR-code check-ins, and laptop hardware compliance checks.
            </p>

            <div className="space-y-3 pt-2" id="user-bullets">
              <div className="flex gap-3 items-start text-xs text-slate-600" id="user-bullet-1">
                <QrCode className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <strong>Desk Scan Protocol:</strong> Locate your daily allocated seat and scan the unique printed QR code badge. Select "Check In" inside your mobile app companion. Unauthorized desks will block login attempts and generate audit notices.
                </div>
              </div>

              <div className="flex gap-3 items-start text-xs text-slate-600" id="user-bullet-2">
                <CheckCircle className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <strong>Requesting Seating Overrides:</strong> If no seat is allocated, navigate to the mobile app or click "Request Desk Block." Detail your project requirements, preferred floor scope, and transmit. Approvals are routed instantly.
                </div>
              </div>

              <div className="flex gap-3 items-start text-xs text-slate-600" id="user-bullet-3">
                <FileText className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <strong>Asset Alignment Check:</strong> Make sure the Serial Numbers on your active desk match the barcodes linked under the "Hardware" tab of your phone companion. Report hardware drift to IT.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "admin" && (
          <div className="space-y-4" id="manual-admin-text">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Chapter 2</span>
              <h4 className="text-lg font-bold text-slate-800 tracking-tight">System Administrator Runbooks</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Operational directives for Super Users, Admins, and Department Heads managing bulk onboarding pipelines and CAD maps.
            </p>

            <div className="space-y-3 pt-2" id="admin-bullets">
              <div className="flex gap-3 items-start text-xs text-slate-600" id="admin-bullet-1">
                <ShieldAlert className="text-purple-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <strong>Capacity Squeeze Escalation:</strong> Department Heads are restricted to allocated physical zone capacities. Once a department's allotted region is saturated, approvals are auto-routed to Super User override queue blocks.
                </div>
              </div>

              <div className="flex gap-3 items-start text-xs text-slate-600" id="admin-bullet-2">
                <CheckCircle className="text-purple-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <strong>Interactive Map Publishing:</strong> Use the drag-and-drop Layout Designer panel to map structural barriers. When a department zone is relocated, seats nested inside automatically offset their XY coordinate indices.
                </div>
              </div>

              <div className="flex gap-3 items-start text-xs text-slate-600" id="admin-bullet-3">
                <Activity className="text-purple-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <strong>Bulk Import Auditing:</strong> The Excel / CSV ingest scanner checks for duplicate desk records and incorrect department scopes before running bulk writes. Confirm warning signals prior to committing transactions.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "technical" && (
          <div className="space-y-4" id="manual-technical-text">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Chapter 3</span>
              <h4 className="text-lg font-bold text-slate-800 tracking-tight">Technical & Network Architecture</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Highly scalable cloud-native blueprint linking responsive React structures to resilient backend APIs.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-600" id="tech-architectures">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1.5" id="arch-spec-1">
                <span>Database Engines</span>
                <span className="font-mono text-blue-600">MSSQL / Azure SQL (Elastic Pool)</span>
              </div>
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1.5" id="arch-spec-2">
                <span>API Frameworks</span>
                <span className="font-mono text-blue-600">ASP.NET Core 9.0 Web API (C#) / Node NestJS</span>
              </div>
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1.5" id="arch-spec-3">
                <span>IoT MQTT Broker</span>
                <span className="font-mono text-blue-600">Azure Event Grid / EMQX cluster</span>
              </div>
              <div className="flex justify-between font-bold" id="arch-spec-4">
                <span>Identity Providers</span>
                <span className="font-mono text-blue-600">Microsoft Entra ID / JWT (RS256 keys)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic font-sans leading-relaxed">
              *Designed to comfortably support more than 20,000+ employees and peak loads exceeding 1,500+ seat check-ins per minute through custom table indexes and optimized query locks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
