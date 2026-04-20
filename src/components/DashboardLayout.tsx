import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar";
import { AppSidebar } from "../components/AppSidebar";
import { Bell, LogOut, AlertTriangle, Calendar, Search } from 'lucide-react';
import { Button } from "../components/ui/button";
import { useNotifications } from "../hooks/useNotifications";
import type { Notification, Tool } from "../hooks/useNotifications";

interface DashboardLayoutProps {
  children: React.ReactNode;
  tools?: Tool[];
  onNotificationClick?: (notification: Notification) => void;
}

// --------------------
// SEARCH BAR COMPONENT
// --------------------
interface SearchBarProps {
  onSearch: (query: string, type: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("customer");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim(), searchType);
      setSearchQuery(""); // Clear input after search
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center gap-2 bg-blue-900/50 rounded-lg px-3 py-1 border border-blue-700/50">
      <select 
        value={searchType}
        onChange={(e) => setSearchType(e.target.value)}
        className="bg-transparent text-white text-sm border-none outline-none pr-2"
      >
        <option value="customer" className="bg-blue-900">Customer</option>
        <option value="serial" className="bg-blue-900">Serial No</option>
        <option value="invoice" className="bg-blue-900">Invoice No</option>
      </select>
      
      <div className="w-px h-4 bg-blue-600/50"></div>
      
      <input 
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={`Search by ${searchType === 'customer' ? 'customer name' : searchType === 'serial' ? 'serial number' : 'invoice number'}...`}
        className="bg-transparent border-none outline-none text-white placeholder-gray-400 text-sm w-48 px-2 py-1"
      />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSearch}
        className="h-6 w-6 text-gray-300 hover:text-white hover:bg-blue-700/50 rounded"
        title="Search"
      >
        <Search className="h-3 w-3" />
      </Button>
    </div>
  );
};

// --------------------
// NOTIFICATION BELL COMPONENT
// --------------------
interface NotificationBellProps {
  notificationState: {
    notifications: Notification[];
    unreadCount: number;
    showDropdown: boolean;
  };
  onToggle: () => void;
  onMarkAllRead: () => void;
  onNotificationClick: (notification: Notification) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  notificationState, 
  onToggle, 
  onMarkAllRead, 
  onNotificationClick 
}) => (
  <div className="relative">
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="rounded-full text-gray-300 hover:text-white hover:bg-gray-700/40 transition relative"
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {notificationState.unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-medium">
          {notificationState.unreadCount > 9 ? '9+' : notificationState.unreadCount}
        </span>
      )}
    </Button>

    {/* Notification Dropdown */}
    {notificationState.showDropdown && (
      <div className="absolute right-0 top-12 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
        <div className="p-3 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-semibold">Alerts</h3>
          {notificationState.unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="overflow-y-auto max-h-80">
          {notificationState.notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              No alerts at this time
            </div>
          ) : (
            notificationState.notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-3 border-b border-slate-700 cursor-pointer hover:bg-slate-700/50 transition ${
                  !notification.read ? 'bg-slate-700/30' : ''
                }`}
                onClick={() => onNotificationClick(notification)}
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 ${
                    notification.priority === 'high' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {notification.type === 'low_stock' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {notification.toolName}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-1"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )}
  </div>
);

export function DashboardLayout({ children, tools = [], onNotificationClick }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const {
    notificationState,
    toggleNotificationDropdown,
    markAsRead,
    markAllAsRead,
    closeDropdown
  } = useNotifications(tools);

  // Enhanced notification handler
  const handleNotificationClick = (notification: Notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    markAsRead(notification.id);
    closeDropdown();
  };

  // Search handler - Navigate to appropriate page with search parameters
  const handleSearch = (query: string, type: string) => {
    console.log(`Searching for ${type}:`, query);
    
    switch (type) {
      case "customer":
        // Navigate to customers page with search query
        navigate(`/customers?search=${encodeURIComponent(query)}`);
        break;
        
      case "serial":
        // Navigate to tools summary page with serial number search
        navigate(`/tools-summary?serial=${encodeURIComponent(query)}`);
        break;
        
      case "invoice":
        // Navigate to tools summary page with invoice number search
        navigate(`/tools-summary?search=${encodeURIComponent(query)}`);
        break;
        
      default:
        console.log("Unknown search type:", type);
    }
  };

  // Logout handler
  const handleLogout = () => {
    // Clear any stored user/session data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();

    // Redirect to login page
    window.location.href = "/inventory";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-gray-100">
        {/* Sidebar */}
        <AppSidebar isOpen={isSidebarOpen} />

        {/* Main area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            isSidebarOpen ? "ml-64" : "ml-20"
          }`}
        >
          {/* Header */}
          <header className="h-16 border-b border-gray-700 bg-[#1E293B]/70 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
              <h1 className="text-lg font-semibold text-white tracking-wide">
                Inventory Management
              </h1>
            </div>

            {/* Search Bar, Notification and Logout Button */}
            <div className="flex items-center gap-4">
              {/* Search Bar - Added here */}
              <SearchBar onSearch={handleSearch} />
              {/* Notification Button */}
              <NotificationBell
                notificationState={notificationState}
                onToggle={toggleNotificationDropdown}
                onMarkAllRead={markAllAsRead}
                onNotificationClick={handleNotificationClick}
              />

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="rounded-full text-gray-300 hover:text-white hover:bg-gray-700/40 transition"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}