import { z } from 'zod';

export const SubcontractorSchema = z.object({
    id: z.string().uuid().optional(),
    organization_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    communication_preference: z.enum(['email', 'sms', 'phone']).default('email'),
    trade: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).default('active'),
    compliance_status: z.enum(['pending', 'verified', 'expired']).default('pending'),
});

export type Subcontractor = z.infer<typeof SubcontractorSchema>;
