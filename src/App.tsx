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
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const SalesPage = lazy(() => import("./pages/Sales"));
const InvoicePage = lazy(() => import("./pages/InvoicePage")); 
const AdminDashboard = lazy(() => import("./pages/DashboardPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const ToolsSummary = lazy(() => import("./pages/ToolsSummary"));
const AdminSalesPage = lazy(() => import("./pages/AdminSalesPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const CustomerOwing = lazy(() => import("./pages/CustomerOwing"));
const StaffSalesPage = lazy(() => import("./pages/StaffSalesPage"));
const BuyNow = lazy(() => import("./pages/BuyNow"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Training = lazy(() => import("./pages/Training"));
const CorsNetwork = lazy(() => import("./pages/CorsNetwork"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const CartPage = lazy(() => import("./pages/CartPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CodesManagement = lazy(() => import("./pages/CodesManagement")); 
const PurchasesPage = lazy(() => import("./pages/PurchasesPage"));
const PurchasesIndex = lazy(() => import("./pages/PurchasesIndex"));

// NOTE: We keep MobileNavigation as a normal import because it renders instantly on every page!
import MobileNavigation from "./components/MobileNavigation";

// --- CONTEXT ---
import { CurrencyProvider } from './context/CurrencyContext';
import { CartProvider } from './context/CartContext'; 
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


  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect loop protection
    if (role === "admin") return <Navigate to="/dashboard" replace />;
    if (role === "staff") return <Navigate to="/staff/dashboard" replace />;
    if (role === "customer") return <Navigate to="/customer/dashboard" replace />;
    return <Navigate to="/login" replace />;
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
      <CurrencyProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RouteLogger />
              
              {/* 1. ErrorBoundary must wrap EVERYTHING that uses hooks/context */}
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* --- Public Routes --- */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/training" element={<Training />} />
                    <Route path="/corsnetwork" element={<CorsNetwork />} />
                    <Route path="/buynow" element={<BuyNow />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />
                    <Route path="/course/:courseId" element={<CourseDetail />} />

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
                    <Route path="/customer/owing" element={<PrivateRoute element={<CustomerOwing />} allowedRoles={["staff", "admin"]} />} />
                    <Route path="/codes-management" element={<PrivateRoute element={<CodesManagement />} allowedRoles={["staff", "admin"]} />} />
                    
                    <Route path="/dashboard" element={<PrivateRoute element={<AdminDashboard />} allowedRoles={["admin"]} />} />
                    <Route path="/admin/sales" element={<PrivateRoute element={<AdminSalesPage />} allowedRoles={["admin"]} />} />

                    <Route path="/customer/dashboard" element={<PrivateRoute element={<CustomerDashboard />} allowedRoles={["customer"]} />} />
                    <Route path="/customer/payments" element={<PrivateRoute element={<CustomerPayments />} allowedRoles={["customer"]} />} />
                    
                    <Route path="/sales/staff/:staffId" element={<StaffSalesPage />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>

                {/* 2. MobileNavigation is now INSIDE the ErrorBoundary */}
                <MobileNavigation />
                
              </ErrorBoundary>

            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
};

export default App;