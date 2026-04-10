import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getTools } from "../services/api";
import { Button } from "../components/ui/button";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent } from "../components/ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --------------------
// INTERFACE
// --------------------
interface SerialNumbers {
  receiver?: string;
  receiver1?: string;
  receiver2?: string;
  data_logger?: string;
  external_radio?: string;
  [key: string]: any;
}

interface Tool {
  id: string;
  name: string;
  code: string;
  stock: number;
  supplier?: string;
  supplier_name?: string;
  category?: string;
  invoice_number?: string;
  date_added?: string;
  updated_at?: string;
  description?: string;
  box_type?: string;
  expiry_date?: string;
  serials?: string[] | SerialNumbers;
  available_serials?: string[];
  sold_serials?: any[];
}

// --------------------
// ACCESSORY TYPES
// --------------------
interface Accessory {
  name: string;
  quantity: number;
}

interface SoldSerialInfo {
  serial: string;
  sale_id?: number | null;
  customer_name: string;
  date_sold?: string | null;
  invoice_number?: string | null;
}

// --------------------
// HELPER FUNCTIONS
// --------------------
const isSerialObject = (serials: any): serials is SerialNumbers => {
  return serials && typeof serials === 'object' && !Array.isArray(serials);
};

const getSerialValue = (serials: any, key: string): string => {
  if (!serials) return '';
  if (isSerialObject(serials)) {
    return serials[key] || '';
  }
  return '';
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch {
    return "—";
  }
};

const isDateExpired = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    return date < new Date();
  } catch {
    return false;
  }
};

const isDateExpiringSoon = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return date > now && date <= thirtyDaysFromNow;
  } catch {
    return false;
  }
};

