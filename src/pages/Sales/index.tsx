import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
import { DashboardLayout } from "../../components/DashboardLayout";
import { useNavigate } from "react-router-dom"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-hot-toast";
import axios from "axios"; 
import { useQuery } from "@tanstack/react-query"; // NEW: React Query

// Types & Hooks
import type { Customer, Sale } from "./types";
import { useSalesData } from "./hooks/useSalesData";
import { useSaleForm } from "./hooks/useSaleForm";
import { useToolAssignment } from "./hooks/useToolAssignment";
import { api } from "./utils/api";

// Components
import { CustomerSearch } from "./components/CustomerSearch";
import { SalesTable } from "./components/SalesTable";
import { AddSaleDialog } from "./components/AddSaleDialog";
import { EquipmentTypeModal } from "./components/EquipmentTypeModal";
import { AssignmentModal } from "./components/AssignmentModal";
import { EditStatusDialog } from "./components/EditStatusDialog";
import { ViewSerialsDialog } from "./components/ViewSerialsDialog";

export const HARDCODED_STAFF = [
  { id: "1", name: "Constance Akanueze", email: "a.constance@oticsurveys.com" },
  { id: "2", name: "Survey Andrew", email: "dan@oticsurveys.com" },
  { id: "3", name: "Precious Leniye", email: "precious@company.com" },
  { id: "4", name: "Blessing Ogbonna", email: "blessing.ogbonna@oticsurveys.com" },
  { id: "5", name: "Favour Ahamefula", email: "favour.ahamefula@oticsurveys.com"},
  { id: "6", name: "Winifred Agbapu", email: "winifredagbapu33@gmail.com"}
];

