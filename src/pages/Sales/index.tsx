import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
// Updated path to match your structure
import { DashboardLayout } from "../../components/DashboardLayout";
import { useNavigate } from "react-router-dom"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-hot-toast";

// Types
import type { Customer, Sale } from "./types";

// Components
import { CustomerSearch } from "./components/CustomerSearch";
import { SalesTable } from "./components/SalesTable";
import { AddSaleDialog } from "./components/AddSaleDialog";
import { EquipmentTypeModal } from "./components/EquipmentTypeModal";
import { AssignmentModal } from "./components/AssignmentModal";
import { EditStatusDialog } from "./components/EditStatusDialog";
import { ViewSerialsDialog } from "./components/ViewSerialsDialog";

// Hooks
import { useSalesData } from "./hooks/useSalesData";
import { useSaleForm } from "./hooks/useSaleForm";
import { useToolAssignment } from "./hooks/useToolAssignment";

// Utils
import { api } from "./utils/api";

export default function SalesPage() {
  const navigate = useNavigate();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEquipmentTypeModal, setShowEquipmentTypeModal] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [editStatusOpen, setEditStatusOpen] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [viewingSerials, setViewingSerials] = useState<{
    open: boolean;
    tool: any | null;
    soldSerials: any[];
  }>({
    open: false,
    tool: null,
    soldSerials: []
  });

  const {
    sales,
    customers,
    tools,
    groupedTools,
    setGroupedTools,
    loading,
    fetchGroupedTools,
    addSale,
    updateSaleStatus
  } = useSalesData();

  const {
    saleItems,
    currentItem,
    saleDetails,
    totalCost,
    addItem,
    removeItem,
    updateCurrentItem,
    updateSaleDetails,
    resetForm
  } = useSaleForm();

  const { assignRandomTool } = useToolAssignment();
  const [displayedAssignment, setDisplayedAssignment] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadTools = async () => {
      if (!currentItem.selectedCategory) {
        setGroupedTools([]);
        return;
      }
      try {
        const data = await fetchGroupedTools(
          currentItem.selectedCategory,
          currentItem.selectedEquipmentType
        );
        if (isMounted) setGroupedTools(data || []);
      } catch (error) {
        console.error("Failed to load tools:", error);
      }
    };
    loadTools();
    return () => { isMounted = false; };
  }, [currentItem.selectedCategory, currentItem.selectedEquipmentType]);

  const handleCategorySelect = (category: string) => {
    updateCurrentItem({
      selectedCategory: category,
      selectedEquipmentType: "",
      selectedTool: null,
      cost: ""
    });
    if (category === "Receiver") setShowEquipmentTypeModal(true);
  };

  const handleEquipmentTypeSelect = (equipmentType: string) => {
    updateCurrentItem({ selectedEquipmentType: equipmentType });
    setShowEquipmentTypeModal(false);
  };

  const handleToolSelect = (toolName: string) => {
    const selected = Array.isArray(groupedTools) 
      ? groupedTools.find(tool => tool.name === toolName) 
      : null;
    
    if (selected) {
      updateCurrentItem({
        selectedTool: selected,
        cost: currentItem.cost || String(selected.cost || "")
      });
    }
  };

  const handleAddItem = async () => {
    if (!selectedCustomer || !currentItem.selectedTool || !currentItem.cost) {
      toast.error("Please select customer, equipment and price");
      return;
    }
    setIsSubmitting(true);
    try {
      const qty = currentItem.quantity || 1;
      for (let i = 0; i < qty; i++) {
        const assignment = await assignRandomTool(currentItem);
        const newItem = {
          id: window.crypto.randomUUID(), 
          tool_id: assignment.assigned_tool_id,
          equipment: assignment.tool_name,
          equipment_type: currentItem.selectedEquipmentType || "",
          cost: currentItem.cost, 
          category: currentItem.selectedCategory,
          serial_set: [...(assignment.serial_set || [])],
          external_radio_serial: assignment.external_radio_serial,
          datalogger_serial: assignment.datalogger_serial,
          assigned_tool_id: assignment.assigned_tool_id,
          import_invoice: assignment.import_invoice
        };
        addItem(newItem);
        setDisplayedAssignment(assignment); 
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to assign equipment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSale = async (action: "draft" | "send") => {
    if (!selectedCustomer || saleItems.length === 0) {
      toast.error("Missing customer or items.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        state: selectedCustomer.state,
        items: saleItems,
        total_cost: totalCost.toString(),
        payment_plan: saleDetails.payment_plan,
        initial_deposit: saleDetails.initial_deposit || null,
        payment_months: saleDetails.payment_months || null,
        expiry_date: saleDetails.expiry_date || null,
        date_sold: new Date().toISOString().split('T')[0],
        payment_status: "pending",
      };

      const res = await api.createSale(payload);
      addSale(res.data);

      if (action === "send") {
  const generatedSale = res.data as Sale; // Cast to your updated Sale type

  const invoiceData = {
    // 1. Safely check for invoice_no
    // 2. Safely convert ID to string before slicing
    invoiceNo: generatedSale.invoice_no || `INV-${String(generatedSale.id).slice(0, 5)}`,
    
    date: new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }),
    customer: {
      name: selectedCustomer.name,
      address: `${selectedCustomer.state}, Nigeria`,
    },
    items: saleItems.map(item => ({
      description: item.equipment,
      qty: 1,
      rate: parseFloat(item.cost),
      discount: 0
    })),
    paymentMade: parseFloat(saleDetails.initial_deposit || "0")
  };

  localStorage.setItem("last_generated_invoice", JSON.stringify(invoiceData));
  toast.success("Sale Recorded! Generating Invoice...");
  
  setTimeout(() => {
    navigate(`/invoice/${generatedSale.id}`);
  }, 1000);
} else {
        toast.success("Sale saved as draft!");
      }

      resetForm();
      setSelectedCustomer(null);
      setOpen(false);
    } catch (error) {
      toast.error("Failed to save sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveItem = async (index: number) => {
    const itemToRemove = saleItems[index];
    if (!itemToRemove.assigned_tool_id) {
      removeItem(index);
      return;
    }
    try {
      await api.restoreSerials(itemToRemove.assigned_tool_id, itemToRemove.serial_set || []);
      removeItem(index);
      toast.success("Item removed and stock restored.");
    } catch {
      removeItem(index);
      toast.error("UI updated, but server sync failed.");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      startY: 25,
      head: [["Client", "Items", "Price", "Date", "Status"]],
      body: sales.map((s) => [
        s.name ?? "-",
        s.items?.length ?? 0,
        `₦${parseFloat(s.total_cost).toLocaleString()}`,
        s.date_sold ?? "-",
        (s.payment_status ?? "pending").toUpperCase(),
      ]),
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`sales_report.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
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
          totalCost={totalCost}
          isSubmitting={isSubmitting}
          onCategoryChange={handleCategorySelect}
          onEquipmentTypeChange={handleEquipmentTypeSelect}
          onToolSelect={handleToolSelect}
          onCostChange={(cost) => updateCurrentItem({ cost })}
          onQuantityChange={(quantity) => updateCurrentItem({ quantity })}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          filteredGroupedTools={groupedTools}
          onPaymentPlanChange={(v) => updateSaleDetails({ payment_plan: v })}
          onInitialDepositChange={(v) => updateSaleDetails({ initial_deposit: v })}
          onPaymentMonthsChange={(v) => updateSaleDetails({ payment_months: v })}
          onExpiryDateChange={(v) => updateSaleDetails({ expiry_date: v })}
          onSaveDraft={() => handleSaveSale("draft")}
          onSaveAndSend={() => handleSaveSale("send")}
          onCancel={() => { resetForm(); setSelectedCustomer(null); setOpen(false); }}
        />

        <SalesTable
          sales={sales}
          tools={tools}
          loading={loading}
          onEditStatus={(sale) => {
            setEditingSale(sale);
            setNewPaymentStatus(sale.payment_status || "pending");
            setEditStatusOpen(true);
          }}
          onViewSerials={async (tool) => {
            const toolId = tool.id || (tool as any).assigned_tool_id;
            if (!toolId) return toast.error("Tool ID not found");
            try {
              const res = await api.getSoldSerials(toolId);
              setViewingSerials({ open: true, tool, soldSerials: res.data });
            } catch {
              toast.error("Could not fetch serial history");
            }
          }}
        />

        {/* Keeping existing modals for status and serials */}
        <EditStatusDialog
          open={editStatusOpen}
          onOpenChange={setEditStatusOpen}
          sale={editingSale}
          paymentStatus={newPaymentStatus}
          onStatusChange={setNewPaymentStatus}
          onUpdate={async () => {
            if (!editingSale) return;
            setIsUpdatingStatus(true);
            try {
              await api.updateSaleStatus(editingSale.id, newPaymentStatus);
              updateSaleStatus(editingSale.id, newPaymentStatus);
              setEditStatusOpen(false);
              toast.success("Payment status updated");
            } catch {
              toast.error("Update failed");
            } finally {
              setIsUpdatingStatus(false);
            }
          }}
          isUpdating={isUpdatingStatus}
        />

        <ViewSerialsDialog
          open={viewingSerials.open}
          onOpenChange={(open) => setViewingSerials(prev => ({ ...prev, open }))}
          tool={viewingSerials.tool}
          soldSerials={viewingSerials.soldSerials}
          onClose={() => setViewingSerials({ open: false, tool: null, soldSerials: [] })}
        />

        <EquipmentTypeModal
          open={showEquipmentTypeModal}
          onOpenChange={setShowEquipmentTypeModal}
          selectedType={currentItem.selectedEquipmentType}
          onSelect={handleEquipmentTypeSelect}
          onCancel={() => { setShowEquipmentTypeModal(false); updateCurrentItem({ selectedCategory: "" }); }}
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