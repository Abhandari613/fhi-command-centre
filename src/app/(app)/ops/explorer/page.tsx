import { WorkflowExplorer } from "./WorkflowExplorer";

export const metadata = {
  title: "How It Works | Frank's Home Improvement",
};

export default function ExplorerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">How FHI Works</h1>
        <p className="text-sm text-white/60 mt-1">
          Tap any stage to see what happens, what triggers it, and where the data flows
        </p>
      </div>
      <WorkflowExplorer />
    </div>
  );
}
