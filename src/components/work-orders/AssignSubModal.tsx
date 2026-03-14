"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/GlassCard";
import { User, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AssignSubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onAssigned: () => void;
};

export function AssignSubModal({
  isOpen,
  onClose,
  jobId,
  onAssigned,
}: AssignSubModalProps) {
  const supabase = createClient() as any;
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchSubs = async () => {
    setLoading(true);
    // Fetch all subs
    const { data: allSubs, error } = await supabase
      .from("subcontractors")
      .select("*")
      .order("name");

    if (error) console.error(error);
    else setSubs(allSubs || []);

    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubs();
    }
  }, [isOpen]);

  const handleAssign = async (subId: string) => {
    setAssigning(subId);

    // Check if already assigned
    const { data: existing } = await supabase
      .from("job_assignments")
      .select("*")
      .eq("job_id", jobId)
      .eq("subcontractor_id", subId)
      .single();

    if (existing) {
      toast.error("Subcontractor already assigned!");
      setAssigning(null);
      return;
    }

    const { error } = await supabase.from("job_assignments").insert([
      {
        job_id: jobId,
        subcontractor_id: subId,
        status: "assigned",
      },
    ]);

    if (error) {
      console.error("Error assigning sub:", error);
      toast.error("Failed to assign subcontractor.");
    } else {
      toast.success("Successfully assigned team member");
      onAssigned();
      onClose();
    }
    setAssigning(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Subcontractor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin" />
            </div>
          ) : subs.length === 0 ? (
            <div className="text-center opacity-50 p-4">
              No subcontractors found. Add one in the Team tab.
            </div>
          ) : (
            subs.map((sub) => (
              <div
                key={sub.id}
                onClick={() => handleAssign(sub.id)}
                className="cursor-pointer"
              >
                <GlassCard className="p-3 flex justify-between items-center hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <User className="w-4 h-4 opacity-70" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{sub.name}</div>
                      <div className="text-xs opacity-50">
                        {sub.phone || sub.email}
                      </div>
                    </div>
                  </div>
                  {assigning === sub.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20 group-hover:border-primary" />
                  )}
                </GlassCard>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
