// src/pages/Sales/components/SalesTable.tsx - FINAL VERSION WITH 4 SERIALS
import { Edit, Package } from "lucide-react";
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
  
  // ✅ Smart label detector for serials
  const getSerialLabel = (serial: string, index: number, totalCount: number, equipmentType: string) => {
    const serialUpper = serial.toUpperCase();
    const typeUpper = (equipmentType || "").toUpperCase();
    
    // 1. Detect by pattern
    if (serialUpper.includes("ER-") || serialUpper.includes("RADIO")) {
      return { label: "RADIO:", color: "bg-orange-900/50 border-orange-600" };
    }
    if (serialUpper.includes("DL-") || serialUpper.includes("DATALOGGER")) {
      return { label: "DL:", color: "bg-green-900/50 border-green-600" };
    }
    
    // 2. For Base & Rover Combo with 4 serials
    if (typeUpper.includes("COMBO") || typeUpper.includes("BASE & ROVER")) {
      if (totalCount === 4) {
        if (index === 0) return { label: "R1:", color: "bg-blue-900/50 border-blue-500" };
        if (index === 1) return { label: "R2:", color: "bg-blue-900/50 border-blue-500" };
        if (index === 2) return { label: "DL:", color: "bg-green-900/50 border-green-600" };
        if (index === 3) return { label: "RADIO:", color: "bg-orange-900/50 border-orange-600" };
      }
      return { label: `R${index + 1}:`, color: "bg-blue-900/50 border-blue-500" };
    }
    
    // 3. For Base Only / Rover Only with 2 serials
    if (typeUpper.includes("BASE ONLY") || typeUpper.includes("ROVER ONLY")) {
      if (index === 0) return { label: "Receiver:", color: "bg-blue-900/50 border-blue-500" };
      if (index === 1) return { label: "DL:", color: "bg-green-900/50 border-green-600" };
    }
    
    // 4. Accessories
    if (typeUpper.includes("ACCESSORY")) {
      return { label: "S/N:", color: "bg-slate-700 border-slate-500" };
    }
    
    // 5. Default
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
                  {["Client", "Phone", "Equipment & Type", "Serial Numbers", "Total Cost", "Date Sold", "Invoice #", "Status", "Actions"].map((col) => (
                    <th key={col} className="p-3 text-white font-medium whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-4 text-gray-400">No records yet. Add a sale to begin.</td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors text-gray-300">
                      <td className="p-3 text-white font-medium">{sale.name}</td>
                      <td className="p-3 whitespace-nowrap">{sale.phone}</td>
                      
                      {/* EQUIPMENT & TYPE */}
                      <td className="p-3">
                        <div className="space-y-2">
                          {sale.items?.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 flex-wrap">
                              <span className="text-white text-sm font-semibold">{item.equipment}</span>
                              {item.equipment_type && (
                                <span className="px-2.5 py-1 bg-purple-600 text-white rounded-md text-[11px] font-extrabold uppercase shadow-lg">
                                  {item.equipment_type}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* SERIAL NUMBERS - ALL 4 WITH SMART LABELS */}
                      <td className="p-3 min-w-[600px]">
                        <div className="space-y-3">
                          {sale.items?.map((item: any, index) => {
                            // Parse serials
                            let allSerials: string[] = [];
                            try {
                              allSerials = Array.isArray(item.serial_set) 
                                ? item.serial_set 
                                : JSON.parse(item.serial_set || "[]");
                            } catch {
                              if (item.serial_set) allSerials = [item.serial_set];
                            }

                            // Filter out empty serials
                            allSerials = allSerials.filter(Boolean);

                            return (
                              <div key={index} className="bg-slate-800/30 p-3 rounded-lg border border-slate-700">
                                {/* Equipment name */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-blue-300 font-bold text-xs">{item.equipment}</span>
                                  {item.equipment_type && (
                                    <span className="px-2 py-0.5 bg-purple-600/80 text-white rounded text-[10px] font-bold uppercase">
                                      {item.equipment_type}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    ({allSerials.length} serial{allSerials.length !== 1 ? 's' : ''})
                                  </span>
                                </div>
                                
                                {/* ALL Serials with smart labels */}
                                <div className="flex flex-wrap gap-2">
                                  {allSerials.length > 0 ? (
                                    allSerials.map((serial, sIdx) => {
                                      const { label, color } = getSerialLabel(
                                        serial,
                                        sIdx,
                                        allSerials.length,
                                        item.equipment_type || ""
                                      );
                                      
                                      return (
                                        <span 
                                          key={sIdx} 
                                          className={`inline-flex items-center gap-2 px-3 py-2 ${color} border-2 rounded-lg text-sm font-mono font-extrabold text-white shadow-md hover:brightness-110 transition-all`}
                                        >
                                          <span className="font-black text-[10px] uppercase">{label}</span>
                                          <span className="tracking-wide">{serial}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-xs text-gray-500 italic">No serials recorded</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="p-3 font-bold text-green-400 whitespace-nowrap">
                        ₦{parseFloat(sale.total_cost).toLocaleString()}
                      </td>
                      <td className="p-3 text-gray-300 whitespace-nowrap">
                        {sale.date_sold ? new Date(sale.date_sold).toLocaleDateString('en-GB') : "-"}
                      </td>
                      <td className="p-3 font-mono font-bold text-green-300 text-xs">
                        {sale.invoice_number || "-"}
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          sale.payment_status === "completed" ? "bg-green-900/50 text-green-300 border border-green-700" :
                          sale.payment_status === "installment" ? "bg-blue-900/50 text-blue-300 border border-blue-700" :
                          sale.payment_status === "failed" ? "bg-red-900/50 text-red-300 border border-red-700" :
                          "bg-gray-900/50 text-gray-300 border border-gray-700"
                        }`}>
                          {sale.payment_status || "pending"}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" onClick={() => onEditStatus(sale)} className="text-blue-400 hover:bg-blue-900/30">
                          <Edit className="w-4 h-4" />
                        </Button>
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
