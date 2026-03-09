import {
  LayoutDashboard,
  Package,
  DollarSign,
  Users,
  Settings,
  ShoppingCart,
  FileText,
  Key,
  ReceiptText,
  Wallet, // ✅ Added Wallet icon for Purchases
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../components/ui/sidebar";
import logo from "../assets/otic-logo.png";

// 🧩 Props
interface AppSidebarProps {
  isOpen?: boolean;
}

export function AppSidebar({ isOpen: externalIsOpen }: AppSidebarProps) {
  const { state } = useSidebar();
  const isSidebarExpanded = state === "expanded";

  // prefer external state if provided, otherwise use context
  const isOpen = externalIsOpen ?? isSidebarExpanded;

  // Control width values here
  const expandedWidth = "w-64"; // 16rem
  const collapsedWidth = "w-16"; // 4rem

  // Get current role from localStorage
  const user = localStorage.getItem("user");
  const userRole = user ? JSON.parse(user).role : null;

  // Role-based menu configuration
  const menuByRole: Record<string, { title: string; url: string; icon: any }[]> = {
    admin: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Code Management", url: "/codes-management", icon: Key },
      { title: "Payments", url: "/payments", icon: DollarSign },
      { title: "Invoices", url: "/invoice/latest", icon: ReceiptText },
      { title: "Staff", url: "/staff", icon: Users },
      { title: "Inventory Summary", url: "/tools-summary", icon: FileText },
      { title: "Sales", url: "/admin/sales", icon: ShoppingCart },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
    staff: [
      { title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard },
      { title: "Code Management", url: "/codes-management", icon: Key },
      { title: "Items", url: "/tools", icon: Package },
      { title: "Invoices", url: "/invoice/latest", icon: ReceiptText },
      { title: "Payments", url: "/payments", icon: DollarSign },
      { title: "Inventory Summary", url: "/tools-summary", icon: FileText }, 
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Sales", url: "/sales", icon: ShoppingCart },
    ],
    customer: [
      { title: "Dashboard", url: "/customer/dashboard", icon: LayoutDashboard },
      { title: "Payments", url: "/customer/payments", icon: DollarSign },
    ]
  };

  const menuItems = menuByRole[userRole] || [];

  return (
    <Sidebar
      collapsible="icon"
      className={`border-r border-blue-800/30 bg-blue-950 text-white transition-all duration-300 ease-in-out ${
        isOpen ? expandedWidth : collapsedWidth
      }`}
    >
      <SidebarContent>
        {/* --- Brand Header --- */}
        <div className="flex items-center justify-center py-6 border-b border-blue-800/40">
          {isOpen ? (
            <div className="flex items-center gap-3">
              <img src={logo} alt="GEOSSO LOGO" className="h-8 w-8 object-contain" />
              <h2 className="font-bold text-xl text-white tracking-wide">
                OTIC GEOSYSTEMS
              </h2>
            </div>
          ) : (
            <img src={logo} alt="GEOSSO LOGO" className="h-8 w-8 object-contain" />
          )}
        </div>

        {/* --- Menu --- */}
        <SidebarGroup>
          {isOpen && (
            <SidebarGroupLabel className="px-4 py-2 text-xs uppercase text-blue-200/80 tracking-wide">
              Main Menu
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `
                          flex items-center gap-3 rounded-md px-3 py-2 transition-colors
                          ${
                            isActive
                              ? "bg-blue-700 text-white font-medium border-l-2 border-white"
                              : "text-blue-100 hover:bg-blue-800 hover:text-white"
                          }
                        `
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {isOpen && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}