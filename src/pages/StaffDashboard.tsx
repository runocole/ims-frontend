import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { StatsCard } from "../components/StatsCard";
import { Package, DollarSign, Users, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { fetchDashboardData } from "../services/api";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRevenue, setShowRevenue] = useState(false);

  const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#A855F7"];

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUserName(parsed.name || parsed.email || "User");
      } catch {
        setUserName("User");
      }
    }
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetchDashboardData();
        console.log("📊 Dashboard Data:", res); 
        setDashboardData(res);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const formatCurrency = (amount: number) =>
    `₦${amount?.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Function to get limited items (5 max) for all sections
  const getLimitedItems = (items: any[] | undefined, limit: number = 5) => {
    if (!items) return [];
    return items.slice(0, limit);
  };

  // Function to group low stock items by name and category and limit to 5
  const getGroupedLowStockItems = () => {
    if (!dashboardData?.lowStockItems) return [];

    const groupedItems: { [key: string]: any } = {};

    dashboardData.lowStockItems.forEach((tool: any) => {
      const key = `${tool.name}-${tool.category}`;
      
      if (groupedItems[key]) {
        groupedItems[key].stock += tool.stock;
      } else {
        groupedItems[key] = {
          id: tool.id,
          name: tool.name,
          category: tool.category,
          stock: tool.stock
        };
      }
    });

    return Object.values(groupedItems).slice(0, 5); // Limit to 5
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64 text-gray-500">
          Loading dashboard...
        </div>
      </DashboardLayout>
    );
  }

  const groupedLowStockItems = getGroupedLowStockItems();
  const recentSales = getLimitedItems(dashboardData?.recentSales);
  const expiringReceivers = getLimitedItems(dashboardData?.expiringReceivers);
  const topSellingTools = getLimitedItems(dashboardData?.topSellingTools);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-5xl font-bold tracking-tight text-blue-100 font-serif">
            Welcome Back,
            <span className="ml-2 text-3xl italic text-blue-200 font-medium">
              {userName}
            </span>
          </h3>
          <p className="text-gray-400 mt-2">
            Here's an overview of your company's performance.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard 
            title="Total Stock" 
            value={dashboardData?.totalTools || 0} 
            icon={Package} 
            onClick={() => navigate("/tools-summary")} 
            clickable 
          />
          <StatsCard 
            title="Revenue (MTD)" 
            value={showRevenue ? formatCurrency(dashboardData?.mtdRevenue || 0) : "******"} 
            icon={DollarSign}
            actionIcon={showRevenue ? EyeOff : Eye}
            onActionClick={() => setShowRevenue(!showRevenue)}
          />
          <StatsCard title="Total Users" value={dashboardData?.totalStaff || 0} icon={AlertCircle} />
          <StatsCard 
            title="Active Customers"
            value={dashboardData?.activeCustomers || 0} icon={Users}
            onClick={() => navigate("/customer/owing")}
            clickable
           />
        </div>

        {/* Recent Sales + Low Stock Items */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Sales - Limited to 5 */}
          <Card className="border-border bg-blue-950">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.length > 0 ? (
                    recentSales.map((sale: any) => (
                      <TableRow key={sale.invoice_number}>
                        <TableCell>{sale.invoice_number}</TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>{sale.tool_name}</TableCell>
                        <TableCell>{formatCurrency(sale.cost_sold)}</TableCell>
                        <TableCell>
                          {sale.date_sold ? new Date(sale.date_sold).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        No recent sales
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* Show "View All" link if there are more than 5 sales */}
              {dashboardData?.recentSales && dashboardData.recentSales.length > 5 && (
                <div className="mt-3 text-center">
                  <button 
                    onClick={() => navigate("/sales")}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    View All ({dashboardData.recentSales.length})
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Items - Limited to 5 */}
          <Card className="border-border bg-blue-950">
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedLowStockItems.length > 0 ? (
                    groupedLowStockItems.map((tool: any) => (
                      <TableRow key={`${tool.name}-${tool.category}`}>
                        <TableCell>{tool.name}</TableCell>
                        <TableCell>{tool.category}</TableCell>
                        <TableCell>{tool.stock}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">
                        No low stock items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* Show "View All" link if there are more than 5 low stock items */}
              {dashboardData?.lowStockItems && dashboardData.lowStockItems.length > 5 && (
                <div className="mt-3 text-center">
                  <button 
                    onClick={() => navigate("/tools-summary")}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    View All ({dashboardData.lowStockItems.length})
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inventory Breakdown + Receivers Expiring Soon */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receiver Inventory Breakdown (Smaller) */}
          <Card className="border-border bg-blue-950">
            <CardHeader>
              <CardTitle className="text-lg">Receiver Inventory Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center justify-between">
                {/* Pie Chart */}
                <ResponsiveContainer width="100%" height={200} className="md:w-2/3">
                  <PieChart>
                    <Pie
                      data={dashboardData?.inventoryBreakdown || []}
                      dataKey="count"
                      nameKey="receiver_type"
                      outerRadius={70}
                      label={true} 
                    >
                      {(dashboardData?.inventoryBreakdown || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
  formatter={(value: number | string | undefined) => {
    // 1. Handle missing values immediately
    if (value === undefined || value === null) return ["0 tools (0%)", "Count"];
    
    // 2. Convert to number for calculations
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    
    // 3. Calculate total safely
    const total = (dashboardData?.inventoryBreakdown || []).reduce(
      (sum: number, item: any) => sum + (Number(item.count) || 0),
      0
    );

    const percentage = total > 0 ? ((numericValue / total) * 100).toFixed(1) : "0";
    
    // 4. CRITICAL: Both elements in the array MUST be strings
    return [String(`${numericValue} tools (${percentage}%)`), "Count"];
  }}
/>
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-4 md:mt-0 md:ml-4 space-y-2 text-sm">
                  {(dashboardData?.inventoryBreakdown || []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      ></div>
                      <span className="text-gray-300">
                        {item.receiver_type}: <span className="font-semibold">{item.count}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receivers Expiring Soon - Limited to 5 */}
          <Card className="border-border bg-blue-950">
            <CardHeader>
              <CardTitle className="text-lg">Receivers Expiring Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left p-3 font-semibold">Name</th>
                      <th className="text-left p-3 font-semibold">S/N</th>
                      <th className="text-left p-3 font-semibold">Exp. Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringReceivers.length > 0 ? (
                      expiringReceivers.map((receiver: any, index: number) => (
                        <tr key={index} className="border-b border-gray-700 hover:bg-blue-900">
                          <td className="p-3">{receiver.name}</td>
                          <td className="p-3">{receiver.serialNumber}</td>
                          <td className="p-3">
                            {receiver.expirationDate ? new Date(receiver.expirationDate).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-gray-500 p-4">
                          No receivers expiring soon
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* Show "View All" link if there are more than 5 receivers */}
                {dashboardData?.expiringReceivers && dashboardData.expiringReceivers.length > 5 && (
                  <div className="mt-3 text-center">
                    <button 
                      onClick={() => navigate("/tools-summary")}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      View All ({dashboardData.expiringReceivers.length})
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Selling Tools - Limited to 5 */}
          <Card className="border-border bg-blue-950">
            <CardHeader>
              <CardTitle>Top Selling Equipments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Sales Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSellingTools.length > 0 ? (
                    topSellingTools.map((tool: any) => (
                      <TableRow key={tool.tool__name}>
                        <TableCell>{tool.tool__name}</TableCell>
                        <TableCell>{tool.total_sold}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500">
                        No sales data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* Show "View All" link if there are more than 5 top selling tools */}
              {dashboardData?.topSellingTools && dashboardData.topSellingTools.length > 5 && (
                <div className="mt-3 text-center">
                  <button 
                    onClick={() => navigate("/sales")}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    View All ({dashboardData.topSellingTools.length})
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;