// src/pages/Sales/components/AssignmentModal.tsx
import { Barcode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import type { AssignmentResult } from "../types";

interface AssignmentModalProps {
  assignment: AssignmentResult | null;
  onClose: () => void;
}

const AssignmentModal = ({ assignment, onClose }: AssignmentModalProps) => {
  if (!assignment) return null;

  // Determine the display label based on the actual assignment data
  const equipmentTypeLabel = assignment.setType || "Equipment Unit";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Barcode className="w-5 h-5 text-green-400" />
            Equipment Set Assigned Successfully!
          </DialogTitle>
        </DialogHeader>
  <div className="space-y-2">
  <label className="text-sm font-medium text-slate-400">Main Serials</label>
  <div className="flex flex-wrap gap-2">
    {assignment.serialSet?.map((serial: string, index: number) => (
      <span 
        key={index} 
        className="px-3 py-1 bg-blue-900/30 border border-blue-500/50 text-blue-200 rounded text-sm font-mono"
      >
        {serial}
      </span>
    ))}
  </div>
</div>

{/* Ensure Datalogger and Radio also use the correct keys */}
{assignment.dataloggerSerial && (
  <div className="mt-4">
    <label className="text-sm font-medium text-green-400">Datalogger</label>
    <div className="mt-1 px-3 py-1 bg-green-900/30 border border-green-500/50 text-green-200 rounded text-sm font-mono">
      {assignment.dataloggerSerial}
    </div>
  </div>
)}

{assignment.externalRadioSerial && (
  <div className="mt-4">
    <label className="text-sm font-medium text-orange-400">External Radio</label>
    <div className="mt-1 px-3 py-1 bg-orange-900/30 border border-orange-500/50 text-orange-200 rounded text-sm font-mono">
      {assignment.externalRadioSerial}
    </div>
  </div>
)}
        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { AssignmentModal };