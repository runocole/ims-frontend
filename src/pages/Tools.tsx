import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Search, Plus, Trash2, Edit2, Download, CheckCircle, X, FileText, Barcode, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import {
  getTools,
  createTool,
  updateTool,
  deleteTool,
  getEquipmentTypes,
  getSuppliers,
} from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ---------------- Types ---------------- */
interface Tool {
  id: string;
  name: string;
  code: string;
  cost: string | number;
  stock: number;
  description?: string;
  supplier?: string;
  supplier_name?: string;
  category?: string;
  invoice_number?: string;
  expiry_date?: string;
  date_added?: string;
  serials?: string[];
  available_serials?: string[]; // NEW: Available serial numbers
  sold_serials?: any[]; // NEW: Sold serial numbers with sale info
  equipment_type?: string | null;
  equipment_type_id?: number | string | null;
}

interface GroupedTool {
  id: string;
  name: string;
  category: string;
  equipment_type?: string;
  equipment_type_id?: string | number | null;
  tools: Tool[];
  totalStock: number;
  lastUpdated: string;
  cost: string;
  description?: string;
  supplier_name?: string;
  latestTool: Tool;
}

interface EquipmentType {
  id: number | string;
  name: string;
  default_cost?: string | number;
  category?: string;
  invoice_number?: string; 
}

interface Supplier {
  id: number | string;
  name: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  equipment_count: number;
  total_value: number;
}

interface SoldSerialInfo {
  serial: string;
  sale_id?: number | null;
  customer_name: string;
  date_sold?: string | null;
  invoice_number?: string | null;
}

/* ---------------- Constants ---------------- */
const CATEGORY_OPTIONS = [
  "Receiver",
  "Accessories",
  "Total Stations",
  "Levels",
  "Drones",
  "EcoSounders",
  "Laser Scanners",
  "Others",
];

// Toast Component
const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg border border-green-400 animate-in slide-in-from-right-8 duration-300">
    <CheckCircle className="h-5 w-5" />
    <span className="font-medium">{message}</span>
    <button onClick={onClose} className="hover:bg-green-700 rounded p-1">
      <X className="h-4 w-4" />
    </button>
  </div>
);

/* ---------------- Component ---------------- */
const Tools: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & form state - UPDATED FLOW
  const [open, setOpen] = useState(false);
  const [modalStep, setModalStep] = useState<
    "select-invoice" | "select-category" | "select-equipment-type" | "form"
  >("select-invoice"); 
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null); 
  const [selectedCategoryCard, setSelectedCategoryCard] = useState<string | null>(null);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState(""); 

  // Equipment types
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [isLoadingEquipmentTypes, setIsLoadingEquipmentTypes] = useState(false);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // Invoices - NEW: State for invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Serial number viewing state - NEW
  const [viewingSerials, setViewingSerials] = useState<{
    open: boolean;
    tool: Tool | null;
    soldSerials: SoldSerialInfo[];
  }>({
    open: false,
    tool: null,
    soldSerials: []
  });

  // Form model
  const [form, setForm] = useState<any>({
    name: "",
    code: "",
    cost: "",
    stock: "1",
    description: "",
    supplier: "",
    category: "",
    invoice_number: "",
    expiry_date: "",
    serials: [],
    available_serials: [], 
    equipment_type_id: "",
    equipment_type: "",
  });

  /* ---------------- Grouping Logic ---------------- */
  const groupTools = (tools: Tool[]): GroupedTool[] => {
    const groups: { [key: string]: GroupedTool } = {};

    tools.forEach(tool => {
      if (tool.category === "Receiver" && tool.equipment_type) {
        const key = `receiver-${tool.equipment_type}`;
        
        if (!groups[key]) {
          groups[key] = {
            id: key,
            name: tool.equipment_type,
            category: tool.category || "Receiver",
            equipment_type: tool.equipment_type,
            equipment_type_id: tool.equipment_type_id,
            tools: [tool],
            totalStock: tool.stock || 0,
            lastUpdated: tool.date_added || new Date().toISOString(),
            cost: String(tool.cost),
            description: tool.description,
            supplier_name: tool.supplier_name,
            latestTool: tool,
          };
        } else {
          groups[key].tools.push(tool);
          groups[key].totalStock += tool.stock || 0;
          
          if (tool.date_added && tool.date_added > groups[key].lastUpdated) {
            groups[key].lastUpdated = tool.date_added;
            groups[key].latestTool = tool;
          }
        }
      } else {
        const key = `${tool.category || "Uncategorized"}-${tool.name}`;
        
        if (!groups[key]) {
          groups[key] = {
            id: key,
            name: tool.name,
            category: tool.category || "Uncategorized",
            tools: [tool],
            totalStock: tool.stock || 0,
            lastUpdated: tool.date_added || new Date().toISOString(),
            cost: String(tool.cost),
            description: tool.description,
            supplier_name: tool.supplier_name,
            latestTool: tool,
          };
        } else {
          groups[key].tools.push(tool);
          groups[key].totalStock += tool.stock || 0;
          if (tool.date_added && tool.date_added > groups[key].lastUpdated) {
            groups[key].lastUpdated = tool.date_added;
            groups[key].latestTool = tool;
          }
        }
      }
    });

    return Object.values(groups);
  };

  /* ---------------- Effects ---------------- */
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const data = await getTools();
        const normalized: Tool[] = (data || []).map((t: any) => {
          let serialsArr: string[] = [];
          if (Array.isArray(t.serials)) {
            serialsArr = t.serials;
          } else if (t.serials && typeof t.serials === "object") {
            serialsArr = Object.keys(t.serials)
              .sort()
              .map((k) => t.serials[k])
              .filter(Boolean);
          }
          
          // Handle available_serials and sold_serials
          let availableSerials: string[] = [];
          if (Array.isArray(t.available_serials)) {
            availableSerials = t.available_serials;
          } else if (!t.available_serials && t.serials) {
            // Initialize available_serials with serials if not set
            availableSerials = serialsArr;
          }
          
          let soldSerials: any[] = [];
          if (Array.isArray(t.sold_serials)) {
            soldSerials = t.sold_serials;
          }
          
          return {
            ...t,
            stock: typeof t.stock === "number" ? t.stock : Number(t.stock || 0),
            category: t.category === "Accessory" ? "Accessories" : (t.category || ""),
            serials: serialsArr,
            available_serials: availableSerials, // NEW
            sold_serials: soldSerials, // NEW
            equipment_type: t.equipment_type_name || (typeof t.equipment_type === 'string' ? t.equipment_type : t.name),
            equipment_type_id: t.equipment_type_id ?? "",
            expiry_date: t.expiry_date || "",
          };
        });
        setTools(normalized);
      } catch (error) {
        console.error("Error fetching tools:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  // Fetch equipment types - UPDATED to filter by invoice
  const fetchEquipmentTypes = async (invoiceNumber?: string) => {
    setIsLoadingEquipmentTypes(true);
    try {
      const filters: any = {};
      if (invoiceNumber) {
        filters.invoice_number = invoiceNumber;
      }
      const data = await getEquipmentTypes(filters);
      setEquipmentTypes(data || []);
    } catch (err) {
      console.warn("Could not fetch equipment types:", err);
      setEquipmentTypes([]);
    } finally {
      setIsLoadingEquipmentTypes(false);
    }
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    setIsLoadingSuppliers(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      console.warn("Could not fetch suppliers:", err);
      setSuppliers([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  // NEW: Fetch invoices
  const fetchInvoices = async () => {
    try {
      const data = await getEquipmentTypes(); // We'll get invoices from equipment types
      const invoiceMap = new Map();
      
      data.forEach((item: any) => {
        if (item.invoice_number) {
          if (!invoiceMap.has(item.invoice_number)) {
            invoiceMap.set(item.invoice_number, {
              id: item.invoice_number,
              invoice_number: item.invoice_number,
              created_at: item.created_at || new Date().toISOString(),
              equipment_count: 0,
              total_value: 0
            });
          }
          const invoice = invoiceMap.get(item.invoice_number);
          invoice.equipment_count += 1;
          invoice.total_value += parseFloat(item.default_cost) || 0;
        }
      });

      setInvoices(Array.from(invoiceMap.values()));
    } catch (err) {
      console.warn("Could not fetch invoices:", err);
      setInvoices([]);
    }
  };

  // NEW: View serial numbers for a tool
  const viewSerialNumbers = async (tool: Tool) => {
    try {
      // Use the sold_serials data from the tool
      const soldSerials: SoldSerialInfo[] = [];
      
      for (const serialInfo of tool.sold_serials || []) {
        if (typeof serialInfo === 'object') {
          // FIXED: Properly handle null values
          soldSerials.push({
            serial: serialInfo.serial || 'Unknown',
            sale_id: serialInfo.sale_id || null,
            customer_name: serialInfo.customer_name || 'Unknown',
            date_sold: serialInfo.date_sold || null,
            invoice_number: serialInfo.invoice_number || null
          });
        } else {
          // Handle case where serialInfo is just a string
          soldSerials.push({
            serial: serialInfo,
            sale_id: null,
            customer_name: 'Unknown',
            date_sold: null,
            invoice_number: null
          });
        }
      }
      
      setViewingSerials({
        open: true,
        tool,
        soldSerials
      });
    } catch (error) {
      console.error("Error fetching sold serials:", error);
      alert("Failed to load serial number history");
    }
  };

  useEffect(() => {
    fetchEquipmentTypes();
    fetchSuppliers();
    fetchInvoices(); // NEW: Fetch invoices
  }, []);

  // Toast auto-hide
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setRecentlyAddedId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  /* ---------------- Helpers ---------------- */
  const resetForm = () =>
    setForm({
      name: "",
      code: "",
      cost: "",
      stock: "1",
      description: "",
      supplier: "",
      category: "",
      invoice_number: "",
      expiry_date: "",
      serials: [],
      available_serials: [], // NEW
      equipment_type_id: "",
      equipment_type: "",
    });

  const openAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setEditingToolId(null);
    setSelectedInvoice(null); // NEW: Reset invoice
    setSelectedCategoryCard(null);
    setSelectedEquipmentType(null);
    setModalStep("select-invoice"); // NEW: Start with invoice selection
    setOpen(true);
  };

  const getAllowedExtraLabels = (boxType: string): string[] => {
    if (boxType === "Rover" || boxType === "Base") {
      return ["Data Logger"];
    }
    if (boxType === "Base and Rover") {
      return ["Receiver 2", "DataLogger", "External Radio"];
    }
    return [];
  };

  const openEditModal = (tool: Tool) => {
    const extras: string[] =
      Array.isArray(tool.serials) && tool.serials.length
        ? tool.serials.filter((s) => s !== tool.code)
        : [];

    setForm({
      name: tool.name || "",
      code: tool.code || "",
      cost: String(tool.cost ?? ""),
      stock: String(tool.stock ?? "1"),
      description: tool.description || "",
      supplier: tool.supplier || "",
      category: tool.category || "",
      invoice_number: tool.invoice_number || "",
      expiry_date: tool.expiry_date || "",
      serials: extras.length ? extras : [],
      available_serials: tool.available_serials || [], // NEW
      equipment_type_id: tool.equipment_type_id || "",
      equipment_type: tool.equipment_type || "",
    });

    setIsEditMode(true);
    setEditingToolId(tool.id ?? null);
    setSelectedCategoryCard(tool.category || null);

    if (tool.category === "Receiver") {
      fetchEquipmentTypes(tool.invoice_number).then(() => {
        const etId = tool.equipment_type_id ? String(tool.equipment_type_id) : "";
        const found = equipmentTypes.find((e) => String(e.id) === String(etId) || e.name === tool.equipment_type);
        if (found) {
          setSelectedEquipmentType(String(found.id));
        } else {
          setSelectedEquipmentType(tool.equipment_type_id ? String(tool.equipment_type_id) : tool.equipment_type || null);
        }
      });
    }

    setModalStep("form");
    setOpen(true);
  };

  /* ---------------- Serial extras logic ---------------- */
  const effectiveCategory = selectedCategoryCard || form.category;
  const shouldShowBoxTypeAndExtras = effectiveCategory === "Receiver";
  const allowedExtraLabels = shouldShowBoxTypeAndExtras ? getAllowedExtraLabels(form.description) : [];

  const canAddExtra = () => {
    if (!allowedExtraLabels || allowedExtraLabels.length === 0) return false;
    return (form.serials || []).length < allowedExtraLabels.length;
  };

  const addExtraSerial = () => {
    if (!canAddExtra()) {
      alert(
        allowedExtraLabels.length > 0
          ? `Maximum of ${allowedExtraLabels.length} extra box(es) allowed for "${form.description}".`
          : "No extras allowed for this box type."
      );
      return;
    }
    setForm((prev: any) => ({ ...prev, serials: [...(prev.serials || []), ""] }));
  };

  const removeExtraSerial = (index: number) => {
    const updated = Array.isArray(form.serials) ? [...form.serials] : [];
    updated.splice(index, 1);
    setForm((prev: any) => ({ ...prev, serials: updated }));
  };

  const setExtraSerialValue = (index: number, value: string) => {
    const updated = Array.isArray(form.serials) ? [...form.serials] : [];
    updated[index] = value;
    setForm((prev: any) => ({ ...prev, serials: updated }));
  };

/* ---------------- Equipment type selection ---------------- */
const handleEquipmentTypeSelect = (val: string) => {
  const found = equipmentTypes.find((e) => String(e.id) === String(val) || e.name === val);
  if (found) {
    setSelectedEquipmentType(String(found.id));
    setForm((prev: any) => ({
      ...prev,
      equipment_type_id: found.id, 
      equipment_type: found.name,
      name: found.name,
      cost: String(found.default_cost ?? prev.cost),
      category: selectedCategoryCard || prev.category,
      invoice_number: selectedInvoice || prev.invoice_number,
    }));
  } else {
    setSelectedEquipmentType(val);
    setForm((prev: any) => ({ 
      ...prev, 
      equipment_type_id: val, 
      equipment_type: val,
      category: selectedCategoryCard || prev.category,
      invoice_number: selectedInvoice || prev.invoice_number,
    }));
  }
  
  setModalStep("form");
};
  /* ---------------- Save / Update ---------------- */
const handleSaveTool = async () => {
    // 1. Validation
    if (!String(form.name || "").trim() || !String(form.code || "").trim() || !String(form.cost || "").trim()) {
      alert("Please fill in required fields: Name, Serial (Code), Cost.");
      return;
    }

    // 2. Normalize Category
    let finalCategory = selectedCategoryCard || form.category || "";
    if (finalCategory === "Accessories") finalCategory = "Accessory";
    if (finalCategory === "Receivers") finalCategory = "Receiver";

    // 3. Safely distinguish between DB ID (Receiver) and String (Accessory)
    let finalName = String(form.name).trim();
    let finalEquipmentTypeId: number | null = null; 

    if (selectedEquipmentType) {
      const foundType = equipmentTypes.find((e) => String(e.id) === String(selectedEquipmentType));
      if (foundType) {
        finalName = foundType.name; // It's a Receiver (e.g. "Mars")
        finalEquipmentTypeId = Number(foundType.id);
      } else {
        finalName = selectedEquipmentType; // It's an Accessory (e.g. "Data Logger")
        finalEquipmentTypeId = null; // Null prevents the 400 Bad Request crash!
      }
    } else if (form.equipment_type) {
      finalName = form.equipment_type;
    }

    // 4. Build Payload (including the Supplier that was missing!)
    const payload: any = {
      name: finalName,
      code: String(form.code).trim(),
      cost: parseFloat(String(form.cost)).toFixed(2),
      stock: Math.max(0, Number(form.stock) || 0),
      description: form.description || "",
      category: finalCategory,
      invoice_number: selectedInvoice || form.invoice_number || "",
      expiry_date: form.expiry_date || null,
      supplier: form.supplier || null, 
    };

    if (finalEquipmentTypeId !== null) {
      payload.equipment_type = finalEquipmentTypeId;
      payload.equipment_type_id = finalEquipmentTypeId;
    }

    // 5. Handle Serials Array
    const allSerials = [
      String(form.code).trim(),
      ...(Array.isArray(form.serials) ? form.serials : [])
    ].filter(Boolean);
    
    payload.serials = allSerials;
    payload.available_serials = allSerials;

    if (isEditMode) {
      const existingTool = tools.find(t => t.id === editingToolId);
      if (existingTool) {
        payload.available_serials = form.available_serials || existingTool.available_serials || [];
        payload.sold_serials = existingTool.sold_serials || [];
      }
    }

    try {
      let result: any; 
      
      if (isEditMode && editingToolId) {
        result = await updateTool(editingToolId, payload);
        // Force the UI to show the text name, not the ID
        const updatedItem = {
          ...result,
          name: finalName,
          equipment_type: finalName,
          equipment_type_name: finalName,
          category: finalCategory === "Accessory" ? "Accessories" : finalCategory
        };
        setTools((prev) => prev.map((t) => (t.id === editingToolId ? updatedItem : t)));
      } else {
        const existing = tools.find((t) => t.code?.toLowerCase() === payload.code.toLowerCase());
        if (existing) {
          const newStock = (existing.stock || 0) + payload.stock;
          result = await updateTool(existing.id, { ...payload, stock: newStock });
          const updatedItem = {
            ...result,
            name: finalName,
            equipment_type: finalName,
            equipment_type_name: finalName,
            category: finalCategory === "Accessory" ? "Accessories" : finalCategory
          };
          setTools((prev) => prev.map((t) => (t.id === existing.id ? updatedItem : t)));
        } else {
          result = await createTool(payload);
          const newItem = {
            ...result,
            name: finalName,
            equipment_type: finalName,
            equipment_type_name: finalName,
            category: finalCategory === "Accessory" ? "Accessories" : finalCategory
          };
          setTools((prev) => [newItem, ...prev]);
        }
      }

      setOpen(false);
      resetForm();
      setIsEditMode(false);
      setEditingToolId(null);
      setSelectedInvoice(null);
      setSelectedCategoryCard(null);
      setSelectedEquipmentType(null);
      setModalStep("select-invoice");
      
      setToastMessage(`Successfully saved ${finalName}`);
      setShowToast(true);

    } catch (error: any) { 
      const serverErrors = error.response?.data;
      console.error("❌ Django Rejected:", serverErrors);
      alert("Server Error: " + JSON.stringify(serverErrors || error.message));
    }
  };

  /* ---------------- Delete ---------------- */
  const handleDeleteTool = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tool?")) return;
    try {
      await deleteTool(id);
      setTools((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete tool");
    }
  };

  /* ---------------- Filtering & summary ---------------- */
  const filteredTools = tools.filter((t) => {
    const matchesCategory =
      categoryFilter === "all" || !categoryFilter || (t.category || "").toLowerCase() === categoryFilter.toLowerCase();
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (t.name || "").toLowerCase().includes(q) ||
      (t.code || "").toLowerCase().includes(q) ||
      ((t.description || "") as string).toLowerCase().includes(q) ||
      (t.equipment_type || "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Group the filtered tools
  const groupedTools = groupTools(filteredTools);

  // Update summary calculations to use grouped tools
  const totalTools = groupedTools.length;
  const totalStock = groupedTools.reduce((acc, group) => acc + group.totalStock, 0);
  const lowStock = groupedTools.filter((group) => group.totalStock <= 5).length;

  /* ---------------- PDF Export ---------------- */
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Tools Inventory (Grouped)", 14, 20);

    const tableData = groupedTools.map((group) => [
      group.name,
      group.category,
      group.equipment_type || "—",
      group.tools.reduce((acc, t) => acc + (t.available_serials?.length || 0), 0) + " available",
      group.tools.reduce((acc, t) => acc + (t.sold_serials?.length || 0), 0) + " sold",
      `$${group.cost}`,
      group.totalStock.toString(),
      group.supplier_name || "—",
      group.tools.length + " items",
      group.lastUpdated ? new Date(group.lastUpdated).toLocaleDateString() : "—",
    ]);

    autoTable(doc, {
      head: [
        [
          "Name",
          "Category",
          "Equipment Type",
          "Available Serials",
          "Sold Serials",
          "Cost (USD)",
          "Total Stock",
          "Supplier",
          "Items",
          "Last Updated",
        ],
      ],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 54, 92] },
      theme: "grid",
    });

    doc.save(`tools-inventory-grouped-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // FIXED: Replaced the simple loading text with a proper spinner component for loading Page
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400">Loading inventory...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <DashboardLayout>
      {/* Toast Notification */}
      {showToast && (
        <Toast 
          message={toastMessage} 
          onClose={() => {
            setShowToast(false);
            setRecentlyAddedId(null);
          }} 
        />
      )}

      {/* View Serial Numbers Dialog - NEW */}
      <Dialog open={viewingSerials.open} onOpenChange={(open) => setViewingSerials(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Barcode className="w-5 h-5" />
              Serial Number History - {viewingSerials.tool?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Track which serial numbers have been sold and to whom
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {viewingSerials.soldSerials.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {viewingSerials.soldSerials.map((serialInfo, index) => (
                  <Card key={index} className="bg-slate-800 border-slate-600">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-blue-300 font-medium">Serial:</span>
                          <p className="text-white font-mono">{serialInfo.serial}</p>
                        </div>
                        <div>
                          <span className="text-blue-300 font-medium">Customer:</span>
                          <p className="text-white">{serialInfo.customer_name}</p>
                        </div>
                        <div>
                          <span className="text-blue-300 font-medium">Sale Date:</span>
                          <p className="text-white">
                            {serialInfo.date_sold ? new Date(serialInfo.date_sold).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="text-blue-300 font-medium">Invoice:</span>
                          <p className="text-white">{serialInfo.invoice_number || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Barcode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No serial numbers have been sold for this tool yet.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setViewingSerials({ open: false, tool: null, soldSerials: [] })}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
            <p className="text-gray-500">Manage your equipment records and details</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={openAddModal}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
            <Button variant="outline" onClick={exportToPDF} className="gap-2">
              <Download className="h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search tools by name, code, box type or equipment type..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 items-center">
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-gray-700 rounded-lg">
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("");
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Stock Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border bg-blue-950">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Total Equipment Types</p>
              <h3 className="text-2xl font-bold">{totalTools}</h3>
            </CardContent>
          </Card>
          <Card className="border-border bg-blue-950">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Items in Stock</p>
              <h3 className="text-2xl font-bold">{totalStock}</h3>
            </CardContent>
          </Card>
          <Card className="border-border bg-blue-950">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Low Stock (≤5)</p>
              <h3 className="text-2xl font-bold">{lowStock}</h3>
            </CardContent>
          </Card>
        </div>

        {/* Tools Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupedTools.map((group) => {
            const isRecentlyAdded = group.tools.some(tool => tool.id === recentlyAddedId);
            return (
              <Card 
                key={group.id} 
                className={`
                  hover:shadow-lg transition-all duration-300 bg-blue-950
                  ${isRecentlyAdded ? 'ring-2 ring-green-500 shadow-lg scale-105' : ''}
                `}
              >
                <CardContent className="p-6 space-y-3">
                  {/* Recently Added Badge */}
                  {isRecentlyAdded && (
                    <div className="flex justify-between items-center">
                      <div className="bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Recently Added
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <p className="text-sm text-gray-400">
                        {group.category} {group.equipment_type ? `• ${group.equipment_type}` : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last Updated: {group.lastUpdated ? new Date(group.lastUpdated).toLocaleDateString() : "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {group.tools.length} individual item{group.tools.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewSerialNumbers(group.latestTool)}
                        className="text-green-400 hover:text-green-300 hover:bg-green-900/30"
                        title="View serial numbers"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (group.tools.length > 0) {
                            openEditModal(group.tools[0]);
                          }
                        }}
                        className="text-slate-400 hover:bg-slate-700"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (group.tools.length === 1) {
                            handleDeleteTool(group.tools[0].id);
                          } else {
                            if (window.confirm(`Delete all ${group.tools.length} ${group.name} items?`)) {
                              group.tools.forEach(tool => handleDeleteTool(tool.id));
                            }
                          }
                        }}
                        className="text-red-600 hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-start">
                    <div>
                      {/* Show only the latest tool's serial */}
                      {group.latestTool && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400">Latest Serial</p>
                          <p className="text-sm font-mono text-gray-300">
                            {group.latestTool.code || "—"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-400">Cost</p>
                      <p className="text-sm font-bold text-blue-400">${group.cost}</p>

                      <p className="text-xs text-gray-400 mt-3">Total Stock</p>
                      <div
                        className={`px-2 py-1 rounded-full text-sm font-medium ${
                          group.totalStock <= 5 ? "bg-amber-600/20 text-amber-300" : "bg-green-600/10 text-green-300"
                        }`}
                      >
                        {group.totalStock}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ---------------- Add/Edit Modal ---------------- */}
      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val) {
            setOpen(false);
            resetForm();
            setIsEditMode(false);
            setEditingToolId(null);
            setSelectedInvoice(null);
            setSelectedCategoryCard(null);
            setSelectedEquipmentType(null);
            setModalStep("select-invoice");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Tool" : "Add New Item"}</DialogTitle>
            <DialogDescription>
              {modalStep === "select-invoice"
                ? "Select an invoice to add items to"
                : modalStep === "select-category"
                ? "Choose a category for the item"
                : modalStep === "select-equipment-type"
                ? "Select the equipment type"
                : `Fill in the fields below to ${isEditMode ? "update" : "create"} a tool.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* STEP 1: Invoice selection - NEW STEP */}
            {modalStep === "select-invoice" && (
              <div>
                <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Select Invoice
                </Label>
                
                {/* Invoice Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search invoices..."
                      className="pl-10"
                      value={invoiceSearchTerm}
                      onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto overflow-x-hidden">
  {invoices.length === 0 ? (
    <div className="text-center py-8 text-gray-400">
      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-500" />
      <p>No invoices available</p>
      <p className="text-sm">Please create invoices in Admin Settings first</p>
    </div>
  ) : (
    invoices
      .filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(invoiceSearchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((invoice) => (
        <Card
          key={invoice.id}
          className={`p-3 cursor-pointer hover:scale-[1.02] transform max-w-full ${
            selectedInvoice === invoice.invoice_number ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => {
            setSelectedInvoice(invoice.invoice_number);
            // Fetch equipment types for this specific invoice
            fetchEquipmentTypes(invoice.invoice_number);
            setModalStep("select-category");
          }}
        >
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold truncate">{invoice.invoice_number}</div>
              </div>
              <FileText className="h-6 w-6 text-blue-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      ))
  )}
</div>
              </div>
            )}

            {/* STEP 2: Category selection */}
            {modalStep === "select-category" && (
              <div>
                <Label className="text-lg font-semibold mb-4">
                  Select Category for Invoice: {selectedInvoice}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <Card
                      key={cat}
                      className={`p-4 cursor-pointer hover:scale-105 transform ${selectedCategoryCard === cat ? "ring-2 ring-blue-500" : ""}`}
                      onClick={async () => {
                        setSelectedCategoryCard(cat);
                        
                        // Check if there are equipment types for this category in the selected invoice
                        const categoryEquipmentTypes = equipmentTypes.filter(
                          item => item.category === cat && item.invoice_number === selectedInvoice
                        );
                        
                        if (categoryEquipmentTypes.length > 0) {
                          // If there are equipment types for this category, show selection
                          setModalStep("select-equipment-type");
                        } else {
                          // If no equipment types, go directly to form
                          setForm((prev: any) => ({ 
                            ...prev, 
                            category: cat,
                            invoice_number: selectedInvoice,
                            name: "",
                            cost: ""
                          }));
                          setModalStep("form");
                        }
                      }}
                    >
                      <CardContent>
                        <div className="text-lg font-semibold">{cat}</div>
                        <div className="text-xs text-gray-400 mt-1">Add {cat} items</div>
                        <div className="text-xs text-blue-400 mt-1">
                          {equipmentTypes.filter(item => item.category === cat && item.invoice_number === selectedInvoice).length} types available
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Equipment type selection */}
            {modalStep === "select-equipment-type" && (
              <div>
                <Label>Equipment Type for {selectedCategoryCard} (Invoice: {selectedInvoice})</Label>
                <Select
                  value={selectedEquipmentType ?? ""}
                  onValueChange={(val) => {
                    handleEquipmentTypeSelect(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingEquipmentTypes ? "Loading..." : `Select ${selectedCategoryCard} type`} />
                  </SelectTrigger>
                  <SelectContent className="bg-black text-white border-gray-700 rounded-lg">
                    {isLoadingEquipmentTypes ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : equipmentTypes.filter((item) => item.category === selectedCategoryCard && item.invoice_number === selectedInvoice).length === 0 ? (
                      <SelectItem value="manual">No {selectedCategoryCard} types found in this invoice</SelectItem>
                    ) : (
                      equipmentTypes
                        .filter((item) => item.category === selectedCategoryCard && item.invoice_number === selectedInvoice)
                        .map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} {item.default_cost ? `— $${item.default_cost}` : ""}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                
                {/* Show message and option to proceed without selection */}
                {!isLoadingEquipmentTypes && equipmentTypes.filter((item) => item.category === selectedCategoryCard && item.invoice_number === selectedInvoice).length === 0 && (
                  <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                    <p className="text-amber-400 text-sm mb-2">
                      No {selectedCategoryCard} types configured for invoice {selectedInvoice}.
                    </p>
                    <Button
                      onClick={() => {
                        setForm((prev: any) => ({ 
                          ...prev, 
                          category: selectedCategoryCard,
                          invoice_number: selectedInvoice,
                          name: "",
                          cost: ""
                        }));
                        setModalStep("form");
                      }}
                      variant="outline"
                      className="w-full bg-amber-900/40 border-amber-700 text-amber-300 hover:bg-amber-800/40"
                    >
                      Continue with Manual Entry
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Form */}
            {modalStep === "form" && (
              <>
                {/* Show selected invoice and category info */}
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-blue-300">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">Invoice: {selectedInvoice}</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Category: {selectedCategoryCard || form.category}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setModalStep("select-invoice")}
                      className="text-xs"
                    >
                      Change Invoice
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Item name"
                    className="bg-[#162a52] border-[#2a4375] text-white text-lg font-medium"
                  />
                </div>

                {/* Box Type only when Receiver */}
                {shouldShowBoxTypeAndExtras && (
                  <div className="mt-4">
                    <Label>Box Type</Label>
                    <Select
                      value={form.description}
                      onValueChange={(val) =>
                        setForm((prev: any) => ({
                          ...prev,
                          description: val,
                          serials: prev.serials && prev.serials.length ? prev.serials : [],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select box type" />
                      </SelectTrigger>
                      <SelectContent className="bg-black text-white border-gray-700 rounded-lg">
                        <SelectItem value="Base" className="text-white">Base</SelectItem>
                        <SelectItem value="Rover" className="text-white">Rover</SelectItem>
                        <SelectItem value="Base and Rover" className="text-white">Base and Rover</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Serial </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        placeholder="e.g. TL-001"
                        className="flex-1"
                        required
                      />
                      {shouldShowBoxTypeAndExtras && allowedExtraLabels.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addExtraSerial}
                          className="flex items-center gap-2"
                          disabled={!canAddExtra()}
                        >
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      )}
                    </div>

                    {/* Extras */}
                    {shouldShowBoxTypeAndExtras && form.serials && form.serials.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {form.serials.map((serial: string, idx: number) => {
                          const label = allowedExtraLabels[idx] ?? `Extra ${idx + 1}`;
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="min-w-[110px] text-xs text-slate-300 bg-slate-800 rounded-md px-2 py-2">
                                {label}
                              </div>
                              <Input
                                value={serial}
                                onChange={(e) => setExtraSerialValue(idx, e.target.value)}
                                placeholder={`${label} serial number`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExtraSerial(idx)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {!selectedCategoryCard && (
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={form.category}
                        onValueChange={(val) => {
                          setForm((prev: any) => ({
                            ...prev,
                            category: val,
                            ...(val !== "Receiver" ? { description: "", serials: [], equipment_type_id: "", equipment_type: "" } : {}),
                          }));
                          if (val === "Receiver") {
                            fetchEquipmentTypes(selectedInvoice || "");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-black text-white">
                          {CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c} className="text-white">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {!selectedCategoryCard && form.category === "Receiver" && (
                  <div>
                    <Label>Equipment Type (autofill name & cost)</Label>
                    <Select
                      value={form.equipment_type_id || form.equipment_type}
                      onValueChange={(val) => {
                        handleEquipmentTypeSelect(val);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingEquipmentTypes ? "Loading..." : "Select equipment type"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>
                          -- Select type --
                        </SelectItem>

                        {equipmentTypes.length === 0 && !isLoadingEquipmentTypes && (
                          <SelectItem value="manual">Manual / No types</SelectItem>
                        )}

                        {equipmentTypes
                          .filter((item) => item.category === form.category && item.invoice_number === selectedInvoice)
                          .map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name} {item.default_cost ? `— $${item.default_cost}` : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">Cost is autofilled from admin settings but remains editable.</p>
                  </div>
                )}

                {/* Cost Field Only (Exchange Rate Section Removed) */}
                <div className="space-y-2">
                  <Label htmlFor="cost-usd" className="text-blue-200 flex items-center gap-2">
                    <span>Cost in USD</span>
                    <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">$</span>
                  </Label>
                  <Input
                    id="cost-usd"
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    placeholder="100.00"
                    className="bg-[#162a52] border-[#2a4375] text-white text-lg font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Supplier</Label>
                    <Select
                      value={String(form.supplier || "")}
                      onValueChange={(val) => setForm({ ...form, supplier: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent className="bg-black text-white max-h-60 overflow-y-auto">
                        {isLoadingSuppliers ? (
                          <SelectItem value="" disabled>Loading suppliers...</SelectItem>
                        ) : suppliers.length > 0 ? (
                          suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()} className="text-white">
                              {s.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="No Suppliers" disabled>No suppliers found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invoice number is now auto-filled from selection */}
                  <div className="opacity-70">
                    <Label>Invoice Number (Auto-filled)</Label>
                    <Input 
                      value={selectedInvoice || ""} 
                      readOnly
                      className="bg-gray-800"
                    />
                  </div>
                </div>

                {/* NEW: Expiry Date Field */}
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="bg-[#162a52] border-[#2a4375] text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Optional: Set the expiration date for this item (e.g., warranty, calibration expiry)
                  </p>
                </div>

                {/* NEW: Available Serials Display for Edit Mode */}
                {isEditMode && form.available_serials && form.available_serials.length > 0 && (
                  <div>
                    <Label>Available Serial Numbers ({form.available_serials.length})</Label>
                    <div className="bg-slate-800 p-3 rounded border border-slate-600 max-h-32 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {form.available_serials.map((serial: string, index: number) => (
                          <div key={index} className="font-mono text-green-400">
                            {serial}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      These serial numbers are available for sale. When sold, they will be moved to sold serials.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <div className="flex gap-2">
              {modalStep !== "select-invoice" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (modalStep === "form") {
                      if ((selectedCategoryCard === "Receiver" || form.category === "Receiver") && selectedCategoryCard) {
                        setModalStep(selectedCategoryCard === "Receiver" ? "select-equipment-type" : "select-category");
                      } else {
                        setModalStep("select-category");
                        setSelectedCategoryCard(null);
                      }
                    } else if (modalStep === "select-equipment-type") {
                      setModalStep("select-category");
                      setSelectedEquipmentType(null);
                    } else if (modalStep === "select-category") {
                      setModalStep("select-invoice");
                      setSelectedCategoryCard(null);
                    }
                  }}
                >
                  ← Back
                </Button>
              )}

              {/* Only show Save/Add button on form step */}
              {modalStep === "form" && (
                <Button
                  onClick={handleSaveTool}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isEditMode ? "Save Changes" : "Add Item"}
                </Button>
              )}

              <Button
                onClick={() => {
                  setOpen(false);
                  resetForm();
                  setIsEditMode(false);
                  setEditingToolId(null);
                  setSelectedInvoice(null);
                  setSelectedCategoryCard(null);
                  setSelectedEquipmentType(null);
                  setModalStep("select-invoice");
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Tools;