import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import {
   Search, Package, UserCheck, RefreshCcw, Loader2,
  FolderPlus, Upload, Download, FolderOpen, ChevronLeft,
  FileSpreadsheet, X, Check, Folder, AlertCircle,
} from "lucide-react";
import { toast } from "../components/ui/use-toast";
import axios from "axios";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL = "http://127.0.0.1:8000/api";

const authHeader = () => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CodeBatch {
  id: number;
  batch_number: string;
  received_date: string;
  supplier: string;
  notes: string;
  code_count: number;
  in_stock_count: number;
  sold_count: number;
}

interface BatchItem {
  serial: string;
  status: string;           // "active" | "not sold"
  payment_status: string;
  customer_name: string;
  customer_email: string;
  assigned_date: string;
  current_code: string;
  code_expiry: string;
  qr_code_image?: string;
}

interface BatchItemsData {
  in_stock: BatchItem[];
  sold: BatchItem[];
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function fetchBatches(): Promise<CodeBatch[]> {
  const res = await axios.get(`${API_URL}/code-batches/`, { headers: authHeader() });
  return res.data;
}

async function createBatch(data: {
  batch_number: string;
  supplier: string;
  notes: string;
  received_date: string;
}): Promise<CodeBatch> {
  const res = await axios.post(`${API_URL}/code-batches/`, data, {
    headers: { ...authHeader(), "Content-Type": "application/json" },
  });
  return res.data;
}

async function fetchBatchItems(batchId: number): Promise<BatchItemsData> {
  const res = await axios.get(`${API_URL}/code-batches/${batchId}/items/`, {
    headers: authHeader(),
  });
  return res.data;
}

async function uploadCSVToBatch(
  batchId: number,
  file: File
): Promise<{ imported: number; errors: string[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post(`${API_URL}/code-batches/${batchId}/upload-csv/`, form, {
    headers: authHeader(), // axios sets multipart boundary automatically
  });
  return res.data;
}

async function downloadBatchCSV(batchId: number, batchNumber: string) {
  const res = await axios.get(`${API_URL}/code-batches/${batchId}/download-csv/`, {
    headers: authHeader(),
    responseType: "blob",
  });
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = `batch_${batchNumber}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

const CodesManagement = () => {
  // ── Batch list state ─────────────────────────────────────────────────────
  const [batches, setBatches] = useState<CodeBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  // ── Open batch (folder view) state ───────────────────────────────────────
  const [openBatch, setOpenBatch] = useState<CodeBatch | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItemsData>({ in_stock: [], sold: [] });
  const [loadingItems, setLoadingItems] = useState(false);
  const [activeTab, setActiveTab] = useState<"in_stock" | "sold">("in_stock");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Create folder modal ───────────────────────────────────────────────────
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folderForm, setFolderForm] = useState({
    batch_number: "",
    supplier: "China Supplier",
    notes: "",
    received_date: new Date().toISOString().split("T")[0],
  });
  const [creatingFolder, setCreatingFolder] = useState(false);

  // ── Upload state ──────────────────────────────────────────────────────────
  const [uploadProgress, setUploadProgress] = useState<
    { [id: number]: "idle" | "uploading" | "done" | "error" }
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadBatchId, setPendingUploadBatchId] = useState<number | null>(null);

  // ── Fetch all batches ─────────────────────────────────────────────────────

  const fetchBatchList = async () => {
    setLoadingBatches(true);
    try {
      const data = await fetchBatches();
      setBatches(data);
    } catch {
      toast({ title: "Error", description: "Failed to load code batches.", variant: "destructive" });
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => { fetchBatchList(); }, []);

  // ── Open a batch folder ───────────────────────────────────────────────────

  const openBatchFolder = async (batch: CodeBatch) => {
    setOpenBatch(batch);
    setActiveTab("in_stock");
    setSearchTerm("");
    setLoadingItems(true);
    try {
      const data = await fetchBatchItems(batch.id);
      setBatchItems(data);
    } catch {
      toast({ title: "Error", description: "Failed to load batch contents.", variant: "destructive" });
    } finally {
      setLoadingItems(false);
    }
  };

  const closeBatchFolder = () => {
    setOpenBatch(null);
    setBatchItems({ in_stock: [], sold: [] });
    setSearchTerm("");
  };

  // ── Reload open batch after upload ───────────────────────────────────────

  const reloadOpenBatch = async (batch: CodeBatch) => {
    setLoadingItems(true);
    try {
      const data = await fetchBatchItems(batch.id);
      setBatchItems(data);
    } catch {
      toast({ title: "Error", description: "Failed to refresh batch.", variant: "destructive" });
    } finally {
      setLoadingItems(false);
    }
  };

  // ── Create batch/folder ───────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!folderForm.batch_number.trim()) {
      toast({ title: "Required", description: "Batch number is required.", variant: "destructive" });
      return;
    }
    setCreatingFolder(true);
    try {
      const newBatch = await createBatch(folderForm);
      setBatches((prev) => [newBatch, ...prev]);
      setShowCreateFolder(false);
      setFolderForm({
        batch_number: "",
        supplier: "China Supplier",
        notes: "",
        received_date: new Date().toISOString().split("T")[0],
      });
      toast({ title: "Batch Created", description: `"${newBatch.batch_number}" is ready. Click it to upload a CSV.` });
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.batch_number?.[0] ||
        e?.message ||
        "Something went wrong.";
      toast({ title: "Create Failed", description: msg, variant: "destructive" });
    } finally {
      setCreatingFolder(false);
    }
  };

  // ── CSV Upload ────────────────────────────────────────────────────────────

  const triggerUpload = (batchId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingUploadBatchId(batchId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || pendingUploadBatchId === null) return;
    e.target.value = "";

    const batchId = pendingUploadBatchId;
    setUploadProgress((p) => ({ ...p, [batchId]: "uploading" }));

    try {
      const result = await uploadCSVToBatch(batchId, file);
      setUploadProgress((p) => ({ ...p, [batchId]: "done" }));

      const errMsg = result.errors?.length
        ? ` (${result.errors.length} rows had errors)`
        : "";
      toast({
        title: "Upload Complete",
        description: `${result.imported} receivers imported${errMsg}.`,
      });

      if (openBatch?.id === batchId) {
        await reloadOpenBatch(openBatch);
      }

      await fetchBatchList();

      setTimeout(() => setUploadProgress((p) => ({ ...p, [batchId]: "idle" })), 3000);
    } catch (err: any) {
      setUploadProgress((p) => ({ ...p, [batchId]: "error" }));
      const msg = err?.response?.data?.detail || err?.message || "Upload failed.";
      toast({ title: "Upload Failed", description: msg, variant: "destructive" });
      setTimeout(() => setUploadProgress((p) => ({ ...p, [batchId]: "idle" })), 3000);
    }
  };

  // ── Filtered table list ───────────────────────────────────────────────────

  const filteredList = (openBatch ? batchItems[activeTab] : []).filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.serial.toLowerCase().includes(q) ||
      item.customer_name?.toLowerCase().includes(q) ||
      item.customer_email?.toLowerCase().includes(q)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER — BATCH FOLDER OPEN VIEW
  // ─────────────────────────────────────────────────────────────────────────

  if (openBatch) {
    return (
      <DashboardLayout>
        <div className="space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileSelected}
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={closeBatchFolder}
                className="gap-2 border-slate-700 bg-slate-800 text-white hover:bg-slate-700 h-9"
              >
                <ChevronLeft className="h-4 w-4" />
                All Batches
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-yellow-400" />
                  <h2 className="text-2xl font-bold text-white">{openBatch.batch_number}</h2>
                </div>
                <p className="text-xs text-blue-400 ml-7">
                  {openBatch.supplier} · {openBatch.received_date}
                  {openBatch.notes && <span className="ml-2 text-blue-500">· {openBatch.notes}</span>}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={(e) => triggerUpload(openBatch.id, e)}
                disabled={uploadProgress[openBatch.id] === "uploading"}
                className="gap-2 border-blue-700 bg-blue-950 text-blue-300 hover:bg-blue-800 hover:text-white h-9"
              >
                {uploadProgress[openBatch.id] === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : uploadProgress[openBatch.id] === "done" ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : uploadProgress[openBatch.id] === "error" ? (
                  <X className="h-4 w-4 text-red-400" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadProgress[openBatch.id] === "uploading"
                  ? "Uploading…"
                  : uploadProgress[openBatch.id] === "done"
                  ? "Uploaded!"
                  : "Upload CSV"}
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  downloadBatchCSV(openBatch.id, openBatch.batch_number).catch(() =>
                    toast({ title: "Download Failed", variant: "destructive" })
                  )
                }
                className="gap-2 border-teal-700 bg-teal-950/30 text-teal-300 hover:bg-teal-800 hover:text-white h-9"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>

              <Button
                variant="outline"
                onClick={() => reloadOpenBatch(openBatch)}
                className="gap-2 border-slate-700 bg-slate-800 text-white hover:bg-slate-700 h-9"
              >
                <RefreshCcw className={`h-4 w-4 ${loadingItems ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-blue-950/40 p-1 rounded-xl border border-blue-900/50">
            <div className="flex w-full md:w-auto">
              <button
                onClick={() => { setActiveTab("in_stock"); setSearchTerm(""); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "in_stock"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Package className="h-4 w-4" />
                In Stock
                <span className="ml-1 text-xs bg-blue-800 text-blue-200 rounded-full px-2 py-0.5">
                  {batchItems.in_stock.length}
                </span>
              </button>
              <button
                onClick={() => { setActiveTab("sold"); setSearchTerm(""); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "sold"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <UserCheck className="h-4 w-4" />
                Sold
                <span className="ml-1 text-xs bg-blue-800 text-blue-200 rounded-full px-2 py-0.5">
                  {batchItems.sold.length}
                </span>
              </button>
            </div>

            <div className="relative w-full md:w-72 pr-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === "sold" ? "Search customer or serial…" : "Search serial…"}
                className="pl-10 bg-blue-950 border-blue-800 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-blue-900/50 bg-blue-950/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                {activeTab === "in_stock" ? (
                  <><Package className="h-4 w-4 text-blue-400" /> Inventory Receivers</>
                ) : (
                  <><UserCheck className="h-4 w-4 text-teal-400" /> Customer Assignments</>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingItems ? (
                <div className="flex items-center justify-center py-16 text-blue-400 gap-3">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  Loading receivers…
                </div>
              ) : batchItems[activeTab].length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 text-blue-800" />
                  <p>No {activeTab === "in_stock" ? "in-stock" : "sold"} receivers in this batch.</p>
                  <p className="text-xs text-blue-700">Upload a CSV to populate this batch.</p>
                </div>
              ) : (
                <div className="rounded-md border border-blue-900/50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-blue-900/30">
                      <TableRow className="hover:bg-transparent border-blue-900/50">
                        <TableHead className="text-blue-200">Serial No.</TableHead>
                        {activeTab === "sold" && (
                          <>
                            <TableHead className="text-blue-200">Customer</TableHead>
                            <TableHead className="text-blue-200">Payment</TableHead>
                          </>
                        )}
                        <TableHead className="text-blue-200">Activation Code</TableHead>
                        <TableHead className="text-blue-200">Expiry</TableHead>
                        <TableHead className="text-blue-200 text-center">QR Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredList.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={activeTab === "sold" ? 6 : 4}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No results for "{searchTerm}"
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredList.map((item) => (
                          <TableRow
                            key={item.serial}
                            className="border-blue-900/50 hover:bg-blue-900/10 transition-colors"
                          >
                            <TableCell>
                              <div className="font-bold text-white font-mono text-sm">{item.serial}</div>
                            </TableCell>

                            {activeTab === "sold" && (
                              <>
                                <TableCell>
                                  <div className="text-sm font-medium text-white">{item.customer_name || "—"}</div>
                                  <div className="text-[11px] text-blue-400">{item.customer_email}</div>
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      item.payment_status === "paid"
                                        ? "bg-green-900/40 text-green-400"
                                        : "bg-slate-800 text-slate-400"
                                    }`}
                                  >
                                    {item.payment_status}
                                  </span>
                                </TableCell>
                              </>
                            )}

                            <TableCell className="min-w-[180px]">
                              <div className="flex items-center gap-1.5">
                                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                <span className="text-teal-300 font-mono text-xs bg-blue-950 border border-blue-800 rounded px-2 py-1 select-all">
                                  {item.current_code || (
                                    <span className="text-blue-700 italic">No code yet</span>
                                  )}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className={item.code_expiry ? 'text-xs text-amber-300 font-mono' : 'text-xs text-blue-700 italic'}>
                                {item.code_expiry || '—'}
                              </span>
                            </TableCell>

                            <TableCell className="text-center">
                              {item.qr_code_image ? (
                                <div className="flex justify-center">
                                  <img
                                    src={`data:image/png;base64,${item.qr_code_image}`}
                                    alt="QR Code"
                                    className="w-12 h-12 rounded bg-white p-1 object-contain transition-all duration-300 ease-in-out hover:scale-[4.5] hover:z-50 hover:relative hover:shadow-2xl hover:border hover:border-blue-500 cursor-zoom-in" 
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-blue-700 italic">No QR</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER — BATCH LIST (folder grid)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelected}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Code Management</h2>
            <p className="text-muted-foreground">
              Create a batch folder, upload a CSV, then click the folder to manage receivers.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchBatchList}
              className="gap-2 border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            >
              <RefreshCcw className={`h-4 w-4 ${loadingBatches ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreateFolder(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white"
            >
              <FolderPlus className="h-4 w-4" />
              + New Batch
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-blue-900/20 border border-blue-800/40 px-4 py-3 text-xs text-blue-300 flex items-start gap-2">
          <FileSpreadsheet className="h-4 w-4 mt-0.5 text-blue-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-blue-200">Expected CSV columns: </span>
            <span className="font-mono text-teal-300">
              serial_number, status, payment_status, customer_email, customer_name, assigned_date
            </span>
            <span className="ml-2 text-blue-500">
              · status = <code>active</code> (sold) or <code>not sold</code> (in stock)
            </span>
          </div>
        </div>

        {loadingBatches ? (
          <div className="flex items-center justify-center py-20 text-blue-400 gap-3">
            <Loader2 className="h-7 w-7 animate-spin" />
            Loading batches…
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <FolderOpen className="h-16 w-16 text-blue-800" />
            <p className="text-lg">No code batches yet.</p>
            <Button
              onClick={() => setShowCreateFolder(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-500"
            >
              <FolderPlus className="h-4 w-4" /> Create First Batch
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => {
              const uploadState = uploadProgress[batch.id] || "idle";
              return (
                <div
                  key={batch.id}
                  className="group relative rounded-xl border border-blue-900/50 bg-blue-950/40 hover:bg-blue-900/30 hover:border-blue-700 transition-all cursor-pointer"
                  onClick={() => openBatchFolder(batch)}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <Folder className="h-10 w-10 text-yellow-400 flex-shrink-0 mt-0.5 group-hover:text-yellow-300 transition-colors" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-base truncate">{batch.batch_number}</p>
                        <p className="text-xs text-blue-400 mt-0.5">{batch.supplier} · {batch.received_date}</p>
                        {batch.notes && (
                          <p className="text-xs text-blue-600 mt-1 truncate">{batch.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <div className="flex-1 rounded-lg bg-blue-900/40 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-white">{batch.in_stock_count}</p>
                        <p className="text-[10px] text-blue-400 uppercase tracking-wider">In Stock</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-teal-900/30 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-teal-300">{batch.sold_count}</p>
                        <p className="text-[10px] text-teal-500 uppercase tracking-wider">Sold</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex gap-2 px-4 pb-4"
                    onClick={(e) => e.stopPropagation()} 
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 border-blue-700 bg-blue-950 text-blue-300 hover:bg-blue-800 hover:text-white h-8 text-xs"
                      onClick={(e) => triggerUpload(batch.id, e)}
                      disabled={uploadState === "uploading"}
                    >
                      {uploadState === "uploading" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : uploadState === "done" ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : uploadState === "error" ? (
                        <X className="h-3 w-3 text-red-400" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {uploadState === "uploading" ? "Uploading…"
                        : uploadState === "done" ? "Uploaded!"
                        : uploadState === "error" ? "Error"
                        : "Upload CSV"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 border-teal-700 bg-teal-950/30 text-teal-300 hover:bg-teal-800 hover:text-white h-8 text-xs"
                      onClick={() =>
                        downloadBatchCSV(batch.id, batch.batch_number).catch(() =>
                          toast({ title: "Download Failed", variant: "destructive" })
                        )
                      }
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="bg-slate-900 border-blue-900/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FolderPlus className="h-5 w-5 text-yellow-400" />
              Create New Code Batch
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm text-blue-300 font-medium">
                Batch Number <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g. FEB-MAR-2026"
                className="bg-blue-950 border-blue-800 text-white placeholder:text-blue-700"
                value={folderForm.batch_number}
                onChange={(e) => setFolderForm((f) => ({ ...f, batch_number: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-blue-300 font-medium">Supplier</label>
              <Input
                placeholder="e.g. COMNAV"
                className="bg-blue-950 border-blue-800 text-white placeholder:text-blue-700"
                value={folderForm.supplier}
                onChange={(e) => setFolderForm((f) => ({ ...f, supplier: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-blue-300 font-medium">Received Date</label>
              <Input
                type="date"
                className="bg-blue-950 border-blue-800 text-white"
                value={folderForm.received_date}
                onChange={(e) => setFolderForm((f) => ({ ...f, received_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-blue-300 font-medium">Notes</label>
              <textarea
                rows={2}
                placeholder="Optional notes…"
                className="w-full rounded-md bg-blue-950 border border-blue-800 text-white text-sm px-3 py-2 placeholder:text-blue-700 outline-none focus:border-blue-500 resize-none"
                value={folderForm.notes}
                onChange={(e) => setFolderForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="rounded-md bg-blue-900/20 border border-blue-800/50 p-3 text-xs text-blue-300">
              <p className="font-semibold text-blue-200 mb-1">📋 Required CSV columns</p>
              <p className="font-mono text-teal-300">
                serial_number, status, payment_status, customer_email, customer_name, assigned_date
              </p>
              <p className="mt-1.5 text-blue-500">
                <code>status</code>: <strong>active</strong> = sold &nbsp;|&nbsp; <strong>not sold</strong> = in stock
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateFolder(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={creatingFolder}
              className="bg-blue-600 hover:bg-blue-500 gap-2"
            >
              {creatingFolder ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
              Create Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CodesManagement;