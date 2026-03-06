import React from "react";
import { InvoiceTemplate } from "../components/InvoiceTemplate";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
// Import your layout component
import { DashboardLayout } from "../components/DashboardLayout"; 

const InvoicePage = () => {
  const navigate = useNavigate();
  
  // 1. Get the data from localStorage
  const savedSale = localStorage.getItem("currentInvoice");
  
  // 2. Handle the empty state inside the layout so the sidebar still shows
  if (!savedSale) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center text-white">
          <p>No Invoice Data Found. Please go back to Sales.</p>
          <Button onClick={() => navigate("/sales")} className="mt-4 italic">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Sales Table
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  const sale = JSON.parse(savedSale);

  // 3. Format the data to match the "InvoiceProps" interface exactly
  const formattedInvoiceData = {
    invoiceNo: sale.invoice_number || `INV-${sale.id}`, //
    date: sale.date_sold ? new Date(sale.date_sold).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : "N/A", //
    customer: {
      name: sale.name, //
      address: sale.state || "Lagos, Nigeria", //
    },
    items: sale.items.map((item: any) => ({
      description: item.equipment, //
      equipment_type: item.equipment_type,
      // Parse serials from the sale item
      serials: Array.isArray(item.serial_set) 
        ? item.serial_set 
        : JSON.parse(item.serial_set || "[]"),
      qty: 1, 
      rate: parseFloat(item.cost), //
      discount: 0 
    })),
    paymentMade: sale.payment_status === 'completed' 
      ? parseFloat(sale.total_cost) 
      : parseFloat(sale.initial_deposit || "0") //
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        {/* Navigation & Print Actions (Hidden on paper) */}
        <div className="flex justify-between items-center bg-slate-800/40 p-4 rounded-lg border border-slate-700 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-300">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button 
            onClick={() => window.print()} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Printer className="w-4 h-4 mr-2" /> Print Invoice
          </Button>
        </div>

        {/* 🚀 Passing the 'data' prop here fixes your error */}
        <div className="print:m-0">
          <InvoiceTemplate data={formattedInvoiceData} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvoicePage;