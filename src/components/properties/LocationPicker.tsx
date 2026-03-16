"use client";

import { useEffect, useState } from "react";
import { getPropertyBuildingUnitTree } from "@/app/actions/property-actions";
import { Building2, ChevronDown, DoorOpen, MapPin } from "lucide-react";

type TreeProperty = {
  id: string;
  name: string;
  address: string;
  buildings: TreeBuilding[];
};
type TreeBuilding = {
  id: string;
  property_id: string;
  name: string;
  code: string | null;
  units: TreeUnit[];
};
type TreeUnit = {
  id: string;
  building_id: string;
  unit_number: string;
  status: string;
};

export function PropertyLocationPicker({
  value,
  onChange,
}: {
  value: { propertyId?: string; buildingId?: string; unitId?: string };
  onChange: (v: {
    propertyId?: string;
    buildingId?: string;
    unitId?: string;
  }) => void;
}) {
  const [tree, setTree] = useState<TreeProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPropertyBuildingUnitTree().then((data) => {
      setTree(data);
      setLoading(false);
    });
  }, []);

  const selectedProperty = tree.find((p) => p.id === value.propertyId);
  const selectedBuilding = selectedProperty?.buildings.find(
    (b) => b.id === value.buildingId,
  );

  if (loading) {
    return (
      <div className="text-[10px] text-white/20 py-2 font-mono">
        Loading locations...
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <p className="text-[10px] text-white/30">
        No properties set up yet.{" "}
        <a href="/ops/properties" className="text-primary hover:underline">
          Add one
        </a>
      </p>
    );
  }

  const selectClass =
    "w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors appearance-none";

  return (
    <div className="space-y-3">
      {/* Property */}
      <div>
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
          <MapPin className="w-3 h-3" />
          Property
        </label>
        <div className="relative">
          <select
            value={value.propertyId || ""}
            onChange={(e) =>
              onChange({
                propertyId: e.target.value || undefined,
                buildingId: undefined,
                unitId: undefined,
              })
            }
            className={selectClass}
          >
            <option value="">Select property...</option>
            {tree.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.address}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
        </div>
      </div>

      {/* Building */}
      {selectedProperty && selectedProperty.buildings.length > 0 && (
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
            <Building2 className="w-3 h-3" />
            Building
          </label>
          <div className="relative">
            <select
              value={value.buildingId || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  buildingId: e.target.value || undefined,
                  unitId: undefined,
                })
              }
              className={selectClass}
            >
              <option value="">Select building...</option>
              {selectedProperty.buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.code ? ` (${b.code})` : ""} — {b.units.length} units
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Unit */}
      {selectedBuilding && selectedBuilding.units.length > 0 && (
        <div>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
            <DoorOpen className="w-3 h-3" />
            Unit
          </label>
          <div className="relative">
            <select
              value={value.unitId || ""}
              onChange={(e) =>
                onChange({ ...value, unitId: e.target.value || undefined })
              }
              className={selectClass}
            >
              <option value="">Select unit...</option>
              {selectedBuilding.units.map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.unit_number} ({u.status})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}