// --------------------
// MAIN COMPONENT
// --------------------
const ToolsSummary: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<{invoiceNo: string, boxType: string} | null>(null);
  const [serialSearch, setSerialSearch] = useState("");

  // URL search parameters state
  const [urlSearchQuery, setUrlSearchQuery] = useState("");
  const [urlSearchType, setUrlSearchType] = useState<"serial" | "invoice" | "">("");
  const location = useLocation();

  // Serial number viewing state
  const [viewingSerials, setViewingSerials] = useState<{
    open: boolean;
    tool: Tool | null;
    soldSerials: SoldSerialInfo[];
  }>({
    open: false,
    tool: null,
    soldSerials: []
  });

  // --------------------
  // FIXED: URL SEARCH PARAMETER HANDLING
  // --------------------
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const serial = searchParams.get('serial');
      const invoice = searchParams.get('invoice');
      const searchParam = searchParams.get('search');
      
      let searchQuery = '';
      let searchType: "serial" | "invoice" | "" = "";
      
      if (serial) {
        searchQuery = serial;
        searchType = "serial";
      } else if (invoice) {
        searchQuery = invoice;
        searchType = "invoice";
      } else if (searchParam) {
        searchQuery = searchParam;
        searchType = "";
      }
      
      if (searchQuery) {
        setUrlSearchQuery(searchQuery);
        setUrlSearchType(searchType);
        setSearch(searchQuery);
        
        setTimeout(() => {
          try {
            const highlightedRows = document.querySelectorAll('.highlighted-item');
            if (highlightedRows.length > 0) {
              highlightedRows[0].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          } catch (error) {
            console.error('Error scrolling to highlighted items:', error);
          }
        }, 800);
      }
    } catch (error) {
      console.error('Error handling URL search parameters:', error);
    }
  }, [location.search]);

  // --------------------
  // CLEAR URL SEARCH
  // --------------------
  const clearUrlSearch = () => {
    setUrlSearchQuery("");
    setUrlSearchType("");
    setSearch("");
    window.history.replaceState({}, '', window.location.pathname);
  };

  // --------------------
  // FIXED: CHECK IF ITEM MATCHES URL SEARCH
  // --------------------
  const isItemHighlighted = (tool: Tool) => {
    if (!urlSearchQuery || !tool) return false;
    
    const query = urlSearchQuery.toLowerCase().trim();
    if (!query) return false;
    
    try {
      // Search in tool name
      if (tool.name && tool.name.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in code
      if (tool.code && tool.code.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in invoice number
      if (tool.invoice_number && tool.invoice_number.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in supplier name
      if (tool.supplier_name && tool.supplier_name.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in box type
      if (tool.box_type && tool.box_type.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in serial numbers
      if (tool.serials) {
        if (isSerialObject(tool.serials)) {
          const serialValues = Object.values(tool.serials);
          if (serialValues.some((serial: any) => 
            serial && serial.toString().toLowerCase().includes(query)
          )) {
            return true;
          }
        } else if (Array.isArray(tool.serials)) {
          if (tool.serials.some((serial: any) => 
            serial && serial.toString().toLowerCase().includes(query)
          )) {
            return true;
          }
        }
      }
      
      // Search in available serials array
      if (tool.available_serials && Array.isArray(tool.available_serials)) {
        if (tool.available_serials.some((serial: string) => 
          serial.toLowerCase().includes(query)
        )) {
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking if item is highlighted:', error);
    }
    
    return false;
  };

  // --------------------
  // ACCESSORY DEFINITIONS
  // --------------------
  const getAccessoriesForBoxType = (boxType: string): Accessory[] => {
    if (!boxType) return [];
    
    const normalizedType = boxType.toLowerCase().trim();
    
    if (normalizedType.includes("base")) {
      return [
        { name: "Spindle and Tribrac", quantity: 1 },
        { name: "30cm Pole", quantity: 1 },
        { name: "Batteries", quantity: 2 },
        { name: "Data Logger", quantity: 1 },
        { name: "Receivers", quantity: 1 },
        { name: "Download Cable", quantity: 1 },
        { name: "Receiver Adapter", quantity: 1 },
        { name: "Pole Bracket", quantity: 1 },
        { name: "Charger", quantity: 1 },
        { name: "Whip Antenna", quantity: 1 },
        { name: "Flash Drive", quantity: 1 }
      ];
    } else if (normalizedType.includes("rover")) {
      return [
        { name: "Batteries", quantity: 2 },
        { name: "Data Logger", quantity: 1 },
        { name: "Receivers", quantity: 1 },
        { name: "Download Cable", quantity: 1 },
        { name: "Receiver Adapter", quantity: 1 },
        { name: "Pole Bracket", quantity: 1 },
        { name: "Charger", quantity: 1 },
        { name: "Whip Antenna", quantity: 1 },
        { name: "Flash Drive", quantity: 1 }
      ];
    }
    
    return [];
  };

  // --------------------
  // LOAD TOOLS
  // --------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getTools();
        if (!mounted) return;
        
        const normalized: Tool[] = (data || []).map((t: any) => {
          let serialsData: SerialNumbers = {};
          
          if (t.serials && Array.isArray(t.serials)) {
            const boxType = (t.box_type || t.description || "").toLowerCase();
            
            if (boxType.includes("base and rover")) {
              serialsData = {
                receiver1: t.serials[0] || "",
                receiver2: t.serials[1] || "",
                data_logger: t.serials[2] || "",
                external_radio: t.serials[3] || ""
              };
            } else if (boxType.includes("base") || boxType.includes("rover")) {
              serialsData = {
                receiver: t.serials[0] || "",
                data_logger: t.serials[1] || ""
              };
            } else {
              serialsData = {
                receiver: t.serials[0] || ""
              };
            }
          } else if (t.serials && typeof t.serials === 'object') {
            serialsData = t.serials;
          }
          
          let expiryDate = "";
          if (t.expiry_date) {
            expiryDate = t.expiry_date;
          } else if (t.expiration_date) {
            expiryDate = t.expiration_date;
          } else if (t.warranty_expiry) {
            expiryDate = t.warranty_expiry;
          }
          
          let availableSerials: string[] = [];
          if (Array.isArray(t.available_serials)) {
            availableSerials = t.available_serials;
          } else if (!t.available_serials && t.serials) {
            availableSerials = Array.isArray(t.serials) ? t.serials : Object.values(serialsData).filter(Boolean);
          }
          
          let soldSerials: any[] = [];
          if (Array.isArray(t.sold_serials)) {
            soldSerials = t.sold_serials;
          }
          
          return {
            id: t.id,
            name: t.name,
            code: t.code || "",
            stock: Number(t.stock || 0),
            supplier: t.supplier || "",
            supplier_name: t.supplier_name || "",
            category: t.category || "Uncategorized",
            invoice_number: t.invoice_number || "",
            date_added: t.date_added,
            updated_at: t.updated_at,
            box_type: t.box_type || t.description || "",
            expiry_date: expiryDate,
            serials: serialsData,
            available_serials: availableSerials,
            sold_serials: soldSerials,
          };
        });
        
        setTools(normalized);
      } catch (err) {
        console.error("Failed to load tools:", err);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // View serial numbers for a tool
  const viewSerialNumbers = async (tool: Tool) => {
    try {
      const soldSerials: SoldSerialInfo[] = [];
      
      for (const serialInfo of tool.sold_serials || []) {
        if (typeof serialInfo === 'object') {
          soldSerials.push({
            serial: serialInfo.serial || 'Unknown',
            sale_id: serialInfo.sale_id || null,
            customer_name: serialInfo.customer_name || 'Unknown',
            date_sold: serialInfo.date_sold || null,
            invoice_number: serialInfo.invoice_number || null
          });
        } else {
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

  // --------------------
  // LAST UPDATED
  // --------------------
  const lastUpdated = useMemo(() => {
    if (tools.length === 0) return null;
    const sorted = [...tools]
      .filter((t) => t.updated_at)
      .sort(
        (a, b) =>
          new Date(b.updated_at || "").getTime() -
          new Date(a.updated_at || "").getTime()
      );
    return sorted[0]?.updated_at || null;
  }, [tools]);

  // --------------------
  // CATEGORY LIST
  // --------------------
  const categories = useMemo(() => {
    const set = new Set<string>();
    tools.forEach((t) => set.add(t.category || "Uncategorized"));
    return ["all", ...Array.from(set).sort()];
  }, [tools]);

  // --------------------
  // FIXED: GROUPED DATA
  // --------------------
  const grouped = useMemo(() => {
    try {
      const q = search.trim().toLowerCase();

      const filtered = tools.filter((t) => {
        const categoryMatch =
          categoryFilter === "all" ||
          !categoryFilter ||
          (t.category || "Uncategorized").toLowerCase() ===
            categoryFilter.toLowerCase();
        
        const qMatch =
          !q ||
          t.name.toLowerCase().includes(q) ||
          (t.supplier_name || "").toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.invoice_number && t.invoice_number.toLowerCase().includes(q)) ||
          (t.box_type && t.box_type.toLowerCase().includes(q)) ||
          (t.serials && isSerialObject(t.serials) && 
            Object.values(t.serials).some((serial: any) => 
              serial && serial.toString().toLowerCase().includes(q)
            )
          ) ||
          (t.available_serials && Array.isArray(t.available_serials) &&
            t.available_serials.some((serial: string) => 
              serial.toLowerCase().includes(q)
            )
          );
        
        const lowStockMatch = !lowStockOnly || t.stock < 5;
        const hasStock = t.stock > 0; 
        
        return categoryMatch && qMatch && lowStockMatch && hasStock; 
      });

      const map = new Map<
        string,
        { 
          name: string; 
          totalStock: number; 
          suppliers: string[]; 
          serials: Tool[]; 
          totalAvailableSerials: number; 
          totalSoldSerials: number;
          latestActiveTool: Tool;
        }[]
      >();

      for (const t of filtered) {
        const category = t.category || "Uncategorized";
        if (!map.has(category)) map.set(category, []);

        const toolGroup = map.get(category)!;
        const existing = toolGroup.find((x) => x.name === t.name);

        if (existing) {
          existing.totalStock += t.stock;
          if (t.supplier_name && !existing.suppliers.includes(t.supplier_name))
            existing.suppliers.push(t.supplier_name);
          existing.serials.push(t);
          existing.totalAvailableSerials += t.available_serials?.length || 0;
          existing.totalSoldSerials += t.sold_serials?.length || 0;
          
          const currentDate = existing.latestActiveTool.date_added || "";
          const newDate = t.date_added || "";
          if (newDate && (!currentDate || newDate > currentDate)) {
            existing.latestActiveTool = t;
          }
        } else {
          toolGroup.push({
            name: t.name,
            totalStock: t.stock,
            suppliers: t.supplier_name ? [t.supplier_name] : [],
            serials: [t],
            totalAvailableSerials: t.available_serials?.length || 0,
            totalSoldSerials: t.sold_serials?.length || 0,
            latestActiveTool: t,
          });
        }
      }

      return Array.from(map.entries()).map(([category, tools]) => ({
        category,
        tools,
      }));
    } catch (error) {
      console.error('Error grouping data:', error);
      return [];
    }
  }, [tools, search, categoryFilter, lowStockOnly]);

  // --------------------
  // TOTAL STOCK AND SERIALS
  // --------------------
  const totalStock = useMemo(
    () =>
      grouped.reduce(
        (s, g) =>
          s + g.tools.reduce((sum, t) => sum + (t.totalStock || 0), 0),
        0
      ),
    [grouped]
  );

  const totalAvailableSerials = useMemo(
    () => tools.reduce((acc, tool) => acc + (tool.available_serials?.length || 0), 0),
    [tools]
  );

  const totalSoldSerials = useMemo(
    () => tools.reduce((acc, tool) => acc + (tool.sold_serials?.length || 0), 0),
    [tools]
  );

  // --------------------
  // EXPORT FUNCTIONS (unchanged)
  // --------------------
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Inventory Summary", 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Available Serials: ${totalAvailableSerials} | Total Sold Serials: ${totalSoldSerials}`, 14, 28);

    const body: any[] = [];
    grouped.forEach((cat) => {
      cat.tools.forEach((t, i) => {
        body.push([
          i === 0 ? cat.category : "",
          t.name,
          String(t.totalStock ?? 0),
          String(t.totalAvailableSerials ?? 0),
          String(t.totalSoldSerials ?? 0),
        ]);
      });
    });

    autoTable(doc, {
      head: [["Category", "Tool Name", "Quantity", "Available Serials", "Sold Serials"]],
      body,
      startY: 35,
      styles: { fontSize: 9, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`inventory_summary_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportToolDetailsPDF = () => {
    if (!selectedTool) return;

    const toolGroup = tools.filter((t) => t.name === selectedTool.name);
    const filteredSerials = toolGroup.filter((t) =>
      t.code.toLowerCase().includes(serialSearch.toLowerCase()) ||
      (t.serials && isSerialObject(t.serials) && 
        Object.values(t.serials).some((serial: any) => 
          serial && serial.toString().toLowerCase().includes(serialSearch.toLowerCase())
        )
      )
    );

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${selectedTool.name} - Detailed Inventory`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Items: ${filteredSerials.length}`, 14, 28);

    const body: any[] = [];
    
    filteredSerials.forEach((item) => {
      const serials: string[] = [];
      
      if (item.serials && isSerialObject(item.serials)) {
        const boxType = (item.box_type || "").toLowerCase();
        
        if (boxType.includes("base and rover")) {
          if (item.serials.receiver1) serials.push(`R1: ${item.serials.receiver1}`);
          if (item.serials.receiver2) serials.push(`R2: ${item.serials.receiver2}`);
          if (item.serials.data_logger) serials.push(`DL: ${item.serials.data_logger}`);
          if (item.serials.external_radio) serials.push(`ER: ${item.serials.external_radio}`);
        } else if (boxType.includes("base") || boxType.includes("rover")) {
          if (item.serials.receiver) serials.push(`R: ${item.serials.receiver}`);
          if (item.serials.data_logger) serials.push(`DL: ${item.serials.data_logger}`);
        } else {
          if (item.serials.receiver) serials.push(`R: ${item.serials.receiver}`);
          if (item.serials.data_logger) serials.push(`DL: ${item.serials.data_logger}`);
          if (item.serials.external_radio) serials.push(`ER: ${item.serials.external_radio}`);
        }
      }
      
      if (serials.length === 0 && item.code) {
        serials.push(`Code: ${item.code}`);
      }
      
      body.push([
        item.box_type || "—",
        serials.join('\n') || "—",
        item.supplier_name || "—",
        item.invoice_number || "—",
        formatDate(item.date_added),
        formatDate(item.expiry_date),
        item.available_serials?.length || 0,
        item.sold_serials?.length || 0,
      ]);
    });

    autoTable(doc, {
      head: [["Box Type", "Serial Numbers", "Supplier", "Invoice No", "Date Added", "Expiry Date"]],
      body,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2, valign: 'top' },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`${selectedTool.name}_details_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportAccessoriesPDF = () => {
    if (!selectedInvoice) return;

    const accessories = getAccessoriesForBoxType(selectedInvoice.boxType);
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Accessories List - Invoice ${selectedInvoice.invoiceNo}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Box Type: ${selectedInvoice.boxType || "Not specified"}`, 14, 28);

    const body: any[] = accessories.map((accessory, index) => [
      index + 1,
      accessory.name,
      accessory.quantity
    ]);

    autoTable(doc, {
      head: [["#", "Accessory Name", "Quantity"]],
      body,
      startY: 35,
      styles: { fontSize: 9, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`accessories_${selectedInvoice.invoiceNo}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // --------------------
  // RENDER ACCESSORIES PAGE
  // --------------------
  const renderAccessoriesPage = () => {
    if (!selectedInvoice) return null;

    const accessories = getAccessoriesForBoxType(selectedInvoice.boxType);

    return (
      <div className="mt-6 border rounded-lg p-4 bg-blue-950">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Accessories List - Invoice {selectedInvoice.invoiceNo}
          </h2>
          <div className="flex gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={exportAccessoriesPDF}
            >
              Export PDF
            </Button>
            <Button
              className="bg-slate-700 hover:bg-slate-600"
              onClick={() => setSelectedInvoice(null)}
            >
              Back to Details
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-300">
            <strong>Box Type:</strong> {selectedInvoice.boxType || "Not specified"}
          </p>
        </div>

        <div className="overflow-auto border rounded-md">
          <table className="min-w-full text-white">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-2 text-left w-16">#</th>
                <th className="px-4 py-2 text-left">Accessory Name</th>
                <th className="px-4 py-2 text-left w-24">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {accessories.length > 0 ? (
                accessories.map((accessory, index) => (
                  <tr key={index} className="border-b border-slate-700">
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">{accessory.name}</td>
                    <td className="px-4 py-2">{accessory.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                    No accessories defined for this box type.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --------------------
  // FIXED: RENDER MAIN TABLE
  // --------------------
  const renderMainTable = () => {
    if (grouped.length === 0) {
      return (
        <tr>
          <td colSpan={3} className="p-6 text-center text-gray-500">
            {loading ? 'Loading...' : 'No tools found.'}
          </td>
        </tr>
      );
    }

    const rows: React.ReactNode[] = [];
    
    try {
      grouped.forEach((cat) => {
        const totalToolsInCategory = cat.tools.reduce((sum, tool) => sum + tool.totalStock, 0);
        
        cat.tools.forEach((t, i) => {
          const isHighlighted = t.serials.some(tool => isItemHighlighted(tool));
          
          rows.push(
            <tr
              key={`${cat.category}-${t.name}-${i}`}
              className={`border-b last:border-b-0 hover:bg-slate-50/5 ${
                isHighlighted ? 'highlighted-item bg-blue-950 border-l-4 border-l-yellow-500' : ''
              }`}
            >
              <td className={`px-4 py-3 align-top ${i === 0 ? "font-semibold" : ""}`}>
                {i === 0 ? (
                  <div>
                    {cat.category} 
                    <span className="font-bold text-white ml-1">
                      ({totalToolsInCategory})
                    </span>
                  </div>
                ) : (
                  ""
                )}
              </td>
              <td
                className="px-4 py-3 align-top text-blue-400 cursor-pointer hover:underline"
                onClick={() => setSelectedTool(t.latestActiveTool)}
              >
                <div className="flex items-center gap-2">
                  {t.name}
                  {isHighlighted && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Match
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (t.serials && t.serials.length > 0) {
                        viewSerialNumbers(t.serials[0]);
                      }
                    }}
                    className="text-green-400 hover:text-green-300"
                    title="View serial numbers"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </td>

              <td className="px-4 py-3 text-center align-top">
                <span
                  className={`px-2 py-1 rounded-full text-sm ${
                    t.totalStock <= 5
                      ? "bg-amber-600/20 text-amber-300"
                      : "bg-green-600/10 text-green-300"
                  }`}
                >
                  {t.totalStock}
                </span>
              </td>
            </tr>
          );
        });
      });
    } catch (error) {
      console.error('Error rendering main table:', error);
      return (
        <tr>
          <td colSpan={3} className="p-6 text-center text-red-500">
            Error rendering table data
          </td>
        </tr>
      );
    }

    return rows;
  };

  // --------------------
  // RENDER TOOL DETAILS
  // --------------------
  const renderToolDetails = () => {
    if (!selectedTool) return null;

    try {
      const toolGroup = tools.filter((t) => t.name === selectedTool.name && t.stock > 0);
      
      const filteredSerials = toolGroup.filter((t) =>
        t.code.toLowerCase().includes(serialSearch.toLowerCase()) ||
        (t.serials && isSerialObject(t.serials) && 
          Object.values(t.serials).some((serial: any) => 
            serial && serial.toString().toLowerCase().includes(serialSearch.toLowerCase())
          )
        )
      );

      if (filteredSerials.length === 0) {
        return (
          <div className="mt-6 border rounded-lg p-4 bg-blue-950">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">{selectedTool.name} — Details</h2>
              <Button
                className="bg-slate-700 hover:bg-slate-600"
                onClick={() => setSelectedTool(null)}
              >
                Back
              </Button>
            </div>
            <div className="text-center py-8 text-gray-400">
              <p>No active inventory found for {selectedTool.name}.</p>
              <p className="text-sm mt-2">All items have been sold or are out of stock.</p>
            </div>
          </div>
        );
      }

      const groupedByInvoice = filteredSerials.reduce((acc, item) => {
        const key = item.invoice_number || "no-invoice";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, Tool[]>);

      return (
        <div className="mt-6 border rounded-lg p-4 bg-blue-950">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">{selectedTool.name} — Details</h2>
            <div className="flex gap-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={exportToolDetailsPDF}
              >
                Export PDF
              </Button>
              <Button
                className="bg-slate-700 hover:bg-slate-600"
                onClick={() => setSelectedTool(null)}
              >
                Back
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <input
              type="text"
              placeholder="Filter by serial number, code, or invoice"
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              className="px-3 py-2 bg-slate-800 text-white rounded-md w-80"
            />
            
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <span>Showing: {filteredSerials.length} active items</span>
            </label>
          </div>

          <div className="mb-3 text-sm text-gray-300">
            Showing {filteredSerials.length} active items
            {filteredSerials.some(t => t.expiry_date) && (
              <span className="ml-4">
                • {filteredSerials.filter(t => t.expiry_date).length} items with expiry dates
              </span>
            )}
          </div>

          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-white">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-2 text-left w-40">Box Type</th>
                  <th className="px-4 py-2 text-left w-64">Serial Numbers</th>
                  <th className="px-4 py-2 text-left w-40">Supplier</th>
                  <th className="px-4 py-2 text-left w-40">Invoice No</th>
                  <th className="px-4 py-2 text-left w-40">Date Added</th>
                  <th className="px-4 py-2 text-left w-40">Expiry Date</th>
                </tr>
              </thead>

              <tbody>
                {Object.entries(groupedByInvoice).map(([, group]) =>
                  group.map((item, index) => {
                    const hasExpiryDate = !!item.expiry_date;
                    const isExpired = hasExpiryDate && isDateExpired(item.expiry_date);
                    const isExpiringSoon = hasExpiryDate && isDateExpiringSoon(item.expiry_date);
                    const isHighlighted = isItemHighlighted(item);
                    
                    return (
                      <tr 
                        key={`${item.id}-${index}`} 
                        className={`border-b border-slate-700 ${
                          isHighlighted ? 'highlighted-item bg-blue-950 border-l-4 border-l-yellow-500' : ''
                        }`}
                      >
                        <td className="px-4 py-2 align-top">
                          {item.box_type || "—"}
                        </td>

                        <td className="px-4 py-2 align-top">
                          <div className="space-y-1 text-sm">
                            {isHighlighted && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mb-1">
                                Match
                              </span>
                            )}
                            
                            {item.serials && isSerialObject(item.serials) && (
                              <>
                                {(item.box_type || "").toLowerCase().includes("base and rover") && (
                                  <>
                                    {getSerialValue(item.serials, 'receiver1') && (
                                      <div>
                                        <span className="text-gray-400">Receiver 1:</span> {getSerialValue(item.serials, 'receiver1')}
                                      </div>
                                    )}
                                    {getSerialValue(item.serials, 'receiver2') && (
                                      <div>
                                        <span className="text-gray-400">Receiver 2:</span> {getSerialValue(item.serials, 'receiver2')}
                                      </div>
                                    )}
                                    {getSerialValue(item.serials, 'data_logger') && (
                                      <div>
                                        <span className="text-gray-400">Data Logger:</span> {getSerialValue(item.serials, 'data_logger')}
                                      </div>
                                    )}
                                    {getSerialValue(item.serials, 'external_radio') && (
                                      <div>
                                        <span className="text-gray-400">External Radio:</span> {getSerialValue(item.serials, 'external_radio')}
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                {((item.box_type || "").toLowerCase().includes("base") || 
                                  (item.box_type || "").toLowerCase().includes("rover")) && 
                                  !(item.box_type || "").toLowerCase().includes("base and rover") && (
                                  <>
                                    {getSerialValue(item.serials, 'receiver') && (
                                      <div>
                                        <span className="text-gray-400">Receiver:</span> {getSerialValue(item.serials, 'receiver')}
                                      </div>
                                    )}
                                    {getSerialValue(item.serials, 'data_logger') && (
                                      <div>
                                        <span className="text-gray-400">Data Logger:</span> {getSerialValue(item.serials, 'data_logger')}
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                {!(item.box_type || "").toLowerCase().includes("base") && 
                                 !(item.box_type || "").toLowerCase().includes("rover") && (
                                  <>
                                    {getSerialValue(item.serials, 'receiver') && (
                                      <div>
                                        <span className="text-gray-400">Receiver:</span> {getSerialValue(item.serials, 'receiver')}
                                      </div>
                                    )}
                                    {getSerialValue(item.serials, 'data_logger') && (
                                      <div>
                                        <span className="text-gray-400">Data Logger:</span> {getSerialValue(item.serials, 'data_logger')}
                                      </div>
                                    )}
                                    {getSerialValue(item.serials, 'external_radio') && (
                                      <div>
                                        <span className="text-gray-400">External Radio:</span> {getSerialValue(item.serials, 'external_radio')}
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                            
                            {!item.code && (!item.serials || (isSerialObject(item.serials) && Object.keys(item.serials).length === 0)) && (
                              <span className="text-gray-500">No serial data</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-2 align-top">
                          {item.supplier_name || "—"}
                        </td>

                        <td className="px-4 py-2 align-top">
                          {item.invoice_number ? (
                            <span
                              className="text-blue-400 cursor-pointer hover:underline"
                              onClick={() => setSelectedInvoice({
                                invoiceNo: item.invoice_number!,
                                boxType: item.box_type || ""
                              })}
                            >
                              {item.invoice_number}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-4 py-2 align-top">
                          {formatDate(item.date_added)}
                        </td>

                        <td className="px-4 py-2 align-top">
                          {hasExpiryDate ? (
                            <span className={
                              isExpired 
                                ? "text-red-400 font-medium" 
                                : isExpiringSoon
                                  ? "text-amber-400 font-medium"
                                  : "text-green-400"
                            }>
                              {formatDate(item.expiry_date)}
                              {isExpired && (
                                <span className="text-xs text-red-400 block">Expired</span>
                              )}
                              {isExpiringSoon && (
                                <span className="text-xs text-amber-400 block">Expiring Soon</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering tool details:', error);
      return (
        <div className="mt-6 border rounded-lg p-4 bg-blue-950">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">Error</h2>
            <Button
              className="bg-slate-700 hover:bg-slate-600"
              onClick={() => setSelectedTool(null)}
            >
              Back
            </Button>
          </div>
          <div className="text-center py-8 text-red-400">
            <p>Error loading tool details. Please try again.</p>
          </div>
        </div>
      );
    }
  };

  // --------------------
  // VIEW SERIAL NUMBERS DIALOG
  // --------------------
  const renderSerialNumbersDialog = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${viewingSerials.open ? '' : 'hidden'}`}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">
            Serial Number History - {viewingSerials.tool?.name}
          </h3>
          <button
            onClick={() => setViewingSerials({ open: false, tool: null, soldSerials: [] })}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {viewingSerials.soldSerials.length > 0 ? (
          <div className="space-y-3">
            {viewingSerials.soldSerials.map((serialInfo, index) => (
              <div key={index} className="bg-slate-800 p-4 rounded border border-slate-600">
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
                    <p className="text-white">{serialInfo.date_sold ? new Date(serialInfo.date_sold).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-blue-300 font-medium">Invoice:</span>
                    <p className="text-white">{serialInfo.invoice_number || "N/A"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p>No serial numbers have been sold for this tool yet.</p>
          </div>
        )}
        
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => setViewingSerials({ open: false, tool: null, soldSerials: [] })}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  // --------------------
  // RETURN
  // --------------------
  return (
    <DashboardLayout>
      {renderSerialNumbersDialog()}
      
      <div className="p-6">
        {!selectedTool ? (
          <>
            {/* URL Search Header */}
            {urlSearchQuery && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-blue-800 font-medium">
                      Showing results for {urlSearchType}: "{urlSearchQuery}"
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearUrlSearch}
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    Clear Search
                  </Button>
                </div>
              </div>
            )}

            {/* Search Summary Information */}
            {search && (
              <div className="mb-4 text-sm text-blue-400">
                Searching for: "<strong>{search}</strong>" 
                {urlSearchType && ` (${urlSearchType} search)`}
                <span className="ml-4">
                  Found {grouped.reduce((acc, cat) => acc + cat.tools.length, 0)} items across {grouped.length} categories
                </span>
                <button 
                  onClick={() => setSearch("")}
                  className="ml-4 text-gray-400 hover:text-white text-xs underline"
                >
                  Clear search
                </button>
              </div>
            )}

            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Inventory Summary</h1>
                <p className="text-sm text-gray-500">
                  Grouped by category and tool name.
                </p>
                {lastUpdated && (
                  <p className="text-xs text-gray-400 mt-1">
                    Last updated: {new Date(lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Search by name, supplier, code, invoice, serial number, or box type"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-2 bg-slate-800 text-white rounded-md w-80"
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-800 text-white rounded-md"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === "all" ? "All categories" : c}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                  />
                  Low stock only
                </label>

                <Button
                  className="bg-slate-700 hover:bg-slate-600"
                  onClick={exportPDF}
                >
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Stock Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="border-border bg-blue-950">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-400">Total Equipment Types</p>
                  <h3 className="text-2xl font-bold">{grouped.reduce((acc, cat) => acc + cat.tools.length, 0)}</h3>
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
                  <p className="text-sm text-gray-400">Sold Items</p>
                  <h3 className="text-2xl font-bold text-blue-400">{totalSoldSerials}</h3>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-auto border rounded-lg">
              <table className="min-w-full table-fixed">
                <thead className="bg-slate-900 text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left w-56">Category</th>
                    <th className="px-4 py-3 text-left">Item Name</th>
                    <th className="px-4 py-3 text-center w-28">Quantity</th>
                  </tr>
                </thead>

                <tbody className="text-white bg-blue-950">
                  {renderMainTable()}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <div>
                Showing <strong>{grouped.length}</strong> categories
              </div>
              <div className="flex gap-4">
                <div>
                  Total stock: <strong>{totalStock}</strong>
                </div>
              </div>
            </div>
          </>
        ) : selectedInvoice ? (
          renderAccessoriesPage()
        ) : (
          renderToolDetails()
        )}
      </div>
    </DashboardLayout>
  );
};

export default ToolsSummary;