import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertCircle,
  TrendingUp, ShoppingBag, BadgeCheck, AlertTriangle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { DashboardLayout } from "../components/DashboardLayout";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

// ------------------------------
// TYPES
// ------------------------------
interface SaleItem {
  equipment: string;
  cost: string;
  category: string;
}

interface StaffSale {
  id: number;
  name: string;
  phone: string;
  state: string;
  total_cost: string;
  date_sold: string;
  payment_status: string;
  payment_plan: string;
  invoice_number: string;
  items: SaleItem[];
  staff: string;
}

// ------------------------------
// HELPERS
// ------------------------------
const getStatusStyle = (status: string) => {
  switch ((status || "").toLowerCase()) {
    case "completed":
    case "paid":
    case "fully-paid":
      return "bg-green-900/50 text-green-300 border border-green-700";
    case "overdue":
      return "bg-red-900/50 text-red-300 border border-red-700";
    case "ongoing":
      return "bg-blue-900/50 text-blue-300 border border-blue-700";
    default:
      return "bg-yellow-900/50 text-yellow-300 border border-yellow-700";
  }
};

const formatCurrency = (value: string | number) => {
  const num = parseFloat(String(value)) || 0;
  return `₦${num.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600",
  "bg-rose-600", "bg-amber-600", "bg-cyan-600",
  "bg-indigo-600", "bg-pink-600",
];

// ------------------------------
// COMPONENT
// ------------------------------
export default function StaffSalesDetailPage() {
  // ✅ FIXED: Read the encoded staff name directly from the URL param
  // Route is: /sales/staff/:staffName
  // StaffSalesPage navigates with: /sales/staff/Constance%20Akanueze
  // So decoding the param gives us exactly the name we need — no ID lookup required.
  const { staffName: encodedName } = useParams<{ staffName: string }>();
  const staffName = decodeURIComponent(encodedName || "");

  const location = useLocation();
  const navigate = useNavigate();
  const staffEmail = location.state?.staffEmail || "";

  const [sales, setSales] = useState<StaffSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consistent avatar color derived from first char of name
  const colorIndex = staffName.charCodeAt(0) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIndex];

  useEffect(() => {
    const fetchStaffSales = async () => {
      const token = localStorage.getItem("access") || localStorage.getItem("token");

      // ✅ Guard: if name is missing from URL, show clear error
      if (!staffName) {
        setError("No staff name found in URL. Please go back and try again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all sales for this staff member by name.
        // Works for BOTH hardcoded and registered staff because
        // Sale.staff is always stored as a plain name string.
        const res = await axios.get(`${API_URL}/sales/by-staff/`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { name: staffName },
        });

        const data = Array.isArray(res.data)
          ? res.data
          : res.data.results ?? [];
        setSales(data);

      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.response?.data?.detail || "Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchStaffSales();
  }, [staffName]);

  // ------------------------------
  // DERIVED STATS
  // ------------------------------
  const totalRevenue = sales.reduce(
    (sum, s) => sum + parseFloat(s.total_cost || "0"), 0
  );
  const completedSales = sales.filter((s) =>
    ["completed", "paid", "fully-paid"].includes((s.payment_status || "").toLowerCase())
  ).length;
  const overdueSales = sales.filter(
    (s) => (s.payment_status || "").toLowerCase() === "overdue"
  ).length;

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 min-h-screen text-white">

        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>

        {/* Profile Header */}
        <div className="flex items-center gap-5 bg-blue-950 border border-slate-700 rounded-xl p-5">
          <div className={`${avatarColor} w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
            {staffName ? getInitials(staffName) : "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {staffName || "Staff Member"}'s Sales Records
            </h1>
            {staffEmail && (
              <p className="text-slate-400 text-sm mt-0.5">{staffEmail}</p>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-slate-400">Fetching records from database...</p>
          </div>

        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 border border-red-900 bg-red-950/20 rounded-lg">
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-red-200">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>

        ) : (
          <div className="space-y-6">

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <ShoppingBag className="h-3.5 w-3.5 text-blue-400" />
                    Total Sales
                  </div>
                  <p className="text-3xl font-bold text-white">{sales.length}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    Total Revenue
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(totalRevenue)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <BadgeCheck className="h-3.5 w-3.5 text-green-400" />
                    Completed
                  </div>
                  <p className="text-3xl font-bold text-green-400">{completedSales}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-5 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    Overdue
                  </div>
                  <p className="text-3xl font-bold text-red-400">{overdueSales}</p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Table */}
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-800/60">
                    <tr>
                      <th className="p-4 text-left font-medium">Customer</th>
                      <th className="p-4 text-left font-medium">Invoice</th>
                      <th className="p-4 text-left font-medium hidden md:table-cell">Items</th>
                      <th className="p-4 text-left font-medium hidden md:table-cell">Date</th>
                      <th className="p-4 text-right font-medium">Amount</th>
                      <th className="p-4 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-500">
                          No sales found for {staffName}.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-4">
                            <p className="font-medium text-white">{sale.name}</p>
                            <p className="text-slate-500 text-xs">{sale.state}</p>
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-xs">
                            {sale.invoice_number
                              ? String(sale.invoice_number).slice(0, 12).toUpperCase()
                              : `#${sale.id}`}
                          </td>
                          <td className="p-4 text-slate-400 hidden md:table-cell">
                            <p>
                              {sale.items?.length ?? 0} item
                              {(sale.items?.length ?? 0) !== 1 ? "s" : ""}
                            </p>
                            {sale.items?.length > 0 && (
                              <p className="text-slate-500 text-xs truncate max-w-[150px]">
                                {sale.items.map((i) => i.equipment).join(", ")}
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-slate-400 text-xs hidden md:table-cell">
                            {sale.date_sold
                              ? new Date(sale.date_sold).toLocaleDateString("en-GB")
                              : "—"}
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-400">
                            {formatCurrency(sale.total_cost)}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(sale.payment_status)}`}>
                              {(sale.payment_status || "pending").toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
