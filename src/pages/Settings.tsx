import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  Settings as SettingsIcon, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  Package,
  Building2,
  Tags,
  Shield,
  Satellite,
  Navigation,
  Ruler,
  Drone,
  Waves,
  Scan,
  Box,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign
} from "lucide-react";
import { 
  getEquipmentTypes, 
  createEquipmentType, 
  updateEquipmentType, 
  deleteEquipmentType,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from "../services/api";
import { toast } from "sonner";

interface EquipmentType {
  id: string;
  name: string;
  default_cost: string;
  naira_cost?: string; 
  description?: string;
  created_at?: string;
  category: string;
  invoice_number?: string;
}

interface Supplier {
  id: string;
  name: string;
  created_at?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  equipment_count: number;
  total_value: number;
  total_naira_value?: number; // ADDED: To permanently hold the summed NGN value
  exchange_rate?: string;
}

type DialogType = 'invoice' | 'equipment' | 'supplier' | null;

/* ---------------- Constants ---------------- */
const CATEGORY_OPTIONS = [
  "Receiver",
  "Accessory",
  "Total Station",
  "Level",
  "Drones",
  "EchoSounder",
  "Laser Scanner",
  "Other",
];

const CATEGORY_ICONS = {
  "Receiver": Satellite,
  "Accessory": Drone,
  "Total Station": Navigation,
  "Level": Ruler,
  "Drones": Drone,
  "EchoSounder": Waves,
  "Laser Scanner": Scan,
  "Other": Box
};

const Settings: React.FC = () => {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<string>("");
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const [equipmentForm, setEquipmentForm] = useState({
    name: "",
    default_cost: "",
    naira_cost: "", 
    category: "Receiver",
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
  });

  const filteredEquipmentTypes = categoryFilter === "all" 
    ? equipmentTypes 
    : equipmentTypes.filter(type => type.category === categoryFilter);

  const equipmentByInvoice = equipmentTypes.reduce((acc, equipment) => {
    const invoiceNum = equipment.invoice_number || "No Invoice";
    if (!acc[invoiceNum]) {
      acc[invoiceNum] = [];
    }
    acc[invoiceNum].push(equipment);
    return acc;
  }, {} as Record<string, EquipmentType[]>);

  // FIXED: generateInvoices now preserves existing invoices and safely calculates both USD and NGN totals
  const generateInvoices = (equipmentData: EquipmentType[]) => {
    setInvoices(prevInvoices => {
      const invoiceMap = new Map();
      
      // Keep existing invoices so empty ones (or newly created ones) don't vanish
      prevInvoices.forEach(inv => {
        invoiceMap.set(inv.invoice_number, {
          ...inv,
          equipment_count: 0,
          total_value: 0,
          total_naira_value: 0 // Reset totals to recalculate
        });
      });

      equipmentData.forEach(equipment => {
        if (equipment.invoice_number) {
          if (!invoiceMap.has(equipment.invoice_number)) {
            invoiceMap.set(equipment.invoice_number, {
              id: equipment.invoice_number,
              invoice_number: equipment.invoice_number,
              created_at: equipment.created_at || new Date().toISOString(),
              equipment_count: 0,
              total_value: 0,
              total_naira_value: 0,
              exchange_rate: ""
            });
          }
          const invoice = invoiceMap.get(equipment.invoice_number);
          invoice.equipment_count += 1;
          invoice.total_value += parseFloat(equipment.default_cost) || 0;
          invoice.total_naira_value += parseFloat(equipment.naira_cost || "0") || 0; // Calculates permanent NGN sum
        }
      });

      return Array.from(invoiceMap.values());
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [equipmentData, supplierData] = await Promise.all([
          getEquipmentTypes(),
          getSuppliers()
        ]);
        
        const transformedEquipmentData = (equipmentData || []).map((item: any) => ({
          ...item,
          default_cost: String(item.default_cost || ""),
          naira_cost: String(item.naira_cost || ""), 
          id: String(item.id),
          category: item.category || "Receiver",
          invoice_number: item.invoice_number || ""
        }));
        
        const transformedSupplierData = (supplierData || []).map((item: any) => ({
          ...item,
          id: String(item.id)
        }));
        
        setEquipmentTypes(transformedEquipmentData);
        setSuppliers(transformedSupplierData);
        
        generateInvoices(transformedEquipmentData);
      } catch (err) {
        console.error("Error fetching settings data:", err);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchEquipmentTypes = async () => {
    try {
      const data = await getEquipmentTypes();
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        default_cost: String(item.default_cost || ""),
        naira_cost: String(item.naira_cost || ""),
        id: String(item.id),
        category: item.category || "Receiver",
        invoice_number: item.invoice_number || ""
      }));
      setEquipmentTypes(transformedData);
      generateInvoices(transformedData);
    } catch (err) {
      console.error("Error fetching equipment types:", err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers();
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        id: String(item.id)
      }));
      setSuppliers(transformedData);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  const resetForms = () => {
    setInvoiceNumber("");
    setExchangeRate("");
    setSelectedInvoice("");
    setEquipmentForm({ name: "", default_cost: "", naira_cost: "", category: "Receiver" });
    setSupplierForm({ name: "" });
    setIsEditMode(false);
    setEditingId(null);
  };

  useEffect(() => {
    if (equipmentForm.default_cost) {
      let rate: number | null = null;
      
      if (!isEditMode && exchangeRate) {
        rate = parseFloat(exchangeRate);
      }
      else if (!isEditMode && selectedInvoice) {
        const selectedInvoiceData = invoices.find(inv => inv.invoice_number === selectedInvoice);
        if (selectedInvoiceData?.exchange_rate) {
          rate = parseFloat(selectedInvoiceData.exchange_rate);
        }
      }
      
      if (rate && !isNaN(rate)) {
        const usdCost = parseFloat(equipmentForm.default_cost);
        if (!isNaN(usdCost)) {
          const nairaCost = usdCost * rate;
          setEquipmentForm(prev => ({
            ...prev,
            naira_cost: nairaCost.toFixed(2)
          }));
        }
      }
    }
  }, [equipmentForm.default_cost, exchangeRate, selectedInvoice, isEditMode, invoices]);

  const openAddInvoiceDialog = () => {
    resetForms();
    setDialogType('invoice');
  };

  const openAddEquipmentDialog = (invoiceNum?: string) => {
    resetForms();
    if (invoiceNum) {
      setSelectedInvoice(invoiceNum);
      const selectedInvoiceData = invoices.find(inv => inv.invoice_number === invoiceNum);
      if (selectedInvoiceData?.exchange_rate) {
        setExchangeRate(selectedInvoiceData.exchange_rate);
      }
      setDialogType('equipment');
    } else {
      setDialogType('invoice');
    }
  };

  const openEditEquipmentDialog = (type: EquipmentType) => {
    setEquipmentForm({
      name: type.name || "",
      default_cost: type.default_cost || "",
      naira_cost: type.naira_cost || "", 
      category: type.category || "Receiver",
    });
    setIsEditMode(true);
    setEditingId(type.id);
    setDialogType('equipment');
  };

  const openAddSupplierDialog = () => {
    resetForms();
    setDialogType('supplier');
  };

  const openEditSupplierDialog = (supplier: Supplier) => {
    setSupplierForm({
      name: supplier.name || "",
    });
    setIsEditMode(true);
    setEditingId(supplier.id);
    setDialogType('supplier');
  };

  const handleCreateInvoice = () => {
    if (!invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }

    if (invoices.find(inv => inv.invoice_number === invoiceNumber.trim())) {
      toast.error("Invoice number already exists");
      return;
    }

    const newInvoice: Invoice = {
      id: invoiceNumber.trim(),
      invoice_number: invoiceNumber.trim(),
      created_at: new Date().toISOString(),
      equipment_count: 0,
      total_value: 0,
      total_naira_value: 0,
      exchange_rate: exchangeRate || ""
    };

    setInvoices(prev => [...prev, newInvoice]);
    setSelectedInvoice(invoiceNumber.trim());
    setDialogType('equipment');
    toast.success("Invoice created successfully");
  };

  const handleSaveEquipment = async () => {
    if (!equipmentForm.name.trim()) {
      toast.error("Equipment name is required");
      return;
    }
    if (!equipmentForm.default_cost.trim() || isNaN(parseFloat(equipmentForm.default_cost))) {
      toast.error("Valid default cost is required");
      return;
    }
    if (!equipmentForm.category) {
      toast.error("Category is required");
      return;
    }

    if (!isEditMode && !selectedInvoice) {
      toast.error("Please select an invoice for this equipment");
      return;
    }

    const payload = {
      name: equipmentForm.name.trim(),
      default_cost: equipmentForm.default_cost,
      naira_cost: equipmentForm.naira_cost || "0", 
      category: equipmentForm.category,
      invoice_number: isEditMode ? undefined : selectedInvoice
    };

    try {
      let result: EquipmentType;
      let newList: EquipmentType[] = [];

      if (isEditMode && editingId) {
        result = await updateEquipmentType(editingId, payload);
        newList = equipmentTypes.map(item => 
          item.id === editingId ? { 
            ...result, 
            default_cost: String(result.default_cost || ""),
            naira_cost: String(result.naira_cost || "") 
          } : item
        );
        setEquipmentTypes(newList);
        toast.success("Equipment type updated successfully");
      } else {
        result = await createEquipmentType(payload);
        const newEquipment = { 
          ...result, 
          default_cost: String(result.default_cost || ""),
          naira_cost: String(result.naira_cost || ""), 
          invoice_number: selectedInvoice 
        };
        newList = [...equipmentTypes, newEquipment];
        setEquipmentTypes(newList);
        toast.success(`Equipment type created successfully for invoice ${selectedInvoice}`);
      }

      // Re-trigger invoice math calculation automatically
      generateInvoices(newList);

      setDialogType(null);
      resetForms();
    } catch (err) {
      console.error("Error saving equipment type:", err);
      toast.error("Failed to save equipment type");
    }
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    const payload = {
      name: supplierForm.name.trim(),
    };

    try {
      let result: Supplier;
      if (isEditMode && editingId) {
        result = await updateSupplier(editingId, payload);
        setSuppliers(prev => prev.map(item => 
          item.id === editingId ? result : item
        ));
        toast.success("Supplier updated successfully");
      } else {
        result = await createSupplier(payload);
        setSuppliers(prev => [...prev, result]);
        toast.success("Supplier created successfully");
      }
      setDialogType(null);
      resetForms();
    } catch (err) {
      console.error("Error saving supplier:", err);
      toast.error("Failed to save supplier");
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this equipment type?")) return;
    try {
      await deleteEquipmentType(id);
      toast.success("Equipment type deleted successfully");
      await fetchEquipmentTypes();
    } catch (err) {
      console.error("Error deleting equipment type:", err);
      toast.error("Failed to delete equipment type");
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await deleteSupplier(id);
      toast.success("Supplier deleted successfully");
      await fetchSuppliers();
    } catch (err) {
      console.error("Error deleting supplier:", err);
      toast.error("Failed to delete supplier");
    }
  };

  const toggleInvoiceExpansion = (invoiceNumber: string) => {
    setExpandedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceNumber)) {
        newSet.delete(invoiceNumber);
      } else {
        newSet.add(invoiceNumber);
      }
      return newSet;
    });
  };

  const getCategoryCounts = () => {
    const counts: { [key: string]: number } = {};
    CATEGORY_OPTIONS.forEach(category => {
      counts[category] = equipmentTypes.filter(type => type.category === category).length;
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <Package className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-gray-400">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/20 rounded-lg border border-blue-500/30">
                <SettingsIcon className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Admin Settings</h2>
                <p className="text-gray-400">
                  Configure system defaults, manage invoices, suppliers, and inventory options
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Management */}
        <Card className="border-[#1e3a78]/80 bg-gradient-to-br from-[#0f1f3d] to-[#162a52]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Invoice Management
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage invoices and add equipment to existing invoices
                </CardDescription>
              </div>
              <Button onClick={openAddInvoiceDialog} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg">
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-[#0a1628]/50 rounded-lg border border-[#1e3a78]/30">
                <div className="mx-auto w-16 h-16 bg-blue-950/50 rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-blue-400" />
                </div>
                <p className="text-gray-400 font-medium">No invoices created</p>
                <p className="text-sm text-gray-500">
                  Create your first invoice to start adding equipment
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((invoice) => {
                    const isExpanded = expandedInvoices.has(invoice.invoice_number);
                    const invoiceEquipment = equipmentByInvoice[invoice.invoice_number] || [];
                    
                    return (
                      <Card key={invoice.id} className="bg-[#0a1628]/40 border-[#1e3a78]/40">
                        <CardContent className="p-0">
                          {/* Invoice Header */}
                          <div 
                            className="p-4 hover:bg-[#162a52]/30 transition-colors cursor-pointer"
                            onClick={() => toggleInvoiceExpansion(invoice.invoice_number)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-600/20 rounded-lg">
                                  <FileText className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white text-lg">
                                    {invoice.invoice_number}
                                  </h3>
                                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(invoice.created_at).toLocaleDateString()}
                                    </span>
                                    <span>{invoice.equipment_count} items</span>
                                    
                                    {/* FIXED: Safe USD Rendering */}
                                    <span className="text-green-400 font-semibold">
                                      ${Number(invoice.total_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    
                                    {/* FIXED: Safe NGN Rendering. Pulls directly from the permanently saved equipment values */}
                                    {(Number(invoice.total_naira_value) > 0 || invoice.exchange_rate) ? (
                                      <span className="text-blue-400 font-semibold bg-blue-900/30 px-2 py-0.5 rounded border border-blue-800/50">
                                        ₦{Number(invoice.total_naira_value || (invoice.total_value * parseFloat(invoice.exchange_rate || "0"))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500 text-xs italic">No NGN Cost</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddEquipmentDialog(invoice.invoice_number);
                                  }}
                                  className="gap-2 bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add Equipment
                                </Button>
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-blue-400" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-blue-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expandable Equipment List */}
                          {isExpanded && (
                            <div className="border-t border-[#1e3a78]/50 bg-[#0a1628]/60">
                              {invoiceEquipment.length === 0 ? (
                                <div className="p-6 text-center text-gray-400">
                                  No equipment added to this invoice yet
                                </div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-[#162a52]/40 border-[#1e3a78]/50">
                                      <TableHead className="text-blue-300 font-semibold">Category</TableHead>
                                      <TableHead className="text-blue-300 font-semibold">Equipment Type</TableHead>
                                      <TableHead className="text-blue-300 font-semibold">Cost (USD)</TableHead>
                                      <TableHead className="text-blue-300 font-semibold">Cost (NGN)</TableHead>
                                      <TableHead className="text-blue-300 font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {invoiceEquipment.map((equipment) => {
                                      const CategoryIcon = CATEGORY_ICONS[equipment.category as keyof typeof CATEGORY_ICONS] || Box;
                                      const costUSD = parseFloat(equipment.default_cost) || 0;
                                      const costNGN = equipment.naira_cost ? 
                                        parseFloat(equipment.naira_cost) : 
                                        (invoice.exchange_rate ? costUSD * parseFloat(invoice.exchange_rate) : 0);
                                      
                                      return (
                                        <TableRow key={equipment.id} className="border-[#1e3a78]/30">
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <CategoryIcon className="h-4 w-4 text-blue-400" />
                                              <span className="text-white">{equipment.category}</span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="font-medium text-white">
                                            {equipment.name}
                                          </TableCell>
                                          <TableCell>
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-950/40 text-green-400 rounded-md font-semibold border border-green-800/30">
                                              ${costUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-950/40 text-blue-400 rounded-md font-semibold border border-blue-800/30">
                                              ₦{(costNGN || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditEquipmentDialog(equipment)}
                                                className="h-8 w-8 text-blue-400 hover:bg-blue-950/50 hover:text-blue-300"
                                              >
                                                <Edit2 className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteEquipment(equipment.id)}
                                                className="h-8 w-8 text-red-400 hover:bg-red-950/50 hover:text-red-300"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipment Categories Grid */}
        <Card className="border-[#1e3a78]/80 bg-gradient-to-br from-[#0f1f3d] to-[#162a52]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-5 w-5 text-blue-400" />
                  Equipment Categories
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Overview of equipment types across different categories
                </CardDescription>
              </div>
              <Button onClick={() => openAddEquipmentDialog()} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg">
                <Plus className="h-4 w-4" />
                Add Equipment Type
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {CATEGORY_OPTIONS.map((category) => {
                const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                const count = categoryCounts[category];
                return (
                  <Card 
                    key={category} 
                    className="bg-[#0a1628]/40 border-[#1e3a78]/40 hover:border-[#1e3a78]/70 transition-all hover:shadow-lg"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                          <IconComponent className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-sm">{category}</h3>
                          <p className="text-xs text-gray-400">{count} items</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Supplier Management */}
        <Card className="border-[#2a4375]/80 bg-gradient-to-br from-[#162a52] to-[#1e3a78]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building2 className="h-5 w-5 text-blue-400" />
                  Supplier Management
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your equipment suppliers
                </CardDescription>
              </div>
              <Button onClick={openAddSupplierDialog} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg">
                <Plus className="h-4 w-4" />
                Add Supplier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {suppliers.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-[#0f1f3d]/50 rounded-lg border border-[#2a4375]/30">
                <div className="mx-auto w-16 h-16 bg-blue-950/50 rounded-full flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-blue-400" />
                </div>
                <p className="text-gray-400 font-medium">No suppliers configured</p>
                <p className="text-sm text-gray-500">
                  Add suppliers to track equipment sources
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {suppliers.map((supplier) => (
                  <Card key={supplier.id} className="bg-[#0f1f3d]/40 border-[#2a4375]/40 hover:border-[#2a4375]/70 transition-all hover:shadow-lg">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <h3 className="font-semibold text-lg text-white">{supplier.name}</h3>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSupplierDialog(supplier)}
                            className="h-8 w-8 text-blue-400 hover:bg-blue-950/50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSupplier(supplier.id)}
                            className="h-8 w-8 text-red-400 hover:bg-red-950/50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Info Card */}
        <Card className="border-[#3d5a9e]/60 bg-gradient-to-br from-[#1e3a78] to-[#2a4375]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <div className="space-y-3 flex-1">
                <h3 className="text-lg font-semibold text-blue-300">System Configuration</h3>
                <div className="grid gap-3 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span>Create invoices to organize equipment by purchase orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-blue-400" />
                    <span>Equipment types autofill item names and costs during inventory entry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    <span>Supplier list appears in dropdown when adding new inventory items</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Creation Dialog */}
      <Dialog open={dialogType === 'invoice'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-md bg-[#0f1f3d] border-[#1e3a78]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-blue-400" />
              Create New Invoice
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new invoice to start adding equipment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-number" className="text-sm font-medium text-gray-300">
                Invoice Number <span className="text-red-400">*</span>
              </Label>
              <Input
                id="invoice-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2024-001, PO-12345"
                className="bg-[#162a52] border-[#2a4375] text-white text-lg font-medium"
              />
              <p className="text-xs text-gray-400">
                This invoice number will be used to group equipment items
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exchange-rate" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                Exchange Rate (USD to NGN) <span className="text-gray-400">(Optional)</span>
              </Label>
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="e.g. 1500.00"
                className="bg-[#162a52] border-[#2a4375] text-white text-lg font-medium"
              />
              <p className="text-xs text-gray-400">
                Set the exchange rate for this invoice (1 USD = ? NGN)
              </p>
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setDialogType(null)}
                className="flex-1 sm:flex-none border-gray-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                className="flex-1 sm:flex-none gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={!invoiceNumber.trim()}
              >
                <Save className="h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equipment Type Dialog */}
      <Dialog open={dialogType === 'equipment'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-2xl bg-[#0f1f3d] border-[#1e3a78]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {isEditMode ? (
                <>
                  <Edit2 className="h-5 w-5 text-blue-400" />
                  Edit Equipment Type
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-400" />
                  Add New Equipment Type
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {isEditMode 
                ? "Update the equipment type details below"
                : "Configure a new equipment type with default pricing"}
            </DialogDescription>
          </DialogHeader>

          {!isEditMode && (
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-300 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Invoice Selection</span>
                </div>
                <Select 
                  value={selectedInvoice} 
                  onValueChange={setSelectedInvoice}
                >
                  <SelectTrigger className="bg-[#162a52] border-[#2a4375] text-white">
                    <SelectValue placeholder="Select an invoice" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1f3d] text-white border-[#1e3a78]">
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.invoice_number}>
                        {invoice.invoice_number} ({invoice.equipment_count} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedInvoice && (
                  <p className="text-sm text-red-400 mt-2">
                    Please select an invoice to add equipment to
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="equipment-category" className="text-sm font-medium text-gray-300">
                Category <span className="text-red-400">*</span>
              </Label>
              <Select 
                value={equipmentForm.category} 
                onValueChange={(value) => setEquipmentForm({ ...equipmentForm, category: value })}
              >
                <SelectTrigger className="bg-[#162a52] border-[#2a4375] text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1f3d] text-white border-[#1e3a78]">
                  {CATEGORY_OPTIONS.map((category) => {
                    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                    return (
                      <SelectItem key={category} value={category}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {category}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment-name" className="text-sm font-medium text-gray-300">
                Equipment Type Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="equipment-name"
                value={equipmentForm.name}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                placeholder="e.g. GNSS Receiver, Tripod, RTK Base Station"
                className="bg-[#162a52] border-[#2a4375] text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equipment-cost" className="text-sm font-medium text-gray-300">
                  Default Cost (USD) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="equipment-cost"
                  type="number"
                  step="0.01"
                  value={equipmentForm.default_cost}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, default_cost: e.target.value })}
                  placeholder="0.00"
                  className="bg-[#162a52] border-[#2a4375] text-white text-lg font-medium"
                />
                <p className="text-xs text-gray-400">
                  This cost will autofill when creating inventory items
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="naira-cost" className="text-sm font-medium text-gray-300">
                  Default Cost (NGN) <span className="text-gray-400">(Auto-calculated)</span>
                </Label>
                <Input
                  id="naira-cost"
                  type="number"
                  step="0.01"
                  value={equipmentForm.naira_cost}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, naira_cost: e.target.value })}
                  placeholder="0.00"
                  className="bg-[#162a52] border-[#2a4375] text-white text-lg font-medium"
                  readOnly={!isEditMode} 
                />
                <p className="text-xs text-gray-400">
                  {isEditMode 
                    ? "You can manually adjust the NGN cost for existing items"
                    : "Automatically calculated from USD cost and exchange rate"
                  }
                </p>
              </div>
            </div>

            {(exchangeRate || (selectedInvoice && invoices.find(inv => inv.invoice_number === selectedInvoice)?.exchange_rate)) && !isEditMode && (
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-300 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    Exchange Rate: 1 USD = ₦
                    {parseFloat(
                      exchangeRate || 
                      (selectedInvoice ? invoices.find(inv => inv.invoice_number === selectedInvoice)?.exchange_rate || "0" : "0")
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setDialogType(null)}
                className="flex-1 sm:flex-none border-gray-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEquipment}
                className="flex-1 sm:flex-none gap-2 bg-blue-600 hover:bg-blue-700"
                disabled={!isEditMode && !selectedInvoice}
              >
                <Save className="h-4 w-4" />
                {isEditMode ? "Save Changes" : "Create Type"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={dialogType === 'supplier'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-2xl bg-[#0f1f3d] border-[#1e3a78]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {isEditMode ? (
                <>
                  <Edit2 className="h-5 w-5 text-blue-400" />
                  Edit Supplier
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-400" />
                  Add New Supplier
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {isEditMode 
                ? "Update the supplier details below"
                : "Add a new supplier to your inventory system"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-name" className="text-sm font-medium text-gray-300">
                Supplier Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="supplier-name"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="e.g. COMNAV TECHNOLOGY, GINTEC"
                className="bg-[#162a52] border-[#2a4375] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setDialogType(null)}
                className="flex-1 sm:flex-none border-gray-600 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSupplier}
                className="flex-1 sm:flex-none gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                {isEditMode ? "Save Changes" : "Add Supplier"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Settings;