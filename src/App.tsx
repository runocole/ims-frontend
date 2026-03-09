import React from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CustomerDashboard from "./pages/CustomerDashboard";
import Dashboard from "./pages/StaffDashboard";
import Tools from "./pages/Tools";
import Payments from "./pages/Payments";
import CustomerPayments from "./pages/CustomerPayments";
import StaffPage from "./pages/StaffPage";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import SalesPage from "./pages/Sales";
import InvoicePage from "./pages/InvoicePage"; // ✅ ADDED THIS IMPORT
import AdminDashboard from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import ToolsSummary from "./pages/ToolsSummary";
import AdminSalesPage from "./pages/AdminSalesPage";
import LandingPage from "./pages/LandingPage";
import CustomerOwing from "./pages/CustomerOwing";
import StaffSalesPage from "./pages/StaffSalesPage";
import BuyNow from "./pages/BuyNow";
import Contact from "./pages/Contact";
import About from "./pages/About";
import Training from "./pages/Training";
import CorsNetwork from "./pages/CorsNetwork";
import CourseDetail from "./pages/CourseDetail";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import CartPage from "./pages/CartPage";
import { CurrencyProvider } from './context/CurrencyContext';
import { CartProvider } from './context/CartContext'; 
import ProductDetailPage from "./pages/ProductDetailPage";
import MobileNavigation from "./components/MobileNavigation";
import CodesManagement from "./pages/CodesManagement"; 
import PurchasesPage from "./pages/PurchasesPage";
import PurchasesIndex from "./pages/PurchasesIndex";


const queryClient = new QueryClient();

// ✅ Secure route wrapper
interface PrivateRouteProps {
  element: React.ReactElement;
  allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  element,
  allowedRoles,
}) => {
  const token = localStorage.getItem("access");
  const user = localStorage.getItem("user");
  const role = user ? JSON.parse(user).role : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/dashboard" replace />;
    if (role === "staff") return <Navigate to="/staff/dashboard" replace />;
    if (role === "customer") return <Navigate to="/customer/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return element;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CurrencyProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* --- Public Routes --- */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />

              {/* --- Staff / Shared Routes --- */}
              <Route
                path="/staff/dashboard"
                element={<PrivateRoute element={<Dashboard />} allowedRoles={["staff", "admin"]} />}
              />
              <Route
                path="/tools"
                element={<PrivateRoute element={<Tools />} allowedRoles={["staff", "admin"]} />}
              />
              <Route
                path="/payments"
                element={<PrivateRoute element={<Payments />} allowedRoles={["staff", "admin"]} />}
              />
              
              {/* ✅ ADDED INVOICE ROUTE HERE */}
              <Route
                path="/invoice/:invoiceId"
                element={
                  <PrivateRoute 
                    element={<InvoicePage />} 
                    allowedRoles={["staff", "admin"]} 
                  />
                }
              />

              <Route
                path="sales/:phone"
                element={
                  <PrivateRoute 
                    element={<PurchasesIndex />} 
                    allowedRoles={["staff", "admin"]} 
                  />
                }
              />

              {/* 2. The Customer Specific Ledger (Fires when you click "View Ledger" or the icon in the Sales table) */}
              <Route
                path="sales/:phone/:invoice_number"
                element={
                  <PrivateRoute 
                    element={<PurchasesPage />} 
                    allowedRoles={["staff", "admin"]} 
                  />
                }
              />

              <Route
                path="/sales"
                element={<PrivateRoute element={<SalesPage />} allowedRoles={["staff", "admin"]} />}
              />
              
              <Route
                path="/customers"
                element={<PrivateRoute element={<CustomersPage />} allowedRoles={["staff", "admin"]} />}
              />
              
              <Route
                path="/tools-summary"
                element={<PrivateRoute element={<ToolsSummary />} allowedRoles={["staff", "admin"]} />}
              />
              
              <Route
                path="/staff"
                element={<PrivateRoute element={<StaffPage />} allowedRoles={["staff", "admin"]} />}
              />
              
              <Route
                path="/settings"
                element={<PrivateRoute element={<Settings />} allowedRoles={["staff", "admin"]} />}
              />
              
              <Route
                path="/customer/owing"
                element={<PrivateRoute element={<CustomerOwing />} allowedRoles={["staff", "admin"]} />}
              />

              <Route
                path="/codes-management"
                element={<PrivateRoute element={<CodesManagement />} allowedRoles={["staff", "admin"]} />}
              />

              {/* --- Admin Only Routes --- */}
              <Route
                path="/dashboard"
                element={<PrivateRoute element={<AdminDashboard />} allowedRoles={["admin"]} />}
              />
              <Route
                path="/admin/sales"
                element={<PrivateRoute element={<AdminSalesPage />} allowedRoles={["admin"]} />}
              />

              {/* --- Customer Routes --- */}
              <Route
                path="/customer/dashboard"
                element={<PrivateRoute element={<CustomerDashboard />} allowedRoles={["customer"]} />}
              />
              <Route 
                path="/customer/payments" 
                element={<PrivateRoute element={<CustomerPayments />} allowedRoles={["customer"]} />} 
              />
              
              {/* --- Public Website Routes --- */}
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
              
              {/* --- Staff Sales Route --- */}
              <Route path="/sales/staff/:staffId" element={<StaffSalesPage />} />

              {/* --- Fallback redirect --- */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <MobileNavigation />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </CurrencyProvider>
  </QueryClientProvider>
);

export default App;