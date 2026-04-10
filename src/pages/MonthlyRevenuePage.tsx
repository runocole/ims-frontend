import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  ArrowLeft, TrendingUp, DollarSign,
  ShoppingBag, Calendar, BarChart2, X, CalendarRange
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line
} from "recharts";
import axios from "axios";

const API_URL = "https://inventory.oticgs.com/api";

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Convert "YYYY-MM" string to { year, month_number } for comparison
const parseYearMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month_number: m };
};

// ------------------------------
// COMPONENT
// ------------------------------
const MonthlyRevenuePage = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState<MonthlyRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Year + month button filters
  const [selectedYear, setSelectedYear]   = useState<number | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");

  // Calendar range filter — "YYYY-MM" month-level values
  const [calendarFrom, setCalendarFrom] = useState("");
  const [calendarTo, setCalendarTo]     = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token =
          localStorage.getItem("access") || localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/dashboard/monthly-revenue/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const d = res.data;
// STRICT FALLBACK: Ensure we always set valid properties
setData({
  months: Array.isArray(d?.months) ? d.months : (Array.isArray(d) ? d : []),
  total_all_time: d?.total_all_time || 0,
  total_sales_count: d?.total_sales_count || 0,
});
      } catch (err) {
        console.error("Failed to fetch monthly revenue:", err);
        setError("Could not load revenue data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const now = new Date();

  // Available years from data
  const availableYears = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.months.map((m) => m.year))].sort((a, b) => b - a);
  }, [data]);

  const handleYearChange = (year: number | "all") => {
    setSelectedYear(year);
    setSelectedMonth("all");
    // Clear calendar range when switching to button filters
    setCalendarFrom("");
    setCalendarTo("");
  };

  const handleMonthChange = (month: number | "all") => {
    setSelectedMonth(month);
    setCalendarFrom("");
    setCalendarTo("");
  };

  const handleCalendarApply = () => {
    // When calendar range is applied, clear button filters
    if (calendarFrom || calendarTo) {
      setSelectedYear("all");
      setSelectedMonth("all");
    }
    setShowCalendar(false);
  };

  const clearAllFilters = () => {
    setSelectedYear("all");
    setSelectedMonth("all");
    setCalendarFrom("");
    setCalendarTo("");
    setShowCalendar(false);
  };

  // Which months are available for the selected year (for month buttons)
  const availableMonthNumbers = useMemo(() => {
    if (!data) return [];
    const source = selectedYear === "all"
      ? data.months
      : data.months.filter((m) => m.year === selectedYear);
    return [...new Set(source.map((m) => m.month_number))].sort((a, b) => a - b);
  }, [data, selectedYear]);

  // ------------------------------
  // FILTERED MONTHS
  // Calendar range takes priority over year/month buttons
  // ------------------------------
  const filteredMonths = useMemo(() => {
    if (!data) return [];

    // Calendar range filter
    if (calendarFrom || calendarTo) {
      return data.months.filter((m) => {
        // Convert month to a comparable "YYYY-MM" string
        const mKey = `${m.year}-${String(m.month_number).padStart(2, "0")}`;
        const fromOk = !calendarFrom || mKey >= calendarFrom;
        const toOk   = !calendarTo   || mKey <= calendarTo;
        return fromOk && toOk;
      });
    }

    // Year + month button filter
    return data.months.filter((m) => {
      const yearMatch  = selectedYear  === "all" || m.year         === selectedYear;
      const monthMatch = selectedMonth === "all" || m.month_number === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [data, selectedYear, selectedMonth, calendarFrom, calendarTo]);

  // Filtered totals
  const filteredTotal = useMemo(
    () => filteredMonths.reduce((sum, m) => sum + m.revenue, 0),
    [filteredMonths]
  );
  const filteredSalesCount = useMemo(
    () => filteredMonths.reduce((sum, m) => sum + m.sales_count, 0),
    [filteredMonths]
  );

  const isCalendarFiltered = !!(calendarFrom || calendarTo);
  const isButtonFiltered   = selectedYear !== "all" || selectedMonth !== "all";
  const isFiltered         = isCalendarFiltered || isButtonFiltered;

  // Calendar range label
  const calendarLabel = useMemo(() => {
    if (!isCalendarFiltered) return "";
    const from = calendarFrom
      ? (() => { const p = parseYearMonth(calendarFrom); return `${MONTH_NAMES[p.month_number - 1]} ${p.year}`; })()
      : "Start";
    const to = calendarTo
      ? (() => { const p = parseYearMonth(calendarTo); return `${MONTH_NAMES[p.month_number - 1]} ${p.year}`; })()
      : "Now";
    return `${from} → ${to}`;
  }, [calendarFrom, calendarTo, isCalendarFiltered]);

  const currentMonthData = data?.months.find(
    (m) => m.year === now.getFullYear() && m.month_number === now.getMonth() + 1
  );

  const chartData = [...filteredMonths]
    .reverse()
    .slice(-12)
    .map((m) => ({
      name: m.month.split(" ")[0].slice(0, 3) + " " + String(m.year).slice(2),
      revenue: m.revenue,
      sales: m.sales_count,
    }));

  // ------------------------------
  // LOADING
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
  // ERROR
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

        {/* Header */}
        <div className="flex items-center justify-between">
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
        </div>

        {/* ── FILTERS ─────────────────────────────────────────── */}
        <Card className="bg-blue-950 border-slate-700">
          <CardContent className="p-4 space-y-4">

            {/* Row 1 — Year + Month buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-400 text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Filter by:
              </span>

              {/* Year buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleYearChange("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedYear === "all" && !isCalendarFiltered
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white"
                  }`}
                >
                  All Years
                </button>
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearChange(year)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedYear === year && !isCalendarFiltered
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              {/* Divider */}
              {selectedYear !== "all" && !isCalendarFiltered && (
                <span className="text-slate-700">|</span>
              )}

              {/* Month buttons — only when year selected and no calendar filter */}
              {selectedYear !== "all" && !isCalendarFiltered && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleMonthChange("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedMonth === "all"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-white"
                    }`}
                  >
                    All Months
                  </button>
                  {availableMonthNumbers.map((mn) => (
                    <button
                      key={mn}
                      onClick={() => handleMonthChange(mn)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        selectedMonth === mn
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-white"
                      }`}
                    >
                      {MONTH_NAMES[mn - 1]}
                    </button>
                  ))}
                </div>
              )}

              {/* Clear all */}
              {isFiltered && (
                <button
                  onClick={clearAllFilters}
                  className="ml-auto flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition"
                >
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              )}
            </div>

            {/* Row 2 — Calendar range filter */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isCalendarFiltered
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-purple-500 hover:text-white"
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                {isCalendarFiltered ? calendarLabel : "Filter by Date Range"}
              </button>

              {/* Calendar range inputs — shown when expanded */}
              {showCalendar && (
                <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-slate-400 font-medium">From</span>
                    <input
                      type="month"
                      value={calendarFrom}
                      onChange={(e) => setCalendarFrom(e.target.value)}
                      className="bg-transparent text-sm text-white focus:outline-none [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <span className="text-slate-600 text-sm">→</span>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-slate-400 font-medium">To</span>
                    <input
                      type="month"
                      value={calendarTo}
                      onChange={(e) => setCalendarTo(e.target.value)}
                      className="bg-transparent text-sm text-white focus:outline-none [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCalendarApply}
                    className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
                  >
                    Apply
                  </Button>
                  {isCalendarFiltered && (
                    <button
                      onClick={() => { setCalendarFrom(""); setCalendarTo(""); }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Clear range
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Active filter label */}
            {isFiltered && (
              <p className="text-xs text-slate-500">
                Showing:{" "}
                <span className="text-blue-400 font-medium">
                  {isCalendarFiltered
                    ? calendarLabel
                    : selectedMonth !== "all"
                    ? `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`
                    : `All of ${selectedYear}`}
                </span>
                {" — "}
                <span className="text-emerald-400">
                  {filteredMonths.length} month{filteredMonths.length !== 1 ? "s" : ""}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-950 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">
                    {isFiltered ? "Filtered Revenue" : "All-Time Revenue"}
                  </p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {formatCurrency(isFiltered ? filteredTotal : data.total_all_time)}
                  </p>
                  {isFiltered && (
                    <p className="text-xs text-slate-500 mt-1">
                      All-time: {formatCurrency(data.total_all_time)}
                    </p>
                  )}
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-950 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">
                    This Month (MTD)
                  </p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">
                    {formatCurrency(currentMonthData?.revenue || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentMonthData?.sales_count || 0} sales this month
                  </p>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-950 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">
                    {isFiltered ? "Filtered Sales" : "Total Sales (All Time)"}
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {isFiltered ? filteredSalesCount : data.total_sales_count}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Across {filteredMonths.length} month{filteredMonths.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="bg-slate-700/50 p-3 rounded-full">
                  <ShoppingBag className="h-6 w-6 text-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <Card className="bg-blue-950 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <BarChart2 className="h-4 w-4 text-blue-400" />
                Revenue —{" "}
                {isCalendarFiltered
                  ? calendarLabel
                  : isButtonFiltered
                  ? selectedMonth !== "all"
                    ? `${MONTH_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`
                    : `${selectedYear}`
                  : `Last ${chartData.length} Months`}
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
                    formatter={(value: number | string | undefined) => [
                      formatCurrency(Number(value ?? 0)),
                      "Revenue",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sales Count Trend */}
        {chartData.length > 1 && (
          <Card className="bg-blue-950 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-blue-400" />
                Sales Volume Trend
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
                    formatter={(value: number | string | undefined) => [value ?? 0, "Sales"]}
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

        {/* Monthly Table */}
        <Card className="bg-blue-950 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-400" />
              {isFiltered ? "Filtered Breakdown" : "Complete Monthly Breakdown"}
              {filteredMonths.length > 0 && (
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {filteredMonths.length} record{filteredMonths.length !== 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredMonths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                <BarChart2 className="h-10 w-10 opacity-30" />
                <p>No data for the selected filter.</p>
              </div>
            ) : (
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
                  {filteredMonths.map((m, idx) => {
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
                        <td className="p-4 font-medium text-white">
                          <div className="flex items-center gap-2">
                            {m.month}
                            {isCurrent && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right text-slate-300">{m.sales_count}</td>
                        <td className="p-4 text-right font-semibold text-emerald-400">
                          {formatCurrency(m.revenue)}
                        </td>
                        <td className="p-4 text-right text-slate-400 text-xs">
                          {formatCurrency(avgPerSale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600 bg-slate-800/60">
                    <td className="p-4 font-bold text-white">
                      {isFiltered ? "Filtered Total" : "All Time Total"}
                    </td>
                    <td className="p-4 text-right text-slate-300 font-medium">
                      {filteredSalesCount}
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-400 text-base">
                      {formatCurrency(filteredTotal)}
                    </td>
                    <td className="p-4 text-right text-slate-400 text-xs">
                      {formatCurrency(
                        filteredSalesCount > 0 ? filteredTotal / filteredSalesCount : 0
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default MonthlyRevenuePage;
