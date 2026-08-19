import React, { useState } from "react";
import { 
  Laptop, 
  Monitor, 
  Cpu, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  Download,
  Filter,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRightLeft,
  XCircle,
  FileSpreadsheet,
  ShieldAlert,
  Info
} from "lucide-react";
import * as XLSX from "xlsx";
import { ITAsset, Seat, EmployeeProfile } from "../types";

interface AssetManagementProps {
  assets: ITAsset[];
  seats: Seat[];
  employees: EmployeeProfile[];
  activeRole: string;
  onAddAsset: (asset: ITAsset) => void;
  onUpdateAsset: (asset: ITAsset) => void;
  onDeleteAsset: (assetId: string) => void;
  onBulkDeleteAssets?: (assetIds: string[]) => void;
  onAddAuditLog: (action: string, category: any, details: string) => void;
  editAccessOverride?: "edit" | "view";
}

export default function AssetManagement({
  assets,
  seats,
  employees,
  activeRole,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onBulkDeleteAssets,
  onAddAuditLog,
  editAccessOverride
}: AssetManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ITAsset | null>(null);
  const [transferringAsset, setTransferringAsset] = useState<ITAsset | null>(null);

  // Form State
  const [formAssetId, setFormAssetId] = useState("");
  const [formAssetTag, setFormAssetTag] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Laptop");
  const [formCategory, setFormCategory] = useState("Hardware / Compute");
  const [formManufacturer, setFormManufacturer] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formSerialNumber, setFormSerialNumber] = useState("");
  const [formWarrantyExpiry, setFormWarrantyExpiry] = useState("2028-12-31");
  const [formStatus, setFormStatus] = useState<"Assigned" | "Available" | "Maintenance" | "Decommissioned">("Available");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formSeatNumber, setFormSeatNumber] = useState("");
  const [formRemarks, setFormRemarks] = useState("");

  // Transfer state
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [targetSeatNumber, setTargetSeatNumber] = useState("");

  const isAuthorized = editAccessOverride ? editAccessOverride === "edit" : ["Super User", "Admin", "IT Administrator"].includes(activeRole);

  // Filtered Assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.employeeName && asset.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.seatNumber && asset.seatNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === "ALL" || asset.type === filterType;
    const matchesStatus = filterStatus === "ALL" || asset.status === filterStatus;
    const matchesDepartment = filterDepartment === "ALL" || asset.department === filterDepartment;

    return matchesSearch && matchesType && matchesStatus && matchesDepartment;
  });

  // Open Add Modal
  const handleOpenAddModal = () => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, or IT Administrator can manage IT Assets.");
      return;
    }
    const nextNum = 1000 + assets.length + 1;
    setFormAssetId(`AST-${nextNum}`);
    setFormAssetTag(`EQ-LP-${nextNum}`);
    setFormName("");
    setFormType("Laptop");
    setFormCategory("Hardware / Compute");
    setFormManufacturer("Apple");
    setFormModel("A2992");
    setFormSerialNumber(`SN${nextNum}${Math.floor(100 + Math.random() * 900)}`);
    setFormWarrantyExpiry("2028-12-31");
    setFormStatus("Available");
    setFormEmployeeId("");
    setFormSeatNumber("");
    setFormRemarks("");
    setEditingAsset(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (asset: ITAsset) => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, or IT Administrator can edit IT Assets.");
      return;
    }
    setEditingAsset(asset);
    setFormAssetId(asset.id);
    setFormAssetTag(asset.assetTag);
    setFormName(asset.name);
    setFormType(asset.type);
    setFormCategory(asset.category || "Hardware");
    setFormManufacturer(asset.manufacturer || "");
    setFormModel(asset.model || "");
    setFormSerialNumber(asset.serialNumber);
    setFormWarrantyExpiry(asset.warrantyExpiry);
    setFormStatus(asset.status);
    setFormEmployeeId(asset.employeeId || "");
    setFormSeatNumber(asset.seatNumber || "");
    setFormRemarks(asset.remarks || "");
    setIsAddModalOpen(true);
  };

  // Save Asset (Add or Edit)
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formAssetId || !formSerialNumber || !formAssetTag) {
      alert("Please fill in all required fields (Asset ID, Asset Tag, Serial Number).");
      return;
    }

    const matchedEmp = employees.find(e => e.id === formEmployeeId);
    const matchedSeat = seats.find(s => s.seatNumber === formSeatNumber);

    const assetData: ITAsset = {
      id: formAssetId,
      assetTag: formAssetTag,
      name: formName || `${formType} Unit`,
      type: formType,
      category: formCategory,
      manufacturer: formManufacturer,
      model: formModel,
      serialNumber: formSerialNumber,
      warrantyExpiry: formWarrantyExpiry,
      status: formStatus,
      employeeId: matchedEmp?.id || formEmployeeId,
      employeeName: matchedEmp?.name || (matchedEmp ? matchedEmp.name : undefined),
      department: matchedEmp?.department || matchedSeat?.department || "Unassigned",
      company: matchedEmp?.company || "Global Cyber Systems",
      businessHead: matchedEmp?.businessHead,
      manager: matchedEmp?.manager,
      building: matchedSeat?.buildingId || "Newmark _Hyderabad",
      floor: matchedSeat?.floorId || "11 th Floor CRE",
      zone: matchedSeat?.zoneId,
      seatNumber: matchedSeat?.seatNumber || formSeatNumber,
      seatId: matchedSeat?.id,
      assignmentDate: formStatus === "Assigned" ? new Date().toISOString().split("T")[0] : undefined,
      remarks: formRemarks
    };

    if (editingAsset) {
      onUpdateAsset(assetData);
      onAddAuditLog("Update IT Asset", "IT Asset", `Updated IT asset '${assetData.id}' (${assetData.name}).`);
    } else {
      onAddAsset(assetData);
      onAddAuditLog("Create IT Asset", "IT Asset", `Created new IT asset '${assetData.id}' (${assetData.name}).`);
    }

    setIsAddModalOpen(false);
  };

  // Delete Asset
  const handleDelete = (assetId: string) => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, or IT Administrator can delete IT assets.");
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete IT Asset ID '${assetId}'?`)) {
      onDeleteAsset(assetId);
      setSelectedAssetIds(prev => prev.filter(id => id !== assetId));
      onAddAuditLog("Delete IT Asset", "IT Asset", `Deleted IT Asset '${assetId}' from inventory.`);
    }
  };

  const toggleSelectAllAssets = () => {
    if (selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map(a => a.id));
    }
  };

  const toggleSelectAsset = (assetId: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const handleBulkDeleteAssets = () => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, or IT Administrator can delete IT assets.");
      return;
    }
    if (selectedAssetIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedAssetIds.length} selected IT Assets?`)) {
      return;
    }
    if (onBulkDeleteAssets) {
      onBulkDeleteAssets(selectedAssetIds);
    } else {
      selectedAssetIds.forEach(id => onDeleteAsset(id));
    }
    onAddAuditLog("Bulk Delete IT Assets", "IT Asset", `Permanently deleted ${selectedAssetIds.length} IT assets from inventory.`);
    setSelectedAssetIds([]);
  };

  // Open Transfer Modal
  const handleOpenTransferModal = (asset: ITAsset) => {
    if (!isAuthorized) {
      alert("Permission Denied: Only Super User, Admin, or IT Administrator can transfer IT assets.");
      return;
    }
    setTransferringAsset(asset);
    setTargetEmployeeId(asset.employeeId || "");
    setTargetSeatNumber(asset.seatNumber || "");
  };

  // Execute Transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringAsset) return;

    const matchedEmp = employees.find(e => e.id === targetEmployeeId);
    const matchedSeat = seats.find(s => s.seatNumber === targetSeatNumber);

    const updated: ITAsset = {
      ...transferringAsset,
      employeeId: matchedEmp?.id,
      employeeName: matchedEmp?.name,
      department: matchedEmp?.department || matchedSeat?.department || transferringAsset.department,
      seatNumber: matchedSeat?.seatNumber || targetSeatNumber,
      seatId: matchedSeat?.id,
      status: (matchedEmp || matchedSeat) ? "Assigned" : "Available",
      assignmentDate: new Date().toISOString().split("T")[0]
    };

    onUpdateAsset(updated);
    onAddAuditLog(
      "Transfer IT Asset",
      "IT Asset",
      `Transferred asset '${transferringAsset.id}' to ${matchedEmp ? matchedEmp.name : "Unassigned"} (Seat: ${targetSeatNumber || "None"}).`
    );

    setTransferringAsset(null);
    alert(`Transfer Complete: Asset '${transferringAsset.id}' re-assigned successfully.`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredAssets.map(a => ({
      "Asset ID": a.id,
      "Asset Tag": a.assetTag,
      "Asset Name": a.name,
      "Type": a.type,
      "Category": a.category,
      "Manufacturer": a.manufacturer,
      "Model": a.model,
      "Serial Number": a.serialNumber,
      "Warranty Expiry": a.warrantyExpiry,
      "Status": a.status,
      "Employee ID": a.employeeId || "N/A",
      "Employee Name": a.employeeName || "Unassigned",
      "Department": a.department || "N/A",
      "Seat Number": a.seatNumber || "N/A",
      "Building": a.building || "N/A",
      "Floor": a.floor || "N/A",
      "Remarks": a.remarks || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "IT_Assets_Inventory");
    XLSX.writeFile(workbook, `IT_Assets_Export_${Date.now()}.xlsx`);

    onAddAuditLog("Export IT Assets", "IT Asset", `Exported ${exportRows.length} asset records to Excel.`);
  };

  return (
    <div className="space-y-6" id="it-asset-management-module">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="asset-kpi-cards">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Total Managed Assets</span>
            <div className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{assets.length}</div>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Laptop size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-sans">Assigned Hardware</span>
            <div className="text-xl font-extrabold text-emerald-800 font-mono mt-0.5">
              {assets.filter(a => a.status === "Assigned").length}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider font-sans">In Inventory Stock</span>
            <div className="text-xl font-extrabold text-amber-800 font-mono mt-0.5">
              {assets.filter(a => a.status === "Available").length}
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider font-sans">Maintenance / Faulty</span>
            <div className="text-xl font-extrabold text-rose-800 font-mono mt-0.5">
              {assets.filter(a => a.status === "Maintenance" || a.status === "Decommissioned").length}
            </div>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Main Bar & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4" id="asset-controls-panel">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-display flex items-center gap-2">
              <Cpu className="text-blue-600" size={20} />
              <span>Enterprise IT Asset Directory</span>
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Track hardware lifecycles, warranty periods, employee assignments, and workstation desk attachments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors font-sans"
            >
              <Download size={14} className="text-blue-600" />
              <span>Export Excel</span>
            </button>

            {isAuthorized && (
              <button
                onClick={handleOpenAddModal}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs font-sans"
              >
                <Plus size={15} />
                <span>Register New Asset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, tag, serial, employee..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Asset Types</option>
            <option value="Laptop">Laptop</option>
            <option value="Monitor">Monitor</option>
            <option value="Docking Station">Docking Station</option>
            <option value="Keyboard">Keyboard</option>
            <option value="Mouse">Mouse</option>
            <option value="Telephone">VoIP Telephone</option>
            <option value="Desktop">Desktop Tower</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="Available">Available</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Decommissioned">Decommissioned</option>
          </select>

          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="border border-slate-200 bg-slate-50 p-2 rounded-xl text-slate-700 font-medium"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product Quality">Product Quality</option>
            <option value="Operations">Operations</option>
            <option value="Finance & HR">Finance & HR</option>
          </select>
        </div>
      </div>

      {/* Main IT Assets Table */}
      {selectedAssetIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 text-rose-950 font-medium font-sans">
            <span className="font-bold bg-rose-200 text-rose-900 px-2.5 py-1 rounded-lg">
              {selectedAssetIds.length} Selected
            </span>
            <span>out of {filteredAssets.length} listed IT assets</span>
          </div>
          <div className="flex items-center gap-2 font-sans">
            <button
              onClick={() => setSelectedAssetIds([])}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold bg-white border border-slate-200 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDeleteAssets}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={14} />
              <span>Delete Selected ({selectedAssetIds.length})</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="asset-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-sans border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredAssets.length > 0 && selectedAssetIds.length === filteredAssets.length}
                    onChange={toggleSelectAllAssets}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Asset ID / Tag</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Hardware Name & Model</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Serial Number</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Warranty Expiry</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Occupant Employee</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Desk Seat</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => {
                  const isSelected = selectedAssetIds.includes(asset.id);
                  return (
                    <tr key={asset.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? "bg-blue-50/40" : ""}`}>
                      <td className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectAsset(asset.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3">
                      <div className="font-bold text-slate-900 font-mono">{asset.id}</div>
                      <div className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-max mt-0.5">
                        {asset.assetTag}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-800">{asset.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {asset.manufacturer} • {asset.model}
                      </div>
                    </td>

                    <td className="p-3 font-mono text-slate-600 font-medium">
                      {asset.serialNumber}
                    </td>

                    <td className="p-3 font-mono text-slate-600">
                      {asset.warrantyExpiry}
                    </td>

                    <td className="p-3">
                      {asset.employeeName ? (
                        <div>
                          <div className="font-bold text-slate-800">{asset.employeeName}</div>
                          <div className="text-[10px] text-slate-400">{asset.department}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="p-3">
                      {asset.seatNumber ? (
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                          {asset.seatNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">In Storage</span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        asset.status === "Assigned" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : asset.status === "Available" 
                            ? "bg-blue-100 text-blue-800" 
                            : asset.status === "Maintenance"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                      }`}>
                        {asset.status}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAuthorized && (
                          <>
                            <button
                              onClick={() => handleOpenTransferModal(asset)}
                              title="Transfer or Re-assign Asset"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <ArrowRightLeft size={15} />
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(asset)}
                              title="Edit Asset Details"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              onClick={() => handleDelete(asset.id)}
                              title="Delete Asset"
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  No IT assets found matching the applied search parameters.
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900">
                {editingAsset ? `Edit Asset: ${editingAsset.id}` : "Register New Enterprise IT Asset"}
              </h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Asset ID *</label>
                  <input
                    type="text"
                    value={formAssetId}
                    onChange={(e) => setFormAssetId(e.target.value)}
                    required
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Asset Tag *</label>
                  <input
                    type="text"
                    value={formAssetTag}
                    onChange={(e) => setFormAssetTag(e.target.value)}
                    required
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Asset Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., MacBook Pro 16 M3 Max"
                  required
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Asset Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Docking Station">Docking Station</option>
                    <option value="Keyboard">Keyboard</option>
                    <option value="Mouse">Mouse</option>
                    <option value="Telephone">Telephone</option>
                    <option value="Desktop">Desktop</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Manufacturer</label>
                  <input
                    type="text"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    placeholder="Apple, Dell, Lenovo"
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Serial Number *</label>
                  <input
                    type="text"
                    value={formSerialNumber}
                    onChange={(e) => setFormSerialNumber(e.target.value)}
                    required
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={formWarrantyExpiry}
                    onChange={(e) => setFormWarrantyExpiry(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="Available">Available</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Desk Seat</label>
                  <select
                    value={formSeatNumber}
                    onChange={(e) => setFormSeatNumber(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-xl text-xs font-mono"
                  >
                    <option value="">None (Storage)</option>
                    {seats.map(s => (
                      <option key={s.id} value={s.seatNumber}>
                        {s.seatNumber} ({s.status} - {s.employeeName || "Vacant"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Assign Employee</label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department} - {emp.seatNumber || "No Seat"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Remarks / Notes</label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                >
                  {editingAsset ? "Update Asset" : "Save Asset Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Asset Modal */}
      {transferringAsset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                Transfer Asset: {transferringAsset.id}
              </h4>
              <button onClick={() => setTransferringAsset(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Re-assign <strong>{transferringAsset.name}</strong> ({transferringAsset.assetTag}) to a new occupant or desk location.
            </p>

            <form onSubmit={handleExecuteTransfer} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Employee</label>
                <select
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                >
                  <option value="">Unassigned (In Inventory)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Desk Seat</label>
                <select
                  value={targetSeatNumber}
                  onChange={(e) => setTargetSeatNumber(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-xl text-xs font-mono"
                >
                  <option value="">No Desk Seat Attachment</option>
                  {seats.map(s => (
                    <option key={s.id} value={s.seatNumber}>
                      {s.seatNumber} ({s.status} - {s.employeeName || "Vacant"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferringAsset(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
