import { useEffect, useState } from "react";
import { getSales, fetchCustomerOwingData } from "../services/api";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { FileText, CheckCircle, Clock, UploadCloud, Activity } from "lucide-react";

const CustomerPayments = () => {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoading(true);
        // Added safety: If one fails, the other can still load
        const [salesData, financialData] = await Promise.all([
          getSales().catch(() => []),
          fetchCustomerOwingData().catch(() => null)
        ]);
        
        setSales(Array.isArray(salesData) ? salesData : salesData?.results || []);
        setFinancials(financialData);
      } catch (error) {
        console.error("Failed to load payment data", error);
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96 text-blue-200">
          <Activity className="w-8 h-8 animate-spin mr-2" />
          Loading payment history...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-2">
        <div>
          <h2 className="text-3xl font-bold text-white">Payment Plans & Invoices</h2>
          <p className="text-slate-400">Track your part-payments and upload proof of payment.</p>
        </div>

        {/* Global Summary - Added safe access with ?? 0 */}
        {financials && (financials?.amountLeft ?? 0) > 0 && (
            <Card className="bg-orange-950/20 border-orange-900/50">
                <CardContent className="flex items-center justify-between p-6">
                    <div>
                        <p className="text-orange-400 font-medium">Total Outstanding Balance</p>
                        <h3 className="text-3xl font-bold text-white">
                          ₦{(financials?.amountLeft ?? 0).toLocaleString()}
                        </h3>
                    </div>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Upload Global Proof
                    </Button>
                </CardContent>
            </Card>
        )}

        {/* Invoice List */}
        <div className="grid gap-4">
            {sales.map((sale: any, index: number) => {
                // Use ?? 0 to prevent toLocaleString() from crashing on null
                const totalAmount = parseFloat(sale?.total_amount || sale?.total_cost) || 0;
                const amountPaid = parseFloat(sale?.amount_paid || sale?.initial_deposit) || 0;
                const balance = totalAmount - amountPaid;
                const isPaid = sale?.payment_status?.toLowerCase() === "completed" || balance <= 0;

                return (
                    <Card key={sale?.id || index} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${isPaid ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                                    <FileText className={`w-5 h-5 ${isPaid ? 'text-green-500' : 'text-blue-500'}`} />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-lg">Invoice #{sale?.invoice_number || 'N/A'}</CardTitle>
                                    <p className="text-sm text-slate-400">
                                        Date: {sale?.date_sold ? new Date(sale.date_sold).toLocaleDateString() : "No Date"}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-0">
                                {isPaid ? (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Fully Paid
                                    </Badge>
                                ) : (
                                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                                        <Clock className="w-3 h-3 mr-1" /> Part Payment
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 py-4 border-t border-slate-800 mt-2">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Total Invoice</p>
                                    <p className="text-lg font-semibold text-slate-200">₦{totalAmount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Amount Paid</p>
                                    <p className="text-lg font-semibold text-green-400">₦{amountPaid.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Balance Owed</p>
                                    <p className="text-lg font-semibold text-orange-400">₦{balance > 0 ? balance.toLocaleString() : "0"}</p>
                                </div>
                            </div>

                            {!isPaid && (
                                <div className="flex justify-end pt-2">
                                    <Button variant="outline" className="text-blue-400 border-blue-900 hover:bg-blue-950">
                                        Upload Proof of Payment
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {sales.length === 0 && !loading && (
                <div className="text-center py-10 text-slate-500 bg-slate-900/30 rounded-lg border border-slate-800 border-dashed">
                    <p>No invoices found.</p>
                </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerPayments;