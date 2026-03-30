// src/pages/Sales/components/PaymentDetails.tsx
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Calendar } from "lucide-react"; // Import this for the icon
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../../components/ui/select";
import type { SaleDetails } from "../types";

interface PaymentDetailsProps {
  saleDetails: SaleDetails;
  totalCost: number;
  onPaymentPlanChange: (value: string) => void;
  onInitialDepositChange: (value: string) => void;
  onPaymentMonthsChange: (value: string) => void;
}

const PaymentDetails = ({
  saleDetails,
  totalCost,
  onPaymentPlanChange,
  onInitialDepositChange,
  onPaymentMonthsChange,
}: PaymentDetailsProps) => {

  // Logic to calculate the dynamic due date for the UI preview
  const getDueDatePreview = () => {
    if (saleDetails.payment_plan === "Yes" && saleDetails.payment_months) {
      const months = parseInt(saleDetails.payment_months, 10);
      const date = new Date();
      date.setMonth(date.getMonth() + months);
      
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    return null;
  };

  const dueDatePreview = getDueDatePreview();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Payment Plan</Label>
          <Select
            value={saleDetails.payment_plan}
            onValueChange={onPaymentPlanChange}
          >
            <SelectTrigger className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              <SelectValue placeholder="Select Payment Plan" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 text-white border-slate-600">
              <SelectItem value="No" className="hover:bg-slate-700">
                No (Full Payment)
              </SelectItem>
              <SelectItem value="Yes" className="hover:bg-slate-700">
                Yes (Installment Plan)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {saleDetails.payment_plan === "Yes" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700">
            <div>
              <Label className="text-white">Initial Deposit (₦)</Label>
              <Input
                type="number"
                value={saleDetails.initial_deposit}
                onChange={(e) => onInitialDepositChange(e.target.value)}
                className="bg-slate-700 text-white border-slate-600 placeholder-gray-400"
                placeholder="Enter deposit amount"
              />
              {saleDetails.initial_deposit && (
                <p className="text-xs text-gray-400 mt-1">
                  Remaining: ₦{(totalCost - parseFloat(saleDetails.initial_deposit || "0")).toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <Label className="text-white">Payment Duration</Label>
              <Select
                value={saleDetails.payment_months}
                onValueChange={onPaymentMonthsChange}
              >
                <SelectTrigger className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                  <SelectValue placeholder="Select months" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 text-white border-slate-600">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                    <SelectItem key={month} value={month.toString()} className="hover:bg-slate-700">
                      {month} {month === 1 ? 'month' : 'months'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saleDetails.initial_deposit && saleDetails.payment_months && (
                <p className="text-xs text-gray-400 mt-1">
                  Monthly: ₦{((totalCost - parseFloat(saleDetails.initial_deposit)) / parseInt(saleDetails.payment_months || "1")).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* FINAL DUE DATE DISPLAY */}
          {dueDatePreview && (
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-md">
              <div className="p-2 bg-blue-600/20 rounded-full">
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Final Payment Due By</p>
                <p className="text-sm text-blue-100 font-semibold">{dueDatePreview}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { PaymentDetails };