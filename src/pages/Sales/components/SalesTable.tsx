import { useState } from "react"; // <-- ADDED useState
import { Edit, Package, FileText, UserSearch, ChevronLeft, ChevronRight } from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { TooltipProvider } from "../../../components/ui/tooltip";
import type { Sale, SaleItem, Tool } from "../types";

interface SalesTableProps {
  sales: Sale[];
  tools: Tool[];
  loading: boolean;
  onEditStatus: (sale: Sale) => void;
  onViewSerials: (tool: Tool) => void;
}

const SalesTable = ({ sales, loading, onEditStatus }: SalesTableProps) => {
  const navigate = useNavigate();

  // --- NEW: PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleViewInvoice = (sale: Sale) => {
    localStorage.setItem("currentInvoice", JSON.stringify(sale));
    navigate(`/invoice/${sale.invoice_number || sale.id}`);
  };

  // Helper function to color-code the equipment type badge
  const getBadgeStyle = (type?: string) => {
    if (!type) return "bg-slate-700/50 text-slate-300 border-slate-600";
    
    const t = type.toLowerCase();
    if (t.includes("base") && t.includes("rover")) {
      return "bg-purple-900/50 text-purple-400 border-purple-800";
    }
    if (t.includes("base")) {
      return "bg-blue-900/50 text-blue-400 border-blue-800";
    }
    if (t.includes("rover")) {
      return "bg-teal-900/50 text-teal-400 border-teal-800";
    }
    if (t.includes("accessory") || t.includes("accessories")) {
      return "bg-slate-700/50 text-slate-300 border-slate-600";
    }
    return "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
  };

  // Helper function to color-code the Payment Status badge
  const getStatusBadgeStyle = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") {
      return "bg-emerald-900/50 text-emerald-400 border-emerald-800";
    }
    if (s === "ongoing") {
      return "bg-blue-900/50 text-blue-400 border-blue-800";
    }
    if (s === "pending") {
      return "bg-orange-900/50 text-orange-400 border-orange-800";
    }
    // Fallback just in case
    return "bg-slate-700/50 text-slate-300 border-slate-600"; 
  };

  // --- NEW: SORTING & PAGINATION LOGIC ---
  // 1. Sort sales descending by ID so the newest (last added) is always at the top
  const sortedSales = [...sales].sort((a, b) => Number(b.id) - Number(a.id));

  // 2. Calculate pagination details
  const totalPages = Math.ceil(sortedSales.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages); // Prevents out-of-bounds page
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  
  // 3. Extract the 10 items for the current page
  const currentSales = sortedSales.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Card className="bg-blue-950 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Sales Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-gray-400 text-center py-4">Loading...</p>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <TooltipProvider>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b border-slate-700 bg-slate-800">
                      {["Client", "Invoice #", "Equipment & Type", "Serial Numbers", "Total Cost", "Status", "Actions"].map((col) => (
                        <th key={col} className="p-3 text-white font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-gray-400">No records yet.</td>
                      </tr>
                    ) : (
                      currentSales.map((sale) => (
                        <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors text-gray-300">
                          
                          {/* 1. Client Name + Phone */}
                          <td className="p-3 text-white font-medium">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{sale.name}</span>
                              </div>
                              <div className="text-xs text-gray-500">{sale.phone}</div>
                            </div>
                          </td>

                          {/* 2. Dedicated Invoice Column */}
                          <td className="p-3 font-mono text-blue-300 text-xs font-bold">
                            {sale.invoice_number || "PENDING"}
                          </td>
                          
                          {/* 3. Equipment & Type */}
                          <td className="p-3">
                            {sale.items && sale.items.length > 0 ? (
                              sale.items.map((item: SaleItem, idx: number) => (
                                <div key={idx} className="flex flex-col mb-3 last:mb-0 border-l-2 border-slate-700 pl-3">
                                  <span className="text-white text-sm font-semibold mb-1">
                                    {item.equipment || "Unnamed Equipment"}
                                  </span>
                                  <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getBadgeStyle(item.equipment_type)}`}>
                                    {item.equipment_type || "Accessory"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-amber-900/30 text-amber-500 border-amber-800/50">
                                No Items Found
                              </span>
                            )}
                          </td>

                          {/* 4. Serial Info Placeholder */}
                          <td className="p-3">
                            <div className="text-[10px] text-blue-400 bg-blue-900/20 px-2 py-1 rounded inline-block border border-blue-900/50">
                              View in Invoice
                            </div>
                          </td>

                          {/* 5. Total Cost */}
                          <td className="p-3 font-bold text-green-400">
                            ₦{parseFloat(sale.total_cost || "0").toLocaleString()}
                          </td>

                          {/* 6. Payment Status */}
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getStatusBadgeStyle(sale.status || sale.payment_status)}`}>
                              {sale.status || sale.payment_status || "PENDING"}
                            </span>
                          </td>

                          {/* 7. Actions */}
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleViewInvoice(sale)} 
                                className="text-blue-400 hover:bg-blue-900/30"
                                title="View Invoice"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => navigate(`/sales/${sale.phone}`)} 
                                className="text-emerald-400 hover:bg-emerald-900/30"
                                title="Customer Ledger"
                              >
                                <UserSearch className="w-4 h-4" />
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onEditStatus(sale)} 
                                className="text-orange-400 hover:bg-orange-900/30"
                                title="Edit Status"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </TooltipProvider>
            </div>

            {/* --- NEW: PAGINATION CONTROLS --- */}
            {sortedSales.length > 0 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800">
                <div className="text-xs text-gray-400">
                  Showing <span className="text-white font-medium">{startIndex + 1}</span> to <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, sortedSales.length)}</span> of <span className="text-white font-medium">{sortedSales.length}</span> entries
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="h-8 border-slate-700 bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Prev
                  </Button>
                  
                  <div className="text-xs font-medium text-gray-400 px-2">
                    Page <span className="text-white">{safeCurrentPage}</span> of <span className="text-white">{totalPages}</span>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={safeCurrentPage === totalPages}
                    className="h-8 border-slate-700 bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { SalesTable };