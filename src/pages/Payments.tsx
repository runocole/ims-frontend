import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  TrendingUp, Clock, AlertTriangle, Search, Download,
  Loader2, RefreshCcw, ChevronLeft, ChevronRight, Wallet, 
  UserSearch, FileText, Calendar as CalendarIcon, X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "../components/ui/use-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL = "https://inventory.oticgs.com/api";

const authHeader = () => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentSummary {
  total_revenue: number;
  receivables: number; 
  pending_amount: number;
  pending_count: number;
  overdue_amount: number;
  overdue_count: number;
  total_sales: number;
}

interface PaymentItem {
  equipment?: string;
  equipment_type?: string;
  quantity?: number; // ADDED: Quantity property for grouped items
  [key: string]: any;
}

interface PaymentRow {
  payment_id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  equipment?: any; 
  items?: any;   
  amount: string;
  date: string;
  payment_plan: string;
  status: string;
  payment_status: string;
  state: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const getStatusBadgeStyle = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "bg-emerald-900/50 text-emerald-400 border-emerald-800";
  if (s === "ongoing") return "bg-blue-900/50 text-blue-400 border-blue-800";
  if (s === "pending") return "bg-orange-900/50 text-orange-400 border-orange-800";
  if (s === "installment") return "bg-indigo-900/50 text-indigo-400 border-indigo-800";
  if (s === "failed") return "bg-red-900/50 text-red-400 border-red-800";
  if (s === "overdue") return "bg-rose-900/50 text-rose-400 border-rose-800";
  return "bg-slate-700/50 text-slate-300 border-slate-600"; 
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

const parseItems = (data: any): PaymentItem[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    if (data.trim() === "[]" || data.trim() === "") return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return data.split(/,|\n|\||\band\b|&|\+/i).map(i => {
        const text = i.trim();
        if (!text) return null;
        let guessedType = "Accessory";
        const lowerText = text.toLowerCase();
        if (lowerText.includes("base") && lowerText.includes("rover")) guessedType = "Base & Rover";
        else if (lowerText.includes("base")) guessedType = "Base";
        else if (lowerText.includes("rover")) guessedType = "Rover";
        else if (lowerText.includes("receiver") || lowerText.includes("t20")) guessedType = "Receiver";
        return { equipment: text, equipment_type: guessedType };
      }).filter(Boolean) as PaymentItem[];
    }
  }
  return [];
};

const getItemsForPayment = (row: PaymentRow): PaymentItem[] => {
  let items = parseItems(row.items);
  if (items.length === 0) items = parseItems(row.equipment);
  
  // ADDED: Group identical items together to create a quantity badge
  const groupedMap = items.reduce((acc, item) => {
    const key = `${(item.equipment || "").toLowerCase().trim()}_${(item.equipment_type || "").toLowerCase().trim()}`;
    if (!acc[key]) {
      acc[key] = { ...item, quantity: 1 };
    } else {
      acc[key].quantity = (acc[key].quantity || 1) + 1;
    }
    return acc;
  }, {} as Record<string, PaymentItem>);
  
  return Object.values(groupedMap);
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PaymentTracking = () => {
  const navigate = useNavigate(); 
  
  // Data States
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination States (Driven by Backend)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const isAdmin = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").role === "admin";
  } catch {
    return false;
  }
})();

