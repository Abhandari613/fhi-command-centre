"use client";

import { useState } from "react";
import { createIntervention } from "@/app/actions/engine/intervention-actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowRight, Loader2, Sparkles, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface InterventionMapperProps {
  engagementId: string;
  unmappedFriction: any[]; // Replace with proper type
  existingInterventions: any[];
}

export function InterventionMapper({
  engagementId,
  unmappedFriction,
  existingInterventions,
}: InterventionMapperProps) {
  const [selectedFrictionId, setSelectedFrictionId] = useState<string | null>(
    null,
  );
  const [interventionName, setInterventionName] = useState("");
  const [interventionDesc, setInterventionDesc] = useState("");
  const [interventionType, setInterventionType] = useState<
    | "automation"
    | "process_change"
    | "tool_integration"
    | "training"
    | "strategic_shift"
  >("process_change");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const selectedFrictionItem = unmappedFriction.find(
    (f) => f.id === selectedFrictionId,
  );

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFrictionId || !interventionName.trim()) return;

    setIsSubmitting(true);
    try {
      const intervention = await createIntervention(
        engagementId,
        interventionName,
        interventionDesc || `Solves: ${selectedFrictionItem?.description}`,
        interventionType,
      );

      // Note: Ideally we'd also link the friction item to this new intervention here.
      // For Phase 1 we just create the intervention. Future: create the link relationship.

      setInterventionName("");
      setInterventionDesc("");
      setSelectedFrictionId(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to create intervention", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
      {/* Left Column: Friction Items */}
      <div className="space-y-4 overflow-y-auto pr-2">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Friction Points to Solve
        </h3>

        {unmappedFriction.length === 0 && (
          <GlassCard className="p-8 text-center opacity-60">
            <p>No unmapped friction points found. Great job!</p>
          </GlassCard>
        )}

        <div className="grid gap-3">
          {unmappedFriction.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedFrictionId(item.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                selectedFrictionId === item.id
                  ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <p className="text-white/90">{item.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-white/60">
                  {item.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Intervention Creator */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          Design Intervention
        </h3>

        <GlassCard className="p-6 h-full flex flex-col">
          {!selectedFrictionId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/40">
              <ArrowRight className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a friction point on the left to design a solution.</p>
            </div>
          ) : (
            <form
              onSubmit={handleCreateIntervention}
              className="flex-1 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
            >
              <div>
                <label className="text-xs uppercase tracking-wider text-white/40 mb-1 block">
                  Solving For
                </label>
                <p className="text-white/90 italic border-l-2 border-amber-400/50 pl-3 py-1">
                  "{selectedFrictionItem?.description}"
                </p>
              </div>

              <div className="space-y-3 mt-4">
                <div>
                  <label className="text-sm text-white/70 block mb-1">
                    Intervention Name
                  </label>
                  <input
                    type="text"
                    value={interventionName}
                    onChange={(e) => setInterventionName(e.target.value)}
                    placeholder="e.g. Implement automated invoicing"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/70 block mb-1">
                    Type
                  </label>
                  <select
                    value={interventionType}
                    onChange={(e) => setInterventionType(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="process_change">Process Change</option>
                    <option value="automation">Automation</option>
                    <option value="tool_integration">Tool Integration</option>
                    <option value="training">Training</option>
                    <option value="strategic_shift">Strategic Shift</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-white/70 block mb-1">
                    Description
                  </label>
                  <textarea
                    value={interventionDesc}
                    onChange={(e) => setInterventionDesc(e.target.value)}
                    placeholder="How will this solve the problem?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
                  />
                </div>
              </div>

              <div className="mt-auto pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !interventionName.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  Create Intervention
                </button>
              </div>
            </form>
          )}
        </GlassCard>
      </div>
    </section>
  );
}
