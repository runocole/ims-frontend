import { useEffect, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { Button } from "../../components/ui/button";
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
import axios from "axios"; 

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

  // --- Staff state for dropdown ---
  const [staffList, setStaffList] = useState<any[]>([]);

  // --- NEW: Handle Tax & Staff locally ---
  const [applyTax, setApplyTax] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string | number>("");

  const {
    sales, 
    customers,
    tools,
    groupedTools,
    setGroupedTools,
    loading: hookLoading,
    fetchGroupedTools,
    addSale,
    updateSaleStatus
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

  // --- NEW: Automatically calculate totals based on the items in the cart ---
  const subtotal = saleItems.reduce((sum, item) => sum + parseFloat(item.cost || "0"), 0);
  const taxAmount = applyTax ? subtotal * 0.075 : 0;
  const totalCost = subtotal + taxAmount;

  const { assignRandomTool } = useToolAssignment();
  const [displayedAssignment, setDisplayedAssignment] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [serverSales, setServerSales] = useState<Sale[]>([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

  // Fetch Staff List for Dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("access") || localStorage.getItem("token");
        const API_URL = "http://127.0.0.1:8000/api";
        const res = await axios.get(`${API_URL}/auth/staff/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStaffList(res.data.results || res.data || []);
      } catch (error) {
        console.error("Failed to load staff members:", error);
      }
    };
    fetchStaff();
  }, []);

  const fetchPaginatedSales = useCallback(async () => {
    setIsTableLoading(true);
    try {
      const token = localStorage.getItem("access") || localStorage.getItem("token"); 
      const API_URL = "http://127.0.0.1:8000/api";

      const res = await axios.get(`${API_URL}/sales/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          start_date: startDate,
          end_date: endDate
        }
      });
      
      setServerSales(res.data.results || res.data);
      if (res.data.count !== undefined) {
        setTotalItems(res.data.count);
        setTotalPages(Math.ceil(res.data.count / 10)); 
      }
    } catch (err) {
      console.error("Failed to fetch paginated sales:", err);
      toast.error("Failed to load sales data.");
    } finally {
      setIsTableLoading(false);
    }
  }, [currentPage, startDate, endDate]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPaginatedSales();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchPaginatedSales]);

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
        
        // --- NEW: Add Tax and Staff to payload safely ---
        staff: selectedStaff ? Number(selectedStaff) : null,
        tax_amount: String(taxAmount), 
        total_cost: String(totalCost),
        
        payment_plan: saleDetails.payment_plan,
        initial_deposit: saleDetails.initial_deposit || null,
        payment_months: saleDetails.payment_months || null,
        expiry_date: saleDetails.expiry_date || null,
        date_sold: new Date().toISOString().split('T')[0],
        
        payment_status: (saleDetails.payment_plan?.toLowerCase() === "installment" || parseFloat(saleDetails.initial_deposit || "0") > 0) 
                  ? "ongoing" 
                  : "pending",
      };

      const res = await api.createSale(payload);
      addSale(res.data); 

      if (action === "send") {
        const generatedSale = res.data as Sale; 

        const invoiceData = {
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
          taxAmount: taxAmount, 
          paymentMade: parseFloat(saleDetails.initial_deposit || "0")
        };

        localStorage.setItem("last_generated_invoice", JSON.stringify(invoiceData));
        toast.success("Sale Recorded! Generating Invoice...");
        
        setTimeout(() => {
          navigate(`/invoice/${generatedSale.id}`);
        }, 1000);
      } else {
        toast.success("Sale saved as draft!");
        fetchPaginatedSales(); 
      }

      // --- NEW: Reset all states including staff and tax after success ---
      resetForm();
      setApplyTax(false);
      setSelectedStaff("");
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
          
          subtotal={subtotal}
          taxAmount={taxAmount}
          totalCost={totalCost}
          applyTax={applyTax}
          onTaxChange={setApplyTax}
          staffList={staffList}
          selectedStaff={selectedStaff as string}
          onStaffChange={setSelectedStaff}

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
          onCancel={() => { 
            resetForm(); 
            setApplyTax(false);
            setSelectedStaff("");
            setSelectedCustomer(null); 
            setOpen(false); 
          }}
        />

        <SalesTable
          sales={serverSales} 
          tools={tools}
          loading={hookLoading || isTableLoading}
          
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(page) => setCurrentPage(page)}
          filterStartDate={startDate}
          filterEndDate={endDate}
          onDateChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
            setCurrentPage(1); 
          }}

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
              fetchPaginatedSales(); 
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