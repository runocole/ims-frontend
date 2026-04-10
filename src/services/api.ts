import axios from "axios";

const API_URL = "https://inventory.oticgs.com/api";

// ----------------------------
// 1. CREATE CENTRAL AXIOS INSTANCE
// ----------------------------
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ----------------------------
// 2. REQUEST INTERCEPTOR (Fixes Amnesia/Reload)
// ----------------------------
api.interceptors.request.use(
  (config) => {
    // We can use "access" directly here which matches your constants file
    const token = localStorage.getItem("access");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ----------------------------
// 3. RESPONSE INTERCEPTOR (Fixes Disconnects/Inactivity)
// ----------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh");
        
        // Ask backend for a new access token
        const response = await axios.post(`${API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        // Save the new access token
        const newAccessToken = response.data.access;
        localStorage.setItem("access", newAccessToken);

        // Update the failed request and try again automatically
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Session expired. Please log in again.");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// ----------------------------
// TYPES
// ----------------------------
export interface ReceiverType {
  id: string;
  name: string;
  default_cost: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

// ----------------------------
// AUTH
// ----------------------------
export const loginUser = async (email: string, password: string) => {
  try {
    // Login doesn't use the interceptor because we don't have a token yet
    const response = await axios.post(`${API_URL}/auth/login/`, { email, password });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Login error:", error.response?.data || error.message);
    } else {
      console.error("Unexpected error:", (error as Error).message);
    }
    throw error;
  }
};

// ----------------------------
// STAFF
// ----------------------------
export const registerStaff = async (name: string, email: string, phone: string) => {
  const response = await api.post(`/auth/add-staff/`, { name, email, phone });
  return response.data;
};

export const getStaff = async () => {
  const response = await api.get(`/auth/staff/`);
  return response.data;
};

// ----------------------------
// CUSTOMERS
// ----------------------------
export const getCustomers = async (page = 1, search = "") => {
  const params: Record<string, any> = { page };
  if (search) params.search = search;
  const response = await api.get(`/customers/`, { params });
  return response.data; 
};

export const registerCustomer = async (name: string, email: string, phone: string, state: string) => {
  const response = await api.post(`/customers/add`, { name, email, phone, state });
  return response.data;
};

export const activateCustomer = async (customerId: number) => {
  const response = await api.post(`/customers/activate/${customerId}/`, {});
  return response.data;
};

export const fetchCustomerOwingData = async (): Promise<any> => {
  const response = await api.get(`/customer-owing/`);
  return response.data;
};

// ----------------------------
// SALES
// ----------------------------
export const getSales = async () => {
  const response = await api.get(`/sales/`);
  return response.data;
};

export const getSaleDetail = async (id: number) => {
  const response = await api.get(`/sales/${id}/`);
  return response.data;
};

export const createSale = async (saleData: any) => {
  const response = await api.post(`/sales/`, saleData);
  return response.data;
};

export const updateSale = async (id: number, saleData: any) => {
  const response = await api.put(`/sales/${id}/`, saleData);
  return response.data;
};

// ----------------------------
// PAYMENTS
// ----------------------------
export const getPayments = async () => {
  const response = await api.get(`/payments/`);
  return response.data;
};

// ----------------------------
// TOOLS
// ----------------------------
export const getTools = async () => {
  const response = await api.get(`/tools/`);
  return response.data;
};

export const createTool = async (toolData: {
  name: string;
  description?: string;
  code: string;
  cost: string;
  category?: string;
  stock?: number;
  supplier?: string;
  expiry_date?: string; 
}) => {
  const response = await api.post(`/tools/`, toolData);
  return response.data;
};

export const updateTool = async (
  id: string,
  updatedData: Partial<{
    name: string;
    description: string;
    code: string;
    cost: string;
    status: string;
    category: string;
    stock: number;
    supplier: string;
    expiry_date: string; 
  }>
) => {
  const response = await api.patch(`/tools/${id}/`, updatedData);
  return response.data;
};

export const updateToolStatus = async (id: string, status: string) => {
  const response = await api.patch(`/tools/${id}/`, { status });
  return response.data;
};

export const deleteTool = async (id: string) => {
  await api.delete(`/tools/${id}/`); // <--- FIXED THE TYPESCRIPT ERROR!
  return true;
};

// ----------------------------
// DASHBOARD
// ----------------------------
export const fetchDashboardData = async () => {
  const response = await api.get(`/dashboard/summary/`);
  const data = response.data;

  return {
    totalTools: data.totalTools ?? data.total_tools,
    totalStaff: data.totalStaff ?? data.total_staff,
    activeCustomers: data.activeCustomers ?? data.active_customers ?? 0,
    mtdRevenue: data.mtdRevenue ?? data.total_revenue ?? 0,
    toolStatusCounts: data.toolStatusCounts ?? data.tool_status_counts ?? {},
    inventoryBreakdown: data.inventoryBreakdown ?? data.inventory_breakdown ?? [],
    lowStockItems: data.lowStockItems ?? data.low_stock_items ?? [],
    topSellingTools: data.topSellingTools ?? data.top_selling_tools ?? [],
    recentSales: data.recentSales ?? data.recent_sales ?? [],
    expiringReceivers: data.expiringReceivers ?? data.expiring_receivers ?? [],
  };
};

// ----------------------------
// EQUIPMENT TYPES
// ----------------------------
export interface EquipmentType {
  id: string;
  name: string;
  default_cost: string;
  category: string;
  description?: string;
  created_at?: string;
}

export const getEquipmentByInvoice = async () => {
  const response = await api.get(`/equipment-types/by-invoice/`);
  return response.data;
};

export const getEquipmentTypes = async (filters?: { invoice_number?: string; category?: string }) => {
  const params = new URLSearchParams();
  if (filters?.invoice_number) params.append('invoice_number', filters.invoice_number);
  if (filters?.category) params.append('category', filters.category);
  
  const response = await api.get(`/equipment-types/?${params}`);
  return response.data;
};

export const createEquipmentType = async (data: {
  name: string;
  default_cost: string;
  category: string;
  invoice_number?: string;
}) => {
  const response = await api.post(`/equipment-types/`, data);
  return response.data;
};

export const updateEquipmentType = async (id: string, data: {
  name: string;
  default_cost: string;
  category: string;
  invoice_number?: string;
}) => {
  const response = await api.put(`/equipment-types/${id}/`, data);
  return response.data;
};

export const deleteEquipmentType = async (id: string) => {
  const response = await api.delete(`/equipment-types/${id}/`);
  return response.data;
};

// ----------------------------
// SUPPLIERS
// ----------------------------
export const getSuppliers = async () => {
  const response = await api.get(`/suppliers/`);
  return response.data;
};

export const createSupplier = async (supplierData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) => {
  const response = await api.post(`/suppliers/`, supplierData);
  return response.data;
};

export const updateSupplier = async (
  id: string,
  supplierData: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }>
) => {
  const response = await api.patch(`/suppliers/${id}/`, supplierData);
  return response.data;
};

export const deleteSupplier = async (id: string) => {
  const response = await api.delete(`/suppliers/${id}/`);
  return response.data;
};

// ----------------------------
// CODE MANAGEMENT
// ----------------------------
export const getReceiverCodes = async () => {
  const response = await api.get(`/codes/management/`);
  return response.data;
};

export const saveReceiverCode = async (serial: string, code: string, duration: string) => {
  const response = await api.post(`/codes/management/save/`, { serial, code, duration });
  return response.data;
};

export const getMyCodes = async () => {
  const response = await api.get(`/codes/customer/`);
  return response.data;
};

export default api;