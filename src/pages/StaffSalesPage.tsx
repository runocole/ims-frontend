import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { DashboardLayout } from "../components/DashboardLayout";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

export default function StaffSalesPage() {
  // ✅ This grabs ALL params from the URL
  const params = useParams(); 
  
  // ✅ This finds the FIRST value in the params object (which will be "15")
  const id = Object.values(params)[0]; 

  const location = useLocation();
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffName, setStaffName] = useState(location.state?.staffName || "Staff Member");

  useEffect(() => {
    const fetchStaffSales = async () => {
      // ... (rest of your fetch logic using 'id')
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      
      if (!id) {
        setError("No Staff ID found in URL");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1. Try to fetch staff details if name is missing (on refresh)
        if (!location.state?.staffName) {
          try {
            const staffRes = await axios.get(`${API_URL}staff/${id}/`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setStaffName(staffRes.data.name);
          } catch (e) { console.log("Staff name fetch failed, using default."); }
        }

        // 2. Fetch Sales - Using the exact param your Django backend expects
        // Usually, Django filters use 'staff' or 'staff_id'
        const salesRes = await axios.get(`${API_URL}/sales/`, {
          params: { staff_id: id }, 
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Data from API:", salesRes.data);

        // ✅ FIX: Handle DRF Pagination (results) vs Direct Array
        const data = salesRes.data?.results || (Array.isArray(salesRes.data) ? salesRes.data : []);
        setSales(data);

      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.response?.data?.detail || "Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchStaffSales();
  }, [id]);

  // Safe calculation
  const totalRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.total_cost || s.total_amount) || 0), 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-white">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft /> Back</Button>
          <h1 className="text-2xl font-bold">{staffName}'s Sales Records</h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-slate-400">Fetching records from database...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 border border-red-900 bg-red-950/20 rounded-lg">
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-red-200">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Card className="bg-slate-900 border-slate-800"><CardContent className="p-6">
                  <p className="text-slate-400 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold">₦{totalRevenue.toLocaleString()}</p>
               </CardContent></Card>
               <Card className="bg-slate-900 border-slate-800"><CardContent className="p-6">
                  <p className="text-slate-400 text-sm">Sales Count</p>
                  <p className="text-3xl font-bold">{sales.length}</p>
               </CardContent></Card>
            </div>

            {/* Table */}
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="p-4 text-left">Customer</th>
                      <th className="p-4 text-left">Invoice</th>
                      <th className="p-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr><td colSpan={3} className="p-10 text-center text-slate-500">No sales found for this user.</td></tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="p-4 font-medium">{sale.name}</td>
                          <td className="p-4 text-slate-400">{sale.invoice_number || "N/A"}</td>
                          <td className="p-4 text-right font-bold text-green-400">₦{parseFloat(sale.total_cost).toLocaleString()}</td>
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