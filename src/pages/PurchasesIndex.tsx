import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Receipt, ArrowLeft, Loader2, User, Phone, Wallet } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "http://localhost:8000/api";

const PurchaseIndex = () => {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllCustomerSales = async () => {
      if (!phone) return;
      setLoading(true);
      
      const token = localStorage.getItem("access") || localStorage.getItem("token");

      try {
        const response = await fetch(`${API_BASE_URL}/sales/?phone=${phone}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        const actualSales = Array.isArray(data) ? data : (data.results || []);
        
        // --- NEW: STRICT FRONTEND FILTER ---
        // If the backend ignores the ?phone query and sends everything, 
        // we manually filter out any invoice that doesn't match the phone number.
       const customerSpecificSales = actualSales.filter(
          (sale: any) => sale.phone === phone
        );
        
        setSales(customerSpecificSales);
      } catch (error) {
        console.error(error);
        toast.error("Could not load customer history.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllCustomerSales();
  }, [phone]);

  const totalValue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_cost || "0"), 0);

  // Helper function to color-code the equipment type badge
  const getBadgeStyle = (type?: string) => {
    if (!type) return "bg-slate-700/50 text-slate-300 border-slate-600";
    
    const t = type.toLowerCase();
    if (t.includes("base") && t.includes("rover")) {
      return "bg-purple-900/50 text-purple-400 border-purple-800";
    }
    if (t.includes("base")) {
      return "bg-blue-900/50 text-blue-400 border-blue-800";
    }
    if (t.includes("rover")) {
      return "bg-teal-900/50 text-teal-400 border-teal-800";
    }
    if (t.includes("accessory") || t.includes("accessories")) {
      return "bg-slate-700/50 text-slate-300 border-slate-600";
    }
    return "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20 pt-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
           <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
             <ArrowLeft className="mr-2 w-4 h-4"/> Back
           </Button>
           <h1 className="text-2xl font-bold text-white">Customer Invoices</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 bg-slate-900 rounded-xl border border-slate-800">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-slate-900 rounded-2xl border border-dashed border-slate-800">
            No purchase records found for {phone}.
          </div>
        ) : (
          <>
            {/* Customer Summary Card */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex justify-between items-center">
               <div>
                 <p className="text-sm text-gray-400 uppercase font-bold flex items-center gap-2"><User className="w-4 h-4"/> {sales[0]?.name || "Customer"}</p>
                 <p className="text-lg text-emerald-500 font-mono mt-1 flex items-center gap-2"><Phone className="w-4 h-4"/> {phone}</p>
               </div>
               <div className="text-right">
                 <p className="text-sm text-gray-400 uppercase font-bold flex items-center justify-end gap-2"><Wallet className="w-4 h-4"/> Total Lifetime Value</p>
                 <p className="text-2xl font-black text-blue-400">₦{totalValue.toLocaleString()}</p>
               </div>
            </div>

            <h3 className="text-lg font-bold text-white mt-8 mb-4">Select an Invoice to view items and payments:</h3>

            {/* List of all Invoices */}
            <div className="grid grid-cols-1 gap-4">
              {sales.map((sale) => (
                <div 
                  key={sale.invoice_number}
                  onClick={() => navigate(`/sales/${phone}/${sale.invoice_number}`)} 
                  className="bg-slate-900 p-6 rounded-xl border border-slate-800 cursor-pointer hover:border-emerald-500 hover:bg-slate-800/80 transition-all group flex flex-col md:flex-row md:justify-between items-start md:items-center gap-6"
                >
                  {/* Left: Invoice Num & Date */}
                  <div className="flex items-center gap-4 md:w-1/4">
                    <div className="bg-slate-800 p-3 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                      <Receipt className="w-6 h-6 text-blue-400 group-hover:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-black text-xl">{sale.invoice_number}</p>
                      <p className="text-gray-500 text-sm mt-1">Date: {new Date(sale.date_sold || sale.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Middle: Equipment Items & Badges */}
                  <div className="flex-1 w-full border-y md:border-y-0 md:border-l border-slate-800 py-4 md:py-0 md:pl-6 flex flex-col gap-3">
                    {sale.items && sale.items.length > 0 ? (
                      sale.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                          {/* Equipment Name */}
                          <span className="text-white text-sm font-semibold">
                            {item.equipment || "Unnamed Equipment"}
                          </span>
                          
                          {/* Colored Type Badge */}
                          <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getBadgeStyle(item.equipment_type)}`}>
                            {item.equipment_type || "Accessory"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 italic">No equipment listed</span>
                    )}
                  </div>
                  
                  {/* Right: Price & Button */}
                  <div className="text-left md:text-right md:min-w-[150px]">
                    <p className="text-white font-bold text-lg mb-1">₦{parseFloat(sale.total_cost).toLocaleString()}</p>
                    <Button variant="link" className="text-emerald-500 p-0 h-auto group-hover:text-emerald-400">View Ledger →</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PurchaseIndex;