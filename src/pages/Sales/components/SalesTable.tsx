import { Edit, Package, FileText, UserSearch, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react"; 
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
  // --- Server-Side Control Props ---
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  filterStartDate: string;
  filterEndDate: string;
  onDateChange: (start: string, end: string) => void;
}

const SalesTable = ({ 
  sales, 
  loading, 
  onEditStatus,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  filterStartDate,
  filterEndDate,
  onDateChange
}: SalesTableProps) => {
  const navigate = useNavigate();

  const handleViewInvoice = (sale: Sale) => {
    localStorage.setItem("currentInvoice", JSON.stringify(sale));
    navigate(`/invoice/${sale.invoice_number || sale.id}`);
  };

  const getBadgeStyle = (type?: string) => {
    if (!type) return "bg-slate-700/50 text-slate-300 border-slate-600";
    const t = type.toLowerCase();
    if (t.includes("base") && t.includes("rover")) return "bg-purple-900/50 text-purple-400 border-purple-800";
    if (t.includes("base")) return "bg-blue-900/50 text-blue-400 border-blue-800";
    if (t.includes("rover")) return "bg-teal-900/50 text-teal-400 border-teal-800";
    if (t.includes("accessory") || t.includes("accessories")) return "bg-slate-700/50 text-slate-300 border-slate-600";
    return "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
  };

  const getStatusBadgeStyle = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "bg-emerald-900/50 text-emerald-400 border-emerald-800";
    if (s === "ongoing") return "bg-blue-900/50 text-blue-400 border-blue-800";
    if (s === "pending") return "bg-orange-900/50 text-orange-400 border-orange-800";
    return "bg-slate-700/50 text-slate-300 border-slate-600"; 
  };

  // Calculate standard display range
  const itemsPerPage = 10;
  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <Card className="bg-blue-950 border-slate-700">
      <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Sales Overview
        </CardTitle>

        {/* --- DATE RANGE FILTERS --- */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-md p-1 px-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">From</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => onDateChange(e.target.value, filterEndDate)}
                  className="bg-transparent text-sm text-gray-200 focus:outline-none focus:text-blue-400 transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <span className="text-gray-600">-</span>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">To</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => onDateChange(filterStartDate, e.target.value)}
                  className="bg-transparent text-sm text-gray-200 focus:outline-none focus:text-blue-400 transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
            </div>
          </div>

          {(filterStartDate || filterEndDate) && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDateChange("", "")}
              className="h-9 w-9 text-gray-400 hover:text-white hover:bg-slate-800"
              title="Clear Filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
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
                      {/* --- NEW: Added 'Sold By' to headers --- */}
                      {["Date", "Client", "Sold By", "Invoice #", "Equipment & Type", "Serial Numbers", "Total Cost", "Status", "Actions"].map((col) => (
                        <th key={col} className="p-3 text-white font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center p-8 text-gray-400"> {/* Colspan updated to 9 */}
                          {(filterStartDate || filterEndDate) ? `No sales found for the selected date range.` : "No records yet."}
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors text-gray-300">
                          
                          <td className="p-3 whitespace-nowrap text-gray-400">
                            {sale.date_sold ? new Date(sale.date_sold).toLocaleDateString() : "N/A"}
                          </td>

                          <td className="p-3 text-white font-medium">
                            <div className="flex flex-col">
                              <span className="text-base">{sale.name}</span>
                              <span className="text-xs text-gray-500">{sale.phone}</span>
                            </div>
                          </td>

                          {/* --- NEW: Sold By Column --- */}
                          <td className="p-3 text-gray-300 text-xs">
                            {sale.staff_name ? sale.staff_name : sale.sold_by}
                          </td>

                          <td className="p-3 font-mono text-blue-300 text-xs font-bold">
                            {sale.invoice_number || "PENDING"}
                          </td>
                          
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

                          <td className="p-3">
                            <div className="text-[10px] text-blue-400 bg-blue-900/20 px-2 py-1 rounded inline-block border border-blue-900/50">
                              View in Invoice
                            </div>
                          </td>

                          {/* --- NEW: Added Tax Indicator --- */}
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-green-400">
                                ₦{parseFloat(sale.total_cost || "0").toLocaleString()}
                              </span>
                              {parseFloat(sale.tax_amount || "0") > 0 && (
                                <span className="text-[10px] text-gray-500 font-medium">
                                  (Inc. Tax)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getStatusBadgeStyle(sale.status || sale.payment_status)}`}>
                              {sale.status || sale.payment_status || "PENDING"}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(sale)} className="text-blue-400 hover:bg-blue-900/30" title="View Invoice">
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/sales/${sale.phone}`)} className="text-emerald-400 hover:bg-emerald-900/30" title="Customer Ledger">
                                <UserSearch className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => onEditStatus(sale)} className="text-orange-400 hover:bg-orange-900/30" title="Edit Status">
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

            {/* --- SERVER-SIDE PAGINATION CONTROLS --- */}
            {sales.length > 0 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800">
                <div className="text-xs text-gray-400">
                  Showing <span className="text-white font-medium">{startIndex + 1}</span> to <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="text-white font-medium">{totalItems}</span> entries
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onPageChange(currentPage - 1)} 
                    disabled={currentPage === 1} 
                    className="h-8 border-slate-700 bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <div className="text-xs font-medium text-gray-400 px-2">
                    Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onPageChange(currentPage + 1)} 
                    disabled={currentPage >= totalPages} 
                    className="h-8 border-slate-700 bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
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