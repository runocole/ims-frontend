// src/pages/Sales/components/AddSaleDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { CustomerInfo } from "./CustomerInfo";
import { EquipmentSelector } from "./EquipmentSelector";
import { SaleItemsList } from "./SaleItemsList";
import { PaymentDetails } from "./PaymentDetails";
import type { Customer, CurrentItem, GroupedTool, SaleItem, SaleDetails } from "../types";

export interface StaffMember {
  id: number | string;
  name: string;
  email: string;
}

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomer: Customer | null;
  currentItem: CurrentItem;
  groupedTools: GroupedTool[];
  filteredGroupedTools: GroupedTool[];
  saleItems: SaleItem[];
  saleDetails: SaleDetails;
  
  subtotal: number;
  taxAmount: number;
  totalCost: number;
  applyTax: boolean;
  onTaxChange: (apply: boolean) => void;

  staffList?: StaffMember[]; 
  selectedStaff: string;
  onStaffChange: (staffId: string) => void;

  isSubmitting: boolean;
  onCategoryChange: (category: string) => void;
  onEquipmentTypeChange: (type: string) => void;
  onToolSelect: (toolName: string) => void;
  onCostChange: (cost: string) => void;
  onQuantityChange: (qty: number) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onPaymentPlanChange: (value: string) => void;
  onInitialDepositChange: (value: string) => void;
  onPaymentMonthsChange: (value: string) => void;
  onExpiryDateChange: (value: string) => void;
  onSaveDraft: () => void;
  onSaveAndSend: () => void;
  onCancel: () => void;
}

export const AddSaleDialog = ({
  open,
  onOpenChange,
  selectedCustomer,
  currentItem,
  groupedTools,
  filteredGroupedTools,
  saleItems,
  saleDetails,
  subtotal,
  taxAmount,
  totalCost,
  applyTax,
  onTaxChange,
  staffList = [], // Now using the real list from backend props
  selectedStaff,
  onStaffChange,
  isSubmitting,
  onCategoryChange,
  onEquipmentTypeChange,
  onToolSelect,
  onCostChange,
  onQuantityChange,
  onAddItem,
  onRemoveItem,
  onPaymentPlanChange,
  onInitialDepositChange,
  onPaymentMonthsChange,
  onExpiryDateChange,
  onSaveDraft,
  onSaveAndSend,
  onCancel
}: AddSaleDialogProps) => {

  const isAddDisabled = !currentItem.selectedTool || !currentItem.cost || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Sale</DialogTitle>
        </DialogHeader>

        <CustomerInfo customer={selectedCustomer} />

        <div className="space-y-6 py-3">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
            {/* Staff Selector - Uses Real Backend Data */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Sold By (Staff Override)
              </label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white focus:outline-none focus:border-blue-500"
                value={selectedStaff}
                onChange={(e) => onStaffChange(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">-- Default (Logged In User) --</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tax Toggle */}
            <div className="flex items-center space-x-3 pt-1 md:pt-6">
              <input 
                type="checkbox" 
                id="tax-toggle"
                className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                checked={applyTax}
                onChange={(e) => onTaxChange(e.target.checked)}
                disabled={isSubmitting}
              />
              <label htmlFor="tax-toggle" className="text-sm font-medium text-slate-300 cursor-pointer">
                Apply 7.5% Tax
              </label>
            </div>
          </div>

          <EquipmentSelector
            currentItem={currentItem}
            groupedTools={groupedTools}
            filteredGroupedTools={filteredGroupedTools}
            onCategoryChange={onCategoryChange}
            onToolSelect={onToolSelect}
            onCostChange={onCostChange}
            onQuantityChange={onQuantityChange}
            onAddItem={onAddItem}
            isAddDisabled={isAddDisabled}
          />

          {applyTax && saleItems.length > 0 && (
             <div className="text-right text-sm text-slate-400">
               Subtotal: ₦{subtotal.toLocaleString()} | Tax (7.5%): ₦{taxAmount.toLocaleString()}
             </div>
          )}

          <SaleItemsList
            items={saleItems}
            totalCost={totalCost}
            onRemoveItem={onRemoveItem}
          />

          <PaymentDetails
            saleDetails={saleDetails}
            totalCost={totalCost}
            onPaymentPlanChange={onPaymentPlanChange}
            onInitialDepositChange={onInitialDepositChange}
            onPaymentMonthsChange={onPaymentMonthsChange}
            onExpiryDateChange={onExpiryDateChange}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-gray-300 border-slate-600 hover:bg-slate-700 hover:text-white"
          >
            Cancel
          </Button>
          
          <Button
            variant="secondary"
            onClick={onSaveDraft}
            disabled={isSubmitting || saleItems.length === 0}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            {isSubmitting ? "Processing..." : "Save to Draft"}
          </Button>

          <Button
            onClick={onSaveAndSend}
            disabled={isSubmitting || saleItems.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? "Processing..." : "Save & Send Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};