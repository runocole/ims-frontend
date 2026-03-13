import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ADDED: For navigation
import { getSales } from "../services/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Download, Search, DollarSign, Calendar, FileText, Package, CreditCard, UserSearch } from "lucide-react"; // ADDED: UserSearch for ledger icon
import { DashboardLayout } from "../components/DashboardLayout";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface SaleItem {
  tool_id: string;
  equipment: string;
  cost: string;
  category?: string;
  serial_set?: string[];
  datalogger_serial?: string;
}

interface Sale {
  id: number;
  customer_id?: number;
  name: string;
  phone: string;
  state: string;
  items: SaleItem[];
  total_cost: string;
  date_sold: string;
  import_invoice?: string;
  invoice_number?: string;
  payment_plan?: string;
  initial_deposit?: string;
  payment_months?: string;
  expiry_date?: string;
  payment_status?: string;
  staff_name?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  user_id?: number;
  created_by?: {
    id: number;
    name: string;
    email: string;
  };
  sold_by?: string; 
  staff?: number;   
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
}

const AdminSalesPage: React.FC = () => {
  const navigate = useNavigate(); // ADDED: Hook for routing

  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Sale>("date_sold");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Get current user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const getStaffName = (sale: Sale): string => {
    if (sale.sold_by) {
      const email = sale.sold_by;
      const username = email.split('@')[0];
      const nameParts = username.split('.');
      const friendlyName = nameParts.map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
      return friendlyName;
    }
    if (sale.staff_name && sale.staff_name !== "Unknown Staff") {
      return sale.staff_name;
    }
    if (sale.created_by?.name) {
      return sale.created_by.name;
    }
    if (sale.user?.name) {
      return sale.user.name;
    }
    return currentUser?.name || "Sales Team";
  };

  // Fetch Sales
  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        const data = await getSales();
        setSales(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load sales:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  // Filter sales
  const filteredSales = sales.filter((sale) => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    const staffName = getStaffName(sale).toLowerCase();
    
    return (
      sale.name.toLowerCase().includes(search) ||
      sale.phone.toLowerCase().includes(search) ||
      sale.state.toLowerCase().includes(search) ||
      sale.invoice_number?.toLowerCase().includes(search) ||
      staffName.includes(search) ||
      sale.items?.some(item => item.equipment.toLowerCase().includes(search)) ||
      sale.payment_plan?.toLowerCase().includes(search)
    );
  });

  // Sort sales
  const sortedSales = [...filteredSales].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortField === 'staff_name') {
      const aStaff = getStaffName(a);
      const bStaff = getStaffName(b);
      if (aStaff < bStaff) return sortOrder === "asc" ? -1 : 1;
      if (aStaff > bStaff) return sortOrder === "asc" ? 1 : -1;
      return 0;
    }
    
    if (sortField === 'total_cost' || sortField === 'initial_deposit') {
      const aNum = parseFloat(aValue as string) || 0;
      const bNum = parseFloat(bValue as string) || 0;
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    }
    
    if (sortField === 'date_sold') {
      const aDate = new Date(aValue as string).getTime();
      const bDate = new Date(bValue as string).getTime();
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    }
    
    const aStr = String(aValue || '').toLowerCase();
    const bStr = String(bValue || '').toLowerCase();
    
    if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
    if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof Sale) => {
    const order = sortField === field && sortOrder === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortOrder(order);
  };

  // ADDED: Reused the View Invoice logic from your main Sales Table
  const handleViewInvoice = (sale: Sale) => {
    localStorage.setItem("currentInvoice", JSON.stringify(sale));
    navigate(`/invoice/${sale.invoice_number || sale.id}`);
  };

  // Calculate stats
  const stats = {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, sale) => sum + parseFloat(sale.total_cost || "0"), 0),
    totalStaff: new Set(sales.map(sale => getStaffName(sale))).size,
    pendingPayments: sales.filter(sale => 
      sale.payment_status?.toLowerCase() === 'pending' || 
      sale.payment_status?.toLowerCase() === 'installment' ||
      sale.payment_status?.toLowerCase() === 'ongoing'
    ).length,
    totalInstallments: sales.filter(sale => 
      sale.payment_plan?.toLowerCase() === 'yes'
    ).length,
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Complete Sales Report - All Staff", 14, 10);

    const tableColumn = [
      "Customer", "Phone", "State", "Equipment", "Total Amount", 
      "Payment Plan", "Initial Deposit", "Payment Months", "Status", 
      "Date Sold", "Sold By", "Invoice"
    ];
    
    const tableRows = sortedSales.map((sale) => [
      sale.name || "-",
      sale.phone || "-",
      sale.state || "-",
      sale.items?.map(item => item.equipment).join(', ') || "-",
      `₦${parseFloat(sale.total_cost || "0").toLocaleString()}`,
      sale.payment_plan || "-",
      sale.initial_deposit ? `₦${parseFloat(sale.initial_deposit).toLocaleString()}` : "-",
      sale.payment_months ? `${sale.payment_months} months` : "-",
      sale.payment_status || "-",
      sale.date_sold ? new Date(sale.date_sold).toLocaleDateString() : "-",
      getStaffName(sale),
      sale.invoice_number || "-"
    ]);

    // @ts-ignore
    doc.autoTable({ 
      head: [tableColumn], 
      body: tableRows, 
      startY: 20,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`sales_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-900/50 text-green-300 border-green-700';
      case 'ongoing': return 'bg-cyan-900/50 text-cyan-300 border-cyan-700'; // ADDED ONGOING COLOR
      case 'pending': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'installment': return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'failed': return 'bg-red-900/50 text-red-300 border-red-700';
      default: return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  const formatEquipment = (items: SaleItem[]) => {
    if (!items || items.length === 0) return "-";
    if (items.length === 1) return items[0].equipment;
    return `${items[0].equipment} +${items.length - 1} more`;
  };

  const calculateRemainingBalance = (sale: Sale) => {
    if (!sale.initial_deposit) return parseFloat(sale.total_cost || "0");
    const total = parseFloat(sale.total_cost || "0");
    const deposit = parseFloat(sale.initial_deposit);
    return total - deposit;
  };

  const calculateMonthlyPayment = (sale: Sale) => {
    if (!sale.payment_months || !sale.initial_deposit) return 0;
    const remaining = calculateRemainingBalance(sale);
    const months = parseInt(sale.payment_months);
    return months > 0 ? remaining / months : 0;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading sales data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Sales Overview</h1>
            <p className="text-gray-400 mt-2">Monitor all sales activities across your team</p>
            {currentUser && (
              <p className="text-sm text-blue-400 mt-1">
                Logged in as: <strong>{currentUser.name}</strong>
              </p>
            )}
          </div>
          <Button 
            onClick={exportPDF} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" /> 
            Export PDF
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Sales</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.totalSales}</p>
                </div>
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    ₦{stats.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-600/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Pending Payments</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.pendingPayments}</p>
                </div>
                <div className="p-3 bg-yellow-600/20 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Installment Plans</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.totalInstallments}</p>
                </div>
                <div className="p-3 bg-purple-600/20 rounded-lg">
                  <CreditCard className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
            <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-400" />
              All Sales Records
            </CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search customers, equipment, staff, invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600 text-white w-full md:w-80"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {sortedSales.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FileText className="h-12 w-12 text-gray-500 mx-auto" />
                <p className="text-gray-400 text-lg">No sales records found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm ? "Try adjusting your search terms" : "Sales will appear here once staff members make transactions"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-left border-b border-slate-700 whitespace-nowrap">
                      {[
                        { key: "name", label: "Customer" },
                        { key: "phone", label: "Phone" },
                        { key: "state", label: "State" },
                        { key: "items", label: "Equipment" },
                        { key: "total_cost", label: "Total Amount" },
                        { key: "payment_plan", label: "Payment Plan" },
                        { key: "initial_deposit", label: "Initial Deposit" },
                        { key: "payment_months", label: "Payment Months" },
                        { key: "payment_status", label: "Status" },
                        { key: "date_sold", label: "Date Sold" },
                        { key: "staff_name", label: "Sold By" },
                        { key: "invoice_number", label: "Invoice" },
                        { key: "actions", label: "Actions" } // ADDED ACTIONS HEADER
                      ].map(({ key, label }) => (
                        <th
                          key={key}
                          className={`p-3 text-gray-300 font-semibold text-left hover:bg-slate-700/50 transition-colors ${key !== "actions" ? "cursor-pointer" : ""}`}
                          onClick={() => key !== "actions" && handleSort(key as keyof Sale)}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {sortField === key && (
                              <span className="text-xs">
                                {sortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                        <td className="p-3 text-white font-medium whitespace-nowrap">{sale.name}</td>
                        <td className="p-3 text-gray-300 whitespace-nowrap">{sale.phone}</td>
                        <td className="p-3 text-gray-300 whitespace-nowrap">{sale.state}</td>
                        <td className="p-3 text-gray-300 whitespace-nowrap" title={sale.items?.map(item => item.equipment).join(', ')}>
                          {formatEquipment(sale.items || [])}
                        </td>
                        <td className="p-3 text-green-400 font-semibold whitespace-nowrap">
                          ₦{parseFloat(sale.total_cost || "0").toLocaleString()}
                        </td>
                        <td className="p-3 text-gray-300 whitespace-nowrap">{sale.payment_plan || "-"}</td>
                        
                        <td className="p-3 whitespace-nowrap">
                          {sale.initial_deposit ? (
                            <div className="space-y-1">
                              <div className="text-yellow-400 font-semibold">
                                ₦{parseFloat(sale.initial_deposit).toLocaleString()}
                              </div>
                              {sale.payment_plan?.toLowerCase() === 'yes' && (
                                <div className="text-xs text-gray-400">
                                  Remaining: ₦{calculateRemainingBalance(sale).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        
                        <td className="p-3 whitespace-nowrap">
                          {sale.payment_months ? (
                            <div className="space-y-1">
                              <div className="text-blue-400 font-semibold">
                                {sale.payment_months} {parseInt(sale.payment_months) === 1 ? 'month' : 'months'}
                              </div>
                              {sale.initial_deposit && (
                                <div className="text-xs text-gray-400">
                                  ₦{calculateMonthlyPayment(sale).toLocaleString()}/month
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase border tracking-wider ${getStatusColor(sale.payment_status || '')}`}>
                            {sale.payment_status || "Unknown"}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300 whitespace-nowrap">
                          {sale.date_sold ? new Date(sale.date_sold).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-blue-300 font-medium">
                            {getStaffName(sale)}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300 font-mono text-xs whitespace-nowrap">
                          {sale.invoice_number || "-"}
                        </td>

                        {/* ADDED: ACTIONS COLUMN DATA */}
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSalesPage;