// src/pages/Sales/hooks/useSaleForm.ts
import { useState } from 'react';
import type { CurrentItem, SaleItem, SaleDetails } from '../types';

const useSaleForm = () => {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  
  const [currentItem, setCurrentItem] = useState<CurrentItem>({
    selectedCategory: "",
    selectedEquipmentType: "",
    selectedTool: null,
    cost: "",
    quantity: 1 
  });

  const [saleDetails, setSaleDetails] = useState<SaleDetails>({
    payment_plan: "",
    initial_deposit: "",
    payment_months: "",
    expiry_date: ""
  });

  // --- NEW: State for Staff Override and Tax ---
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [applyTax, setApplyTax] = useState<boolean>(false);

  // --- NEW: Calculate Subtotal, Tax, and Total Cost ---
  const subtotal = saleItems.reduce((sum, item) => sum + parseFloat(item.cost || "0"), 0);
  const taxAmount = applyTax ? subtotal * 0.075 : 0; // 7.5% tax
  const totalCost = subtotal + taxAmount;

  const addItem = (item: SaleItem) => {
    setSaleItems(prev => [...prev, item]);
  };

  const removeItem = (index: number) => {
    setSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateCurrentItem = (updates: Partial<CurrentItem>) => {
    setCurrentItem(prev => ({ ...prev, ...updates }));
  };

  const updateSaleDetails = (updates: Partial<SaleDetails>) => {
    setSaleDetails(prev => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setSaleItems([]);
    setCurrentItem({
      selectedCategory: "",
      selectedEquipmentType: "",
      selectedTool: null,
      cost: "",
      quantity: 1 
    });
    setSaleDetails({
      payment_plan: "",
      initial_deposit: "",
      payment_months: "",
      expiry_date: "",
    });
    // Reset the new fields
    setSelectedStaff("");
    setApplyTax(false);
  };

  return {
    saleItems,
    currentItem,
    saleDetails,
    selectedStaff,   // <-- Exported for the API call
    applyTax,        // <-- Exported for the UI
    subtotal,        // <-- Exported for the UI
    taxAmount,       // <-- Exported for the API call
    totalCost,       // <-- Updated with tax
    addItem,
    removeItem,
    updateCurrentItem,
    updateSaleDetails,
    setSelectedStaff, // <-- Exported for the UI
    setApplyTax,      // <-- Exported for the UI
    resetForm
  };
};

export { useSaleForm };