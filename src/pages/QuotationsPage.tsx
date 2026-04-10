import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Plus, Search, FileText, Mail, ArrowRightLeft, Trash2,
  Loader2, RefreshCcw, ChevronLeft, ChevronRight,
  X, Minus, ClipboardList, Printer,
} from "lucide-react";
import { toast } from "../components/ui/use-toast";
import axios from "axios";
import { useReactToPrint } from "react-to-print";
import logo from "../assets/otic-logo.png";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_URL = "https://inventory.oticgs.com/api";
const authHeader = () => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuotationItem {
  id?: number;
  equipment: string;
  equipment_type: string;
  category: string;
  cost: string;
  quantity: number;
}

interface Quotation {
  id: number;
  quote_number: string;
  name: string;
  phone: string;
  email: string;
  state: string;
  staff: string;
  total_cost: string;
  tax_amount: string;
  payment_plan: string;
  initial_deposit: string | null;
  payment_months: number | null;
  notes: string;
  date_created: string;
  valid_until: string | null;
  is_converted: boolean;
  converted_sale_id: number | null;
  items: QuotationItem[];
  bank_name: string;
  account_name: string;
  account_number: string;
  tin_number: string;
  footer_note: string;
}

// ─── Blank item ───────────────────────────────────────────────────────────────
const blankItem = (): QuotationItem => ({
  equipment: "",
  equipment_type: "",
  category: "",
  cost: "",
  quantity: 1,
});

