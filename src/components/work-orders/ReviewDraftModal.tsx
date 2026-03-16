"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Trash2,
  Building,
  MapPin,
  Wrench,
} from "lucide-react";
import {
  approveWorkOrderDraft,
  deleteWorkOrderDraft,
} from "@/app/actions/draft-actions";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { PropertyLocationPicker } from "@/components/properties/LocationPicker";
import { cn } from "@/lib/utils";

interface ExtractedData {
  client_name?: string | null;
  property_address_or_unit?: string | null;
  trade_type?: string | null;
  description: string;
  needs_clarification: boolean;
  missing_details: string[];
}

interface Draft {
  id: string;
  source: string;
  raw_content: string;
  status: string;
  extracted_data: ExtractedData;
  created_at: string;
}

export function ReviewDraftModal({
  draft,
  onClose,
}: {
  draft: Draft | null;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{
    propertyId?: string;
    buildingId?: string;
    unitId?: string;
  }>({});

  if (!draft) return null;

  const { extracted_data: data } = draft;
  const hasIssues = data.needs_clarification || data.missing_details.length > 0;

  const actionApprove = async (formData: FormData) => {
    setSubmitting(true);
    // Inject location IDs into formData
    if (location.propertyId) formData.set("property_id", location.propertyId);
    if (location.buildingId) formData.set("building_id", location.buildingId);
    if (location.unitId) formData.set("unit_id", location.unitId);
    const res = await approveWorkOrderDraft(draft.id, formData);
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Work Order Approved!");
      onClose();
    }
  };

  const actionDelete = async () => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    setSubmitting(true);
    const res = await deleteWorkOrderDraft(draft.id);
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Draft Deleted");
      onClose();
    }
  };

  return (
    <Dialog.Root open={!!draft} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-black/80 p-0 shadow-2xl shadow-indigo-500/10 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl">
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-transparent pointer-events-none" />
              <div>
                <Dialog.Title className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Review Work Order Draft
                  <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                    {draft.source}
                  </span>
                </Dialog.Title>
                <Dialog.Description className="text-sm text-white/60 mt-1">
                  AI extracted these details. Please verify and fill in any
                  missing info.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-full p-2 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {hasIssues && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-200">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-300">
                      Missing Information Detected
                    </h4>
                    <ul className="mt-1 text-sm list-disc pl-4 opacity-80">
                      {data.missing_details.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <form
                id="approve-form"
                action={actionApprove}
                className="space-y-4"
              >
                <GlassCard className="p-5 space-y-4">
                  {/* Location Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Link to Property
                      <span className="text-white/20 normal-case tracking-normal font-normal ml-1">
                        (optional)
                      </span>
                    </label>
                    <PropertyLocationPicker
                      value={location}
                      onChange={setLocation}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/50 uppercase tracking-wide flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5" /> Client Name /
                        Property
                      </label>
                      <input
                        name="client_name"
                        defaultValue={data.client_name || ""}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 placeholder:text-white/20"
                        placeholder="e.g. Acme Properties"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/50 uppercase tracking-wide flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Unit / Address{" "}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        name="property_address_or_unit"
                        defaultValue={data.property_address_or_unit || ""}
                        required
                        className={cn(
                          "w-full bg-black/40 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 placeholder:text-white/20",
                          !data.property_address_or_unit
                            ? "border-red-500/50 focus:ring-red-500/50"
                            : "border-white/10 focus:ring-brand-primary/50",
                        )}
                        placeholder="e.g. Unit 4B — auto-filled from picker or type manually"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wide flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> Trade Type
                    </label>
                    <input
                      name="trade_type"
                      defaultValue={data.trade_type || ""}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 placeholder:text-white/20"
                      placeholder="e.g. Plumbing, HVAC"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={data.description || ""}
                      rows={4}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50 placeholder:text-white/20 resize-none"
                      placeholder="Describe the problem or request..."
                    />
                  </div>
                </GlassCard>
              </form>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wide px-1">
                  Original Transcript / Message
                </label>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-sm text-white/70 italic leading-relaxed">
                  &ldquo;{draft.raw_content}&rdquo;
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex items-center justify-between bg-black/40">
              <button
                type="button"
                onClick={actionDelete}
                disabled={submitting}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Discard Draft
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="approve-form"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-brand-primary/20 transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve & Create
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
