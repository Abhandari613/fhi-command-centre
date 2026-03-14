import { z } from "zod";

export const WorkOrderSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  client_id: z.string().uuid(),
  property_address_or_unit: z
    .string()
    .min(1, "Property address/unit is required"),
  status: z
    .enum(["Draft", "Scheduled", "In Progress", "Completed"])
    .default("Draft"),
  due_at: z.string().datetime().optional().nullable(),
});

export type WorkOrder = z.infer<typeof WorkOrderSchema>;

export const WorkOrderTaskSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  work_order_id: z.string().uuid(),
  trade_type: z.string().min(1, "Trade type is required"),
  assigned_subcontractor_id: z.string().uuid().optional().nullable(),
  status: z
    .enum(["Unassigned", "Scheduled", "In Progress", "Completed"])
    .default("Unassigned"),
  estimated_cost: z.number().min(0).default(0),
});

export type WorkOrderTask = z.infer<typeof WorkOrderTaskSchema>;
