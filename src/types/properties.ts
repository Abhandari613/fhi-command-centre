// Location hierarchy types: Property > Building > Unit > Turnover

export type Property = {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  client_name?: string;
  building_count?: number;
  total_units?: number;
  units_in_turnover?: number;
  active_turnovers?: number;
};

export type Building = {
  id: string;
  property_id: string;
  organization_id: string;
  name: string;
  code: string | null;
  address: string | null;
  floor_count: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  unit_count?: number;
  units_in_turnover?: number;
};

export type Unit = {
  id: string;
  building_id: string;
  organization_id: string;
  unit_number: string;
  floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  status: "occupied" | "vacant" | "turnover" | "ready" | "offline";
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  building_name?: string;
  property_name?: string;
  active_turnover?: Turnover | null;
};

export const TURNOVER_STAGES = [
  "notice",
  "vacated",
  "inspection",
  "in_progress",
  "paint",
  "clean",
  "final_qc",
  "ready",
] as const;

export type TurnoverStage = (typeof TURNOVER_STAGES)[number];

export const TURNOVER_STAGE_CONFIG: Record<
  TurnoverStage,
  { label: string; color: string; bgColor: string }
> = {
  notice: {
    label: "Notice Given",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  vacated: {
    label: "Vacated",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
  },
  inspection: {
    label: "Inspection",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  in_progress: {
    label: "Repairs",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  paint: {
    label: "Paint",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  clean: { label: "Clean", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  final_qc: {
    label: "Final QC",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  ready: {
    label: "Ready",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
};

export type Turnover = {
  id: string;
  unit_id: string;
  organization_id: string;
  move_out_date: string | null;
  target_ready_date: string | null;
  move_in_date: string | null;
  stage: TurnoverStage;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  job_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  unit_number?: string;
  building_name?: string;
  building_code?: string;
  property_id?: string;
  property_name?: string;
  property_address?: string;
  assigned_name?: string;
  days_vacant?: number;
  task_count?: number;
  tasks_completed?: number;
};

export type TurnoverTask = {
  id: string;
  turnover_id: string;
  organization_id: string;
  description: string;
  trade: string | null;
  assigned_to: string | null;
  status: "pending" | "in_progress" | "completed" | "skipped";
  estimated_cost: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  assigned_name?: string;
};

export type TurnoverTemplate = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  tasks: Array<{
    description: string;
    trade: string;
    estimated_cost: number | null;
    sort_order: number;
  }>;
  is_active: boolean;
  created_at: string;
};

export type PropertyTurnoverSummary = {
  property_id: string;
  property_name: string;
  property_address: string;
  organization_id: string;
  building_count: number;
  total_units: number;
  units_in_turnover: number;
  units_ready: number;
  units_vacant: number;
  active_turnovers: number;
  completed_turnovers: number;
};
