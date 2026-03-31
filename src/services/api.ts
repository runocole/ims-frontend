import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

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
// AUTH HEADER
// ----------------------------
const authHeader = () => {
  // Check for both common token names just in case!
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  console.log("Token being sent:", token); // Add this line to debug
  // If your Django backend uses standard DRF Tokens instead of JWT, 
  // you might need to change "Bearer" to "Token" below.
  return {
    Authorization: `Bearer ${token}`, 
  };
};

// ----------------------------
// AUTH
// ----------------------------
export const loginUser = async (email: string, password: string) => {
  try {
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
  const response = await axios.post(
    `${API_URL}/auth/add-staff/`,
    { name, email, phone },
    { headers: authHeader() }
  );
  return response.data;
};

export const getStaff = async () => {
  const response = await axios.get(`${API_URL}/auth/staff/`, {
    headers: authHeader(),
  });
  return response.data;
};

// ----------------------------
// CUSTOMERS
// ----------------------------
export const getCustomers = async (page = 1, search = "") => {
  const params: Record<string, any> = { page };
  if (search) params.search = search;
  const response = await axios.get(`${API_URL}/customers/`, { params, headers: authHeader() });
  return response.data;  // return full paginated object {count, next, previous, results}
};

export const registerCustomer = async (
  name: string,
  email: string,
  phone: string,
  state: string
) => {
  const response = await axios.post(
    `${API_URL}/customers/add`,
    { name, email, phone, state },
    { headers: authHeader() }
  );
  return response.data;
};

export const activateCustomer = async (customerId: number) => {
  const response = await axios.post(
    `${API_URL}/customers/activate/${customerId}/`,
    {},
    { headers: authHeader() }
  );
  return response.data;
};


export const fetchCustomerOwingData = async (): Promise<any> => {
  try {
    const response = await axios.get(`${API_URL}/customer-owing/`, {  // ✅ Uses API_URL and correct path
      headers: authHeader(),
    });
    
    console.log("Customer Owing API Response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching customer owing data:', error);
    
  
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('URL called:', error.config?.url);
    } else if (error.request) {
      console.error('No response received. Check:');
      console.error('- Is Django server running?');
      console.error('- Is the URL correct?');
    }
    
    throw error;
  }
};
// ----------------------------
// SALES
// ----------------------------
export const getSales = async () => {
  const response = await axios.get(`${API_URL}/sales/`, {
    headers: authHeader(),
  });
  return response.data;
};

export const getSaleDetail = async (id: number) => {
  const response = await axios.get(`${API_URL}/sales/${id}/`, {
    headers: authHeader(),
  });
  return response.data;
};

export const createSale = async (saleData: any) => {
  const response = await axios.post(`${API_URL}/sales/`, saleData, {
    headers: authHeader(),
  });
  return response.data;
};

export const updateSale = async (id: number, saleData: any) => {
  const response = await axios.put(`${API_URL}/sales/${id}/`, saleData, {
    headers: authHeader(),
  });
  return response.data;
};

// ----------------------------
// PAYMENTS
// ----------------------------
export const getPayments = async () => {
  const response = await axios.get(`${API_URL}/payments/`, {
    headers: authHeader(),
  });
  return response.data;
};

// ----------------------------
// TOOLS
// ----------------------------
export const getTools = async () => {
  const response = await axios.get(`${API_URL}/tools/`, {
    headers: authHeader(),
  });
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
  expiry_date?: string; // Add expiry_date
}) => {
  const response = await axios.post(`${API_URL}/tools/`, toolData, {
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
  });
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
    expiry_date: string; // Add expiry_date
  }>
) => {
  const response = await axios.patch(`${API_URL}/tools/${id}/`, updatedData, {
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

export const updateToolStatus = async (id: string, status: string) => {
  const response = await fetch(`${API_URL}/tools/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) throw new Error("Failed to update tool status");
  return await response.json();
};

export const deleteTool = async (id: string) => {
  const response = await fetch(`${API_URL}/tools/${id}/`, {
    method: "DELETE",
    headers: authHeader(),
  });

  if (!response.ok) throw new Error("Failed to delete tool");
  return true;
};

// ----------------------------
// DASHBOARD
// ----------------------------
export const fetchDashboardData = async () => {
  const response = await axios.get(`${API_URL}/dashboard/summary/`, {
    headers: authHeader(),
  });
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

// Get equipment by invoice
export const getEquipmentByInvoice = async () => {
  const response = await axios.get(`${API_URL}/equipment-types/by-invoice/`, { // ADD API_URL
    headers: authHeader(),
  });
  return response.data;
};

// Get equipment types with optional filters
export const getEquipmentTypes = async (filters?: { invoice_number?: string; category?: string }) => {
  const params = new URLSearchParams();
  if (filters?.invoice_number) params.append('invoice_number', filters.invoice_number);
  if (filters?.category) params.append('category', filters.category);
  
  const response = await axios.get(`${API_URL}/equipment-types/?${params}`, { // ADD API_URL
    headers: authHeader(),
  });
  return response.data;
};

// Create equipment type
export const createEquipmentType = async (data: {
  name: string;
  default_cost: string;
  category: string;
  invoice_number?: string;
}) => {
  const response = await axios.post(`${API_URL}/equipment-types/`, data, { // ADD API_URL
    headers: authHeader(),
  });
  return response.data;
};

// Update equipment type
export const updateEquipmentType = async (id: string, data: {
  name: string;
  default_cost: string;
  category: string;
  invoice_number?: string;
}) => {
  const response = await axios.put(`${API_URL}/equipment-types/${id}/`, data, { // ADD API_URL
    headers: authHeader(),
  });
  return response.data;
};

// Delete equipment type
export const deleteEquipmentType = async (id: string) => {
  const response = await axios.delete(`${API_URL}/equipment-types/${id}/`, { // ADD API_URL
    headers: authHeader(),
  });
  return response.data;
};

// ----------------------------
// SUPPLIERS
// ----------------------------
export const getSuppliers = async () => {
  const response = await axios.get(`${API_URL}/suppliers/`, {
    headers: authHeader(),
  });
  return response.data;
};

export const createSupplier = async (supplierData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) => {
  const response = await axios.post(`${API_URL}/suppliers/`, supplierData, {
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
  });
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
  const response = await axios.patch(`${API_URL}/suppliers/${id}/`, supplierData, {
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

export const deleteSupplier = async (id: string) => {
  const response = await axios.delete(`${API_URL}/suppliers/${id}/`, {
    headers: authHeader(),
  });
  return response.data;
};

// ----------------------------
// CODE MANAGEMENT
// ----------------------------
export const getReceiverCodes = async () => {
  const response = await axios.get(`${API_URL}/codes/management/`, {
    headers: authHeader(),
  });
  return response.data;
};

export const saveReceiverCode = async (serial: string, code: string, duration: string) => {
  const response = await axios.post(
    `${API_URL}/codes/management/save/`,
    { serial, code, duration },
    { headers: authHeader() }
  );
  return response.data;
};

export const getMyCodes = async () => {
  const response = await axios.get(`${API_URL}/codes/customer/`, {
    headers: authHeader(),
  });
  return response.data; // This will return only codes belonging to the logged-in customer
};