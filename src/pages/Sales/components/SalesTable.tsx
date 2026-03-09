import { Edit, Package, FileText, UserSearch } from "lucide-react"; 
import { useNavigate } from "react-router-dom"; 
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import type { SaleItem } from "../types";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "../../../components/ui/tooltip";
import type { Sale, Tool } from "../types";

interface SalesTableProps {
  sales: Sale[];
  tools: Tool[];
  loading: boolean;
  onEditStatus: (sale: Sale) => void;
  onViewSerials: (tool: Tool) => void;
}

const SalesTable = ({ sales, tools, loading, onEditStatus }: SalesTableProps) => {
  const navigate = useNavigate();

  const handleViewInvoice = (sale: Sale) => {
    localStorage.setItem("currentInvoice", JSON.stringify(sale));
    navigate(`/invoice/${sale.invoice_number || sale.id}`);
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Sales Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-gray-400 text-center py-4">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <TooltipProvider>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-slate-700 bg-slate-800">
                    {["Client", "Equipment & Type", "Serial Numbers", "Total Cost", "Invoice #", "Status", "Actions"].map((col) => (
                      <th key={col} className="p-3 text-white font-medium whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-4 text-gray-400">No records yet.</td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors text-gray-300">
                        
                        {/* 1. Client Name + Inline Inv # */}
                        <td className="p-3 text-white font-medium">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{sale.name}</span>
                              <span className="text-[10px] text-blue-400 font-mono italic">
                                ({sale.invoice_number || "N/A"})
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">{sale.phone}</div>
                          </div>
                        </td>
                        
                        {/* 2. Equipment & Type (FIXED HERE) */}
                        <td className="p-3">
  {sale.items && sale.items.length > 0 ? (
    sale.items.map((item: SaleItem, idx: number) => (
      <div key={idx} className="flex flex-col mb-2 last:mb-0 border-l border-slate-700 pl-2">
        {/* 1. Equipment Name */}
        <span className="text-white text-xs font-semibold">
          {item.equipment || "Unnamed Equipment"}
        </span>
        
        {/* 2. Equipment Type with Fallback Debugger */}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          item.equipment_type ? 'text-emerald-500' : 'text-red-500 italic'
        }`}>
          {/*{item.equipment_type || "Type Missing"}*/}
        </span>
      </div>
    ))
  ) : (
    <span className="text-amber-500 text-[10px]">No Items Found</span>
  )}
</td>

                        {/* 3. Serial Info Placeholder */}
                        <td className="p-3">
                          <div className="text-[10px] text-blue-400 bg-blue-900/20 px-2 py-1 rounded inline-block border border-blue-900/50">
                            View in Invoice
                          </div>
                        </td>

                        {/* 4. Total Cost */}
                        <td className="p-3 font-bold text-green-400">
                          ₦{parseFloat(sale.total_cost || "0").toLocaleString()}
                        </td>

                        {/* 5. Dedicated Invoice Column */}
                        <td className="p-3 font-mono text-blue-300 text-xs font-bold">
                          {sale.invoice_number || "PENDING"}
                        </td>

                        {/* 6. Payment Status */}
                        <td className="p-3">
                           <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                             sale.payment_status === 'completed' 
                             ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' 
                             : 'bg-orange-900/50 text-orange-400 border border-orange-800'
                           }`}>
                            {sale.payment_status}
                          </span>
                        </td>

                        {/* 7. Actions */}
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

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => onEditStatus(sale)} 
                              className="text-orange-400 hover:bg-orange-900/30"
                              title="Edit Status"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { SalesTable };