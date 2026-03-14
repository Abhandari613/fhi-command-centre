"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { deactivateServiceItem } from "@/app/actions/services-catalog-actions";
import type { ServiceItem } from "@/app/actions/services-catalog-actions";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  labor: {
    label: "Labor",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  material: {
    label: "Material",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  flat_rate: {
    label: "Flat Rate",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

interface ServiceItemCardProps {
  item: ServiceItem;
  onEdit?: (item: ServiceItem) => void;
  onDeactivate?: () => void;
}

export function ServiceItemCard({
  item,
  onEdit,
  onDeactivate,
}: ServiceItemCardProps) {
  const [isPending, startTransition] = useTransition();
  const badge = TYPE_BADGE[item.item_type] || TYPE_BADGE.labor;

  const handleDeactivate = () => {
    startTransition(async () => {
      await deactivateServiceItem(item.id);
      onDeactivate?.();
    });
  };

  return (
    <GlassCard className="p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm text-white truncate">
            {item.task_name}
          </h3>
          {item.description && (
            <p className="text-xs text-white/40 mt-0.5 truncate">
              {item.description}
            </p>
          )}
        </div>
        <span
          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${badge.color}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div>
          <span className="text-xl font-black tabular-nums text-emerald-400">
            {fmt.format(item.unit_price)}
          </span>
          <span className="text-xs text-white/30 ml-1">
            x{item.default_quantity}
          </span>
        </div>
        <div className="flex gap-1">
          {onEdit && (
            <AnimatedButton
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </AnimatedButton>
          )}
          <AnimatedButton
            variant="ghost"
            size="icon"
            onClick={handleDeactivate}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            )}
          </AnimatedButton>
        </div>
      </div>
    </GlassCard>
  );
}
