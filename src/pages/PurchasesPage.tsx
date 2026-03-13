import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Wallet, User, ArrowLeft, Loader2, Package, Calendar, CheckCircle2, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "http://localhost:8000/api"; 

const PurchasesPage: React.FC = () => {
  const { phone, invoice_number } = useParams<{ phone: string, invoice_number: string }>();
  const navigate = useNavigate();
  
  // Data State
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Submission State
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- EDIT STATE ---
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState({ total_cost: "", initial_deposit: "" });
  
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState<string>("");

  // Helper function to color-code the equipment type badge
  const getBadgeStyle = (type?: string) => {
    if (!type) return "bg-slate-700/50 text-slate-300 border-slate-600";
    
    const t = type.toLowerCase();
    if (t.includes("base") && t.includes("rover")) {
      return "bg-purple-900/50 text-purple-400 border-purple-800";
    }
    if (t.includes("base")) {
      return "bg-blue-900/50 text-blue-400 border-blue-800";
    }
    if (t.includes("rover")) {
      return "bg-teal-900/50 text-teal-400 border-teal-800";
    }
    if (t.includes("accessory") || t.includes("accessories")) {
      return "bg-slate-700/50 text-slate-300 border-slate-600";
    }
    return "bg-emerald-900/30 text-emerald-400 border-emerald-800/50";
  };

  // --- Fetch Data ---
  const fetchInvoiceData = async () => {
    if (!phone || !invoice_number) return;
    setLoading(true);
    
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      const [salesRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sales/?invoice=${invoice_number}`, { headers }),
        fetch(`${API_BASE_URL}/payments/?phone=${phone}`, { headers })
      ]);

      const salesData = await salesRes.json();
      const paymentsData = await paymentsRes.json();

      const specificSale = Array.isArray(salesData) ? salesData.find((s: any) => s.invoice_number === invoice_number) || salesData[0] : (salesData.results || []).find((s: any) => s.invoice_number === invoice_number);
      setInvoiceDetail(specificSale);
      setEditInvoiceData({
        total_cost: specificSale?.total_cost || "0",
        initial_deposit: specificSale?.initial_deposit || "0"
      });

      const specificPayments = Array.isArray(paymentsData) ? paymentsData : (paymentsData.results || []);
      
      setInvoicePayments(specificPayments.filter((p: any) => 
        p.invoice_number === invoice_number || p.sale === specificSale?.id
      ));

    } catch (error) {
      toast.error("Failed to fetch invoice details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [phone, invoice_number]);

  // Calculations
  const safeParseAmount = (val: any) => parseFloat(val?.toString().replace(/,/g, "") || "0");
  const initialDeposit = parseFloat(invoiceDetail?.initial_deposit || "0");
  const totalSubsequentPayments = invoicePayments.reduce((acc: number, p: any) => acc + parseFloat(p.amount || "0"), 0);
  const totalPaid = initialDeposit + totalSubsequentPayments;
  const totalCost = parseFloat(invoiceDetail?.total_cost || "0");
  const currentBalance = totalCost - totalPaid;

  // --- UPDATE INVOICE DETAILS ---
  const handleUpdateInvoice = async () => {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    try {
      const response = await fetch(`${API_BASE_URL}/sales/${invoiceDetail.id}/`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(editInvoiceData),
      });

      if (response.ok) {
        toast.success("Invoice updated successfully!");
        setIsEditingInvoice(false);
        fetchInvoiceData();
      } else {
        toast.error("Failed to update invoice.");
      }
    } catch (error) {
      toast.error("Network error.");
    }
  };

  // --- UPDATE A SPECIFIC PAYMENT ---
  const handleUpdatePayment = async (paymentId: number) => {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: editPaymentAmount }),
      });

      if (response.ok) {
        toast.success("Payment log updated!");
        setEditingPaymentId(null);
        fetchInvoiceData();
      } else {
        toast.error("Failed to update payment.");
      }
    } catch (error) {
      toast.error("Network error.");
    }
  };

  // --- ADD NEW PAYMENT ---
  const handleLogNewPayment = async () => {
    const amount = parseFloat(paymentAmount || "0");
    if (amount <= 0 || isNaN(amount)) return toast.error("Please enter a valid amount");

    setIsSubmitting(true);
    const token = localStorage.getItem("access") || localStorage.getItem("token");

    const newPaymentLog = {
      sale: invoiceDetail?.id,
      invoice_number: invoice_number,
      phone: phone,
      name: invoiceDetail?.name || "Customer",
      amount: amount.toString(),
      status: "completed" 
    };

    try {
      const response = await fetch(`${API_BASE_URL}/payments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(newPaymentLog),
      });

      if (response.ok) {
        const createdPayment = await response.json(); 
        
        setPaymentAmount("");
        setInvoicePayments(prev => [...prev, createdPayment]);

        const newTotalPaid = totalPaid + amount;
        const newInvoiceStatus = newTotalPaid >= totalCost ? "completed" : "ongoing";
        
        try {
          const patchRes = await fetch(`${API_BASE_URL}/sales/${invoiceDetail.id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ payment_status: newInvoiceStatus }), 
          });

          if (patchRes.ok) {
            if (newInvoiceStatus === "completed") {
              toast.success("Balance cleared! Invoice marked as Completed.");
            } else {
              toast.success("Payment logged! Invoice marked as Ongoing.");
            }
            setInvoiceDetail((prev: any) => prev ? { ...prev, payment_status: newInvoiceStatus } : prev);
          } else {
            console.error("Failed to patch invoice status. Make sure 'ongoing' is in Django choices.");
            toast.success("Payment saved, but failed to update invoice status.");
          }
        } catch (patchErr) {
          console.error("Failed to auto-update invoice status", patchErr);
          toast.error("Payment saved, but network error updating invoice status.");
        }
        
      } else {
        toast.error("Failed to log payment.");
      }
    } catch (error) {
      toast.error("Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-emerald-500 animate-spin" /></div></DashboardLayout>;

  if (!invoiceDetail) return (
    <DashboardLayout>
      <div className="flex justify-center items-center h-screen flex-col text-white">
        <p className="text-xl font-bold mb-4">Could not load invoice data.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-10 pt-6">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Ledger
          </Button>
          <div className="text-right">
             <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Invoice Ref</h2>
             <p className="text-2xl text-emerald-500 font-mono font-black">{invoice_number}</p>
          </div>
        </div>

        {/* --- INVOICE SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
            <p className="text-xs text-gray-400 uppercase font-bold mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400"/> Customer Name
            </p>
            <p className="text-lg font-bold text-white uppercase truncate">
                {invoiceDetail?.name || "Unknown"} 
            </p>
            <p className="text-sm text-emerald-500 font-mono mt-1">{phone}</p>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-400 uppercase font-bold flex items-center gap-2">Invoice Values</p>
              {!isEditingInvoice ? (
                <button onClick={() => setIsEditingInvoice(true)} className="text-blue-400 hover:text-blue-300"><Edit2 className="w-4 h-4"/></button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleUpdateInvoice} className="text-emerald-400 hover:text-emerald-300"><Save className="w-4 h-4"/></button>
                  <button onClick={() => setIsEditingInvoice(false)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4"/></button>
                </div>
              )}
            </div>
            
            {isEditingInvoice ? (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16">Total:</span>
                  <Input className="h-7 text-xs bg-slate-900" value={editInvoiceData.total_cost} onChange={e => setEditInvoiceData({...editInvoiceData, total_cost: e.target.value})} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16">Deposit:</span>
                  <Input className="h-7 text-xs bg-slate-900" value={editInvoiceData.initial_deposit} onChange={e => setEditInvoiceData({...editInvoiceData, initial_deposit: e.target.value})} />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-300">Total: <span className="text-white font-bold font-mono">₦{totalCost.toLocaleString()}</span></p>
                <p className="text-sm text-gray-300">Deposit: <span className="text-white font-bold font-mono">₦{initialDeposit.toLocaleString()}</span></p>
              </div>
            )}
          </div>

          <div className={`p-5 rounded-xl border-2 shadow-lg flex flex-col justify-center transition-colors duration-500 ${currentBalance > 0 ? 'bg-slate-900 border-red-900/50' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
            <p className={`text-xs uppercase font-bold mb-2 transition-colors duration-500 ${currentBalance > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
              {currentBalance > 0 ? 'Outstanding Balance' : 'Fully Cleared'}
            </p>
            <p className={`text-3xl font-black transition-colors duration-500 ${currentBalance > 0 ? 'text-red-500' : 'text-emerald-400'}`}>₦{currentBalance.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* --- ITEMS BOUGHT SECTION --- */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2">
              <Package className="text-blue-400 w-5 h-5" /> 
              <h3 className="text-white font-bold">Equipment Purchased</h3>
            </div>
            <div className="p-5 space-y-3">
              {invoiceDetail.items?.map((item: any, idx: number) => (
                <div key={idx} className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center gap-4">
                  <div className="flex flex-col gap-2 flex-grow">
                    <div className="text-white text-base font-bold">{item.equipment || "Unnamed Equipment"}</div>
                    
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getBadgeStyle(item.equipment_type)}`}>
                        {item.equipment_type || "Accessory"}
                      </span>
                      <span className="text-slate-300 text-[10px] font-mono border border-slate-700 bg-slate-900 px-2 py-0.5 rounded tracking-wide">
                        S/N: {item.serial_number || item.serial_numbers || "N/A"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 py-2 rounded-lg font-mono font-bold text-right min-w-[100px]">
                    <div className="text-[9px] text-emerald-500/70 uppercase tracking-wider mb-0.5">Unit Price</div>
                    ₦{parseFloat(item.price || item.unit_price || item.amount || item.cost || "0").toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- PAYMENT HISTORY & EDITING SECTION --- */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-xl">
            <div className="p-5 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="text-emerald-400 w-5 h-5" /> 
                <h3 className="text-white font-bold">Editable Timeline</h3>
              </div>
              <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md">Paid: ₦{totalPaid.toLocaleString()}</span>
            </div>
            
            <div className="p-5 space-y-3 flex-grow overflow-y-auto max-h-[400px]">
              
              {/* --- ADDED INITIAL DEPOSIT CARD --- */}
              {initialDeposit > 0 && (
                <div className="flex justify-between items-center bg-slate-800 border border-slate-700 p-4 rounded-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-300">Initial Deposit</p>
                      <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                        Pre-Payment
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {invoiceDetail?.date 
                        ? new Date(invoiceDetail.date).toLocaleDateString() 
                        : "At time of sale"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold font-mono">+ ₦{initialDeposit.toLocaleString()}</span>
                    {/* Placeholder div to align visually with the edit button margins below */}
                    <div className="w-6 h-6"></div> 
                  </div>
                </div>
              )}

              {/* --- REGULAR LOGGED PAYMENTS --- */}
              {invoicePayments.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center bg-slate-800/50 border border-slate-700 p-4 rounded-xl group">
                  <div>
                    <p className="text-sm font-bold text-gray-300">Logged Payment</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(p.payment_date || p.created_at).toLocaleDateString()}</p>
                  </div>

                  {editingPaymentId === p.id ? (
                    <div className="flex items-center gap-2">
                      <Input 
                        className="w-24 h-8 text-sm bg-slate-900" 
                        value={editPaymentAmount} 
                        onChange={(e) => setEditPaymentAmount(e.target.value)}
                      />
                      <button onClick={() => handleUpdatePayment(p.id)} className="text-emerald-400 hover:text-emerald-300 p-1"><Save className="w-4 h-4"/></button>
                      <button onClick={() => setEditingPaymentId(null)} className="text-red-400 hover:text-red-300 p-1"><X className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold font-mono">+ ₦{parseFloat(p.amount || "0").toLocaleString()}</span>
                      <button 
                        onClick={() => { setEditingPaymentId(p.id); setEditPaymentAmount(p.amount); }} 
                        className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 transition-opacity p-1"
                      >
                        <Edit2 className="w-4 h-4"/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* LOG NEW PAYMENT BOTTOM BAR */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/80">
              <div className="flex gap-3">
                <Input 
                  type="number" 
                  placeholder="Enter amount to pay..."
                  className="bg-slate-800 border-slate-700 text-white flex-grow h-12 disabled:opacity-50"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={currentBalance <= 0}
                />
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 h-12 disabled:opacity-50 disabled:bg-slate-700"
                  onClick={handleLogNewPayment}
                  disabled={isSubmitting || !paymentAmount || currentBalance <= 0}
                >
                  {currentBalance <= 0 ? "Fully Paid" : "Add Payment"}
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default PurchasesPage;