const [showRevenue, setShowRevenue] = useState(false);


  const itemsPerPage = 10;

  // ── THE FIX: Fetching Data via Backend Parameters ──
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/payments/summary/`, {
        headers: authHeader(),
        params: {
          page: currentPage,
          search: search,
          status: statusFilter,
          start_date: startDate,
          end_date: endDate
        }
      });
      
      setSummary(res.data.summary);
      setPayments(res.data.payments);
      
      // Update pagination using the server's exact numbers
      setTotalPages(res.data.total_pages || 1);
      setTotalItems(res.data.total_items || 0);
      
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to load payment data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 whenever ANY filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, startDate, endDate]);

  // Debounce the fetching so it doesn't spam the server while typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, search, statusFilter, startDate, endDate]);

  // Exports currently viewed page
  const exportCSV = () => {
    const headers = ["Invoice", "Customer", "Phone", "Equipment Details", "Amount", "Date", "Plan", "Status", "State"];
    const rows = payments.map((p) => {
      const itemsText = getItemsForPayment(p)
        .map(i => {
          // ADDED: Include quantity in the CSV text output if > 1
          const qtyText = i.quantity && i.quantity > 1 ? ` x${i.quantity}` : "";
          return `${i.equipment || "N/A"}${qtyText} (${i.equipment_type || "N/A"})`;
        })
        .join(" | ");

      return [
        p.invoice_number, p.customer_name, p.customer_phone, itemsText,
        p.amount, p.date, p.payment_plan, p.payment_status, p.state,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_page_${currentPage}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Payment Tracking</h2>
            <p className="text-muted-foreground">Monitor all sales and payment statuses</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              className="gap-2 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={exportCSV}
              className="gap-2 border-teal-700 bg-teal-950/30 text-teal-300 hover:bg-teal-800 hover:text-white"
            >
              <Download className="h-4 w-4" />
              Export Page CSV
            </Button>
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────── */}
        {loading && !summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-blue-900/50 bg-blue-950/40 p-6 animate-pulse h-28" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Revenue */}
            <Card className="border-blue-900/50 bg-blue-950">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Total Revenue</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold text-white">
                        {isAdmin && showRevenue
                          ? formatNaira(summary.total_revenue)
                          : "₦ ••••••"}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => setShowRevenue(!showRevenue)}
                          className="text-blue-400 hover:text-white transition-colors"
                          title={showRevenue ? "Hide revenue" : "Show revenue"}
                        >
                          {showRevenue ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-blue-500 mt-1">
                      {summary.total_sales} total sales
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-900/30 p-2.5">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Collections (New Logic) */}
            <Card className="border-emerald-900/50 bg-slate-900/40">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-emerald-400 font-medium">Total Collections</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {/* Logic: Revenue - Receivables = Cash actually received */}
                      {summary ? formatNaira((summary.total_revenue || 0) - (summary.receivables || 0)) : "₦0"}
                    </p>
                    <p className="text-xs text-emerald-500 mt-1">
                      Actual cash received
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-900/30 p-2.5">
                    <Wallet className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Receivables */}
            <Card className="border-blue-900/50 bg-blue-950">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Total Receivables</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {formatNaira(summary.receivables)}
                    </p>
                    <p className="text-xs text-indigo-400 mt-1">
                      Outstanding balance
                    </p>
                  </div>
                  <div className="rounded-lg bg-indigo-900/30 p-2.5">
                    <Clock className="h-5 w-5 text-indigo-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overdue Amount */}
            <Card className="border-blue-900/50 bg-blue-950">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Overdue Amount</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {formatNaira(summary.overdue_amount)}
                    </p>
                    <p className="text-xs text-red-400 mt-1">
                      {summary.overdue_count} {summary.overdue_count === 1 ? "customer" : "customers"} overdue
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-900/30 p-2.5">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, invoice, or equipment…"
                className="pl-10 bg-slate-900 border-slate-700 text-white w-full focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* ADDED 'overdue' TO THIS ARRAY */}
              {["all", "completed", "ongoing", "pending", "installment", "overdue", "failed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition ${
                    statusFilter === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-900 border border-slate-700 text-blue-400 hover:border-blue-600 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ── Sleek Date Range Filter (Ported from SalesTable) ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-md p-1 px-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-sm text-gray-200 focus:outline-none focus:text-blue-400 transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <span className="text-gray-600">-</span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-sm text-gray-200 focus:outline-none focus:text-blue-400 transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
              </div>
            </div>

            {(startDate || endDate) && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="h-9 w-9 text-gray-400 hover:text-white hover:bg-slate-800"
                title="Clear Filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

        </div>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <Card className="border-slate-700 bg-blue-950">
          <CardContent className="p-0">
            {/* If it's loading AND we have zero payments, show loader overlay */}
            {loading && payments.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-blue-400 gap-3">
                <Loader2 className="h-7 w-7 animate-spin" />
                Fetching secure data…
              </div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                <TrendingUp className="h-10 w-10 text-slate-600" />
                <p>No payments found{search ? ` for your current filters` : ""}.</p>
              </div>
            ) : (
              <div className="flex flex-col relative">
                {/* Subtle loading overlay when fetching next page/search */}
                {loading && (
                  <div className="absolute inset-0 bg-blue-950/50 z-10 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table className="w-full text-sm border-collapse">
                    <TableHeader className="bg-slate-800 border-b border-slate-700">
                      <TableRow className="hover:bg-transparent border-slate-700">
                        {["Invoice", "Customer", "Equipment & Type", "Amount", "Date", "Plan", "Status", "State"].map((col) => (
                          <TableHead key={col} className="p-3 text-white font-medium whitespace-nowrap">
                            {col}
                          </TableHead>
                        ))}
                        <TableHead className="p-3 text-white font-medium whitespace-nowrap text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
  {/* Safety Check: Only map if payments is actually an array */}
  {Array.isArray(payments) ? (
    payments.map((row, idx) => {
      const itemsList = getItemsForPayment(row);

      return (
        <TableRow
          key={`${row.invoice_number}-${idx}`}
          className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors text-gray-300"
        >
          <TableCell className="p-3 font-mono text-blue-300 text-xs font-bold whitespace-nowrap">
            {row.invoice_number}
          </TableCell>

          <TableCell className="p-3 text-white font-medium">
            <div className="flex flex-col">
              <span className="text-sm">{row.customer_name}</span>
              <span className="text-xs text-gray-500 whitespace-nowrap">{row.customer_phone}</span>
            </div>
          </TableCell>

          <TableCell className="p-3 min-w-[200px]">
            {itemsList.length > 0 ? (
              itemsList.map((item, i) => (
                <div key={i} className="flex flex-col mb-3 last:mb-0 border-l-2 border-slate-700 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-semibold">
                      {item.equipment || "Unnamed Equipment"}
                    </span>
                    {item.quantity && item.quantity > 1 && (
                      <span className="bg-slate-700 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-600">
                        x{item.quantity}
                      </span>
                    )}
                  </div>
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
          </TableCell>

          <TableCell className="p-3 font-bold text-green-400 whitespace-nowrap">
            {/* Added a safety check for row.amount as well */}
            {row.amount ? formatNaira(parseFloat(row.amount)) : "₦0.00"}
          </TableCell>

          <TableCell className="p-3 text-sm text-blue-300 whitespace-nowrap">
            {row.date}
          </TableCell>

          <TableCell className="p-3 text-xs text-blue-400 whitespace-nowrap">
            {row.payment_plan || "Full Payment"}
          </TableCell>

          <TableCell className="p-3">
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getStatusBadgeStyle(row.payment_status)}`}>
              {row.payment_status || "PENDING"}
            </span>
          </TableCell>

          <TableCell className="p-3 text-xs text-slate-400 whitespace-nowrap">
            {row.state}
          </TableCell>

          <TableCell className="p-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(`/invoice/${row.invoice_number}`)} 
                className="text-blue-400 hover:bg-blue-900/30" 
                title="View Invoice Card"
              >
                <FileText className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(`/sales/${row.customer_phone}`)} 
                className="text-emerald-400 hover:bg-emerald-900/30" 
                title="Filter Customer on Sales Page"
              >
                <UserSearch className="w-4 h-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    })
  ) : (
    // Fallback if 'payments' is not an array
    <TableRow>
      <TableCell colSpan={9} className="h-24 text-center text-red-400 bg-red-900/10">
        <div className="flex flex-col items-center gap-2">
          <span>Data format error: Payments is not a list.</span>
          <span className="text-[10px] text-gray-500">Check the server response in Network tab.</span>
        </div>
      </TableCell>
    </TableRow>
  )}
</TableBody>
                  </Table>
                </div>

                {/* Server-Side Pagination Controls */}
                {totalItems > 0 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t border-slate-700 bg-slate-900">
                    <div className="text-xs text-gray-400">
                      Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-white font-medium">{totalItems}</span> entries
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || loading}
                        className="h-8 border-slate-700 bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Prev
                      </Button>
                      
                      <div className="text-xs font-medium text-gray-400 px-2">
                        Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || loading}
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
      </div>
    </DashboardLayout>
  );
};

export default PaymentTracking;