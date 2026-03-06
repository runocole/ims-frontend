// src/pages/Sales/utils/api.ts
import axios from "axios";
import type { Sale, Customer, Tool, GroupedTool, SoldSerialInfo } from "../types";

const API_URL = "http://localhost:8000/api";

// Helper to get headers - consolidated to avoid repetition
const getAxiosConfig = () => {
  const token = localStorage.getItem("access");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

const api = {
  /**
   * GENERIC HELPERS
   * Fixes the "Property 'post' does not exist" error
   */
  post: (url: string, data: any) => 
    axios.post(`${API_URL}${url}`, data, getAxiosConfig()),

  /**
   * SALES
   */
  getSales: () => 
    axios.get<Sale[]>(`${API_URL}/sales/`, getAxiosConfig()),
  
  createSale: (payload: any) => 
    axios.post<Sale>(`${API_URL}/sales/`, payload, getAxiosConfig()),
  
  updateSaleStatus: (saleId: number, status: string) => 
    axios.patch(`${API_URL}/sales/${saleId}/`, { payment_status: status }, getAxiosConfig()),

  /**
   * CUSTOMERS
   */
  getCustomers: () => 
    axios.get<Customer[]>(`${API_URL}/customers/`, getAxiosConfig()),

  /**
   * TOOLS & INVENTORY
   */
  getTools: () => 
    axios.get<Tool[]>(`${API_URL}/tools/`, getAxiosConfig()),
  
  getTool: (toolId: string) => 
    axios.get<Tool>(`${API_URL}/tools/${toolId}/`, getAxiosConfig()),
  
  // ✅ UPDATED: Added deduplication logic to handle duplicate tool names
  getGroupedTools: async (category: string, equipmentType?: string) => {
    const params = new URLSearchParams({ category });
    if (equipmentType) {
      params.append('equipment_type', equipmentType);
    }
    
    const response = await axios.get<GroupedTool[]>(
      `${API_URL}/tools/grouped/?${params}`, 
      getAxiosConfig()
    );
    
    // ✅ DEDUPLICATION: Combine tools with same name
    const deduplicatedTools = response.data.reduce((acc: GroupedTool[], tool: GroupedTool) => {
      const existingTool = acc.find(t => t.name === tool.name);
      
      if (existingTool) {
        // Merge duplicate: add stocks together
        existingTool.total_stock += tool.total_stock;
        existingTool.tool_count = (existingTool.tool_count || 0) + (tool.tool_count || 1);
      } else {
        // First occurrence of this tool name
        acc.push({ ...tool });
      }
      
      return acc;
    }, []);
    
    return { ...response, data: deduplicatedTools };
  },
  
  assignRandomTool: (toolName: string, category: string, equipmentType?: string) => 
    axios.post(`${API_URL}/tools/assign-random/`, {
      tool_name: toolName,
      category,
      equipment_type: equipmentType
    }, getAxiosConfig()),

  // NEW: Specifically handles restoring stock when an item is removed from the table
  restoreSerials: (toolId: string | number, serialSet: string[]) => 
    axios.post(`${API_URL}/tools/restore-serials/`, {
      tool_id: toolId,
      serial_set: serialSet
    }, getAxiosConfig()),
  
  getSoldSerials: (toolId: string) => 
    axios.get<SoldSerialInfo[]>(`${API_URL}/tools/${toolId}/sold-serials/`, getAxiosConfig()),

  /**
   * EMAIL
   */
  sendSaleEmail: (email: string, name: string, items: any[], total: number, invoiceNumber?: string) => 
    axios.post(`${API_URL}/send-sale-email/`, {
      to_email: email,
      subject: `Your Invoice ${invoiceNumber ? `- ${invoiceNumber}` : ''}`,
      message: `Hello ${name},\n\nThank you for your purchase! Here's your invoice:\n\n${items.map(item => 
        `• ${item.equipment} - ₦${parseFloat(item.cost).toLocaleString()}`
      ).join('\n')}\n\nTotal: ₦${total.toLocaleString()}\n\nPayment link: [Paystack Link Here]\n\nBest regards,\nOTIC Surveys`,
    }, getAxiosConfig()),
};

export { api };