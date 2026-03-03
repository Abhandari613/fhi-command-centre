import { CalibrationWizard } from "@/components/engine/calibrate/CalibrationWizard";
import { getActiveEngagement } from "@/utils/engine-helpers";
import { Loader2 } from "lucide-react";

export default async function CalibratePage() {
    const engagement = await getActiveEngagement();

    if (!engagement) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center opacity-60">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading engagement data...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <CalibrationWizard engagementId={engagement.id} />
        </div>
    );
}
