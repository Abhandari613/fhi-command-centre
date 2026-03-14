import { getDesires } from "@/app/actions/engine/desire-actions";
import { getInterventions } from "@/app/actions/engine/intervention-actions";
import { ProposalGenerator } from "@/components/engine/proposal/ProposalGenerator";
import { getActiveEngagement } from "@/utils/engine-helpers";
import { AlertTriangle } from "lucide-react";

export default async function ProposalPage() {
  const engagement = await getActiveEngagement();

  if (!engagement) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">No Active Engagement Found</h2>
        <p className="opacity-60 mt-2">
          Please initialize an organization and engagement first.
        </p>
      </div>
    );
  }

  const [desires, interventions] = await Promise.all([
    getDesires(engagement.id),
    getInterventions(engagement.id),
  ]);

  return (
    <div className="min-h-screen pb-24 p-6">
      <ProposalGenerator
        engagement={engagement}
        desires={desires || []}
        interventions={interventions || []}
      />
    </div>
  );
}
