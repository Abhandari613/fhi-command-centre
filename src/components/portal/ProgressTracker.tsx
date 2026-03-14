"use client";

import { useEffect, useState } from "react";

type ProgressData = {
  job: {
    id: string;
    jobNumber: string;
    address: string;
    status: string;
    stage: string;
    dueDate: string | null;
  };
  progress: {
    totalTasks: number;
    completedTasks: number;
    percent: number;
    tasks: { id: string; description: string; completed: boolean }[];
  };
  recentPhotos: { id: string; url: string; date: string; phase: string }[];
};

export function ProgressTracker({ jobId }: { jobId: string }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/portal/progress?jobId=${jobId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);
      } catch (err) {
        console.error("Failed to load progress:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // Refresh every 60 seconds for live updates
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Unable to load progress.
      </div>
    );
  }

  const { job, progress, recentPhotos } = data;

  return (
    <div className="space-y-6">
      {/* Stage Badge */}
      <div className="text-center">
        <span className="inline-block bg-orange-100 text-orange-700 text-sm font-bold px-4 py-1.5 rounded-full">
          {job.stage}
        </span>
        {job.dueDate && (
          <p className="text-sm text-gray-500 mt-2">
            Scheduled for{" "}
            {new Date(job.dueDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {progress.totalTasks > 0 && (
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Progress</span>
            <span className="font-bold text-gray-900">{progress.percent}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress.percent}%`,
                background:
                  progress.percent === 100
                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                    : "linear-gradient(90deg, #f97316, #ea580c)",
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {progress.completedTasks} of {progress.totalTasks} tasks complete
          </p>
        </div>
      )}

      {/* Task Checklist */}
      {progress.tasks.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Tasks</h3>
          <div className="space-y-2">
            {progress.tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  task.completed
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    task.completed ? "bg-green-500 text-white" : "bg-gray-200"
                  }`}
                >
                  {task.completed && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    task.completed ? "text-green-700" : "text-gray-600"
                  }`}
                >
                  {task.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Photos */}
      {recentPhotos.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            Recent Photos
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {recentPhotos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-xl overflow-hidden bg-gray-100"
              >
                <img
                  src={photo.url}
                  alt="Job progress"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
