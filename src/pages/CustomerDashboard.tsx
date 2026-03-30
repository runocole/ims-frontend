import { fetchCustomerOwingData, getSales, getReceiverCodes } from "../services/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Package, CreditCard, Calendar, CheckCircle, AlertCircle, Lock, Copy, Activity } from "lucide-react";
import { Progress } from "../components/ui/progress"; 

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Customer");
  const [financials, setFinancials] = useState<any>(null); 
  const [equipmentList, setEquipmentList] = useState<any[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    let userEmail = "";
    let userPhone = "";
    let parsedName = "";
    
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        parsedName = parsed.name || "";
        setUserName(parsedName || "Customer");
        userEmail = (parsed.email || "").toLowerCase().trim();
        userPhone = (parsed.phone || "").trim();
      } catch (e) {}
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [financialData, salesData, codesData] = await Promise.all([
            fetchCustomerOwingData(), 
            getSales(),
            getReceiverCodes() 
        ]);

        // 1. Setup Financials - Broader matching logic
        const myFinancials = financialData?.customers?.find((c: any) => 
            (userEmail && c.email?.toLowerCase().trim() === userEmail) || 
            (userPhone && c.phone?.trim() === userPhone) ||
            (parsedName && c.name?.toLowerCase().trim() === parsedName.toLowerCase().trim())
        );

        const total = myFinancials?.totalSellingPrice || 0;
        const owed = myFinancials?.amountLeft || 0;
        setFinancials({
            totalSellingPrice: total,
            amountLeft: owed,
            status: myFinancials?.status || "Up to date",
            progress: total > 0 ? ((total - owed) / total) * 100 : 100
        });
        
        // 2. Match Equipment with Batch-Imported Codes
        const allSales = salesData?.results || salesData || [];
        
        // Smarter matching: Check Email OR Phone OR Name
        const customerSales = allSales.filter((sale: any) => {
            const matchEmail = userEmail && sale.email?.toLowerCase().trim() === userEmail;
            const matchPhone = userPhone && sale.phone?.trim() === userPhone;
            const matchName = parsedName && sale.name?.toLowerCase().trim() === parsedName.toLowerCase().trim();
            return matchEmail || matchPhone || matchName;
        });

        const myBatchItems = codesData?.sold || [];
        let allEquipment: any[] = [];

        // 🔥 NEW: Aggressive string cleaner to ensure serials match perfectly
        const cleanString = (s: any) => String(s || "").replace(/[\[\]\s"']/g, '').toLowerCase();

        // Loop through the customer's sales
        customerSales.forEach((sale: any) => {
            let itemsArray = Array.isArray(sale.items) ? sale.items : JSON.parse(sale.items || "[]");
            const saleInvoice = cleanString(sale.invoice_number || sale.id);

            itemsArray.forEach((item: any) => {
                // 1. Extract and clean the item's serial numbers
                let itemSerials: string[] = [];
                if (typeof item.serial_number === 'string' && item.serial_number.includes('[')) {
                    try {
                        itemSerials = JSON.parse(item.serial_number).map(cleanString);
                    } catch {
                        itemSerials = [cleanString(item.serial_number)];
                    }
                } else {
                    itemSerials = [cleanString(item.serial_number)];
                }

                // 2. 🔥 STRICT MATCHING: Find this item in the Code Management Batch Data
                const matchedBatchItem = myBatchItems.find((b: any) => {
                    const batchSerial = cleanString(b.serial);
                    const batchInvoice = cleanString(b.invoice);
                    
                    // Match by Serial Number OR exact Invoice match to be 100% safe
                    return itemSerials.includes(batchSerial) || (batchInvoice === saleInvoice && batchInvoice !== "");
                });

                // 3. APPLY STRICT BATCH STATUS
                let paymentStatus = "paid"; 
                let rawCode = null;
                let expiryDate = null;

                if (matchedBatchItem) {
                    // 👉 If it exists in Code Management, strictly use exactly what that page says!
                    paymentStatus = String(matchedBatchItem.payment_status || "paid").toLowerCase().trim();
                    rawCode = matchedBatchItem.current_code;
                    expiryDate = matchedBatchItem.duration || matchedBatchItem.expiry || null; 
                } else {
                    // Fallback only if the code hasn't been generated in the batch page yet
                    paymentStatus = String(sale.payment_status || "paid").toLowerCase().trim();
                }

                const isOverdue = paymentStatus === "overdue";

                allEquipment.push({
                    invoice: sale.invoice_number || sale.id,
                    tool_name: item.equipment || item.name || "Equipment",
                    serial: item.serial_number, 
                    category: item.category || "Tool",
                    payment_status: isOverdue ? "overdue" : "paid",
                    is_overdue: isOverdue,
                    is_fully_paid: !isOverdue, 
                    current_code: isOverdue ? null : rawCode, // Hide code if overdue!
                    expiry: expiryDate
                });
            });
        });

        // 4. Fallback for codes generated outside of explicit sales records
        if (allEquipment.length === 0 && myBatchItems.length > 0) {
            allEquipment = myBatchItems
                .filter((b: any) => cleanString(b.customer_name) === cleanString(parsedName))
                .map((item: any) => {
                    const isOverdue = String(item.payment_status).toLowerCase() === "overdue";
                    return {
                        invoice: item.invoice || "N/A",
                        tool_name: item.tool_name || "Equipment",
                        serial: item.serial,
                        category: "Receiver",
                        payment_status: isOverdue ? "overdue" : "paid",
                        is_overdue: isOverdue,
                        is_fully_paid: !isOverdue,
                        current_code: isOverdue ? null : item.current_code,
                        expiry: item.duration || item.expiry || null
                    }
                });
        }

        console.log("4. Final Data sending to Cards:", allEquipment);
        setEquipmentList(allEquipment);

      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []); // Added dependencies to ensure it runs correctly

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

  return (
    <DashboardLayout>
      <div className="space-y-8 p-2">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Hello, <span className="text-blue-400">{userName}</span>
            </h1>
            <p className="text-slate-400 mt-1">Manage your equipment and payments.</p>
          </div>
          <Button onClick={() => navigate('/customer/payments')} className="bg-green-600 hover:bg-green-700 text-white">
            <CreditCard className="w-4 h-4 mr-2" />
            View Payment Plan
          </Button>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Purchase Value</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₦{financials?.totalSellingPrice?.toLocaleString() || "0"}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Outstanding Balance</CardTitle>
              <AlertCircle className={`h-4 w-4 ${financials?.amountLeft > 0 ? "text-red-500" : "text-green-500"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₦{financials?.amountLeft?.toLocaleString() || "0"}</div>
              <Progress value={financials?.progress || 0} className="h-2 mt-2 bg-slate-800" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Status</CardTitle>
              <Calendar className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white capitalize">{financials?.status || "Up to date"}</div>
              <p className="text-xs text-slate-500 mt-1 tracking-wide">Status based on current records</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchased Equipment List */}
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">My Equipment Portfolio</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {equipmentList.map((item, index) => (
                    <Card key={index} className="bg-[#0f1f3d] border-[#1b2d55] overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-[#142647]">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-semibold text-blue-100">{item.tool_name}</CardTitle>
                                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300 bg-blue-500/10">
                                    {item.category}
                                </Badge>
                            </div>
                            {item.is_fully_paid ? (
                                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-500" /></div>
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center"><Lock className="h-5 w-5 text-red-500" /></div>
                            )}
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Serial Number</p>
                                <p className="font-mono text-sm text-white bg-slate-900/50 p-2 rounded border border-slate-800 break-all">{item.serial}</p>
                            </div>

                            <div className={`p-3 rounded-lg border ${item.is_fully_paid ? "bg-green-950/30 border-green-900/50" : "bg-red-950/10 border-red-900/30"}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Activation Code(s)</p>
                                </div>
                                {item.is_fully_paid ? (
                                    <div className="flex justify-between items-center mt-1">
                                        <code className="text-md font-mono text-green-400 tracking-wider">
                                            {item.current_code ? item.current_code : "PENDING GENERATION"}
                                        </code>
                                        {item.current_code && (
                                            <button className="text-slate-400 hover:text-white ml-2 flex-shrink-0" onClick={() => navigator.clipboard.writeText(item.current_code)}>
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-2">
                                        <div className="text-lg font-bold text-slate-700 blur-[4px] select-none">XXXX-XXXX-XXXX-XXXX</div>
                                        <p className="text-xs text-red-300">Requires full payment</p>
                                    </div>
                                )}
                            </div>
                            <div className="pt-2 text-xs text-slate-500 border-t border-slate-800">Invoice Reference: {item.invoice}</div>
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