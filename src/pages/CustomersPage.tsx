import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { registerCustomer, getCustomers } from "../services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Search, Plus, Mail, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "../components/ui/use-toast";

// ------------------------------
// INTERFACE
// ------------------------------
interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  state: string;
  is_activated: boolean;
}

// ------------------------------
// COMPONENT
// ------------------------------
const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlSearchQuery, setUrlSearchQuery] = useState("");

  // ------------------------------
  // PAGINATION STATE
  // ------------------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Add Customer Fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    state: "",
  });

  // Get URL parameters
  const location = useLocation();

  // ------------------------------
  // Fetch Customers
  // ------------------------------
  const fetchCustomers = async (page = 1, search = "") => {
    try {
      const data = await getCustomers(page, search);
      setCustomers(data.results);
      setTotalCount(data.count);
      setHasNext(!!data.next);
      setHasPrev(!!data.previous);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast({ title: "Error", description: "Could not fetch customers." });
    }
  };

  useEffect(() => {
    fetchCustomers(currentPage, searchTerm);
  }, []);

  // ------------------------------
  // Handle URL Search Parameters
  // ------------------------------
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const search = searchParams.get('search');

    if (search) {
      setUrlSearchQuery(search);
      setSearchTerm(search);
      setCurrentPage(1);
      fetchCustomers(1, search);

      setTimeout(() => {
        const highlightedRow = document.querySelector('.highlighted-customer');
        if (highlightedRow) {
          highlightedRow.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 500);
    }
  }, [location.search]);

  // ------------------------------
  // Add Customer — Optimistic UI Update
  // ------------------------------
  const handleAddCustomer = async () => {
    const { name, email, phone, state } = formData;

    if (!email || !name) {
      toast({ title: "Missing Info", description: "Name and Email are required." });
      return;
    }

    // Build a temporary customer object instantly
    const tempCustomer: Customer = {
      id: `temp-${Date.now()}`,
      name,
      email,
      phone,
      state,
      is_activated: false,
    };

    // ✅ OPTIMISTIC UPDATE: Add to list immediately before API call
    setCustomers((prev) => [tempCustomer, ...prev]);
    setNewCustomer(tempCustomer);
    setFormData({ name: "", email: "", phone: "", state: "" });
    setShowAddModal(false);
    setShowSuccessModal(true);

    try {
      setLoading(true);
      const response = await registerCustomer(name, email, phone, state);

      // Replace temp customer with real one from server
      const confirmedCustomer: Customer = {
        id: response.id || tempCustomer.id,
        name,
        email,
        phone,
        state,
        is_activated: false,
      };

      setCustomers((prev) =>
        prev.map((c) => (c.id === tempCustomer.id ? confirmedCustomer : c))
      );
      setNewCustomer(confirmedCustomer);

      toast({
        title: "Success",
        description: "Customer added successfully! Email with password has been sent.",
      });

      // ✅ FIXED: Sync with correct page and search arguments
      fetchCustomers(1, searchTerm);
      setCurrentPage(1);

    } catch (error: any) {
      console.error("Add customer failed:", error);

      if (error.response?.status === 500 && error.response?.data?.detail?.includes('email')) {
        const confirmedCustomer: Customer = {
          id: error.response.data.id || tempCustomer.id,
          name,
          email,
          phone,
          state,
          is_activated: false,
        };

        setCustomers((prev) =>
          prev.map((c) => (c.id === tempCustomer.id ? confirmedCustomer : c))
        );
        setNewCustomer(confirmedCustomer);

        toast({
          title: "Customer Created",
          description: "Customer was created but email failed to send. You can still add a sale.",
          variant: "destructive",
        });

        // ✅ FIXED: Sync with correct page and search arguments
        fetchCustomers(1, searchTerm);
        setCurrentPage(1);

      } else {
        // ❌ ROLLBACK: Remove temp customer if request truly failed
        setCustomers((prev) => prev.filter((c) => c.id !== tempCustomer.id));
        setShowSuccessModal(false);

        toast({
          title: "Error",
          description: error.response?.data?.detail || "Failed to add customer.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // Navigate to Sales Page
  // ------------------------------
  const handleAddSale = () => {
    if (newCustomer) {
      localStorage.setItem('selectedCustomer', JSON.stringify({
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        state: newCustomer.state
      }));
      window.location.href = '/inventory/sales';
    }
  };

  // ------------------------------
  // Search Handler — calls backend
  // ------------------------------
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    fetchCustomers(1, value);
  };

  // ------------------------------
  // Check if customer matches URL search
  // ------------------------------
  const isCustomerHighlighted = (customer: Customer) => {
    if (!urlSearchQuery) return false;
    const query = urlSearchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  };

  // ------------------------------
  // Clear URL search
  // ------------------------------
  const clearUrlSearch = () => {
    setUrlSearchQuery("");
    setSearchTerm("");
    setCurrentPage(1);
    fetchCustomers(1, "");
    window.history.replaceState({}, '', window.location.pathname);
  };

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
            <p className="text-muted-foreground">
              Manage customer information and account status
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>

        {/* Add Customer Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Customer name"
                required
              />

              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
                required
              />

              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 08012345678"
              />

              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Lagos"
              />
            </div>

            <DialogFooter>
              <Button onClick={handleAddCustomer} disabled={loading}>
                {loading ? "Adding..." : "Add Customer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="bg-blue-950 text-white">
            <DialogHeader>
              <DialogTitle className="text-green-600">Success!</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-lg text-white">
                Successfully added a customer, kindly proceed to add sale
              </p>
              {newCustomer && (
                <div className="mt-4 p-3 bg-blue-950 rounded-md text-gray-900">
                  <p className="text-white"><strong>Name:</strong> {newCustomer.name}</p>
                  <p className="text-white"><strong>Email:</strong> {newCustomer.email}</p>
                  <p className="text-white"><strong>Phone:</strong> {newCustomer.phone}</p>
                  <p className="text-white"><strong>State:</strong> {newCustomer.state}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleAddSale} className="bg-blue-600 hover:bg-blue-700 text-white">
                Add Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* URL Search Banner */}
        {urlSearchQuery && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  Showing results for: "{urlSearchQuery}"
                </span>
                <span className="text-blue-600 text-sm">
                  ({totalCount} matches found)
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearUrlSearch}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                Clear Search
              </Button>
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, email, or phone..."
            className="pl-10"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Customer Table */}
        <Card className="bg-blue-950">
          <CardHeader>
            <CardTitle>All Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-slate-900">
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className={`
                        ${isCustomerHighlighted(customer) ? 'highlighted-customer bg-blue-950 border-l-4 border-l-yellow-500' : ''}
                        hover:bg-slate-900
                      `}
                    >
                      <TableCell className="font-medium text-sm">
                        {String(customer.id).startsWith("temp-")
                          ? "Adding..."
                          : String(customer.id).slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {customer.name}
                        {isCustomerHighlighted(customer) && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Match
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{customer.email ?? "No email"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{customer.phone}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{customer.state || "—"}</TableCell>

                      <TableCell>
                        {customer.is_activated ? (
                          <span className="text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-yellow-600 font-medium">Inactive</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      {urlSearchQuery ? `No customers found for "${urlSearchQuery}"` : "No customers found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* PAGINATION CONTROLS */}
            {(hasNext || hasPrev) && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * 10) + 1}–{Math.min(currentPage * 10, totalCount)} of {totalCount} customers
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const prev = currentPage - 1;
                      setCurrentPage(prev);
                      fetchCustomers(prev, searchTerm);
                    }}
                    disabled={!hasPrev}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(totalCount / 10)}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = currentPage + 1;
                      setCurrentPage(next);
                      fetchCustomers(next, searchTerm);
                    }}
                    disabled={!hasNext}
                    className="gap-1"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomersPage;
