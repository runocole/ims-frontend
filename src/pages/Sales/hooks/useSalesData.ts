import { useState, useEffect, useCallback } from "react";
import type { Sale, Customer, Tool, GroupedTool } from "../types";
import { api } from "../utils/api";

const useSalesData = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [groupedTools, setGroupedTools] = useState<GroupedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, custRes, toolsRes] = await Promise.allSettled([
        api.getSales(),
        api.getCustomers(),
        api.getTools(),
      ]);

      // Handle Sales
      if (salesRes.status === 'fulfilled') {
        const d = (salesRes.value.data as any)?.results || salesRes.value.data;
        setSales(Array.isArray(d) ? d : []);
      }

      // Handle Customers
      if (custRes.status === 'fulfilled') {
        const d = (custRes.value.data as any)?.results || custRes.value.data;
        setCustomers(Array.isArray(d) ? d : []);
      }

      // Handle Tools
      if (toolsRes.status === 'fulfilled') {
        const d = (toolsRes.value.data as any)?.results || toolsRes.value.data;
        setTools(Array.isArray(d) ? d : []);
      }

    } catch (err) {
      console.error("Critical fetch error:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchGroupedTools = async (category: string, equipmentType?: string) => {
    try {
      const response = await api.getGroupedTools(category, equipmentType);
      const data = (response.data as any)?.results || response.data;
      const safeData = Array.isArray(data) ? data : [];
      setGroupedTools(safeData);
      return safeData;
    } catch (err) {
      setGroupedTools([]);
      return [];
    }
  };

  const addSale = (newSale: Sale) => {
    setSales((prev) => [newSale, ...(Array.isArray(prev) ? prev : [])]);
  };

  const updateSaleStatus = (saleId: number, status: string) => {
    setSales((prev) => (Array.isArray(prev) ? prev : []).map((sale) => 
      sale.id === saleId ? { ...sale, payment_status: status } : sale
    ));
  };

  // --- THE CRITICAL RETURN ---
  // We ensure even if state is null, we return empty arrays to prevent .map() crashes
  return {
    sales: sales || [],
    customers: customers || [],
    tools: tools || [],
    groupedTools: groupedTools || [],
    setGroupedTools,
    loading,
    error,
    fetchGroupedTools,
    addSale,
    updateSaleStatus,
    refreshAll: fetchAll
  };
};

export { useSalesData };