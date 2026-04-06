import { fetchCustomerOwingData, getSales, getReceiverCodes } from "../services/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Package, CreditCard, Calendar, CheckCircle,
  AlertCircle, Lock, Copy, Activity, AlertTriangle
} from "lucide-react";
import { Progress } from "../components/ui/progress";

// ------------------------------
// STATUS HELPERS
// ------------------------------
const STATUS_OVERDUE_VARIANTS  = ["overdue"];
const STATUS_PAID_VARIANTS     = ["completed", "paid", "fully-paid", "fully_paid"];
const STATUS_ONGOING_VARIANTS  = ["on-track", "due-soon", "ongoing"];

const isStatusOverdue = (status: string) =>
  STATUS_OVERDUE_VARIANTS.includes((status || "").toLowerCase().trim());

const isStatusPaid = (status: string) =>
  STATUS_PAID_VARIANTS.includes((status || "").toLowerCase().trim());

const isStatusOngoing = (status: string) =>
  STATUS_ONGOING_VARIANTS.includes((status || "").toLowerCase().trim());

// Maps DB status to display label
const getStatusLabel = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  if (s === "overdue")                         return "Overdue";
  if (s === "on-track" || s === "ongoing")     return "Ongoing";
  if (s === "due-soon")                        return "Ongoing";
  if (s === "fully-paid" || s === "fully_paid") return "Fully Paid";
  if (s === "completed"  || s === "paid")      return "Paid";
  return "Ongoing";
};

const getStatusTextColor = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  if (s === "overdue")                                        return "text-red-400";
  if (s === "fully-paid" || s === "completed" || s === "paid") return "text-green-400";
  return "text-blue-400"; 
};

const getStatusIconColor = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  if (s === "overdue")                                        return "text-red-500";
  if (s === "fully-paid" || s === "completed" || s === "paid") return "text-green-500";
  return "text-blue-500";
};

const getStatusSubtext = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  if (s === "overdue")   return "Payment is past due — please contact us";
  if (s === "due-soon")  return "Payment is due within 7 days";
  if (s === "fully-paid" || s === "completed" || s === "paid") return "All payments are complete";
  return "Installment plan is active";
};

