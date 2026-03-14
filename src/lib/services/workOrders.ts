/**
 * @intent Create, read, and manage B2B Work Orders and their associated tasks.
 * @generated AI-assisted — reviewed and validated against WorkOrderSchema
 */
import { createClient } from '@/utils/supabase/server';
import { WorkOrderSchema, WorkOrderTaskSchema, type WorkOrder, type WorkOrderTask } from '../schemas/workOrderSchema';

export async function getWorkOrders(organizationId: string): Promise<WorkOrder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch work orders', { error, organizationId });
        throw error;
    }
    return data as WorkOrder[];
}

export async function createWorkOrder(input: Omit<WorkOrder, 'id'>): Promise<WorkOrder> {
    const validatedData = WorkOrderSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('work_orders')
        .insert(validatedData)
        .select()
        .single();

    if (error) {
        console.error('Failed to create work order', { error, input });
        throw error;
    }
    return data as WorkOrder;
}

export async function getWorkOrderTasks(organizationId: string, workOrderId?: string): Promise<WorkOrderTask[]> {
    const supabase = await createClient();
    let query = supabase
        .from('work_order_tasks')
        .select('*')
        .eq('organization_id', organizationId);

    if (workOrderId) {
        query = query.eq('work_order_id', workOrderId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch work order tasks', { error, organizationId, workOrderId });
        throw error;
    }
    return data as WorkOrderTask[];
}

export async function createWorkOrderTask(input: Omit<WorkOrderTask, 'id'>): Promise<WorkOrderTask> {
    const validatedData = WorkOrderTaskSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('work_order_tasks')
        .insert(validatedData)
        .select()
        .single();

    if (error) {
        console.error('Failed to create work order task', { error, input });
        throw error;
    }
    return data as WorkOrderTask;
}
