import { InvoiceTemplate } from "../components/InvoiceTemplate";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";

const InvoicePage = () => {
  const navigate = useNavigate();
  const savedSale = localStorage.getItem("currentInvoice");

  if (!savedSale || savedSale === "undefined") {
    return (
      <DashboardLayout>
        <div className="p-10 text-center text-white">
          <p>No Invoice Data Found. Please go back.</p>
          <Button onClick={() => navigate(-1)} className="mt-4 italic bg-slate-800 hover:bg-slate-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  let sale: any;
  try {
    sale = JSON.parse(savedSale);
  } catch {
    sale = {};
  }

  const safelyParseSerials = (serialData: any) => {
    if (Array.isArray(serialData)) return serialData;
    if (!serialData) return [];
    try { return JSON.parse(serialData); }
    catch { return [serialData]; }
  };

  // Pass everything directly from the sale object — no calculations
  const formattedInvoiceData = {
    invoiceNo:     sale?.invoice_number || sale?.invoiceNo || `INV-${sale?.id || "001"}`,
    date:          sale?.date_sold || sale?.date || new Date().toLocaleDateString(),
    paymentStatus: (sale?.payment_status || "").toLowerCase(),
    totalCost:     parseFloat(sale?.total_cost || "0"),
    taxAmount:     parseFloat(sale?.tax_amount || "0"),
    initialDeposit: parseFloat(sale?.initial_deposit || "0"),
    customer: {
      name:    sale?.customer_name || sale?.name || "Unknown Customer",
      address: sale?.state || "Lagos, Nigeria",
    },
    items: Array.isArray(sale?.items) && sale.items.length > 0
      ? sale.items.map((item: any) => ({
          description:    item?.equipment || item?.description || "Equipment Purchase",
          equipment_type: item?.equipment_type || item?.category || "",
          serials:        safelyParseSerials(item?.serial_set || item?.serials),
          qty:            item?.quantity || item?.qty || 1,
          cost:           parseFloat(item?.cost || item?.amount || item?.rate || "0"),
        }))
      : [{
          description:    sale?.equipment || "Equipment Purchase",
          equipment_type: "",
          serials:        [],
          qty:            1,
          cost:           parseFloat(sale?.total_cost || "0"),
        }],
  };

  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .print-hidden,
            nav, header, aside, footer,
            [data-sidebar], [data-radix-popper-content-wrapper] {
              display: none !important;
            }
            body, html {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body > div, #root > div, main {
              all: unset !important;
              display: block !important;
            }
            .print-area {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100vw !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              z-index: 9999 !important;
            }
            #printable-invoice {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 20mm 15mm !important;
              box-shadow: none !important;
            }
          }
        `,
      }} />

      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        <div className="flex justify-between items-center bg-slate-800/40 p-4 rounded-lg border border-slate-700 print-hidden">
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

        <div className="print-area">
          <InvoiceTemplate data={formattedInvoiceData} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvoicePage;