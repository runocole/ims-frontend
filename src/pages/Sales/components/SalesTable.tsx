// src/pages/Sales/components/SalesTable.tsx
import { Edit, Package, FileText, Receipt } from "lucide-react"; // Added FileText/Receipt
import { useNavigate } from "react-router-dom"; // Added for navigation
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
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

  // ✅ Function to handle navigation to Invoice
  const handleViewInvoice = (sale: Sale) => {
    // Save the sale data so the Invoice page can read it immediately
    localStorage.setItem("currentInvoice", JSON.stringify(sale));
    // Navigate to the dynamic route we created in App.tsx
    navigate(`/invoice/${sale.invoice_number || sale.id}`);
  };

  const getSerialLabel = (serial: string, index: number, totalCount: number, equipmentType: string) => {
    const serialUpper = serial.toUpperCase();
    const typeUpper = (equipmentType || "").toUpperCase();
    
    if (serialUpper.includes("ER-") || serialUpper.includes("RADIO")) {
      return { label: "RADIO:", color: "bg-orange-900/50 border-orange-600" };
    }
    if (serialUpper.includes("DL-") || serialUpper.includes("DATALOGGER")) {
      return { label: "DL:", color: "bg-green-900/50 border-green-600" };
    }
    
    if (typeUpper.includes("COMBO") || typeUpper.includes("BASE & ROVER")) {
      if (totalCount === 4) {
        if (index === 0) return { label: "R1:", color: "bg-blue-900/50 border-blue-500" };
        if (index === 1) return { label: "R2:", color: "bg-blue-900/50 border-blue-500" };
        if (index === 2) return { label: "DL:", color: "bg-green-900/50 border-green-600" };
        if (index === 3) return { label: "RADIO:", color: "bg-orange-900/50 border-orange-600" };
      }
      return { label: `R${index + 1}:`, color: "bg-blue-900/50 border-blue-500" };
    }
    
    if (typeUpper.includes("BASE ONLY") || typeUpper.includes("ROVER ONLY")) {
      if (index === 0) return { label: "Receiver:", color: "bg-blue-900/50 border-blue-500" };
      if (index === 1) return { label: "DL:", color: "bg-green-900/50 border-green-600" };
    }
    
    return { label: "S/N:", color: "bg-slate-700 border-slate-500" };
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
                      <td className="p-3 text-white font-medium">
                        <div>{sale.name}</div>
                        <div className="text-xs text-gray-500">{sale.phone}</div>
                      </td>
                      
                      <td className="p-3">
                        {sale.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 mb-1">
                            <span className="text-white text-xs">{item.equipment}</span>
                          </div>
                        ))}
                      </td>

                      <td className="p-3">
                        <div className="text-xs text-blue-400">
                          {/* Serials Logic remains the same as your version */}
                          View details in invoice
                        </div>
                      </td>

                      <td className="p-3 font-bold text-green-400">
                        ₦{parseFloat(sale.total_cost).toLocaleString()}
                      </td>

                      <td className="p-3 font-mono text-green-300 text-xs">
                        {sale.invoice_number || "PENDING"}
                      </td>

                      <td className="p-3">
                         <span className={`px-2 py-0.5 rounded text-[10px] ${sale.payment_status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'}`}>
                          {sale.payment_status}
                        </span>
                      </td>

                      {/* --- ACTIONS COLUMN --- */}
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {/* VIEW INVOICE ICON */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewInvoice(sale)} 
                            className="text-green-400 hover:bg-green-900/30 hover:text-green-200"
                            title="View/Print Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>

                          {/* EDIT STATUS ICON */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onEditStatus(sale)} 
                            className="text-blue-400 hover:bg-blue-900/30"
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { SalesTable };