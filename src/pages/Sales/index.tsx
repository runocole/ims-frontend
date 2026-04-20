import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
import { DashboardLayout } from "../../components/DashboardLayout";
import { useNavigate } from "react-router-dom"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-hot-toast";
import axios from "axios"; 
import { useQuery } from "@tanstack/react-query";

import type { Customer, Sale } from "./types";
import { useSalesData } from "./hooks/useSalesData";
import { useSaleForm } from "./hooks/useSaleForm";
import { useToolAssignment } from "./hooks/useToolAssignment";
import { api } from "./utils/api";

import { CustomerSearch } from "./components/CustomerSearch";
import { SalesTable } from "./components/SalesTable";
import { AddSaleDialog } from "./components/AddSaleDialog";
import { EquipmentTypeModal } from "./components/EquipmentTypeModal";
import { AssignmentModal } from "./components/AssignmentModal";
import { EditStatusDialog } from "./components/EditStatusDialog";
import { ViewSerialsDialog } from "./components/ViewSerialsDialog";
import { useStaffList } from "../../hooks/useStaffList";

export default function SalesPage() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [applyTax, setApplyTax] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

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

  const { staffList } = useStaffList();
  const {
    customers, tools, groupedTools, setGroupedTools,
    fetchGroupedTools, addSale
  } = useSalesData();

  const {
    saleItems, currentItem, saleDetails,
    addItem, removeItem, updateCurrentItem, updateSaleDetails, resetForm
  } = useSaleForm();

  const { assignRandomTool } = useToolAssignment();

  // ── Browser Tab Close Safety Net ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If there are items in the cart, warn the user before they leave
      if (saleItems.length > 0) {
        e.preventDefault();
        e.returnValue = ""; 
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saleItems]);

  // ── React Query — includes showDrafts in key so it refetches on toggle ──
  const { data: salesData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sales', currentPage, startDate, endDate, showDrafts],
    queryFn: async () => {
      const token = localStorage.getItem("access") || localStorage.getItem("token"); 
      const params: Record<string, any> = {
        page: currentPage,
        start_date: startDate,
        end_date: endDate,
      };
      // Draft mode: send status=pending so backend returns only pending sales
      if (showDrafts) params.status = "pending";
      const res = await axios.get(`https://inventory.oticgs.com/api/sales/`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return res.data;
    }
  });

  const serverSales = salesData?.results && Array.isArray(salesData.results)
  ? salesData.results
  : Array.isArray(salesData) 
    ? salesData 
    : [];
  const totalItems = salesData?.count || 0;
  const totalPages = salesData?.count ? Math.ceil(salesData.count / 10) : 1;

  const subtotal = saleItems.reduce((sum, item) => sum + parseFloat(item.cost || "0"), 0);
  const taxAmount = applyTax ? subtotal * 0.075 : 0;
  const totalCost = subtotal + taxAmount;

  useEffect(() => {
    let isMounted = true;
    if (!currentItem.selectedCategory) { setGroupedTools([]); return; }
    const loadTools = async () => {
      try {
        const data = await fetchGroupedTools(
          currentItem.selectedCategory,
          currentItem.selectedEquipmentType
        );
        if (isMounted) setGroupedTools(data || []);
      } catch (error) { console.error(error); }
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
    const selected = Array.isArray(groupedTools)
      ? groupedTools.find(t => t.name === toolName) : null;
    if (selected) {
      updateCurrentItem({
        selectedTool: selected,
        cost: currentItem.cost || String(selected.cost || ""),
      });
    }
  };

  // ── Shared reset ──
  const resetDialog = () => {
    resetForm();
    setApplyTax(false);
    setSelectedStaff("");
    setSelectedCustomer(null);
    setOpen(false);
  };

  // ── Build payload — shared shape for draft, send, cancel-save ──
  const buildPayload = (status: string) => {
    let calculatedDueDate: string | null = null;
    if (saleDetails.payment_plan?.includes("Yes") && saleDetails.payment_months) {
      const months = parseInt(saleDetails.payment_months, 10);
      const date = new Date();
      date.setMonth(date.getMonth() + months);
      calculatedDueDate = date.toISOString().split("T")[0];
    }
    return {
      name: selectedCustomer!.name,
      phone: selectedCustomer!.phone,
      state: selectedCustomer!.state,
      items: saleItems,
      staff: String(selectedStaff).trim(),
      tax_amount: String(taxAmount),
      total_cost: String(totalCost),
      payment_plan: saleDetails.payment_plan,
      initial_deposit: saleDetails.initial_deposit || null,
      payment_months: saleDetails.payment_months || null,
      due_date: calculatedDueDate,
      date_sold: new Date().toISOString().split("T")[0],
      payment_status: status,
    };
  };

  // ── Resolve live status for Save & Send ──
  const resolveStatus = () => {
    const deposit = parseFloat(saleDetails.initial_deposit || "0");
    if (deposit >= totalCost && totalCost > 0) return "completed";
    if (saleDetails.payment_plan?.toLowerCase() === "installment" || deposit > 0) return "ongoing";
    if (saleDetails.payment_plan === "Yes") return "ongoing";
    return "completed";
  };

  // ── Restore all assigned serials back to inventory ──
  const restoreAllSerials = async () => {
    for (const item of saleItems) {
      if (item.assigned_tool_id) {
        try {
          await api.restoreSerials(item.assigned_tool_id, item.serial_set || []);
        } catch { /* best-effort */ }
      }
    }
  };

  // ── Main save handler ──
  const handleSaveSale = async (action: "draft" | "send" | "cancel") => {
    // Cancel with no items — just close
    if (action === "cancel" && saleItems.length === 0) {
      resetDialog();
      return;
    }

    // Cancel with items — save as draft if we have customer + staff, else restore serials
    if (action === "cancel" && saleItems.length > 0) {
      const hasCustomer = !!selectedCustomer;
      const hasStaff = !!String(selectedStaff).trim();
      if (hasCustomer && hasStaff) {
        try {
          const payload = buildPayload("pending");
          const res = await api.createSale(payload);
          addSale(res.data);
          refetch();
          toast("Sale saved as draft. Find it under Drafts.", { icon: "📋" });
        } catch {
          await restoreAllSerials();
          toast("Could not save draft. Items returned to inventory.", { icon: "↩️" });
        }
      } else {
        await restoreAllSerials();
        toast("Items returned to inventory.", { icon: "↩️" });
      }
      resetDialog();
      return;
    }

    // Draft or Send — require customer and items
    if (!selectedCustomer || saleItems.length === 0) {
      return toast.error("Missing customer or items.");
    }
    const staffName = String(selectedStaff).trim();
    if (!staffName || staffName === "undefined" || staffName === "null") {
      return toast.error("Please select a staff member.");
    }

    setIsSubmitting(true);
    try {
      const status = action === "draft" ? "pending" : resolveStatus();
      const payload = buildPayload(status);
      const res = await api.createSale(payload);
      addSale(res.data);

      if (action === "send") {
        const generatedSale = res.data as Sale;
        const invoiceData = {
          invoiceNo: generatedSale.invoice_no || `INV-${String(generatedSale.id).slice(0, 5)}`,
          date: new Date().toLocaleDateString("en-GB"),
          customer: { name: selectedCustomer.name, address: `${selectedCustomer.state}, Nigeria` },
          items: saleItems.map(item => ({
            description: item.equipment, qty: 1, rate: parseFloat(item.cost), discount: 0,
          })),
          taxAmount,
          paymentMade: parseFloat(saleDetails.initial_deposit || "0"),
        };
        localStorage.setItem("last_generated_invoice", JSON.stringify(invoiceData));
        navigate(`/invoice/${generatedSale.id}`);
      } else {
        toast.success("Sale saved as draft!");
        refetch();
      }
      resetDialog();
    } catch (error: any) {
      toast.error("Failed to save sale.");
      console.error(error.response?.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Dialog Close Interceptor ──
  const handleDialogClose = (isOpen: boolean) => {
    // If the modal is trying to close AND there are items in the cart
    if (!isOpen && saleItems.length > 0) {
      // Trigger the Cancel/Save-to-Draft logic instead of letting it vanish
      handleSaveSale("cancel");
    } else {
      // Otherwise, just open or close normally
      setOpen(isOpen);
    }
  };

  // ── Resume a draft ──
  const handleResumeDraft = async (sale: Sale) => {
    try {
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      const res = await axios.get(`https://inventory.oticgs.com/api/sales/${sale.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fullSale = res.data;

      setSelectedCustomer({
        id: fullSale.id,
        name: fullSale.name,
        phone: fullSale.phone,
        email: "",
        state: fullSale.state,
      });

      setSelectedStaff(fullSale.staff || "");

      updateSaleDetails({
        payment_plan: fullSale.payment_plan || "No",
        initial_deposit: fullSale.initial_deposit ? String(fullSale.initial_deposit) : "",
        payment_months: fullSale.payment_months ? String(fullSale.payment_months) : "",
      });

      if (fullSale.items && fullSale.items.length > 0) {
        fullSale.items.forEach((item: any) => {
          addItem({
            id: window.crypto.randomUUID(),
            tool_id: item.tool_id || item.assigned_tool_id,
            equipment: item.equipment,
            equipment_type: item.equipment_type || "",
            cost: String(item.cost),
            category: item.category,
            serial_set: item.serial_set || [],
            assigned_tool_id: item.assigned_tool_id || item.tool_id,
            import_invoice: item.import_invoice || "",
          });
        });
      }

      setOpen(true);

      await axios.delete(`https://inventory.oticgs.com/api/sales/${sale.id}/`,{
        headers: { Authorization: `Bearer ${token}` },
      });
      refetch();

      toast(
        `Resuming draft for ${fullSale.name}. Items restored — click Save & Send when ready.`,
        { icon: "▶️", duration: 6000 }
      );
    } catch (err: any) {
      toast.error("Failed to resume draft. Please try again.");
      console.error(err);
    }
  };

  // ── Delete a draft ──
  const handleDeleteDraft = async (sale: Sale) => {
    try {
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      await axios.delete(`https://inventory.oticgs.com/api/sales/${sale.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refetch();
      toast.success("Draft deleted. Items returned to inventory.");
    } catch {
      toast.error("Failed to delete draft.");
    }
  };

  // ── Remove Middle Card Item ──
  const handleRemoveItem = async (index: number) => {
    const itemToRemove = saleItems[index];
    
    // If no serials were assigned yet, just remove it from UI
    if (!itemToRemove.assigned_tool_id) { 
      removeItem(index); 
      return; 
    }
    
    try {
      // Attempt to return the serials to the database
      await api.restoreSerials(itemToRemove.assigned_tool_id, itemToRemove.serial_set || []);
      
      // ONLY remove from the screen if the database confirms it succeeded
      removeItem(index);
    } catch (error) {
      // DO NOT remove from the UI here. Show a warning instead.
      console.error("Failed to restore item:", error);
      toast.error("Network glitch: Could not return item to inventory. Please try again.");
    }
  };

  // ── PDF Export ──
  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      startY: 25,
      head: [["Client", "Items", "Price", "Date", "Status"]],
      body: serverSales.map((s: Sale) => [
        s.name ?? "-", s.items?.length ?? 0,
        `₦${parseFloat(s.total_cost).toLocaleString()}`,
        s.date_sold ?? "-",
        (s.payment_status ?? "pending").toUpperCase(),
      ]),
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save("sales_report.pdf");
  };

  if (isLoading && serverSales.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6 animate-pulse w-full">
          <div className="h-24 bg-slate-200 rounded-lg w-full border border-slate-100" />
          <div className="flex justify-end">
            <div className="h-10 bg-slate-200 rounded-md w-32" />
          </div>
          <div className="h-96 bg-slate-200 rounded-lg w-full border border-slate-100 mt-6" />
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
          onOpenChange={handleDialogClose} // <--- Intercepts background clicks and ESC key
          selectedCustomer={selectedCustomer}
          currentItem={currentItem}
          groupedTools={groupedTools}
          filteredGroupedTools={groupedTools}
          saleItems={saleItems}
          saleDetails={saleDetails}
          subtotal={subtotal}
          taxAmount={taxAmount}
          totalCost={totalCost}
          applyTax={applyTax}
          onTaxChange={setApplyTax}
          staffList={staffList}
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
          onPaymentPlanChange={(v) => updateSaleDetails({ payment_plan: v })}
          onInitialDepositChange={(v) => updateSaleDetails({ initial_deposit: v })}
          onPaymentMonthsChange={(v) => updateSaleDetails({ payment_months: v })}
          onSaveDraft={() => handleSaveSale("draft")}
          onSaveAndSend={() => handleSaveSale("send")}
          onCancel={() => handleSaveSale("cancel")}
        />

        <SalesTable
          sales={serverSales}
          tools={tools}
          staffList={staffList}
          loading={isFetching}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          filterStartDate={startDate}
          filterEndDate={endDate}
          onDateChange={(start, end) => { setStartDate(start); setEndDate(end); setCurrentPage(1); }}
          showDrafts={showDrafts}
          onDeleteDraft={handleDeleteDraft}
          onDraftFilterChange={(val) => { setShowDrafts(val); setCurrentPage(1); }}
          onEditStatus={(sale) => {
            setEditingSale(sale);
            setNewPaymentStatus(sale.payment_status || "pending");
            setEditStatusOpen(true);
          }}
          onResumeDraft={handleResumeDraft}
          onMarkOverdue={async (sale) => {
            try {
              await api.updateSaleStatus(sale.id, "overdue");
              refetch();
              toast.success("Customer marked as Overdue");
            } catch { toast.error("Failed to mark as overdue"); }
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
              refetch();
              setEditStatusOpen(false);
              toast.success("Status Updated");
            } catch { toast.error("Failed"); }
            finally { setIsUpdatingStatus(false); }
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