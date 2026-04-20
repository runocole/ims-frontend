import React, { Suspense, lazy} from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// --- PAGE IMPORTS ---
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const Dashboard = lazy(() => import("./pages/StaffDashboard"));
const Tools = lazy(() => import("./pages/Tools"));
const Payments = lazy(() => import("./pages/Payments"));
const CustomerPayments = lazy(() => import("./pages/CustomerPayments"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const StaffSalesPage = lazy(() => import("./pages/StaffSalesPage"));
const StaffDirectoryPage = lazy(() => import("./pages/StaffDirectoryPage"));
const StaffSalesDetailPage = lazy(() => import("./pages/StaffSalesDetailPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const SalesPage = lazy(() => import("./pages/Sales"));
const InvoicePage = lazy(() => import("./pages/InvoicePage")); 
const AdminDashboard = lazy(() => import("./pages/DashboardPage"));
const MonthlyRevenuePage = lazy(() => import("./pages/MonthlyRevenuePage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const ToolsSummary = lazy(() => import("./pages/ToolsSummary"));
const AdminSalesPage = lazy(() => import("./pages/AdminSalesPage"));

const CustomerOwing = lazy(() => import("./pages/CustomerOwing"));
const CodesManagement = lazy(() => import("./pages/CodesManagement")); 
const PurchasesPage = lazy(() => import("./pages/PurchasesPage"));
const PurchasesIndex = lazy(() => import("./pages/PurchasesIndex"));
const CodeSearch = lazy(() => import("./pages/CodeSearch"));
const QuotationsPage = lazy(() => import("./pages/QuotationsPage"));

// --- CONTEXT ---
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";
import { useLocation } from "react-router-dom";




const RouteLogger = () => {
  const location = useLocation();
  console.log("Matched route:", location.pathname);
  return null;
};


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// --- BULLETPROOF AUTH CHECK ---
const PrivateRoute: React.FC<{ element: React.ReactElement; allowedRoles?: string[] }> = ({ 
  element, 
  allowedRoles 
}) => {
  const token = localStorage.getItem("access");
  const userStr = localStorage.getItem("user");
  
  let role = null;
  try {
    // If the string is "undefined" or malformed, this catch prevents the white screen
    role = userStr ? JSON.parse(userStr).role : null;
  } catch (e) {
    console.error("Auth Parsing Error:", e);
    role = null;
  }

  console.log("Token:", token);
  console.log("Raw userStr:", userStr);
  console.log("Parsed role:", role);
  console.log("Allowed roles:", allowedRoles);


  if (!token) return <Navigate to="/inventory" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect loop protection
    if (role === "admin") return <Navigate to="/dashboard" replace />;
    if (role === "staff") return <Navigate to="/staff/dashboard" replace />;
    if (role === "customer") return <Navigate to="/customer/dashboard" replace />;
    return <Navigate to="/inventory" replace />;
  }

  return element;
};

// --- LOADING FALLBACK (Prevents the White Void) ---
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
  </div>
);

const ErrorFallback = ({ error }: FallbackProps) => {
  const err = error as Error;
  return (
    <div style={{ color: "white", background: "#0f172a", padding: "2rem" }}>
      <p>Something went wrong:</p>
      <pre>{err.message}</pre>
    </div>
  );
};



const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename="/inventory">
              <RouteLogger />
              
              {/* 1. ErrorBoundary must wrap EVERYTHING that uses hooks/context */}
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* --- Public Routes --- */}
                    <Route path="/" element={<Login />} />
                    <Route path="/code" element={<CodeSearch />} />

                    {/* --- Protected Routes --- */}
                    <Route path="/staff/dashboard" element={<PrivateRoute element={<Dashboard />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/tools" element={<PrivateRoute element={<Tools />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/payments" element={<PrivateRoute element={<Payments />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/invoice/:invoiceId" element={<PrivateRoute element={<InvoicePage />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/sales" element={<PrivateRoute element={<SalesPage />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/sales/:phone" element={<PrivateRoute element={<PurchasesIndex />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/sales/:phone/:invoice_number" element={<PrivateRoute element={<PurchasesPage />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/customers" element={<PrivateRoute element={<CustomersPage />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/tools-summary" element={<PrivateRoute element={<ToolsSummary />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/staff" element={<PrivateRoute element={<StaffPage />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/settings" element={<PrivateRoute element={<Settings />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/customer/receivables" element={<PrivateRoute element={<CustomerOwing />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/codes-management" element={<PrivateRoute element={<CodesManagement />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/quotations" element={<PrivateRoute element={<QuotationsPage />} allowedRoles={["admin", "staff"]} />} />
                    
                    <Route path="/dashboard" element={<PrivateRoute element={<AdminDashboard />} allowedRoles={["admin"]} />} />
                    <Route path="/admin/sales" element={<PrivateRoute element={<AdminSalesPage />} allowedRoles={["admin"]} />} />
                    <Route path="/staff-directory" element={<PrivateRoute element={<StaffDirectoryPage />} allowedRoles={["admin"]} />} />
                    <Route path="/sales/staff/:staffName" element={<PrivateRoute element={<StaffSalesDetailPage />} allowedRoles={["admin"]} />} />
                    <Route path="/revenue-history" element={<PrivateRoute element={<MonthlyRevenuePage />} allowedRoles={["admin"]} />} />

                    <Route path="/customer/dashboard" element={<PrivateRoute element={<CustomerDashboard />} allowedRoles={["customer"]} />} />
                    <Route path="/customer/payments" element={<PrivateRoute element={<CustomerPayments />} allowedRoles={["customer"]} />} />
                    
                    <Route path="/sales/staff/:staffId" element={<StaffSalesPage />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
                
              </ErrorBoundary>

            </BrowserRouter>
          </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;