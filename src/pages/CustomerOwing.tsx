import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { StatsCard } from "../components/StatsCard";
import {
  DollarSign, TrendingUp, Clock, AlertCircle,
  Users, Send, ArrowLeft, RefreshCw,
  ChevronLeft, ChevronRight, Eye, EyeOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { fetchCustomerOwingData } from "../services/api";
import axios from "axios";
import { toast } from "react-hot-toast";

const API_URL = "http://localhost:8000/api";
const CUSTOMERS_PER_PAGE = 10;

// ------------------------------
// TYPES
// ------------------------------
interface CustomerOwingData {
  summary: {
    totalSellingPrice: number;
    totalAmountReceived: number;
    totalAmountLeft: number;
    upcomingReceivables: number;
    overdueCustomers: number;
    totalCustomers: number;
  };
  customers: Customer[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSellingPrice: number;
  amountPaid: number;
  amountLeft: number;
  dateLastPaid: string;
  dateNextInstallment: string;
  status: "ongoing" | "overdue" | "fully-paid"; // <--- CHANGE THIS LINE
  progress: number;
}

// ------------------------------
// HELPERS
// ------------------------------
const formatCurrency = (amount: number) =>
  `₦${(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (dateString: string) => {
  if (!dateString || dateString === "-") return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-NG");
  } catch {
    return "-";
  }
};

// ------------------------------
// STATUS HELPERS
// on-track and due-soon both display as "Ongoing" (blue)
// overdue displays as "Overdue" (red)
// fully-paid never appears on this page
// ------------------------------
const getStatusLabel = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  if (s === "overdue") return "Overdue";
  return "Ongoing"; // on-track, due-soon, anything else = Ongoing
};

const getStatusBadgeClass = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  if (s === "overdue")
    return "bg-red-900/60 text-red-400 border border-red-500";
  return "bg-blue-900/50 text-blue-400 border border-blue-800"; // Ongoing
};

const getProgressColor = (progress: number) => {
  if (progress >= 100) return "bg-emerald-500";
  if (progress >= 60)  return "bg-blue-500";
  if (progress >= 30)  return "bg-yellow-500";
  return "bg-red-500";
};

// ------------------------------
// COMPONENT
// ------------------------------
const CustomerOwingPage = () => {
  const navigate = useNavigate();
  const [customerData, setCustomerData] = useState<CustomerOwingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const hasSyncedRef = useRef(false);

  const isAdmin = (() => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").role === "admin";
  } catch { return false; }
})();
const [showRevenue, setShowRevenue] = useState(false);

  // ------------------------------
  // SYNC
  // ------------------------------
  const syncFinancials = useCallback(async () => {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    await axios.post(
      `${API_URL}/customers/sync-financials/`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }, []);

  // ------------------------------
  // LOAD DATA — instant, no sync blocking
  // ------------------------------
  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const res = await fetchCustomerOwingData();
      setCustomerData(res);
    } catch (err) {
      console.error("Error fetching customer data:", err);
      if (showLoader) toast.error("Failed to load customer data.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // ------------------------------
  // BACKGROUND SYNC — after data is shown, silent refresh
  // ------------------------------
  const runBackgroundSync = useCallback(async () => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    try {
      setBackgroundSyncing(true);
      await syncFinancials();
      await loadData(false);
    } catch (err) {
      console.warn("Background sync:", err);
    } finally {
      setBackgroundSyncing(false);
    }
  }, [syncFinancials, loadData]);

  useEffect(() => {
    loadData(true).then(() => {
      runBackgroundSync();
    });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // ------------------------------
  // MANUAL SYNC
  // ------------------------------
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncFinancials();
      await loadData(false);
      toast.success("Customer financials synced successfully.");
    } catch {
      toast.error("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  // ------------------------------
  // RECORD PAYMENT
  // ------------------------------
  const handleRecordPayment = (customer: Customer) => {
    if (customer.phone) {
      navigate(`/sales/${customer.phone}`);
    } else {
      toast.error("No phone number found for this customer.");
    }
  };

  const handleSendReminder = (customerId: string) => {
    console.log("Sending reminder to customer:", customerId);
  };

  // ------------------------------
  // FILTER + SEARCH
  // Filter "ongoing" maps to both on-track and due-soon DB values
  // ------------------------------
  const filteredCustomers = customerData?.customers?.filter((customer) => {
    let matchesFilter = false;
    if (filter === "all") {
      matchesFilter = true;
    } else if (filter === "ongoing") {
      // Look directly for the new "ongoing" status from the backend
      matchesFilter = customer.status === "ongoing"; 
    } else {
      matchesFilter = customer.status === filter;
    }

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      (customer.name  || "").toLowerCase().includes(query) ||
      (customer.email || "").toLowerCase().includes(query) ||
      (customer.phone || "").includes(query);

    return matchesFilter && matchesSearch;
  }) ?? [];

  // ------------------------------
  // PAGINATION
  // ------------------------------
  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * CUSTOMERS_PER_PAGE,
    currentPage * CUSTOMERS_PER_PAGE
  );
  const startItem = filteredCustomers.length === 0
    ? 0
    : (currentPage - 1) * CUSTOMERS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * CUSTOMERS_PER_PAGE, filteredCustomers.length);

  // ------------------------------
  // LOADING
  // ------------------------------
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-64 gap-3 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
          <p>Loading customer data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-5xl font-bold tracking-tight text-blue-100 font-serif">
              Customer Installment Payment
            </h3>
            <p className="text-gray-400 mt-2">
              Monitor customer payments, track installments, and manage receivables.
            </p>
            {backgroundSyncing && (
              <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Updating financials in background...
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleManualSync}
              disabled={syncing || backgroundSyncing}
              className="bg-blue-900 border-blue-700 text-white hover:bg-blue-800 transition"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Data"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="bg-blue-900 border-blue-700 text-white hover:bg-blue-800 transition"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Revenue"
            value={isAdmin && showRevenue
              ? formatCurrency(customerData?.summary?.totalSellingPrice || 0)
              : "₦ ••••••"}
            icon={DollarSign}
            actionIcon={isAdmin ? (showRevenue ? EyeOff : Eye) : undefined}
            onActionClick={isAdmin ? () => setShowRevenue(!showRevenue) : undefined}
          />
          <StatsCard
            title="Total Collections"
            value={formatCurrency(customerData?.summary?.totalAmountReceived || 0)}
            icon={TrendingUp}
          />
          <StatsCard
            title="Total Receivables"
            value={formatCurrency(customerData?.summary?.totalAmountLeft || 0)}
            icon={AlertCircle}
          />
          <StatsCard
            title="Upcoming (Next 7 Days)"
            value={formatCurrency(customerData?.summary?.upcomingReceivables || 0)}
            icon={Clock}
          />
        </div>

        {/* Customer Overview + Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border bg-blue-950">
            <CardHeader><CardTitle>Customer Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-900 rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-300" />
                  <div className="text-2xl font-bold text-white">
                    {customerData?.summary?.totalCustomers || 0}
                  </div>
                  <div className="text-sm text-gray-400">Total Customers</div>
                </div>
                <div className="text-center p-4 bg-red-900 rounded-lg">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-300" />
                  <div className="text-2xl font-bold text-white">
                    {customerData?.summary?.overdueCustomers || 0}
                  </div>
                  <div className="text-sm text-gray-400">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-blue-950">
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4 mr-2" /> Send Bulk Reminders
                </Button>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <DollarSign className="w-4 h-4 mr-2" /> Record Bulk Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Installments Table */}
        <Card className="border-border bg-blue-950">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>
                Customer Installments
                {filteredCustomers.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({filteredCustomers.length} customers)
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {/* Filter: only Ongoing and Overdue */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-blue-900 border border-blue-700 rounded-md px-3 py-2 text-white"
                >
                  <option value="all">All</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="overdue">Overdue</option>
                </select>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-blue-900 border border-blue-700 rounded-md px-3 py-2 text-white placeholder-gray-400"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Selling</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Amount Left</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Last Paid</TableHead>
                  <TableHead>Next Installment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.length > 0 ? (
                  paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{customer.name}</div>
                          <div className="text-sm text-gray-400">{customer.email}</div>
                          <div className="text-xs text-gray-500">{customer.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {formatCurrency(customer.totalSellingPrice)}
                      </TableCell>
                      <TableCell className={
                        customer.amountPaid > 0
                          ? "text-green-400 font-semibold"
                          : "text-gray-400"
                      }>
                        {formatCurrency(customer.amountPaid)}
                      </TableCell>
                      <TableCell className={
                        customer.amountLeft > 0
                          ? "text-red-400 font-semibold"
                          : "text-emerald-400 font-semibold"
                      }>
                        {customer.amountLeft > 0
                          ? formatCurrency(customer.amountLeft)
                          : "Cleared"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(customer.progress)}`}
                              style={{ width: `${Math.min(customer.progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-300">{customer.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {formatDate(customer.dateLastPaid)}
                      </TableCell>
                      <TableCell className={
                        customer.status === "overdue"
                          ? "text-red-400 font-semibold text-sm"
                          : "text-gray-300 text-sm"
                      }>
                        {formatDate(customer.dateNextInstallment)}
                      </TableCell>
                      {/* Status: only Ongoing (blue) or Overdue (red) */}
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusBadgeClass(customer.status)}`}>
                          {getStatusLabel(customer.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder(customer.id)}
                            className="bg-yellow-600 hover:bg-yellow-700 border-yellow-600"
                            title="Send Reminder"
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecordPayment(customer)}
                            className="bg-green-600 hover:bg-green-700 border-green-600"
                            title="Record Payment"
                          >
                            <DollarSign className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      {searchQuery
                        ? `No customers found matching "${searchQuery}"`
                        : "No customers with active installments found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-gray-400">
                  Showing {startItem}–{endItem} of {filteredCustomers.length} customers
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 5) return true;
                      if (page === 1 || page === totalPages) return true;
                      return Math.abs(page - currentPage) <= 1;
                    })
                    .reduce((acc: (number | string)[], page, idx, arr) => {
                      if (idx > 0 && (page as number) - (arr[idx - 1] as number) > 1) {
                        acc.push("...");
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span key={`e-${idx}`} className="text-gray-500 px-1">...</span>
                      ) : (
                        <Button
                          key={item}
                          variant={item === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(item as number)}
                          className={
                            item === currentPage
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                          }
                        >
                          {item}
                        </Button>
                      )
                    )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Legend — only Ongoing and Overdue */}
        <Card className="border-border bg-blue-950">
          <CardHeader><CardTitle className="text-lg">Status Legend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-300">Ongoing — active installment plan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-300">Overdue — payment past due</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default CustomerOwingPage;
