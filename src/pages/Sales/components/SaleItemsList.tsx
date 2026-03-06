// src/pages/Sales/components/SaleItemsList.tsx - FIXED VERSION
import { Trash2, Tag, FileCheck, Layers } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { SaleItem } from "../types";

interface SaleItemsListProps {
  items: SaleItem[];
  totalCost: number;
  onRemoveItem: (index: number) => void;
}

const SaleItemsList = ({ items, totalCost, onRemoveItem }: SaleItemsListProps) => {
  if (items.length === 0) return null;

  return (
    <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/50 shadow-inner">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-white font-bold flex items-center gap-2 tracking-tight">
          <Tag className="w-5 h-5 text-blue-500" />
          Items in this Sale
          <span className="ml-1 px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-400">
            {items.length}
          </span>
        </h3>
        <div className="text-right">
          <div className="text-xs text-slate-400 uppercase font-semibold tracking-widest mb-1">Total Amount</div>
          <div className="text-xl font-black text-green-400 font-mono">
            ₦{totalCost.toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {items.map((item, index) => (
          <div key={item.id || index} className="group relative p-4 bg-slate-800/40 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all duration-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-extrabold text-base tracking-tight">{item.equipment}</span>
                  
                  {item.equipment_type && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {item.equipment_type}
                    </span>
                  )}

                  {item.import_invoice && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700/50 text-[10px] text-slate-400 border border-slate-600">
                      <FileCheck className="w-3 h-3" />
                      {item.import_invoice}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest italic">
                  {item.category}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-white bg-slate-950/50 px-3 py-1 rounded-md border border-slate-700/50">
                    ₦{parseFloat(item.cost).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(index)}
                  className="h-9 w-9 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* ✅ FIXED: Only show serial_set (which contains ALL 4 serials) */}
            {item.serial_set && item.serial_set.length > 0 && (
              <div className="mt-4 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 group-hover:bg-slate-950/60 transition-colors">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">
                  Serial Numbers ({item.serial_set.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.serial_set.map((serial: string, idx: number) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-[11px] font-mono text-slate-300"
                    >
                      {serial}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
};

export { SaleItemsList };
