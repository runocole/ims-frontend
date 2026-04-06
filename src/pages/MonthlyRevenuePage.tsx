import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  ArrowLeft, TrendingUp, DollarSign,
  ShoppingBag, Calendar, BarChart2
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line
} from "recharts";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

// ------------------------------
// TYPES
// ------------------------------
interface MonthlyRevenue {
  month: string;
  year: number;
  month_number: number;
  revenue: number;
  sales_count: number;
}

interface MonthlyRevenueData {
  months: MonthlyRevenue[];
  total_all_time: number;
  total_sales_count: number;
}

// ------------------------------
// HELPERS
// ------------------------------
const formatCurrency = (amount: number) =>
  `₦${(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ------------------------------
// COMPONENT
// ------------------------------
const MonthlyRevenuePage = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState<MonthlyRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("access") || localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/dashboard/monthly-revenue/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);

        // Default to the most recent year available if we have data
        if (res.data.months.length > 0) {
          const latestYear = Math.max(...res.data.months.map((m: MonthlyRevenue) => m.year));
          setSelectedYear(latestYear);
        }
      } catch (err) {
        console.error("Failed to fetch monthly revenue:", err);
        setError("Could not load revenue data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ------------------------------
  // DATA PROCESSING
  // ------------------------------
  const availableYears = data
    ? Array.from(new Set(data.months.map(m => m.year))).sort((a, b) => b - a)
    : [];

  const filteredMonths = data?.months.filter(m => m.year === selectedYear) || [];
  const selectedYearRevenue = filteredMonths.reduce((sum, m) => sum + m.revenue, 0);
  const selectedYearSales = filteredMonths.reduce((sum, m) => sum + m.sales_count, 0);

  // Current month details (MTD)
  const now = new Date();
  const currentMonthData = data?.months.find(
    (m) => m.year === now.getFullYear() && m.month_number === now.getMonth() + 1
  );

  // Chart data — filtered by year, displayed in chronological order
  const chartData = [...filteredMonths]
    .reverse()
    .map((m) => ({
      name: m.month.split(" ")[0].slice(0, 3) + " " + String(m.year).slice(2),
      revenue: m.revenue,
      sales: m.sales_count,
    }));

  // ------------------------------
  // LOADING STATE
  // ------------------------------
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p>Loading revenue data...</p>
        </div>
      </DashboardLayout>
    );
  }

  // ------------------------------
  // ERROR STATE
  // ------------------------------
  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
          <BarChart2 className="h-12 w-12 opacity-30" />
          <p>{error || "No data available."}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="border-slate-600 text-slate-300"
          >
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">

        {/* Header & Year Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Revenue History
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Month-by-month breakdown of all sales revenue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 w-fit">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selectedYear === year 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-slate-400 hover:text-white"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats (4 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Yearly Card (Dynamic) */}
          <Card className="bg-blue-900/40 border-blue-500/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-xs uppercase tracking-wide font-semibold">
                    {selectedYear} Revenue
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(selectedYearRevenue)}
                  </p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MTD Card */}
          <Card className="bg-blue-950 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">
                    This Month (MTD)
                  </p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {formatCurrency(currentMonthData?.revenue || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentMonthData?.sales_count || 0} sales this month
                  </p>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All-Time Card */}
          <Card className="bg-blue-950 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">
                    All-Time Revenue
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(data.total_all_time)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Across {data.months.length} month{data.months.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Sales Card */}
          <Card className="bg-blue-950 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">
                    Total Sales (All Time)
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {data.total_sales_count}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedYearSales} sales in {selectedYear}
                  </p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-full">
                  <ShoppingBag className="h-6 w-6 text-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart (Revenue) */}
        {chartData.length > 0 && (
          <Card className="bg-blue-950 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <BarChart2 className="h-4 w-4 text-blue-400" />
                Revenue Performance — {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#1e3a5f" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={{ stroke: "#1e3a5f" }}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `₦${(v / 1_000_000).toFixed(1)}M`
                        : `₦${(v / 1_000).toFixed(0)}K`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e3a5f",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sales Count Trend Line */}
        {chartData.length > 1 && (
          <Card className="bg-blue-950 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Sales Volume Trend — {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#1e3a5f" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#1e3a5f" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e3a5f",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                    }}
                    formatter={(value: any) => [Number(value ?? 0), "Sales"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Month-by-Month Table */}
        <Card className="bg-blue-950 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-400" />
              Complete Monthly Breakdown ({selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80">
                  <tr>
                    <th className="text-left p-4 text-slate-300 font-medium">Month</th>
                    <th className="text-right p-4 text-slate-300 font-medium">Sales</th>
                    <th className="text-right p-4 text-slate-300 font-medium">Revenue</th>
                    <th className="text-right p-4 text-slate-300 font-medium">Avg per Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonths.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        No data recorded for {selectedYear}
                      </td>
                    </tr>
                  ) : (
                    filteredMonths.map((m, idx) => {
                      const isCurrent =
                        m.year === now.getFullYear() &&
                        m.month_number === now.getMonth() + 1;
                      const avgPerSale =
                        m.sales_count > 0 ? m.revenue / m.sales_count : 0;

                      return (
                        <tr
                          key={idx}
                          className={`border-t border-slate-700/50 transition-colors ${
                            isCurrent
                              ? "bg-blue-900/20 border-l-2 border-l-blue-500"
                              : "hover:bg-slate-800/30"
                          }`}
                        >
                          <td className="p-4 font-medium text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {m.month}
                              {isCurrent && (
                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right text-slate-300">
                            {m.sales_count}
                          </td>
                          <td className="p-4 text-right font-semibold text-emerald-400">
                            {formatCurrency(m.revenue)}
                          </td>
                          <td className="p-4 text-right text-slate-400 text-xs">
                            {formatCurrency(avgPerSale)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Auto-calculated Selected Year Total */}
                {filteredMonths.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-800/60">
                      <td className="p-4 font-bold text-white">Total for {selectedYear}</td>
                      <td className="p-4 text-right text-slate-300 font-medium">
                        {selectedYearSales}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400 text-base">
                        {formatCurrency(selectedYearRevenue)}
                      </td>
                      <td className="p-4 text-right text-slate-400 text-xs">
                        {formatCurrency(
                          selectedYearSales > 0
                            ? selectedYearRevenue / selectedYearSales
                            : 0
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default MonthlyRevenuePage;