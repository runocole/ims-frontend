// src/pages/Sales/components/EquipmentSelector.tsx
import { Plus, Minus, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { TOOL_CATEGORIES } from "../types";
import type { GroupedTool, CurrentItem } from "../types";

interface EquipmentSelectorProps {
  currentItem: CurrentItem;
  groupedTools: GroupedTool[];
  filteredGroupedTools: GroupedTool[];
  onCategoryChange: (category: string) => void;
  onToolSelect: (toolName: string) => void;
  onCostChange: (cost: string) => void;
  onQuantityChange: (qty: number) => void;
  onAddItem: () => void;
  isAddDisabled: boolean;
}

const EquipmentSelector = ({
  currentItem,
  groupedTools,
  filteredGroupedTools,
  onCategoryChange,
  onToolSelect,
  onCostChange,
  onQuantityChange,
  onAddItem,
  isAddDisabled
}: EquipmentSelectorProps) => {

  const currentQty = currentItem.quantity || 1;
  const maxStock = currentItem.selectedTool?.total_stock || 0;

  const handleManualQtyChange = (val: string) => {
    const num = parseInt(val);
    if (isNaN(num) || num < 1) {
      onQuantityChange(1);
    } else if (num > maxStock) {
      onQuantityChange(maxStock);
    } else {
      onQuantityChange(num);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 bg-slate-800 rounded-lg border border-slate-700">
        
        {/* Category Selection */}
        <div className="md:col-span-3">
          <Label className="text-white text-xs mb-1.5 block">Equipment Category</Label>
          <Select
            value={currentItem.selectedCategory}
            onValueChange={onCategoryChange}
          >
            <SelectTrigger className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600 h-10">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-white border-slate-600">
              {TOOL_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category} className="hover:bg-slate-700 cursor-pointer">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Equipment Selection */}
        <div className="md:col-span-3">
          <Label className="text-white text-xs mb-1.5 block">Select Equipment</Label>
          <div className="flex flex-col gap-2">
            <Select
              value={currentItem.selectedTool?.name || ""}
              onValueChange={onToolSelect}
              disabled={!currentItem.selectedCategory || (currentItem.selectedCategory === "Receiver" && !currentItem.selectedEquipmentType)}
            >
              <SelectTrigger className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600 h-10">
                <SelectValue 
                  placeholder={
                    !currentItem.selectedCategory ? "Select category first" : `Select ${currentItem.selectedCategory}`
                  } 
                />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-600">
                {filteredGroupedTools.map((tool) => (
                  <SelectItem key={tool.group_id} value={tool.name} className="hover:bg-slate-700 cursor-pointer">
                    <div className="flex justify-between items-center w-full gap-4">
                      <span>{tool.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${tool.total_stock > 0 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                        Stock: {tool.total_stock}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Price Input */}
        <div className="md:col-span-3">
          <Label className="text-white text-xs mb-1.5 block">Selling Price (₦)</Label>
          <Input
            type="number"
            value={currentItem.cost}
            onChange={(e) => onCostChange(e.target.value)}
            className="bg-slate-700 text-white border-slate-600 placeholder-gray-500 h-10"
            placeholder="0.00"
            disabled={!currentItem.selectedTool}
          />
        </div>

        {/* Quantity Control */}
        <div className="md:col-span-2">
          <Label className="text-white text-xs mb-1.5 block text-center">Quantity</Label>
          <div className="flex items-center border border-slate-600 rounded-md bg-slate-700 h-10 overflow-hidden">
            <button 
              type="button"
              disabled={currentQty <= 1}
              onClick={() => onQuantityChange(currentQty - 1)}
              className="flex-1 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-600 disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            
            <input 
              type="text"
              className="w-10 bg-transparent text-center font-semibold text-white text-sm border-x border-slate-600 h-full focus:outline-none"
              value={currentQty}
              onChange={(e) => handleManualQtyChange(e.target.value)}
            />

            <button 
              type="button"
              disabled={!currentItem.selectedTool || currentQty >= maxStock}
              onClick={() => onQuantityChange(currentQty + 1)}
              className="flex-1 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-600 disabled:opacity-30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Add Button */}
        <div className="md:col-span-1">
          <Button
            onClick={onAddItem}
            disabled={isAddDisabled || maxStock === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* DYNAMIC SELECTION BADGE: Displayed below the grid for immediate confirmation */}
      {currentItem.selectedEquipmentType && (
        <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
              Ready to add: {currentItem.selectedEquipmentType}
            </span>
          </div>
          {currentItem.selectedTool && (
            <span className="text-[10px] text-slate-500 font-medium italic">
              — Selected {currentItem.selectedTool.name} ({currentItem.selectedTool.total_stock} in stock)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export { EquipmentSelector };