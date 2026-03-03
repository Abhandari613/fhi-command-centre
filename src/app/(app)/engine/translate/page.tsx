import { getFrictionItems } from "@/app/actions/engine/friction-actions";
import { getInterventions } from "@/app/actions/engine/intervention-actions";
import { InterventionMapper } from "@/components/engine/translate/InterventionMapper";
import { getActiveEngagement } from "@/utils/engine-helpers";
import { AlertTriangle } from "lucide-react";

export default async function TranslatePage() {
    const engagement = await getActiveEngagement();

    if (!engagement) {
        return (
            <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold">No Active Engagement Found</h2>
                <p className="opacity-60 mt-2">Please initialize an organization and engagement first.</p>
            </div>
        );
    }

    const [friction, interventions] = await Promise.all([
        getFrictionItems(engagement.id),
        getInterventions(engagement.id)
    ]);

    // In a real app, we'd filter friction items that are already "mapped" (solved)
    // For now, pass all friction items
    const unmappedFriction = friction || [];

    return (
        <div className="min-h-screen pb-24 p-6 space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Translation Layer</h1>
                <p className="opacity-60">
                    Map friction points to strategic interventions.
                </p>
            </header>

            <InterventionMapper
                engagementId={engagement.id}
                unmappedFriction={unmappedFriction}
                existingInterventions={interventions || []}
            />
        </div>
    );
}