// ------------------------------
// COMPONENT
// ------------------------------
const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading]       = useState(true);
  const [userName, setUserName]     = useState("Customer");
  const [financials, setFinancials] = useState<any>(null);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    let userEmail  = "";
    let userPhone  = "";
    let parsedName = "";

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        parsedName   = (parsed.name  || "").trim();
        setUserName(parsedName || "Customer");
        userEmail    = (parsed.email || "").toLowerCase().trim();
        userPhone    = (parsed.phone || "").trim();
      } catch (e) {}
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const [financialData, salesData, codesData] = await Promise.all([
          fetchCustomerOwingData(),
          getSales(),
          getReceiverCodes(),
        ]);

        // ------------------------------
        // FINANCIALS
        // ------------------------------
        const customersList: any[] = financialData?.customers || [];

        const myRecord = customersList.find((c: any) => {
          const phoneMatch = userPhone && (c.phone || "").trim() === userPhone;
          const emailMatch = userEmail && (c.email || "").toLowerCase().trim() === userEmail;
          const nameMatch  = parsedName && (c.name  || "").toLowerCase().trim() === parsedName.toLowerCase().trim();
          return phoneMatch || emailMatch || nameMatch;
        });

        if (myRecord) {
          const total    = parseFloat(myRecord.totalSellingPrice ?? 0);
          const paid     = parseFloat(myRecord.amountPaid        ?? 0);
          const owed     = parseFloat(myRecord.amountLeft        ?? 0);
          const rawStatus = myRecord.status ?? "on-track";

          const progress = total > 0 ? Math.min((paid / total) * 100, 100) : 100;

          setFinancials({
            totalSellingPrice: total,
            amountPaid:        paid,
            amountLeft:        owed,
            status:            rawStatus,
            progress,
          });
        } else {
          setFinancials({
            totalSellingPrice: 0,
            amountPaid:        0,
            amountLeft:        0,
            status:            "on-track",
            progress:          100,
          });
        }

        // ------------------------------
        // EQUIPMENT 
        // ------------------------------
        const allSales = salesData?.results || salesData || [];

        const customerSales = allSales.filter((sale: any) => {
          const matchPhone = userPhone && (sale.phone || "").trim() === userPhone;
          const matchEmail = userEmail && (sale.email || "").toLowerCase().trim() === userEmail;
          const matchName  = parsedName && (sale.name  || "").toLowerCase().trim() === parsedName.toLowerCase().trim();
          return matchPhone || matchEmail || matchName;
        });

        const myBatchItems = codesData?.sold || [];
        let allEquipment: any[] = [];

        const cleanString = (s: any) =>
          String(s || "").replace(/[\[\]\s"']/g, "").toLowerCase();

        customerSales.forEach((sale: any) => {
          let itemsArray = Array.isArray(sale.items)
            ? sale.items
            : JSON.parse(sale.items || "[]");

          const saleInvoice     = cleanString(sale.invoice_number || sale.id);
          const saleLevelStatus = (sale.payment_status || "").toLowerCase().trim();

          itemsArray.forEach((item: any) => {
            // Parse serial numbers
            let itemSerials: string[] = [];
            if (typeof item.serial_number === "string" && item.serial_number.includes("[")) {
              try {
                itemSerials = JSON.parse(item.serial_number).map(cleanString);
              } catch {
                itemSerials = [cleanString(item.serial_number)];
              }
            } else {
              itemSerials = [cleanString(item.serial_number)];
            }

            // Find ALL matching batch items to extract all activation codes
            const allMatchedBatchItems = myBatchItems.filter((b: any) => {
              const batchSerial  = cleanString(b.serial);
              const batchInvoice = cleanString(b.invoice);
              return (
                itemSerials.includes(batchSerial) ||
                (batchInvoice === saleInvoice && batchInvoice !== "")
              );
            });

            // Extract all valid codes and remove duplicates
            const extractedCodes = allMatchedBatchItems
              .map((b: any) => b.current_code)
              .filter((code: any) => code && typeof code === 'string' && code.trim() !== "");
            const uniqueCodes = [...new Set(extractedCodes)];

            // Match first batch item to keep existing status logic perfectly intact
            const matchedBatchItem = allMatchedBatchItems[0];

            let batchStatus = "";
            let expiryDate  = null;

            if (matchedBatchItem) {
              batchStatus = (matchedBatchItem.payment_status || "").toLowerCase().trim();
              expiryDate  = matchedBatchItem.duration || matchedBatchItem.expiry || null;
            }

            // ------------------------------
            // OVERDUE / FULLY PAID LOGIC
            // ------------------------------
            const isOverdue =
              isStatusOverdue(batchStatus) ||
              isStatusOverdue(saleLevelStatus);

            const isBatchPaid = matchedBatchItem ? isStatusPaid(batchStatus) : false;
            const isSalePaid  = isStatusPaid(saleLevelStatus);
            const isFullyPaid = !isOverdue && (isBatchPaid || isSalePaid);

            allEquipment.push({
              invoice:        sale.invoice_number || sale.id,
              tool_name:      item.equipment || item.name || "Equipment",
              serial:         item.serial_number, // Kept for safety
              serials_array:  itemSerials.length > 0 ? itemSerials : [cleanString(item.serial_number)], // For chip display
              category:       item.category || "Tool",
              payment_status: isOverdue ? "overdue" : isFullyPaid ? "paid" : saleLevelStatus,
              is_overdue:     isOverdue,
              is_fully_paid:  isFullyPaid,
              current_codes:  isOverdue || !isFullyPaid ? [] : uniqueCodes, // Multiple codes support
              expiry:         expiryDate,
            });
          });
        });

        // Fallback: codes generated outside explicit sales records
        if (allEquipment.length === 0 && myBatchItems.length > 0) {
          allEquipment = myBatchItems
            .filter((b: any) => cleanString(b.customer_name) === cleanString(parsedName))
            .map((item: any) => {
              const batchStatus = (item.payment_status || "").toLowerCase();
              const isOverdue   = isStatusOverdue(batchStatus);
              const isFullyPaid = !isOverdue && isStatusPaid(batchStatus);
              const validCode   = item.current_code && item.current_code.trim() !== "" ? [item.current_code] : [];

              return {
                invoice:        item.invoice || "N/A",
                tool_name:      item.tool_name || "Equipment",
                serial:         item.serial,
                serials_array:  [cleanString(item.serial)], // For chip display
                category:       "Receiver",
                payment_status: isOverdue ? "overdue" : "paid",
                is_overdue:     isOverdue,
                is_fully_paid:  isFullyPaid,
                current_codes:  isOverdue || !isFullyPaid ? [] : validCode,
                expiry:         item.duration || item.expiry || null,
              };
            });
        }

        setEquipmentList(allEquipment);
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ------------------------------
  // LOADING
  // ------------------------------
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96 text-blue-200">
          <Activity className="w-8 h-8 animate-spin mr-2" />
          Loading your dashboard...
        </div>
      </DashboardLayout>
    );
  }

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <DashboardLayout>
      <div className="space-y-8 p-2">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Hello, <span className="text-blue-400">{userName}</span>
            </h1>
            <p className="text-slate-400 mt-1">Manage your equipment and payments.</p>
          </div>
          <Button
            onClick={() => navigate("/customer/payments")}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            View Payment Plan
          </Button>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">

          {/* Total Purchase Value */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Purchase Value
              </CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ₦{(financials?.totalSellingPrice || 0).toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}
              </div>
              {(financials?.amountPaid ?? 0) > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  ₦{(financials.amountPaid).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                  })} paid so far
                </p>
              )}
            </CardContent>
          </Card>

          {/* Outstanding Balance */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Outstanding Balance
              </CardTitle>
              <AlertCircle
                className={`h-4 w-4 ${
                  (financials?.amountLeft ?? 0) > 0 ? "text-red-500" : "text-green-500"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (financials?.amountLeft ?? 0) > 0 ? "text-red-400" : "text-green-400"
              }`}>
                {(financials?.amountLeft ?? 0) > 0
                  ? `₦${(financials.amountLeft).toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                    })}`
                  : "Cleared"}
              </div>
              <Progress
                value={financials?.progress ?? 0}
                className="h-2 mt-2 bg-slate-800"
              />
              <p className="text-xs text-slate-500 mt-1">
                {Math.round(financials?.progress ?? 0)}% cleared
              </p>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Account Status
              </CardTitle>
              <Calendar className={`h-4 w-4 ${getStatusIconColor(financials?.status)}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getStatusTextColor(financials?.status)}`}>
                {getStatusLabel(financials?.status || "")}
              </div>
              <p className="text-xs text-slate-500 mt-1 tracking-wide">
                {getStatusSubtext(financials?.status || "")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Equipment Portfolio */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">My Equipment Portfolio</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {equipmentList.map((item, index) => (
              <Card key={index} className="bg-[#0f1f3d] border-[#1b2d55] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-[#142647]">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-blue-100">
                      {item.tool_name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-xs border-blue-500/30 text-blue-300 bg-blue-500/10"
                    >
                      {item.category}
                    </Badge>
                  </div>
                  {item.is_overdue ? (
                    <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                  ) : item.is_fully_paid ? (
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-yellow-500" />
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  
                  {/* NEW UI: Serial Numbers as Chips */}
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                      Serial Number(s)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.serials_array.map((serialNum: string, idx: number) => (
                        <span 
                          key={idx} 
                          className="font-mono text-xs text-blue-200 bg-[#1b2d55] px-2 py-1.5 rounded-md border border-blue-800/40"
                        >
                          {serialNum.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* NEW UI: Multiple Activation Codes */}
                  <div className={`p-3 rounded-lg border ${
                    item.is_overdue
                      ? "bg-red-950/20 border-red-900/40"
                      : item.is_fully_paid
                      ? "bg-green-950/20 border-green-900/40"
                      : "bg-yellow-950/10 border-yellow-900/30"
                  }`}>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                      Activation Code(s)
                    </p>

                    {item.is_overdue ? (
                      // OVERDUE — always locked, code never shown
                      <div className="text-center py-2">
                        <div className="text-lg font-bold text-slate-700 blur-[4px] select-none">
                          XXXX-XXXX-XXXX-XXXX
                        </div>
                        <p className="text-xs text-red-400 mt-1 font-medium">
                          Account overdue — contact support
                        </p>
                      </div>
                    ) : item.is_fully_paid ? (
                      // FULLY PAID — show list of all codes
                      item.current_codes && item.current_codes.length > 0 ? (
                        <div className="space-y-2">
                          {item.current_codes.map((code: string, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-900/40 p-2 rounded border border-slate-800">
                              <code className="text-sm md:text-md font-mono text-green-400 tracking-wider break-all mr-2">
                                {code}
                              </code>
                              <button
                                className="text-slate-400 hover:text-white flex-shrink-0 transition-colors"
                                onClick={() => navigator.clipboard.writeText(code)}
                                title="Copy Code"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Edge case: Paid, but no code generated yet
                        <code className="text-md font-mono text-green-400 tracking-wider block text-center py-2">
                          PENDING GENERATION
                        </code>
                      )
                    ) : (
                      // ONGOING — locked until fully paid
                      <div className="text-center py-2">
                        <div className="text-lg font-bold text-slate-700 blur-[4px] select-none">
                          XXXX-XXXX-XXXX-XXXX
                        </div>
                        <p className="text-xs text-yellow-300 mt-1">
                          Requires full payment
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-xs text-slate-500 border-t border-slate-800/50">
                    Invoice Reference: {item.invoice}
                  </div>
                </CardContent>
              </Card>
            ))}

            {equipmentList.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No equipment records found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;