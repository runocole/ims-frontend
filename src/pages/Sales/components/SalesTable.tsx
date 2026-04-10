import { useState } from "react";
import { 
  Edit, Package, FileText, UserSearch, Calendar as CalendarIcon, 
  X, AlertTriangle, ChevronLeft, ChevronRight, FileEdit, Play, Trash2
} from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { TooltipProvider } from "../../../components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../../components/ui/dialog";
import type { Sale, Tool } from "../types";

interface SalesTableProps {
  sales: Sale[];
  tools: Tool[];
  loading: boolean;
  staffList?: any[]; 
  onEditStatus: (sale: Sale) => void;
  onViewSerials: (tool: Tool) => void; 
  onMarkOverdue?: (sale: Sale) => void;
  onResumeDraft?: (sale: Sale) => void;
  onDeleteDraft?: (sale: Sale) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  filterStartDate: string;
  filterEndDate: string;
  onDateChange: (start: string, end: string) => void;
  showDrafts: boolean;
  onDraftFilterChange: (show: boolean) => void;
}

const SalesTable = ({ 
  sales, 
  loading, 
  onEditStatus,
  onMarkOverdue,
  onResumeDraft,
  onDeleteDraft,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  filterStartDate,
  filterEndDate,
  onDateChange,
  showDrafts,
  onDraftFilterChange,
}: SalesTableProps) => {
  const navigate = useNavigate();

  // ── Delete confirmation dialog state ──
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  console.log("TABLE DEBUG:", { rawSales: sales, count: safeSales.length, showingDrafts: showDrafts });

  const handleDeleteClick = (sale: Sale) => {
    setDeleteTarget(sale);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget && onDeleteDraft) {
      onDeleteDraft(deleteTarget);
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteCancel = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <>
      <Card className="bg-blue-950 border-slate-700 flex flex-col h-full">
        <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Sales Overview
            {showDrafts && (
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-orange-600/20 text-orange-400 border border-orange-600/40">
                Drafts only
              </span>
            )}
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date range filter */}
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

            {/* Drafts toggle */}
            <button
              onClick={() => onDraftFilterChange(!showDrafts)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                showDrafts
                  ? "bg-orange-600 border-orange-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-orange-500 hover:text-orange-400"
              }`}
              title={showDrafts ? "Exit draft view" : "View saved drafts"}
            >
              <FileEdit className="h-3.5 w-3.5" />
              {showDrafts ? "Exit Drafts" : "Drafts"}
            </button>
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
                          <td colSpan={8} className="text-center p-8 text-gray-400">
                            {showDrafts
                              ? "No drafts found. Drafts are created when you save or cancel a sale mid-way."
                              : "No records found."}
                          </td>
                        </tr>
                      ) : (
                        safeSales.map((sale) => {
                          const isDraft = (sale.payment_status || "").toLowerCase() === "pending";
                          const manualIsOverdue = sale.due_date && 
                            sale.due_date < todayStr && 
                            !['completed', 'paid', 'fully-paid'].includes(sale.payment_status?.toLowerCase() || "");
                          const isOverdue = sale.is_overdue || manualIsOverdue;
                          const currentStatus = isOverdue ? "overdue" : (sale.payment_status || "pending");
                          const needsStatusSync = isOverdue && sale.payment_status !== 'overdue';

                          return (
                            <tr
                              key={sale.id}
                              className={`border-b border-slate-700 hover:bg-slate-800/50 text-gray-300 ${
                                isDraft ? "border-l-2 border-l-orange-500/60" : ""
                              }`}
                            >
                              <td className="p-3 whitespace-nowrap">
                                {sale.date_sold || "N/A"}
                                {isDraft && (
                                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-400 border border-orange-600/30 font-bold uppercase tracking-wide">
                                    Draft
                                  </span>
                                )}
                              </td>
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
                              <td className="p-3">
                                {/* The Main Total Cost */}
                                <div className="font-bold text-green-400">
                                  ₦{parseFloat(sale.total_cost || "0").toLocaleString()}
                                </div>
                                
                                {/* Conditional Tax Display */}
                                {sale.tax_amount && parseFloat(sale.tax_amount) > 0 && (
                                  <div className="text-[10px] mt-0.5 leading-tight">
                                    <span className="text-slate-500 block">
                                      Incl. Tax: ₦{parseFloat(sale.tax_amount).toLocaleString()}
                                    </span>
                                    <span className="text-[9px] px-1 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50 uppercase font-medium">
                                      VAT Added
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 w-fit ${getStatusBadgeStyle(currentStatus)}`}>
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

                                  {/* Resume — only on draft rows */}
                                  {isDraft && onResumeDraft && (
                                    <Button 
                                      variant="ghost" size="icon" 
                                      onClick={() => onResumeDraft(sale)} 
                                      className="text-green-400 h-8 w-8 hover:bg-green-900/30"
                                      title="Resume this draft to continue the sale"
                                    >
                                      <Play className="w-4 h-4" />
                                    </Button>
                                  )}

                                  {/* Delete — only on draft rows */}
                                  {isDraft && onDeleteDraft && (
                                    <Button 
                                      variant="ghost" size="icon" 
                                      onClick={() => handleDeleteClick(sale)} 
                                      className="text-red-400 h-8 w-8 hover:bg-red-900/30"
                                      title="Delete draft and return items to inventory"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}

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

              {/* Pagination */}
              {safeSales.length > 0 && totalPages > 1 && (
                <div className="mt-auto flex flex-col sm:flex-row items-center justify-between border-t border-slate-700 pt-4 px-2 gap-4">
                  <div className="text-sm text-gray-400">
                    Showing Page <span className="font-medium text-white">{currentPage}</span> of{" "}
                    <span className="font-medium text-white">{totalPages}</span> 
                    <span className="ml-1">({totalItems} total records)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => onPageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => onPageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Custom Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md bg-blue-950 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-900/30 border border-red-700/50">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              Delete Draft
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              Are you sure you want to delete this draft? All assigned items will be
              returned to inventory and this action cannot be undone.
            </p>

            {deleteTarget && (
              <div className="rounded-lg bg-slate-800 border border-slate-700 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer</span>
                  <span className="text-white font-medium">{deleteTarget.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice</span>
                  <span className="text-blue-300 font-mono text-xs">
                    {deleteTarget.invoice_number || "PENDING"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Items</span>
                  <span className="text-white">
                    {deleteTarget.items?.length ?? 0} item{(deleteTarget.items?.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total</span>
                  <span className="text-green-400 font-semibold">
                    ₦{parseFloat(deleteTarget.total_cost || "0").toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-orange-900/20 border border-orange-700/40 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-orange-300 text-xs leading-relaxed">
                Assigned serial numbers will be released back to available inventory stock.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-700 hover:bg-red-600 text-white gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { SalesTable };