// ─── Blank form ──────────────────────────────────────────────────────────────
const blankForm = () => ({
  name: "",
  phone: "",
  email: "",
  state: "",
  staff: "",
  payment_plan: "No",
  initial_deposit: "",
  payment_months: "",
  notes: "",
  valid_until: "",
  // ADD THESE:
  bank_name: "Zenith Bank",
  account_name: "OTIC GEOSYSTEMS LTD",
  account_number: "1015175251",
  tin_number: "31413107-0001",
  footer_note: "This is a quotation only and does not constitute a final invoice.",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  `₦${Number(n || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ─── Printable Quotation Template ────────────────────────────────────────────
const PrintableQuotation = ({ q }: { q: Quotation }) => {
  const subTotal = q.items.reduce(
    (s, i) => s + parseFloat(i.cost || "0") * i.quantity, 0
  );
  const tax = parseFloat(q.tax_amount || "0");
  const total = subTotal + tax;
  const deposit = parseFloat(q.initial_deposit || "0");
  const balance = total - deposit;

  return (
    <div
      className="max-w-4xl mx-auto bg-white text-slate-900 p-10 font-sans"
      id="printable-quotation"
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-8 border-gray-200">
        <div>
          <img src={logo} alt="OTIC" className="h-12 mb-4" />
          <h1 className="text-xl font-bold text-blue-900">OTIC GEOSYSTEMS LTD</h1>
          <p className="text-sm text-gray-600">3, Bello Close, Chevyview Estate, Chevron Drive</p>
          <p className="text-sm text-gray-600">Lekki-Epe Expressway, Lagos, Nigeria</p>
        </div>
        <div className="text-right">
          {/* QUOTATION watermark label */}
          <div className="inline-block border-4 border-blue-800 px-4 py-1 mb-2">
            <h2 className="text-4xl font-bold text-blue-800 tracking-widest uppercase">
              Quotation
            </h2>
          </div>
          <p className="font-semibold text-lg text-slate-700">#{q.quote_number}</p>
          {q.valid_until && (
            <p className="text-sm text-gray-500 mt-1">
              Valid Until:{" "}
              <span className="font-medium text-slate-700">
                {new Date(q.valid_until).toLocaleDateString("en-GB")}
              </span>
            </p>
          )}
          <div className="mt-3">
            <p className="text-sm text-gray-500 uppercase">Estimated Total</p>
            <p className="text-2xl font-bold text-slate-800">
              NGN {total.toLocaleString()}.00
            </p>
          </div>
        </div>
      </div>

      {/* Quote To & Dates */}
      <div className="grid grid-cols-2 gap-8 py-8">
        <div>
          <p className="text-sm text-gray-500 mb-1 uppercase font-semibold">Quote To</p>
          <p className="font-bold text-lg">{q.name}</p>
          {q.phone && <p className="text-sm text-gray-600">{q.phone}</p>}
          {q.email && <p className="text-sm text-gray-600">{q.email}</p>}
          {q.state && <p className="text-sm text-gray-600">{q.state}, Nigeria</p>}
        </div>
        <div className="flex flex-col items-end justify-center space-y-1 text-sm">
          <p>
            <span className="text-gray-500">Quote Date:</span>{" "}
            <span className="font-medium">
              {new Date(q.date_created).toLocaleDateString("en-GB")}
            </span>
          </p>
          {q.valid_until && (
            <p>
              <span className="text-gray-500">Valid Until:</span>{" "}
              <span className="font-medium">
                {new Date(q.valid_until).toLocaleDateString("en-GB")}
              </span>
            </p>
          )}
          <p>
            <span className="text-gray-500">Prepared By:</span>{" "}
            <span className="font-medium">{q.staff || "OTIC Team"}</span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left border-collapse mt-4">
        <thead>
          <tr className="bg-slate-800 text-white uppercase text-xs">
            <th className="p-3 font-semibold">#</th>
            <th className="p-3 font-semibold">Item & Description</th>
            <th className="p-3 font-semibold">Type</th>
            <th className="p-3 font-semibold text-center">Qty</th>
            <th className="p-3 font-semibold text-right">Unit Rate</th>
            <th className="p-3 font-semibold text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {q.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100 text-sm">
              <td className="p-3 text-gray-500">{i + 1}</td>
              <td className="p-3 font-medium">{item.equipment}</td>
              <td className="p-3 text-gray-600">{item.equipment_type || "—"}</td>
              <td className="p-3 text-center">{item.quantity}</td>
              <td className="p-3 text-right">
                {parseFloat(item.cost).toLocaleString()}.00
              </td>
              <td className="p-3 text-right font-semibold">
                {(parseFloat(item.cost) * item.quantity).toLocaleString()}.00
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Financial Summary */}
      <div className="flex justify-end py-8">
        <div className="w-72 space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Sub Total</span>
            <span>{subTotal.toLocaleString()}.00</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax (7.5%)</span>
              <span>{tax.toLocaleString()}.00</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 text-slate-800">
            <span>Total</span>
            <span>NGN {total.toLocaleString()}.00</span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between text-blue-700 font-medium">
              <span>Initial Deposit</span>
              <span>NGN {deposit.toLocaleString()}.00</span>
            </div>
          )}
          {q.payment_months && (
            <div className="flex justify-between text-gray-600">
              <span>Payment Duration</span>
              <span>{q.payment_months} months</span>
            </div>
          )}
          <div className="flex justify-between font-bold bg-blue-50 p-3 text-slate-900 border-l-4 border-blue-800">
            <span>Balance Due</span>
            <span>NGN {balance.toLocaleString()}.00</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {q.notes && (
        <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700">
          <p className="font-bold text-gray-800 mb-1 uppercase tracking-wider text-xs">
            Notes
          </p>
          <p className="whitespace-pre-line">{q.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 border-t pt-6 text-xs text-gray-500 leading-relaxed">
        <p className="font-bold text-gray-700 mb-2 uppercase tracking-wider">
          Payment Details
        </p>
        <p>Kindly pay into this account below and send proof of payment.</p>
        <p className="mt-1">
          <span className="font-semibold text-gray-700">Bank:</span> {q.bank_name}
        </p>
        <p>
          <span className="font-semibold text-gray-700">Account Name:</span>{" "}
          {q.account_name}
        </p>
        <p>
          <span className="font-semibold text-gray-700">Account NO:</span>{" "}
          {q.account_number}
        </p>
        <p className="mt-4 italic">{q.footer_note}</p>
        <p className="mt-2 font-medium">TIN NO. {q.tin_number}</p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const QuotationsPage = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Dialog states
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quotation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [converting, setConverting] = useState(false);

  // Form state
  const [form, setForm] = useState(blankForm());
  const [items, setItems] = useState<QuotationItem[]>([blankItem()]);
  const [applyTax, setApplyTax] = useState(false);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchQuotations = async (page = 1, q = "") => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/quotations/`, {
        headers: authHeader(),
        params: { page, search: q },
      });
      const data = res.data;
      
      // ADDED SAFETY: Ensure we ALWAYS set an array
      const safeData = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
      setQuotations(safeData);
      
      setTotalItems(data.count || 0);
      setTotalPages(data.count ? Math.ceil(data.count / 10) : 1);
    } catch {
      toast({ title: "Error", description: "Failed to load quotations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations(currentPage, search);
  }, [currentPage]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
    fetchQuotations(1, val);
  };

  // ── Calculations ───────────────────────────────────────────────────────────
  const subTotal = items.reduce(
    (s, i) => s + parseFloat(i.cost || "0") * (i.quantity || 1), 0
  );
  const taxAmount = applyTax ? subTotal * 0.075 : 0;
  const totalCost = subTotal + taxAmount;

  // ── Item helpers ───────────────────────────────────────────────────────────
  const updateItem = (idx: number, key: keyof QuotationItem, val: string | number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  };

  const addItemRow = () => setItems(prev => [...prev, blankItem()]);
  const removeItemRow = (idx: number) =>
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  // ── Create quotation ───────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) {
      return toast({ title: "Required", description: "Customer name is required.", variant: "destructive" });
    }
    if (items.some(i => !i.equipment.trim() || !i.cost)) {
      return toast({ title: "Required", description: "All items need equipment name and cost.", variant: "destructive" });
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/quotations/`,
        {
          ...form,
          total_cost: String(totalCost),
          tax_amount: String(taxAmount),
          payment_months: form.payment_months ? parseInt(form.payment_months) : null,
          initial_deposit: form.initial_deposit || null,
          valid_until: form.valid_until || null,
          items: items.map(i => ({
            equipment: i.equipment,
            equipment_type: i.equipment_type,
            category: i.category,
            cost: i.cost,
            quantity: i.quantity,
          })),
        },
        { headers: authHeader() }
      );
      toast({ title: "Quotation Created", description: "Quotation saved successfully." });
      setShowCreate(false);
      setForm(blankForm());
      setItems([blankItem()]);
      setApplyTax(false);
      fetchQuotations(1, search);
      setCurrentPage(1);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to create quotation.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Send email ─────────────────────────────────────────────────────────────
  const handleSendEmail = async (q: Quotation) => {
    if (!q.email) {
      return toast({
        title: "No Email",
        description: "This quotation has no email address.",
        variant: "destructive",
      });
    }
    setSendingEmail(true);
    try {
      await axios.post(
        `${API_URL}/quotations/${q.id}/send-email/`,
        {},
        { headers: authHeader() }
      );
      toast({ title: "Email Sent", description: `Quotation sent to ${q.email}.` });
    } catch (err: any) {
      toast({
        title: "Email Failed",
        description: err?.response?.data?.error || "Could not send email.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // ── Convert to sale ────────────────────────────────────────────────────────
  const handleConvert = async (q: Quotation) => {
    if (q.is_converted) {
      return toast({
        title: "Already Converted",
        description: `This quotation was already converted to Sale #${q.converted_sale_id}.`,
        variant: "destructive",
      });
    }
    if (!window.confirm(`Convert quotation ${q.quote_number} to a sale? This cannot be undone.`)) return;

    setConverting(true);
    try {
      const res = await axios.post(
        `${API_URL}/quotations/${q.id}/convert/`,
        {},
        { headers: authHeader() }
      );
      toast({
        title: "Converted!",
        description: res.data.message,
      });
      fetchQuotations(currentPage, search);
      setShowView(false);
    } catch (err: any) {
      toast({
        title: "Conversion Failed",
        description: err?.response?.data?.error || "Could not convert quotation.",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this quotation? This cannot be undone.")) return;
    try {
      await axios.delete(`${API_URL}/quotations/${id}/`, { headers: authHeader() });
      toast({ title: "Deleted", description: "Quotation deleted." });
      fetchQuotations(currentPage, search);
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 p-1">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-blue-400" />
              Quotations
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Create and manage price quotations for customers
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fetchQuotations(currentPage, search)}
              className="gap-2 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreate(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Plus className="h-4 w-4" /> New Quotation
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, phone or quote number…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-white"
          />
        </div>

        {/* Table */}
        <Card className="bg-blue-950 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              All Quotations
              {totalItems > 0 && (
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ({totalItems} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-blue-400">
                <Loader2 className="h-6 w-6 animate-spin" /> Loading quotations…
              </div>
            ) : quotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                <ClipboardList className="h-12 w-12 opacity-30" />
                <p>No quotations yet. Create your first one.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-slate-800/80">
                    <TableRow className="hover:bg-transparent border-slate-700">
                      <TableHead className="text-slate-300">Quote #</TableHead>
                      <TableHead className="text-slate-300">Customer</TableHead>
                      <TableHead className="text-slate-300">Items</TableHead>
                      <TableHead className="text-slate-300">Total</TableHead>
                      <TableHead className="text-slate-300">Date</TableHead>
                      <TableHead className="text-slate-300">Valid Until</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {Array.isArray(quotations) ? (
                    quotations.map((q) => (
                      <TableRow key={q.id} className="border-slate-700 hover:bg-slate-800/50">
                        <TableCell className="font-mono text-blue-300 font-medium">
                          {q.quote_number}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-white">{q.name}</div>
                          <div className="text-xs text-slate-400">{q.phone}</div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {q.items?.length || 0} items
                        </TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          ₦{parseFloat(q.total_cost || "0").toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {new Date(q.date_created).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            q.is_converted 
                              ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/50" 
                              : "bg-orange-900/30 text-orange-400 border-orange-800/50"
                          }`}>
                            {q.is_converted ? "Converted" : "Pending"}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">
                          {q.staff || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => { setViewingQuote(q); setShowView(true); }}
                              className="text-blue-400 hover:bg-blue-900/30 h-8 w-8"
                              title="View / Print"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => handleDelete(q.id)}
                              className="text-red-400 hover:bg-red-900/30 h-8 w-8"
                              title="Delete Quotation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-red-400">
                        Data format error: Received invalid data from server.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t border-slate-700">
                    <p className="text-xs text-slate-400">
                      Page <span className="text-white font-medium">{currentPage}</span> of{" "}
                      <span className="text-white font-medium">{totalPages}</span>
                      <span className="ml-1">({totalItems} total)</span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── CREATE DIALOG ───────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-400" />
              New Quotation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <h3 className="col-span-full text-sm font-semibold text-blue-300 uppercase tracking-wider">
                Customer Information
              </h3>
              {[
                { label: "Customer Name *", key: "name", placeholder: "Full name" },
                { label: "Phone", key: "phone", placeholder: "e.g. 0801234567" },
                { label: "Email", key: "email", placeholder: "customer@email.com", type: "email" },
                { label: "State", key: "state", placeholder: "e.g. Lagos" },
                { label: "Prepared By (Staff)", key: "staff", placeholder: "Staff name" },
                { label: "Valid Until", key: "valid_until", type: "date" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <Label className="text-slate-300 text-xs">{label}</Label>
                  <Input
                    type={type || "text"}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="bg-slate-900 border-slate-600 text-white mt-1"
                  />
                </div>
              ))}
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">
                  Equipment Items
                </h3>
                <Button
                  size="sm" onClick={addItemRow}
                  className="bg-blue-600 hover:bg-blue-500 text-white h-8 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700 items-end"
                  >
                    <div className="col-span-3">
                      <Label className="text-slate-400 text-[10px]">Equipment *</Label>
                      <Input
                        placeholder="e.g. T20, Jupiter"
                        value={item.equipment}
                        onChange={(e) => updateItem(idx, "equipment", e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white mt-1 h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-slate-400 text-[10px]">Type</Label>
                      <Input
                        placeholder="Base / Rover"
                        value={item.equipment_type}
                        onChange={(e) => updateItem(idx, "equipment_type", e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white mt-1 h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-slate-400 text-[10px]">Category</Label>
                      <Input
                        placeholder="Receiver"
                        value={item.category}
                        onChange={(e) => updateItem(idx, "category", e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white mt-1 h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-slate-400 text-[10px]">Unit Price *</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.cost}
                        onChange={(e) => updateItem(idx, "cost", e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white mt-1 h-9 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-slate-400 text-[10px]">Qty</Label>
                      <div className="flex items-center border border-slate-600 rounded bg-slate-900 h-9 overflow-hidden mt-1">
                        <button
                          type="button"
                          onClick={() => updateItem(idx, "quantity", Math.max(1, item.quantity - 1))}
                          className="px-2 h-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center text-sm font-semibold text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItem(idx, "quantity", item.quantity + 1)}
                          className="px-2 h-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded p-1.5 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="tax-toggle"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="tax-toggle" className="text-sm text-slate-300 cursor-pointer">
                    Apply 7.5% Tax
                  </label>
                </div>
                <div className="text-right text-sm">
                  {applyTax && (
                    <span className="text-slate-400 mr-4">
                      Tax: {fmt(taxAmount)}
                    </span>
                  )}
                  <span className="font-bold text-white text-base">
                    Total: {fmt(totalCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <h3 className="col-span-full text-sm font-semibold text-blue-300 uppercase tracking-wider">
                Payment Details (Optional)
              </h3>
              <div>
                <Label className="text-slate-300 text-xs">Payment Plan</Label>
                <select
                  value={form.payment_plan}
                  onChange={(e) => setForm(f => ({ ...f, payment_plan: e.target.value }))}
                  className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-md p-2 text-white text-sm"
                >
                  <option value="No">No (Full Payment)</option>
                  <option value="Yes">Yes (Installment Plan)</option>
                </select>
              </div>
              {form.payment_plan === "Yes" && (
                <>
                  <div>
                    <Label className="text-slate-300 text-xs">Initial Deposit (₦)</Label>
                    <Input
                      type="number"
                      placeholder="Enter deposit amount"
                      value={form.initial_deposit}
                      onChange={(e) => setForm(f => ({ ...f, initial_deposit: e.target.value }))}
                      className="bg-slate-900 border-slate-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Payment Duration (months)</Label>
                    <select
                      value={form.payment_months}
                      onChange={(e) => setForm(f => ({ ...f, payment_months: e.target.value }))}
                      className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-md p-2 text-white text-sm"
                    >
                      <option value="">Select months</option>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <option key={m} value={m}>{m} {m === 1 ? "month" : "months"}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="col-span-full">
                <Label className="text-slate-300 text-xs">Notes (Optional)</Label>
                <textarea
                  rows={3}
                  placeholder="Any additional notes for the customer…"
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-md p-2 text-white text-sm resize-none"
                />
              </div>
            </div>

            {/* Company / Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <h3 className="col-span-full text-sm font-semibold text-blue-300 uppercase tracking-wider">
                Payment & Company Details
              </h3>
              <p className="col-span-full text-xs text-slate-500">
                Pre-filled with your company defaults. Edit if needed for this quotation.
              </p>

              <div>
                <Label className="text-slate-300 text-xs">Bank Name</Label>
                <Input
                  value={form.bank_name}
                  onChange={(e) => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Account Name</Label>
                <Input
                  value={form.account_name}
                  onChange={(e) => setForm(f => ({ ...f, account_name: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Account Number</Label>
                <Input
                  value={form.account_number}
                  onChange={(e) => setForm(f => ({ ...f, account_number: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">TIN Number</Label>
                <Input
                  value={form.tin_number}
                  onChange={(e) => setForm(f => ({ ...f, tin_number: e.target.value }))}
                  className="bg-slate-900 border-slate-600 text-white mt-1"
                />
              </div>
              <div className="col-span-full">
                <Label className="text-slate-300 text-xs">Footer Note</Label>
                <textarea
                  rows={2}
                  value={form.footer_note}
                  onChange={(e) => setForm(f => ({ ...f, footer_note: e.target.value }))}
                  className="w-full mt-1 bg-slate-900 border border-slate-600 rounded-md p-2 text-white text-sm resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={submitting}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><Plus className="h-4 w-4" /> Create Quotation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── VIEW / PRINT DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-5xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              {viewingQuote?.quote_number}
              {viewingQuote?.is_converted && (
                <span className="ml-2 text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-700">
                  Converted to Sale
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {viewingQuote && (
            <>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-700">
                <Button
                  size="sm"
                  onClick={handlePrint}
                  className="bg-slate-700 hover:bg-slate-600 text-white gap-2"
                >
                  <Printer className="h-4 w-4" /> Print / Save PDF
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSendEmail(viewingQuote)}
                  disabled={sendingEmail || !viewingQuote.email}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white gap-2"
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Send Email
                </Button>
                {!viewingQuote.is_converted && (
                  <Button
                    size="sm"
                    onClick={() => handleConvert(viewingQuote)}
                    disabled={converting}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white gap-2"
                  >
                    {converting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4" />
                    )}
                    Convert to Sale
                  </Button>
                )}
              </div>

              {/* Printable area */}
              <div ref={printRef} className="bg-white rounded-lg overflow-hidden">
                <PrintableQuotation q={viewingQuote} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default QuotationsPage;
