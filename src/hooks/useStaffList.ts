import { useState, useEffect, useCallback } from "react";
// Import our smart API instead of raw axios
import api from "../services/api"; // Make sure this path is correct based on where your file is!

export interface StaffMember {
  id: number | string;
  name: string;
  email: string;
  type: "registered" | "display";
}

export const useStaffList = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    setStaffError(null);
    try {
      // Use 'api.get' instead of 'axios.get'. No need to pass headers manually!
      const [registeredRes, displayRes] = await Promise.allSettled([
        api.get(`/auth/staff/`),
        api.get(`/staff/display/`),
      ]);

      const registeredData =
        registeredRes.status === "fulfilled"
          ? Array.isArray(registeredRes.value.data.results)
            ? registeredRes.value.data.results
            : Array.isArray(registeredRes.value.data)
            ? registeredRes.value.data
            : []
          : [];

      const registered: StaffMember[] = registeredData.map((u: any) => ({
        id: u.id,
        name: u.name || u.username || u.email,
        email: u.email,
        type: "registered" as const,
      }));

      const displayData =
        displayRes.status === "fulfilled"
          ? Array.isArray(displayRes.value.data.results)
            ? displayRes.value.data.results
            : Array.isArray(displayRes.value.data)
            ? displayRes.value.data
            : []
          : [];

      const display: StaffMember[] = displayData.map((s: any) => ({
        id: `display-${s.id}`,
        name: s.name,
        email: s.email || "",
        type: "display" as const,
      }));

      const registeredNames = new Set(
        registered.map((s) => s.name.toLowerCase())
      );
      const uniqueDisplay = display.filter(
        (s) => !registeredNames.has(s.name.toLowerCase())
      );

      setStaffList([...registered, ...uniqueDisplay]);
    } catch (err) {
      console.error("Failed to fetch staff list:", err);
      setStaffError("Could not load staff list.");
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return { staffList, loadingStaff, staffError, refetchStaff: fetchStaff };
};