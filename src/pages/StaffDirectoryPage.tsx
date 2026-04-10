import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Users, TrendingUp, ShoppingBag, BadgeCheck,
  UserCheck, UserPlus, X, Eye, EyeOff,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { DashboardLayout } from "../components/DashboardLayout";
import axios from "axios";

const API_URL = "https://inventory.oticgs.com/api";

const authHeader = () => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: "registered" | "display";
}

interface StaffSummary {
  totalSales: number;
  totalRevenue: number;
  completedSales: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600",
  "bg-rose-600", "bg-amber-600", "bg-cyan-600",
  "bg-indigo-600", "bg-pink-600",
];

const getInitials = (name: string) => {
  if (!name) return "ST"; // Default fallback initials
  return name.split(" ").map((n) => n?.[0] || "").join("").slice(0, 2).toUpperCase();
};

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

// ─── Staff Card ───────────────────────────────────────────────────────────────
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
      try {
        const res = await axios.get(`${API_URL}/sales/by-staff/`, {
          headers: authHeader(),
          params: { name: staff.name },
        });
        const sales = Array.isArray(res.data) ? res.data : res.data.results ?? [];
        const revenue = sales.reduce(
          (sum: number, s: any) => sum + parseFloat(s.total_cost || "0"), 0
        );
        const completed = sales.filter((s: any) =>
          ["completed", "paid", "fully-paid"].includes(
            (s.payment_status || "").toLowerCase()
          )
        ).length;
        setSummary({
          totalSales: sales.length,
          totalRevenue: revenue,
          completedSales: completed,
        });
      } catch {
        setSummary({ totalSales: 0, totalRevenue: 0, completedSales: 0 });
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [staff.name]);

  const isRegistered = staff.type === "registered";

  return (
    <Card className="bg-blue-950 border border-slate-700 hover:border-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/30">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={`${AVATAR_COLORS[index % AVATAR_COLORS.length]} min-w-[3.25rem] min-h-[3.25rem] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
          >
            {getInitials(staff.name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold text-sm truncate">
                {staff.name}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isRegistered
                    ? "bg-green-900 text-green-300"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {isRegistered ? "Registered" : "Staff"}
              </span>
            </div>
            {staff.email && (
              <p className="text-slate-400 text-xs truncate mt-0.5">
                {staff.email}
              </p>
            )}
            {staff.phone && (
              <p className="text-slate-500 text-xs truncate">{staff.phone}</p>
            )}
            {!isRegistered && (
              <p className="text-slate-600 text-[10px] mt-0.5 italic">
                Sales attribution only — no login access
              </p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-3 mt-3">
              <div className="flex items-center gap-1 text-slate-300 text-xs">
                <ShoppingBag className="h-3 w-3 text-blue-400" />
                {loadingSummary ? (
                  <span className="w-8 h-2.5 bg-slate-700 animate-pulse rounded inline-block" />
                ) : (
                  <span>{summary?.totalSales} sales</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-300 text-xs">
                <BadgeCheck className="h-3 w-3 text-green-400" />
                {loadingSummary ? (
                  <span className="w-8 h-2.5 bg-slate-700 animate-pulse rounded inline-block" />
                ) : (
                  <span>{summary?.completedSales} completed</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs font-semibold">
              <TrendingUp className="h-3 w-3" />
              {loadingSummary ? (
                <span className="w-16 h-2.5 bg-slate-700 animate-pulse rounded inline-block" />
              ) : (
                <span>{formatCurrency(summary?.totalRevenue ?? 0)}</span>
              )}
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffDirectoryPage() {
  const navigate = useNavigate();

  const [registeredStaff, setRegisteredStaff] = useState<StaffMember[]>([]);
  const [displayStaff, setDisplayStaff]       = useState<StaffMember[]>([]);
  const [loading, setLoading]                 = useState(true);

  // Dialog state — "registered" or "display"
  const [addType, setAddType]     = useState<"registered" | "display" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  // ── Fetch both lists ──────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [regRes, dispRes] = await Promise.allSettled([
        axios.get(`${API_URL}/auth/staff/`,    { headers: authHeader() }),
        axios.get(`${API_URL}/staff/display/`, { headers: authHeader() }),
      ]);

      if (regRes.status === "fulfilled") {
        const rawData = regRes.value.data;
        const data = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.results) ? rawData.results : []);
        
        setRegisteredStaff(
          data.map((u: any) => ({
            id:    String(u.id || Math.random()),
            name:  u.name || u.email || "Unnamed Staff",
            email: u.email || "",
            phone: u.phone || "",
            type:  "registered" as const,
          }))
        );
      }

      if (dispRes.status === "fulfilled") {
        const rawData = dispRes.value.data;
        const data = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.results) ? rawData.results : []);
        
        setDisplayStaff(
          data.map((s: any) => ({
            id:    String(s.id || Math.random()),
            name:  s.name || s.email || "Unnamed Staff",
            email: s.email || "",
            phone: s.phone || "",
            type:  "display" as const,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Merge for grid display — registered first, then display-only
  const registeredNames = new Set(
    registeredStaff.map((s) => (s.name || "").toLowerCase())
  );
  
  const uniqueDisplay = displayStaff.filter(
    (s) => !registeredNames.has((s.name || "").toLowerCase())
  );
  
  const allStaff = [...registeredStaff, ...uniqueDisplay];

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setFormError(null);
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (addType === "registered" && !form.email.trim()) {
      setFormError("Email is required for registered staff."); return;
    }

    setSubmitting(true);
    try {
      if (addType === "registered") {
        await axios.post(
          `${API_URL}/auth/add-staff/`,
          { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
          { headers: authHeader() }
        );
      } else {
        await axios.post(
          `${API_URL}/staff/display/`,
          { name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null },
          { headers: authHeader() }
        );
      }
      setAddType(null);
      setForm({ name: "", email: "", phone: "" });
      await fetchAll();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.name?.[0] ||
        err?.response?.data?.email?.[0] ||
        "Failed to add staff member.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewProfile = (staff: StaffMember) => {
    navigate(`/sales/staff/${encodeURIComponent(staff.name)}`, {
      state: { staffEmail: staff.email },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Staff Directory
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage staff members and view their sales performance
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-blue-950 border border-slate-700 rounded-lg px-4 py-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-white text-sm font-medium">
                {allStaff.length} staff member{allStaff.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Add display-only staff */}
            <Button
              onClick={() => {
                setAddType("display");
                setForm({ name: "", email: "", phone: "" });
                setFormError(null);
              }}
              variant="outline"
              className="border-slate-600 bg-slate-800 hover:bg-slate-700 text-white gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Staff
            </Button>

            {/* Add registered staff (with login) */}
            <Button
              onClick={() => {
                setAddType("registered");
                setForm({ name: "", email: "", phone: "" });
                setFormError(null);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Registered Staff
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />
            Registered — has app login access
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
            Staff — sales attribution only, no login
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading staff...
          </div>
        )}

        {/* Grid */}
        {!loading && allStaff.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allStaff.map((staff, index) => (
              <StaffCard
                key={`${staff.type}-${staff.id}`}
                staff={staff}
                index={index}
                onViewProfile={() => handleViewProfile(staff)}
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && allStaff.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 border border-slate-700 rounded-lg gap-4">
            <Users className="h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No staff members yet.</p>
            <Button
              onClick={() => setAddType("display")}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              <UserPlus className="h-4 w-4" /> Add First Staff Member
            </Button>
          </div>
        )}
      </div>

      {/* ── Add Staff Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!addType} onOpenChange={() => setAddType(null)}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-900/40 border border-blue-700/50">
                <UserPlus className="w-4 h-4 text-blue-400" />
              </div>
              {addType === "registered"
                ? "Add Registered Staff"
                : "Add Staff Member"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Type explanation */}
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs leading-relaxed ${
              addType === "registered"
                ? "bg-green-900/20 border-green-700/40 text-green-300"
                : "bg-slate-800/60 border-slate-700 text-slate-400"
            }`}>
              {addType === "registered" ? (
                <Eye className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
              ) : (
                <EyeOff className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-500" />
              )}
              {addType === "registered"
                ? "This staff member will receive a login password via email and can access the app."
                : "This staff member will appear in the sales dropdown for attribution only. No login or password is created."}
            </div>

            <div>
              <Label className="text-slate-300 text-sm">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g. Blessing Ogbonna"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1.5 placeholder:text-slate-500"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm">
                Email Address{" "}
                {addType === "registered"
                  ? <span className="text-red-400">*</span>
                  : <span className="text-slate-500">(optional)</span>}
              </Label>
              <Input
                type="email"
                placeholder="staff@oticsurveys.com"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1.5 placeholder:text-slate-500"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm">
                Phone Number <span className="text-slate-500">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. 08012345678"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1.5 placeholder:text-slate-500"
              />
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
                <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-xs">{formError}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddType(null);
                setForm({ name: "", email: "", phone: "" });
                setFormError(null);
              }}
              disabled={submitting}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Add Staff</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
