import { z } from 'zod';

export const lineItemSchema = z.object({
    id: z.string().optional(), // For UI tracking
    description: z.string().min(1, "Description is required"),
    quantity: z.union([z.number().min(0), z.literal('')]).optional(),
    unit_price: z.union([z.number().min(0), z.literal('')]).optional(),
    item_type: z.enum(['labor', 'material']).default('labor'),
    provided_by: z.enum(['contractor', 'client']).default('contractor'),
});

export const createQuoteSchema = z.object({
    client_id: z.string().uuid("Invalid Client ID"),
    location_id: z.string().uuid("Invalid location ID").optional().nullable(),
    address: z.string().optional(),
    title: z.string().min(1, "Job title is required"),
    description: z.string().optional(),
    line_items: z.array(lineItemSchema).min(1, "At least one item is required"),
    estimated_duration: z.number().min(1).optional(),
    requires_supplies: z.boolean().default(false),
    expected_supplies: z.array(z.string()).optional(),
    deposit_required: z.boolean().default(false),
    deposit_amount: z.number().min(0).optional(),
    status: z.enum(['draft', 'open', 'sent']).optional(),
});

export type CreateQuoteInput = z.input<typeof createQuoteSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