export default function SalesPage() {
  const navigate = useNavigate();

  // --- UI States ---
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Data States (Managed Locally) ---
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [applyTax, setApplyTax] = useState(false);

  // --- Modal States ---
  const [showEquipmentTypeModal, setShowEquipmentTypeModal] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [editStatusOpen, setEditStatusOpen] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [displayedAssignment, setDisplayedAssignment] = useState<any>(null);
  const [viewingSerials, setViewingSerials] = useState<{
    open: boolean;
    tool: any | null;
    soldSerials: any[];
  }>({ open: false, tool: null, soldSerials: [] });

  const {
    customers,
    tools,
    groupedTools,
    setGroupedTools,
    fetchGroupedTools,
    addSale
  } = useSalesData();

  const {
    saleItems,
    currentItem,
    saleDetails,
    addItem,
    removeItem,
    updateCurrentItem,
    updateSaleDetails,
    resetForm
  } = useSaleForm();

  const { assignRandomTool } = useToolAssignment();

  // --- REACT QUERY FETCHING LOGIC ---
  const { data: salesData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sales', currentPage, startDate, endDate], // Auto-refetches when these change
    queryFn: async () => {
      const token = localStorage.getItem("access") || localStorage.getItem("token"); 
      const API_URL = "http://127.0.0.1:8000/api";
      const res = await axios.get(`${API_URL}/sales/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: currentPage, start_date: startDate, end_date: endDate }
      });
      return res.data;
    }
  });

  // Derived state from React Query
  const serverSales = Array.isArray(salesData?.results) ? salesData.results : (Array.isArray(salesData) ? salesData : []);
  const totalItems = salesData?.count || 0;
  const totalPages = salesData?.count ? Math.ceil(salesData.count / 10) : 1;

  // --- Calculations ---
  const subtotal = saleItems.reduce((sum, item) => sum + parseFloat(item.cost || "0"), 0);
  const taxAmount = applyTax ? subtotal * 0.075 : 0;
  const totalCost = subtotal + taxAmount;

  // Fetch tools when category changes
  useEffect(() => {
    let isMounted = true;
    if (!currentItem.selectedCategory) {
      setGroupedTools([]);
      return;
    }
    const loadTools = async () => {
      try {
        const data = await fetchGroupedTools(currentItem.selectedCategory, currentItem.selectedEquipmentType);
        if (isMounted) setGroupedTools(data || []);
      } catch (error) {
        console.error(error);
      }
    };
    loadTools();
    return () => { isMounted = false; };
  }, [currentItem.selectedCategory, currentItem.selectedEquipmentType]);

  const handleCategorySelect = (category: string) => {
    updateCurrentItem({ selectedCategory: category, selectedEquipmentType: "", selectedTool: null, cost: "" });
    if (category === "Receiver") setShowEquipmentTypeModal(true);
  };

  const handleEquipmentTypeSelect = (equipmentType: string) => {
    updateCurrentItem({ selectedEquipmentType: equipmentType });
    setShowEquipmentTypeModal(false);
  };

  const handleToolSelect = (toolName: string) => {
    const selected = Array.isArray(groupedTools) ? groupedTools.find(t => t.name === toolName) : null;
    if (selected) {
      updateCurrentItem({ selectedTool: selected, cost: currentItem.cost || String(selected.cost || "") });
    }
  };

  const handleSaveSale = async (action: "draft" | "send") => {
    if (!selectedCustomer || saleItems.length === 0) return toast.error("Missing customer or items.");
    
    const staffName = String(selectedStaff).trim();
    if (!staffName || staffName === "undefined") return toast.error("Please select a staff member.");

    let calculatedDueDate = null;

    if (saleDetails.payment_plan?.includes("Yes") && saleDetails.payment_months) {
    const months = parseInt(saleDetails.payment_months, 10);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    
    // Formats it as YYYY-MM-DD for Django
    calculatedDueDate = date.toISOString().split('T')[0];
    
  }

    setIsSubmitting(true);
    try {
      const payload = {
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        state: selectedCustomer.state,
        items: saleItems,
        staff: staffName, 
        tax_amount: String(taxAmount), 
        total_cost: String(totalCost),
        payment_plan: saleDetails.payment_plan,
        initial_deposit: saleDetails.initial_deposit || null,
        payment_months: saleDetails.payment_months || null,
        //expiry_date: saleDetails.expiry_date || null,
        due_date: calculatedDueDate,
        date_sold: new Date().toISOString().split('T')[0],
        payment_status: (saleDetails.payment_plan?.toLowerCase() === "installment" || parseFloat(saleDetails.initial_deposit || "0") > 0) ? "ongoing" : "pending",
      };

      const res = await api.createSale(payload);
      addSale(res.data); 

      if (action === "send") {
        const generatedSale = res.data as Sale; 
        const invoiceData = {
          invoiceNo: generatedSale.invoice_no || `INV-${String(generatedSale.id).slice(0, 5)}`,
          date: new Date().toLocaleDateString('en-GB'),
          customer: { name: selectedCustomer.name, address: `${selectedCustomer.state}, Nigeria` },
          items: saleItems.map(item => ({ description: item.equipment, qty: 1, rate: parseFloat(item.cost), discount: 0 })),
          taxAmount, 
          paymentMade: parseFloat(saleDetails.initial_deposit || "0")
        };
        localStorage.setItem("last_generated_invoice", JSON.stringify(invoiceData));
        navigate(`/invoice/${generatedSale.id}`);
      } else {
        toast.success("Sale saved as draft!");
        refetch(); // Instantly update the table via React Query
      }

      resetForm();
      setApplyTax(false);
      setSelectedStaff("");
      setSelectedCustomer(null);
      setOpen(false);
    } catch (error: any) {
      toast.error("Failed to save sale.");
      console.error(error.response?.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveItem = async (index: number) => {
    const itemToRemove = saleItems[index];
    if (!itemToRemove.assigned_tool_id) { removeItem(index); return; }
    try {
      await api.restoreSerials(itemToRemove.assigned_tool_id, itemToRemove.serial_set || []);
      removeItem(index);
    } catch { removeItem(index); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      startY: 25,
      head: [["Client", "Items", "Price", "Date", "Status"]],
      body: serverSales.map((s: Sale) => [s.name ?? "-", s.items?.length ?? 0, `₦${parseFloat(s.total_cost).toLocaleString()}`, s.date_sold ?? "-", (s.payment_status ?? "pending").toUpperCase()]),
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`sales_report.pdf`);
  };

  // --- SKELETON LOADER (Fixes Layout Shift) ---
  if (isLoading && serverSales.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6 animate-pulse w-full">
          {/* Mock Customer Search Area */}
          <div className="h-24 bg-slate-200 rounded-lg w-full border border-slate-100"></div>
          
          {/* Mock Export Button Area */}
          <div className="flex justify-end">
            <div className="h-10 bg-slate-200 rounded-md w-32"></div>
          </div>
          
          {/* Mock Table Area */}
          <div className="h-96 bg-slate-200 rounded-lg w-full border border-slate-100 mt-6"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        <CustomerSearch
          customers={customers}
          onSelectCustomer={(c) => { setSelectedCustomer(c); setOpen(true); }}
          onAddSaleClick={() => setOpen(true)}
          selectedCustomer={selectedCustomer}
          onClearCustomer={() => { setSelectedCustomer(null); resetForm(); }}
        />

        <div className="flex justify-end gap-3">
          <Button className="bg-slate-800 hover:bg-slate-700 text-white" onClick={exportPDF}>
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>

        <AddSaleDialog
          open={open}
          onOpenChange={setOpen}
          selectedCustomer={selectedCustomer}
          currentItem={currentItem}
          groupedTools={groupedTools}
          saleItems={saleItems}
          saleDetails={saleDetails}
          subtotal={subtotal}
          taxAmount={taxAmount}
          totalCost={totalCost}
          applyTax={applyTax}
          onTaxChange={setApplyTax}
          staffList={HARDCODED_STAFF}
          selectedStaff={selectedStaff}
          onStaffChange={setSelectedStaff}
          isSubmitting={isSubmitting}
          onCategoryChange={handleCategorySelect}
          onEquipmentTypeChange={handleEquipmentTypeSelect}
          onToolSelect={handleToolSelect}
          onCostChange={(cost) => updateCurrentItem({ cost })}
          onQuantityChange={(quantity) => updateCurrentItem({ quantity })}
          onAddItem={async () => {
              setIsSubmitting(true);
              try {
                 const qty = currentItem.quantity || 1;
                 for (let i = 0; i < qty; i++) {
                    const assignment = await assignRandomTool(currentItem);
                    addItem({
                       id: window.crypto.randomUUID(), 
                       tool_id: assignment.assigned_tool_id,
                       equipment: assignment.tool_name,
                       equipment_type: currentItem.selectedEquipmentType || "",
                       cost: currentItem.cost, 
                       category: currentItem.selectedCategory,
                       serial_set: [...(assignment.serial_set || [])],
                       assigned_tool_id: assignment.assigned_tool_id,
                    });
                    setDisplayedAssignment(assignment); 
                 }
              } catch (err: any) { toast.error(err.message); }
              finally { setIsSubmitting(false); }
          }}
          onRemoveItem={handleRemoveItem}
          filteredGroupedTools={groupedTools}
          onPaymentPlanChange={(v) => updateSaleDetails({ payment_plan: v })}
          onInitialDepositChange={(v) => updateSaleDetails({ initial_deposit: v })}
          onPaymentMonthsChange={(v) => updateSaleDetails({ payment_months: v })}
          //onExpiryDateChange={(v) => updateSaleDetails({ expiry_date: v })}
          onSaveDraft={() => handleSaveSale("draft")}
          onSaveAndSend={() => handleSaveSale("send")}
          onCancel={() => { resetForm(); setOpen(false); }}
        />

        <SalesTable
          sales={serverSales} 
          tools={tools}
          staffList={HARDCODED_STAFF} 
          loading={isFetching} // Connects table's internal loader to React Query
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          filterStartDate={startDate}
          filterEndDate={endDate}
          onDateChange={(start, end) => { setStartDate(start); setEndDate(end); setCurrentPage(1); }}
          onEditStatus={(sale) => {
            setEditingSale(sale);
            setNewPaymentStatus(sale.payment_status || "pending");
            setEditStatusOpen(true);
          }}
          // NEW PROP INTEGRATED HERE
          onMarkOverdue={async (sale) => {
            try {
              // Reusing your existing api.updateSaleStatus so everything remains completely consistent
              await api.updateSaleStatus(sale.id, "overdue");
              refetch(); // This instantly triggers React Query to fetch fresh data and update the UI
              toast.success("Customer marked as Overdue");
            } catch (error) {
              toast.error("Failed to mark as overdue");
            }
          }}
          onViewSerials={async (tool) => {
            const toolId = tool.id || (tool as any).assigned_tool_id;
            try {
              const res = await api.getSoldSerials(toolId);
              setViewingSerials({ open: true, tool, soldSerials: res.data });
            } catch { toast.error("History not available"); }
          }}
        />

        <EditStatusDialog 
          open={editStatusOpen} 
          onOpenChange={setEditStatusOpen} 
          sale={editingSale} 
          paymentStatus={newPaymentStatus} 
          onStatusChange={setNewPaymentStatus} 
          isUpdating={isUpdatingStatus} 
          onUpdate={async () => {
            setIsUpdatingStatus(true);
            try {
              await api.updateSaleStatus(editingSale.id, newPaymentStatus);
              refetch(); // Instantly update the table via React Query
              setEditStatusOpen(false);
              toast.success("Status Updated");
            } catch { toast.error("Failed"); } finally { setIsUpdatingStatus(false); }
          }} 
        />
        
        <ViewSerialsDialog 
           open={viewingSerials.open} 
           onOpenChange={(o) => setViewingSerials(p => ({ ...p, open: o }))} 
           onClose={() => setViewingSerials(p => ({ ...p, open: false }))} 
           tool={viewingSerials.tool || {}} 
           soldSerials={viewingSerials.soldSerials || []} 
        />
        
        <EquipmentTypeModal 
          open={showEquipmentTypeModal} 
          onOpenChange={setShowEquipmentTypeModal} 
          onSelect={handleEquipmentTypeSelect} 
          selectedType={currentItem.selectedEquipmentType || ""} 
          onCancel={() => setShowEquipmentTypeModal(false)} 
        />
        
        {displayedAssignment && (
          <AssignmentModal 
            assignment={displayedAssignment} 
            onClose={() => setDisplayedAssignment(null)} 
          />
        )}
      </div>
    </DashboardLayout>
  );
}