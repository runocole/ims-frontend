import { 
  Edit, Package, FileText, UserSearch, Calendar as CalendarIcon, 
  X, AlertTriangle, ChevronLeft, ChevronRight // ✅ NEW IMPORTS ADDED HERE
} from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { TooltipProvider } from "../../../components/ui/tooltip";
import type { Sale, Tool } from "../types";

interface SalesTableProps {
  sales: Sale[];
  tools: Tool[];
  loading: boolean;
  staffList?: any[]; 
  onEditStatus: (sale: Sale) => void;
  onViewSerials: (tool: Tool) => void; 
  onMarkOverdue?: (sale: Sale) => void; 
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
  onMarkOverdue,
  currentPage,
  totalPages,
  totalItems, // ✅ Ensure this is destructured
  onPageChange,
  filterStartDate,
  filterEndDate,
  onDateChange
}: SalesTableProps) => {
  const navigate = useNavigate();

  // Get current date string for comparison (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];

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
    return "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
  };

  const getStatusBadgeStyle = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "bg-emerald-900/50 text-emerald-400 border-emerald-800";
    if (s === "ongoing") return "bg-blue-900/50 text-blue-400 border-blue-800";
    if (s === "pending") return "bg-orange-900/50 text-orange-400 border-orange-800";
    if (s === "overdue") return "bg-red-900/60 text-red-400 border-red-500 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.3)]";
    return "bg-slate-700/50 text-slate-300 border-slate-600"; 
  };

  const safeSales = Array.isArray(sales) ? sales : [];

  return (
    <Card className="bg-blue-950 border-slate-700 flex flex-col h-full">
      <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Sales Overview
        </CardTitle>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-md p-1 px-2">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <div className="flex items-center gap-2">
               <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => onDateChange(e.target.value, filterEndDate)}
                  className="bg-transparent text-sm text-gray-200 focus:outline-none [&::-webkit-calendar-picker-indicator]:invert"
                />
              <span className="text-gray-600">-</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => onDateChange(filterStartDate, e.target.value)}
                  className="bg-transparent text-sm text-gray-200 focus:outline-none [&::-webkit-calendar-picker-indicator]:invert"
                />
            </div>
          </div>
          {(filterStartDate || filterEndDate) && (
            <Button variant="ghost" size="icon" onClick={() => onDateChange("", "")} className="text-gray-400">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {loading ? (
          <p className="text-gray-400 text-center py-4">Loading data...</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <TooltipProvider>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b border-slate-700 bg-slate-800">
                      {["Date", "Client", "Invoice #", "Sold By", "Equipment", "Cost", "Status", "Actions"].map((col) => (
                        <th key={col} className="p-3 text-white font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {safeSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-gray-400">No records found.</td>
                      </tr>
                    ) : (
                      safeSales.map((sale) => {
                        const manualIsOverdue = sale.due_date && 
                                               sale.due_date < todayStr && 
                                               !['completed', 'paid', 'fully-paid'].includes(sale.payment_status?.toLowerCase() || "");
                        
                        const isOverdue = sale.is_overdue || manualIsOverdue;
                        const currentStatus = isOverdue ? "overdue" : (sale.payment_status || "pending");
                        const needsStatusSync = isOverdue && sale.payment_status !== 'overdue';

                        return (
                          <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-800/50 text-gray-300">
                            <td className="p-3 whitespace-nowrap">{sale.date_sold || "N/A"}</td>
                            <td className="p-3">
                              <div className="font-medium text-white">{sale.name}</div>
                              <div className="text-xs text-gray-500">{sale.phone}</div>
                            </td>
                            <td className="p-3 font-mono text-blue-300">{sale.invoice_number || "PENDING"}</td>
                            <td className="p-3">
                              <span className="text-xs text-gray-400 italic">
                                  {sale.staff || "System"}
                              </span>
                            </td>
                            <td className="p-3">
                              {(() => {
                                // Group items by equipment name + type
                                const grouped = (sale.items || []).reduce((acc: Record<string, {
                                  equipment: string;
                                  equipment_type: string;
                                  count: number;
                                }>, item) => {
                                  const key = `${item.equipment}__${item.equipment_type || ""}`;
                                  if (acc[key]) {
                                    acc[key].count += 1;
                                  } else {
                                    acc[key] = {
                                      equipment: item.equipment,
                                      equipment_type: item.equipment_type || "",
                                      count: 1,
                                    };
                                  }
                                  return acc;
                                }, {});

                                return Object.values(grouped).map((group, idx) => (
                                  <div key={idx} className="mb-1">
                                    <span className="text-xs block text-white">
                                      {group.equipment}
                                      {group.count > 1 && (
                                        <span className="ml-1.5 px-1.5 py-0.5 bg-blue-700/50 text-blue-300 rounded text-[9px] font-bold">
                                          ×{group.count}
                                        </span>
                                      )}
                                    </span>
                                    {group.equipment_type && (
                                      <span className={`text-[9px] px-1 rounded border ${getBadgeStyle(group.equipment_type)}`}>
                                        {group.equipment_type}
                                      </span>
                                    )}
                                  </div>
                                ));
                              })()}
                            </td>
                            <td className="p-3 font-bold text-green-400">
                              ₦{parseFloat(sale.total_cost || "0").toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span 
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 w-fit ${getStatusBadgeStyle(currentStatus)}`}
                              >
                                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                                {currentStatus.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 items-center">
                                <Button 
                                  variant="ghost" size="icon" 
                                  onClick={() => handleViewInvoice(sale)} 
                                  className="text-blue-400 h-8 w-8 hover:bg-blue-900/30"
                                  title="View Invoice"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>

                                <Button 
                                  variant="ghost" size="icon" 
                                  onClick={() => navigate(`/sales/${sale.phone}`)} 
                                  className="text-emerald-400 h-8 w-8 hover:bg-emerald-900/30"
                                  title="Customer Profile"
                                >
                                  <UserSearch className="w-4 h-4" />
                                </Button>

                                <Button 
                                  variant="ghost" size="icon" 
                                  onClick={() => onEditStatus(sale)} 
                                  className="text-orange-400 h-8 w-8 hover:bg-orange-900/30"
                                  title="Edit Status"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>

                                {needsStatusSync && onMarkOverdue && (
                                  <Button 
                                    variant="ghost" size="icon" 
                                    onClick={() => onMarkOverdue(sale)} 
                                    className="text-red-400 h-8 w-8 hover:bg-red-900/30 animate-pulse"
                                    title="Mark as Overdue in Database"
                                  >
                                    <AlertTriangle className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </TooltipProvider>
            </div>

            {/* ✅ NEW: PAGINATION FOOTER */}
            {safeSales.length > 0 && totalPages > 1 && (
              <div className="mt-auto flex flex-col sm:flex-row items-center justify-between border-t border-slate-700 pt-4 px-2 gap-4">
                <div className="text-sm text-gray-400">
                  Showing Page <span className="font-medium text-white">{currentPage}</span> of{" "}
                  <span className="font-medium text-white">{totalPages}</span> 
                  <span className="ml-1">({totalItems} total records)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { SalesTable };