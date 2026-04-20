import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom"; 
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { 
  Download, Search, DollarSign, Calendar, FileText, 
  Package, CreditCard, UserSearch, ChevronLeft, ChevronRight,
  X
} from "lucide-react"; 
import { DashboardLayout } from "../components/DashboardLayout";
import "jspdf-autotable";
import axios from "axios";
import { debounce } from "lodash";

// --- Interfaces ---
interface SaleItem {
  tool_id: string;
  equipment: string;
  cost: string;
  category?: string;
}

interface Sale {
  id: number;
  name: string;
  phone: string;
  state: string;
  items: SaleItem[];
  total_cost: string;
  date_sold: string;
  invoice_number?: string;
  payment_plan?: string;
  initial_deposit?: string;
  payment_months?: string;
  payment_status?: string;
  staff_name?: string;
}

const API_URL = "https://inventory.oticgs.com/api";

const AdminSalesPage: React.FC = () => {
  const navigate = useNavigate(); 

  // --- State ---
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── DATE FILTER STATE ─────────────────────────────────────────────────────
  // Same pattern as SalesTable / PaymentTracking — two plain strings,
  // validation happens in handleDateChange before state is committed.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // ─────────────────────────────────────────────────────────────────────────

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Stats State
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
  });

  // --- Search Debouncing ---
  const debouncedSearchHandler = useCallback(
    debounce((value: string) => {
      setDebouncedSearch(value);
      setCurrentPage(1); 
    }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    debouncedSearchHandler(e.target.value);
  };

  // ── DATE CHANGE HANDLER ───────────────────────────────────────────────────
  // Single entry point for both date inputs — same pattern as SalesTable's
  // onDateChange(start, end). If both are set and end < start, end is cleared.
  const handleDateChange = (newStart: string, newEnd: string) => {
    if (newStart && newEnd && newEnd < newStart) {
      setStartDate(newStart);
      setEndDate("");
      setCurrentPage(1);
      return;
    }
    setStartDate(newStart);
    setEndDate(newEnd);
    setCurrentPage(1);
  };
  // ─────────────────────────────────────────────────────────────────────────

  // --- Fetching Logic ---
  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("access") || localStorage.getItem("token");
        
        const params: Record<string, any> = {
          page: currentPage,
          search: debouncedSearch,
          page_size: itemsPerPage,
        };

        // Only send date params when non-empty — same as PaymentTracking
        if (startDate) params.start_date = startDate;
        if (endDate)   params.end_date   = endDate;

        const response = await axios.get(`${API_URL}/sales/`, {
          params,
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = response.data;
        
        setSales(data.results || []);
        setTotalCount(data.count || 0);

        const summary = data.summary || {};

        setStats({
          totalSales: data.count || 0,
          totalRevenue: summary.total_revenue || 0,
          pendingPayments: summary.ongoing_sales || 0,
          completedPayments: summary.completed_sales || 0,
        });

      } catch (error) {
        console.error("Failed to load sales:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [currentPage, debouncedSearch, startDate, endDate]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, startDate, endDate]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // --- Helper Functions ---
  const getStaffName = (sale: Sale): string => {
    if (sale.staff_name && sale.staff_name.trim() !== "") return sale.staff_name;
    return "Sales Team";
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-900/50 text-green-300 border-green-700';
      case 'ongoing': return 'bg-cyan-900/50 text-cyan-300 border-cyan-700'; 
      case 'pending': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'installment': return 'bg-blue-900/50 text-blue-300 border-blue-700';
      default: return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  const formatEquipment = (items: SaleItem[]) => {
    if (!items || items.length === 0) return "-";
    if (items.length === 1) return items[0].equipment;
    return `${items[0].equipment} +${items.length - 1} more`;
  };

  const handleViewInvoice = (sale: Sale) => {
    localStorage.setItem("currentInvoice", JSON.stringify(sale));
    navigate(`/invoice/${sale.invoice_number || sale.id}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Sales Overview</h1>
            <p className="text-gray-400 mt-2">Monitor all sales activities across your team</p>
          </div>
          <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Sales" value={stats.totalSales} icon={<FileText className="text-blue-400" />} />
          <StatCard title="Total Revenue" value={`₦${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="text-green-400" />} />
          <StatCard title="Ongoing Payments" value={stats.pendingPayments} icon={<Calendar className="text-yellow-400" />} />
          <StatCard title="Completed Payments" value={stats.completedPayments} icon={<CreditCard className="text-green-400" />} />
        </div>

        {/* Sales Table Card */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-400" />
                All Sales Records
              </CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search customers, staff, invoice..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* ── DATE FILTER ──────────────────────────────────────────────
                Copied from SalesTable / PaymentTracking pattern:
                - No min/max attributes on inputs
                - Constraint lives in handleDateChange, not the DOM
                - Both inputs call handleDateChange(newVal, otherVal)
                - Clear button calls handleDateChange("", "")              */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-md p-1 px-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">
                      From
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleDateChange(e.target.value, endDate)}
                      className="bg-transparent text-sm text-gray-200 focus:outline-none focus:text-blue-400 transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <span className="text-gray-600">–</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">
                      To
                    </span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleDateChange(startDate, e.target.value)}
                      className="bg-transparent text-sm text-gray-200 focus:outline-none focus:text-blue-400 transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                </div>
              </div>

              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDateChange("", "")}
                  className="h-9 w-9 text-gray-400 hover:text-white hover:bg-slate-800"
                  title="Clear Date Filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {(startDate || endDate) && (
                <span className="text-xs text-blue-400">
                  Filtering by date sold
                  {startDate && endDate ? `: ${startDate} – ${endDate}` : startDate ? ` from ${startDate}` : ` up to ${endDate}`}
                </span>
              )}
            </div>
            {/* ─────────────────────────────────────────────────────────── */}
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800 text-left border-b border-slate-700 whitespace-nowrap text-gray-300 font-semibold">
                    <th className="p-3">Customer</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">State</th>
                    <th className="p-3">Equipment</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Payment Plan</th>
                    <th className="p-3">Initial Deposit</th>
                    <th className="p-3">Payment Months</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date Sold</th>
                    <th className="p-3">Sold By</th>
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className={loading ? "opacity-40" : "opacity-100"}>
                  {Array.isArray(sales) && sales.length > 0 ? (
                    sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-white font-medium">{sale.name || "Unknown"}</td>
                        <td className="p-3 text-gray-300">{sale.phone || "-"}</td>
                        <td className="p-3 text-gray-300">{sale.state || "-"}</td>
                        <td className="p-3 text-gray-300">{formatEquipment(sale.items)}</td>
                        <td className="p-3 text-green-400 font-semibold">
                          ₦{sale.total_cost ? parseFloat(sale.total_cost).toLocaleString() : "0"}
                        </td>
                        <td className="p-3 text-gray-300">{sale.payment_plan || "-"}</td>
                        <td className="p-3">
                          {sale.initial_deposit && parseFloat(sale.initial_deposit) > 0 ? (
                            <div className="text-yellow-400 font-semibold">
                              ₦{parseFloat(sale.initial_deposit).toLocaleString()}
                            </div>
                          ) : "-"}
                        </td>
                        <td className="p-3 text-blue-400 font-semibold">
                          {sale.payment_months ? `${sale.payment_months} months` : "-"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase border font-bold ${getStatusColor(sale.payment_status || '')}`}>
                            {sale.payment_status || "PENDING"}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300">
                          {sale.date_sold ? new Date(sale.date_sold).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-3 text-blue-300">{getStaffName(sale)}</td>
                        <td className="p-3 text-gray-400 font-mono text-xs">{sale.invoice_number || "-"}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewInvoice(sale)}
                              className="text-blue-400 hover:bg-blue-900/30"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/sales/${sale.phone}`)}
                              className="text-emerald-400 hover:bg-emerald-900/30"
                            >
                              <UserSearch className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="text-center py-10 text-gray-400 bg-slate-800/20">
                        {loading ? "Loading records..." : "No sales records found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="text-white">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{" "}
                <span className="text-white">{totalCount}</span> records
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="bg-slate-800 border-slate-700 text-white"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || loading}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="bg-slate-800 border-slate-700 text-white"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Simple StatCard component
const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
  <Card className="bg-slate-900 border-slate-700">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="p-3 bg-slate-800 rounded-lg">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export default AdminSalesPage;