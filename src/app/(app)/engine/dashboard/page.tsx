import { ReliefDashboard } from "@/components/engine/ReliefDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ReliefDashboardPage() {
  return (
    <div className="min-h-screen pb-24 p-6">
      <ReliefDashboard />
    </div>
  );
}
