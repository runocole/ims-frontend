import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Loader2, Receipt, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "http://localhost:8000/api";

const AllPurchasesPage = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllSales = async () => {
      setLoading(true);
      const token = localStorage.getItem("access") || localStorage.getItem("token");

      try {
        // 🎯 Fetching ALL sales, no phone filter!
        const response = await fetch(`${API_BASE_URL}/sales/`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        // Handle both paginated and unpaginated Django responses
        const actualSales = Array.isArray(data) ? data : (data.results || []);
        setSales(actualSales);
      } catch (error) {
        console.error(error);
        toast.error("Could not load the master ledger.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllSales();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-20 pt-6">
        
        {/* Header */}
        <div>
           <h1 className="text-3xl font-black text-white">All Purchases</h1>
           <p className="text-gray-400 mt-1">Master ledger of all system invoices.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 bg-slate-900 rounded-xl border border-slate-800">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-slate-900 rounded-2xl border border-dashed border-slate-800">
            No purchase records found in the system.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sales.map((sale) => (
              <div 
                key={sale.id || sale.invoice_number}
                // 🎯 This is the magic! It builds the URL using the sale's phone and invoice number
                onClick={() => navigate(`/purchases/${sale.phone}/${sale.invoice_number}`)} 
                className="bg-slate-900 p-5 rounded-xl border border-slate-800 cursor-pointer hover:border-emerald-500 hover:bg-slate-800 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-slate-800 p-2 rounded-lg text-blue-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-gray-400 uppercase bg-slate-800 px-2 py-1 rounded">
                      {sale.invoice_number}
                    </span>
                  </div>
                  
                  <p className="text-white font-bold text-lg truncate">{sale.name}</p>
                  <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" /> {sale.phone}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                  <p className="text-emerald-400 font-bold font-mono text-lg">
                    ₦{parseFloat(sale.total_cost || "0").toLocaleString()}
                  </p>
                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AllPurchasesPage;