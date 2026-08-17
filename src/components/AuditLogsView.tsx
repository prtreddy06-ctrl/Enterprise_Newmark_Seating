import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Search, 
  Download, 
  Filter, 
  Clock, 
  User, 
  Activity, 
  Layers, 
  Key, 
  Laptop, 
  FileSpreadsheet, 
  CheckCircle,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import * as XLSX from "xlsx";
import { AuditLog } from "../types";

interface AuditLogsViewProps {
  logs: AuditLog[];
}

const PAGE_SIZE = 50;

export default function AuditLogsView({ logs }: AuditLogsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [page, setPage] = useState(0);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === "ALL" || log.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Reset back to page 1 whenever the filtered result set changes underneath the user
  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedLogs = filteredLogs.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const handleExportExcel = () => {
    // Export exports the full filtered set (not just the current page)
    const rows = filteredLogs.map(l => ({
      "Audit ID": l.id,
      "Timestamp (UTC)": l.timestamp,
      "User Identity": l.user,
      "Action Type": l.action,
      "Category": l.category || "General",
      "Operation Details": l.details,
      "IP Address": l.ipAddress || "Internal System"
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "System_Audit_Trail");
    XLSX.writeFile(workbook, `System_Audit_Trail_Export_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6 font-sans" id="audit-logs-module">
      {/* Top Banner stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="audit-kpi-cards">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Log Records</span>
            <div className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{logs.length}</div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Authentication Events</span>
            <div className="text-xl font-extrabold text-purple-800 font-mono mt-0.5">
              {logs.filter(l => l.category === "Login/Logout" || l.action.toLowerCase().includes("login")).length}
            </div>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Key size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">IT Asset Mutations</span>
            <div className="text-xl font-extrabold text-emerald-800 font-mono mt-0.5">
              {logs.filter(l => l.category === "IT Asset" || l.category === "Excel Ingest").length}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Laptop size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Floor & Seat Ops</span>
            <div className="text-xl font-extrabold text-amber-800 font-mono mt-0.5">
              {logs.filter(l => l.category === "Seat Allocation" || l.category === "Floor Map" || l.category === "Zone/Seat").length}
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <MapIcon size={20} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="audit-controls-panel">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-display flex items-center gap-2">
              <ShieldCheck className="text-blue-600" size={20} />
              <span>Enterprise Compliance & System Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable activity log tracking logins, floor updates, seat allocations, IT asset changes, and spreadsheet imports.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            className="border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} className="text-blue-600" />
            <span>Export Audit Trail</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, action, details or IP address..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value="Login/Logout">Login / Logout</option>
            <option value="User Operations">User Operations</option>
            <option value="Floor Map">Floor Map Operations</option>
            <option value="Zone/Seat">Zone / Seat Management</option>
            <option value="Seat Allocation">Seat Allocation</option>
            <option value="IT Asset">IT Asset Management</option>
            <option value="Excel Ingest">Excel Spreadsheet Import</option>
            <option value="QR Check-in">QR Code Check-in</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="audit-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Timestamp (UTC)</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">User Account</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Action & Category</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Operation Details</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {pagedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-mono text-slate-500 text-[11px] shrink-0 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </td>

                  <td className="p-3 font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-blue-600" />
                      <span>{log.user}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="font-bold text-slate-900">{log.action}</div>
                    <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      {log.category || "General"}
                    </span>
                  </td>

                  <td className="p-3 text-slate-700 font-medium">
                    {log.details}
                  </td>

                  <td className="p-3 font-mono text-slate-400 text-[11px]">
                    {log.ipAddress || "192.168.1.100"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — keeps rendering bounded regardless of how large the log collection grows */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {filteredLogs.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–{Math.min(filteredLogs.length, (safePage + 1) * PAGE_SIZE)} of {filteredLogs.length.toLocaleString()} record(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono font-semibold text-slate-600">Page {safePage + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
