import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

// 1. Create the central Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Request Interceptor: Auto-attach the access token to EVERY request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor: Auto-refresh token if you've been inactive
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 (Unauthorized) and we haven't retried yet
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

        // Update the failed request with the new token and try again!
        if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // If the refresh token is ALSO expired, log them out completely
        console.error("Session expired. Please log in again.");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login"; // Redirect to login page
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// --- AUTH ---
export const loginUser = async (email: string, password: string) => {
  try {
    // Note: We use raw axios here because login doesn't need a token
    const response = await axios.post(`${API_URL}/auth/login/`, {
      email,
      password,
    });
    return response.data; // Ensure your login component saves BOTH 'access' and 'refresh' to localStorage
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Login error:", error.response?.data || error.message);
    } else {
      console.error("Unexpected error:", (error as Error).message);
    }
    throw error;
  }
};

// --- STAFF REGISTRATION ---
export const registerStaff = async (name: string, email: string, phone: string) => {
  const response = await api.post(`/auth/add-staff/`, { name, email, phone });
  return response.data;
};

// --- FETCH STAFF LIST ---
export const getStaff = async () => {
  const response = await api.get(`/auth/staff/`);
  return response.data;
};

// --- CUSTOMER MANAGEMENT ---
export const getCustomers = async () => {
  const response = await api.get(`/customers/`);
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

// --- SALES ---
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

// --- PAYMENTS ---
export const getPayments = async () => {
  const response = await api.get(`/payments/`);
  return response.data;
};

// --- TOOLS ---
export const getTools = async () => {
  const response = await api.get(`/tools/`);
  return response.data;
};

export const createTool = async (toolData: {
  name: string;
  description?: string;
  code: string;
  cost: string;
  status: string;
  category?: string;
  stock?: number;
  supplier?: string;
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
  await api.delete(`/tools/${id}/`);
  return true;
};

// --- DASHBOARD METRICS ---
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
  };
};

export default api;