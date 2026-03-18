// src/pages/Sales/hooks/useSalesData.ts
import { useState, useEffect } from "react";
import type { Sale, Customer, Tool, GroupedTool } from "../types";
import { api } from "../utils/api";

const useSalesData = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [groupedTools, setGroupedTools] = useState<GroupedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [salesRes, custRes, toolsRes] = await Promise.all([
          api.getSales(),
          api.getCustomers(),
          api.getTools(),
        ]);
        setSales(salesRes.data);
        setCustomers(custRes.data);
        setTools(toolsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const fetchGroupedTools = async (category: string, equipmentType?: string) => {
    try {
      const response = await api.getGroupedTools(category, equipmentType);
      setGroupedTools(response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching grouped tools:", err);
      setGroupedTools([]);
      return [];
    }
  };

  const addSale = (newSale: Sale) => {
    setSales((prev: any) => {
      const prevArray = Array.isArray(prev) ? prev : (prev?.results ? prev.results : []);
      // NOTE: If your new sale variable is named something other than 'newSale' 
      // (like 'data', 'response.data', or 'sale'), change it in the line below!
      return [newSale, ...prevArray]; 
    });
  };

  const updateSaleStatus = (saleId: number, status: string) => {
    setSales(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, payment_status: status } : sale
    ));
  };

  return {
    sales,
    customers,
    tools,
    groupedTools,
    setGroupedTools,
    loading,
    error,
    fetchGroupedTools,
    addSale,
    updateSaleStatus,
  };
};

export { useSalesData };