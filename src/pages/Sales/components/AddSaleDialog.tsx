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

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomer: Customer | null;
  currentItem: CurrentItem;
  groupedTools: GroupedTool[];
  filteredGroupedTools: GroupedTool[];
  saleItems: SaleItem[];
  saleDetails: SaleDetails;
  totalCost: number;
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
  totalCost,
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

  // We disable the "Add to Sale" button if fields are missing OR if it's currently adding items
  const isAddDisabled = !currentItem.selectedTool || !currentItem.cost || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Sale</DialogTitle>
        </DialogHeader>

        {/* Displays Selected Customer details */}
        <CustomerInfo customer={selectedCustomer} />

        <div className="space-y-6 py-3">
          {/* Equipment selection and Quantity input */}
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

          {/* Table showing items already added to the sale */}
          <SaleItemsList
            items={saleItems}
            totalCost={totalCost}
            onRemoveItem={onRemoveItem}
          />

          {/* Payment plan logic */}
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