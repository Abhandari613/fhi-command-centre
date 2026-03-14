"use client";

import { useState } from "react";
import { linkPhotoToTask, unlinkPhotoFromTask } from "@/app/actions/completion-actions";
import { CheckCircle, Circle, Loader2, Link2, Unlink } from "lucide-react";

type Task = {
  id: string;
  description: string;
  hasPhoto: boolean;
  photoCount: number;
};

type Photo = {
  id: string;
  url: string;
  caption: string | null;
};

export function TaskPhotoLinker({
  tasks,
  photos,
  onUpdate,
}: {
  tasks: Task[];
  photos: Photo[];
  onUpdate: () => void;
}) {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const handlePhotoClick = async (photoId: string) => {
    if (!selectedTask) return;

    setLinking(true);
    await linkPhotoToTask(selectedTask, photoId);
    setLinking(false);
    setSelectedTask(null);
    onUpdate();
  };

  const handleUnlink = async (taskId: string, photoId: string) => {
    setLinking(true);
    await unlinkPhotoFromTask(taskId, photoId);
    setLinking(false);
    onUpdate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Tasks */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold opacity-60 mb-3">
          Tasks — click to select, then click a photo to link
        </h3>
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() =>
              setSelectedTask(selectedTask === task.id ? null : task.id)
            }
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all ${
              selectedTask === task.id
                ? "bg-primary/20 border border-primary/40"
                : task.hasPhoto
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-white/5 border border-white/10"
            }`}
          >
            {task.hasPhoto ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 opacity-30 flex-shrink-0" />
            )}
            <span className="text-sm flex-1">{task.description}</span>
            {task.photoCount > 0 && (
              <span className="text-xs opacity-40">
                {task.photoCount} photo{task.photoCount > 1 ? "s" : ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Right: Photos */}
      <div>
        <h3 className="text-sm font-bold opacity-60 mb-3">
          {selectedTask
            ? "Click a photo to link it to the selected task"
            : "Completion Photos"}
        </h3>
        {photos.length === 0 ? (
          <p className="text-xs opacity-40 text-center py-8">
            No completion photos uploaded yet
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => handlePhotoClick(photo.id)}
                disabled={!selectedTask || linking}
                className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                  selectedTask
                    ? "cursor-pointer ring-2 ring-transparent hover:ring-primary"
                    : "cursor-default"
                }`}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Completion photo"}
                  className="w-full h-full object-cover"
                />
                {linking && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
