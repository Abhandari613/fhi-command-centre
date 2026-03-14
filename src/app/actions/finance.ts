'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';


export async function getFinanceStats() {
    const supabase = await createClient();

    // Simple Rolling 30 Day Cash Flow
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: transactions } = await supabase
        .from('finance_transactions')
        .select('amount, transaction_date, category:tax_categories(name)')
        .gte('transaction_date', dateStr)
        .order('transaction_date');

    let revenue = 0;
    let expenses = 0;
    let pendingCount = 0;

    // Daily buckets for chart
    const dailyMap = new Map<string, { in: number, out: number }>();

    transactions?.forEach(t => {
        const amt = Number(t.amount);
        if (amt > 0) revenue += amt;
        else expenses += Math.abs(amt);

        const date = t.transaction_date;
        const curr = dailyMap.get(date) || { in: 0, out: 0 };
        if (amt > 0) curr.in += amt;
        else curr.out += Math.abs(amt);
        dailyMap.set(date, curr);
    });

    const { count } = await supabase
        .from('finance_transactions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['INGESTED', 'AMBIGUOUS']);

    pendingCount = count || 0;

    // Convert map to array for chart (last 30 days)
    // For brevity, we just return the map entries sorted
    const chartData = Array.from(dailyMap.entries())
        .map(([date, val]) => ({ date, ...val }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return {
        revenue,
        expenses,
        burnRate: expenses, // Simplified
        pendingCount,
        chartData
    };
}

export async function getUncategorizedTransactions() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('finance_transactions')
        .select(`
            *,
            category:tax_categories!category_id(name)
        `)
        .in('status', ['INGESTED', 'AMBIGUOUS'])
        .order('transaction_date', { ascending: false })
        .limit(100);

    if (!data) return [];

    // Work Order Matching Logic (The "Bridge")
    const deposits = data.filter(t => t.amount > 0);
    if (deposits.length > 0) {
        // Fetch potential Work Orders
        const { data: wos } = await (supabase.from as any)('work_orders')
            .select('id, property_address_or_unit, status')
            .in('status', ['Scheduled', 'In Progress'])
            .limit(5);

        if (wos && wos.length > 0) {
            // Check for matches
            // We just suggest recent active Work Orders 
            data.forEach(txn => {
                if (txn.amount > 0) {
                    (txn as any).suggested_work_order = wos[0]; // Simplistic AI suggestion to top active WO
                }
            });
        }
    }

    return data;
}

export async function matchTransactionToWorkOrder(txnId: string, workOrderId: string) {
    const supabase = await createClient();

    // 1. Link Transaction
    const { error: txError } = await supabase
        .from('finance_transactions')
        .update({
            work_order_id: workOrderId,
            status: 'CONFIRMED',
            category_id: (await getSalesCategoryId(supabase)), // Auto-categorize as Sales
            confidence_score: 1.0,
            rationale: 'Matched to Work Order via generic matching',
            updated_at: new Date().toISOString()
        })
        .eq('id', txnId);

    if (txError) throw new Error(txError.message);

    revalidatePath('/ops/finance');
    revalidatePath(`/ops/work-orders/${workOrderId}`);
    return { success: true };
}

async function getSalesCategoryId(supabase: any) {
    const { data } = await supabase.from('tax_categories').select('id').eq('name', 'Sales / Revenue').single();
    return data?.id;
}

export async function updateTransactionCategory(txnId: string, categoryId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('finance_transactions')
        .update({
            category_id: categoryId,
            status: 'CONFIRMED',
            confidence_score: 1.0,
            updated_at: new Date().toISOString()
        })
        .eq('id', txnId);

    if (error) throw new Error(error.message);
    revalidatePath('/ops/finance');
    return { success: true };
}

export async function getTaxCategories() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('tax_categories')
        .select('*')
        .order('name');
    return data || [];
}

export async function createCategorizationRule(pattern: string, categoryId: string) {
    const supabase = await createClient();

    // 1. Create Rule
    const { error } = await supabase.from('finance_rules').insert({
        param_pattern: pattern,
        action_category_id: categoryId,
        match_type: 'CONTAINS',
        organization_id: (await supabase.auth.getUser()).data.user?.user_metadata.organization_id // simplistic - should be safer
    });

    if (error) {
        console.error("Failed to create rule:", error);
        throw new Error("Failed to create rule.");
    }

    // 2. Trigger immediate run (optional, but good UX)
    await runAutoCategorization();

    revalidatePath('/ops/finance');
    return { success: true };
}

export async function runAutoCategorization() {
    const supabase = await createClient();

    // 1. Get Organization ID safely
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0 };

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) return { count: 0 };

    // 2. Call SQL Function
    const { data: count, error } = await supabase.rpc('categorize_transactions', {
        p_organization_id: profile.organization_id
    });

    if (error) {
        console.error("Auto-categorization failed:", error);
        // We don't throw, just return 0 to avoid breaking UI if backend has transient issue
        return { count: 0 };
    }

    revalidatePath('/ops/finance');
    return { count: count || 0 };
}
