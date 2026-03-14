'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/supabase";

export async function createCalibrationCycle(engagementId: string, startDate: string, endDate: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('calibration_cycles')
        .insert({ engagement_id: engagementId, start_date: startDate, end_date: endDate } as any)
        .select()
        .single();

    if (error) {
        console.error('Error creating calibration cycle:', error);
        throw new Error('Failed to create calibration cycle');
    }

    revalidatePath(`/engine/calibrate`);
    return data;
}

export async function getCalibrationCycles(engagementId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('calibration_cycles')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching calibration cycles:', error);
        throw new Error('Failed to fetch calibration cycles');
    }

    return data;
}
