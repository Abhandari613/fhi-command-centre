import { getDesires } from "@/app/actions/engine/desire-actions";
import { getFrictionItems } from "@/app/actions/engine/friction-actions";
import { DesireInput } from "@/components/engine/discovery/DesireInput";
import { FrictionList } from "@/components/engine/discovery/FrictionList";
import { getActiveEngagement } from "@/utils/engine-helpers";
import { AlertTriangle } from "lucide-react";

export default async function DiscoveryPage() {
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

  const [desires, friction] = await Promise.all([
    getDesires(engagement.id),
    getFrictionItems(engagement.id),
  ]);

  return (
    <div className="min-h-screen pb-24 p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Discovery Intake</h1>
        <p className="opacity-60">
          Engagement: {engagement.client_name} ({engagement.phase})
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <DesireInput
          engagementId={engagement.id}
          existingDesires={desires || []}
        />

        <FrictionList
          engagementId={engagement.id}
          existingFriction={friction || []}
        />
      </div>
    </div>
  );
}
