import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, TrendingUp, ShoppingBag, BadgeCheck, UserCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { DashboardLayout } from "../components/DashboardLayout";
import axios from "axios";

// Single source of truth — same list used in SalesPage form dropdown
import { HARDCODED_STAFF } from "./Sales";

const API_URL = "http://localhost:8000/api";

// ------------------------------
// TYPES
// ------------------------------
interface StaffMember {
  id: string;
  name: string;
  email: string;
  source: "hardcoded" | "registered";
}

interface StaffSummary {
  totalSales: number;
  totalRevenue: number;
  completedSales: number;
}

// ------------------------------
// HELPERS
// ------------------------------
const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600",
  "bg-rose-600", "bg-amber-600", "bg-cyan-600",
  "bg-indigo-600", "bg-pink-600",
];

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

// ------------------------------
// STAFF CARD — fetches its own summary stats
// ------------------------------
const StaffCard = ({
  staff,
  index,
  onViewProfile,
}: {
  staff: StaffMember;
  index: number;
  onViewProfile: () => void;
}) => {
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      try {
        const res = await axios.get(`${API_URL}/sales/by-staff/`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { name: staff.name },
        });
        const sales = Array.isArray(res.data) ? res.data : res.data.results ?? [];
        const revenue = sales.reduce(
          (sum: number, s: any) => sum + parseFloat(s.total_cost || "0"), 0
        );
        const completed = sales.filter((s: any) =>
          ["completed", "paid", "fully-paid"].includes((s.payment_status || "").toLowerCase())
        ).length;
        setSummary({ totalSales: sales.length, totalRevenue: revenue, completedSales: completed });
      } catch {
        setSummary({ totalSales: 0, totalRevenue: 0, completedSales: 0 });
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [staff.name]);

  return (
    <Card className="bg-blue-950 border border-slate-700 hover:border-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/30">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={`${AVATAR_COLORS[index % AVATAR_COLORS.length]} min-w-[3.25rem] min-h-[3.25rem] w-13 h-13 rounded-full flex items-center justify-center text-white font-bold text-lg`}
          >
            {getInitials(staff.name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold text-sm truncate">{staff.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                staff.source === "registered"
                  ? "bg-green-900 text-green-300"
                  : "bg-slate-700 text-slate-300"
              }`}>
                {staff.source === "registered" ? "Registered" : "Staff"}
              </span>
            </div>
            <p className="text-slate-400 text-xs truncate mt-0.5">{staff.email}</p>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1 text-slate-300 text-xs">
                <ShoppingBag className="h-3 w-3 text-blue-400" />
                {loadingSummary
                  ? <span className="w-8 h-2.5 bg-slate-700 animate-pulse rounded inline-block" />
                  : <span>{summary?.totalSales} sales</span>
                }
              </div>
              <div className="flex items-center gap-1 text-slate-300 text-xs">
                <BadgeCheck className="h-3 w-3 text-green-400" />
                {loadingSummary
                  ? <span className="w-8 h-2.5 bg-slate-700 animate-pulse rounded inline-block" />
                  : <span>{summary?.completedSales} completed</span>
                }
              </div>
            </div>

            <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs font-semibold">
              <TrendingUp className="h-3 w-3" />
              {loadingSummary
                ? <span className="w-16 h-2.5 bg-slate-700 animate-pulse rounded inline-block" />
                : <span>{formatCurrency(summary?.totalRevenue ?? 0)}</span>
              }
            </div>
          </div>
        </div>

        {/* View Profile Button */}
        <Button
          onClick={onViewProfile}
          className="w-full mt-4 bg-slate-800 hover:bg-blue-700 text-white text-xs border border-slate-600 hover:border-blue-500 transition-all"
          size="sm"
        >
          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
          View Profile & Sales
        </Button>
      </CardContent>
    </Card>
  );
};

// ------------------------------
// MAIN PAGE
// ------------------------------
export default function StaffDirectoryPage(){
  const navigate = useNavigate();
  const [registeredStaff, setRegisteredStaff] = useState<StaffMember[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(true);

  // Fetch registered staff from Django
  useEffect(() => {
    const fetchRegistered = async () => {
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      try {
        const res = await axios.get(`${API_URL}/auth/staff/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
        setRegisteredStaff(
          data.map((u: any) => ({
            id: String(u.id),
            name: u.name || u.email,
            email: u.email,
            source: "registered" as const,
          }))
        );
      } catch {
        setRegisteredStaff([]);
      } finally {
        setLoadingRegistered(false);
      }
    };
    fetchRegistered();
  }, []);

  // Merge: registered staff first, then hardcoded staff not already in registered list
  const hardcodedAsStaffMembers: StaffMember[] = HARDCODED_STAFF.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    source: "hardcoded" as const,
  }));
  const registeredNames = new Set(registeredStaff.map((s) => s.name.toLowerCase()));
  const uniqueHardcoded = hardcodedAsStaffMembers.filter(
    (s) => !registeredNames.has(s.name.toLowerCase())
  );
  const allStaff = [...registeredStaff, ...uniqueHardcoded];

  const handleViewProfile = (staff: StaffMember) => {
    // ✅ KEY FIX: encode the staff NAME in the URL — not the numeric ID.
    // This means the detail page always has the name it needs directly
    // from the URL, regardless of staff type, refresh, or direct access.
    const encodedName = encodeURIComponent(staff.name);
    navigate(`/sales/staff/${encodedName}`, {
      state: { staffEmail: staff.email },
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Staff Sales</h1>
            <p className="text-muted-foreground mt-1">
              View each staff member's profile and tied sales history
            </p>
          </div>
          <div className="flex items-center gap-2 bg-blue-950 border border-slate-700 rounded-lg px-4 py-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-white text-sm font-medium">
              {allStaff.length} staff members
            </span>
          </div>
        </div>

        {/* Loading registered staff */}
        {loadingRegistered && (
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading registered staff...
          </div>
        )}

        {/* Staff Grid */}
        {allStaff.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allStaff.map((staff, index) => (
              <StaffCard
                key={`${staff.source}-${staff.id}`}
                staff={staff}
                index={index}
                onViewProfile={() => handleViewProfile(staff)}
              />
            ))}
          </div>
        ) : (
          !loadingRegistered && (
            <div className="flex flex-col items-center justify-center h-64 border border-slate-700 rounded-lg">
              <Users className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-400">No staff members found.</p>
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
