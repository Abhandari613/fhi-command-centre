import { WorkflowExplorer } from "./WorkflowExplorer";

export const metadata = {
  title: "How Your Business Runs on Autopilot | Frank's Home Improvement",
};

export default function ExplorerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">How Your Business Runs on Autopilot</h1>
        <p className="text-sm text-white/60 mt-1">
          Tap any step to see what happens behind the scenes — from the first email to tax time
        </p>
      </div>
      <WorkflowExplorer />
    </div>
  );
}
