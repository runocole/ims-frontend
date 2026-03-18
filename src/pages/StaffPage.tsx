import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/DashboardLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { registerStaff, getStaff } from "../services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Search, Plus, Mail, Phone, UserCircle } from "lucide-react";

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_activated: boolean;
}

const StaffPage = () => {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]); 
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await getStaff();
      
      // ✅ Handle Pagination safely
      let actualData: Staff[] = [];
      if (response && response.results && Array.isArray(response.results)) {
        actualData = response.results;
      } else if (Array.isArray(response)) {
        actualData = response;
      }

      setStaffList(actualData);
    } catch (error) {
      console.error("Failed to fetch Users:", error);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!email) return alert("Email is required");
    try {
      setLoading(true);
      const newStaff = await registerStaff(name, email, phone);
      if (newStaff) {
        setShowAddModal(false);
        setEmail(""); setName(""); setPhone("");
        await fetchStaff();
      }
    } catch (err) {
      alert("Error adding user. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Updated to navigate to your new StaffProfileView page
  const handleViewProfile = (staffId: string, staffName: string) => {
    // Make sure this route matches exactly what you have in App.tsx
    navigate(`/sales/staff/${staffId}`, { state: { staffName } });
  };

  const filteredStaff = (Array.isArray(staffList) ? staffList : []).filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      (s.name?.toLowerCase() || "").includes(query) ||
      (s.email?.toLowerCase() || "").includes(query) ||
      (s.phone || "").includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Staff Management</h2>
            <p className="text-blue-300">View and manage staff profiles and performance</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-500">
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        </div>

        {/* Add Staff Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="bg-slate-900 text-white border-slate-700">
            <DialogHeader><DialogTitle>Add New Staff</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Email</Label><Input className="bg-slate-800 border-slate-700" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Name</Label><Input className="bg-slate-800 border-slate-700" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Phone</Label><Input className="bg-slate-800 border-slate-700" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddStaff} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500">
                {loading ? "Processing..." : "Register Staff"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-300" />
          <Input 
            placeholder="Search staff by name or email..." 
            className="pl-10 bg-blue-950 border-blue-800 text-white placeholder:text-blue-400" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>

        {/* Staff Table */}
        <Card className="border-blue-900 bg-blue-950 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-blue-400" />
              Active Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-blue-900 hover:bg-transparent">
                  <TableHead className="text-blue-200">Name</TableHead>
                  <TableHead className="text-blue-200">Contact Info</TableHead>
                  <TableHead className="text-blue-200 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id} className="border-blue-900 hover:bg-blue-900/30">
                      <TableCell className="font-semibold">{staff.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-blue-100 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {staff.email}
                          </span>
                          <span className="text-xs text-blue-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {staff.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-blue-700 hover:bg-blue-800 text-blue-100"
                          onClick={() => handleViewProfile(staff.id, staff.name)}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-blue-400">
                      {loading ? "Fetching staff data..." : "No staff members found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StaffPage;