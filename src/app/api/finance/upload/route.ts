
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

// Helper: Generate Canonical ID for deduplication
function getCanonicalId(date: string, amount: number, description: string, source: string): string {
    const payload = `${date}|${amount.toFixed(2)}|${description.trim().toLowerCase()}|${source}`;
    return crypto.createHash('md5').update(payload).digest('hex');
}

// Helper: robust date parsing
function parseDate(dateStr: string | number | Date): string | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr.toISOString().split('T')[0];

    // Excel Serial Date
    if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(Number(dateStr)) && !dateStr.includes('/') && !dateStr.includes('-'))) {
        const serial = Number(dateStr);
        if (serial > 25569) {
            const dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
            return isNaN(dateObj.getTime()) ? null : dateObj.toISOString().split('T')[0];
        }
    }

    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;

        // Fix future year bug (e.g. "12/31" parsed in Feb defaults to current year Dec)
        const now = new Date();
        if (d > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            d.setFullYear(d.getFullYear() - 1);
        }
        return d.toISOString().split('T')[0];
    } catch {
        return null;
    }
}

// Helper: Find column by loose matching
function findKey(row: any, candidates: string[]): string | undefined {
    const keys = Object.keys(row);
    return keys.find(k => candidates.some(c => k.toLowerCase().includes(c)));
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch User Profile to get Organization ID (RLS Context)
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization found based on user profile' }, { status: 403 });
        }
        const orgId = profile.organization_id;

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        if (jsonData.length === 0) {
            return NextResponse.json({ error: 'File is empty' }, { status: 400 });
        }

        // Detect Columns
        const firstRow = jsonData[0];
        const dateKey = findKey(firstRow, ['date', 'time', 'posted']);
        const descKey = findKey(firstRow, ['desc', 'memo', 'narrative', 'details', 'name']);
        const amountKey = findKey(firstRow, ['amount', 'value']);
        const debitKey = findKey(firstRow, ['debit', 'withdraw']);
        const creditKey = findKey(firstRow, ['credit', 'deposit']);

        if (!dateKey || (!amountKey && (!debitKey && !creditKey))) {
            return NextResponse.json({
                error: 'Could not detect required columns (Date, Amount/Debit/Credit). Please ensure headers are present.'
            }, { status: 400 });
        }

        console.log(`Processing upload for Org ${orgId}: ${jsonData.length} rows`);

        const transactionsToInsert = [];
        const periodsToEnsure = new Set<string>();

        for (const row of jsonData as any[]) {
            const dateRaw = row[dateKey!];
            let amount = 0;
            let desc = '';

            // Resolve Amount
            if (amountKey) {
                amount = parseFloat(String(row[amountKey]).replace(/[^0-9.-]/g, ''));
            } else if (debitKey || creditKey) {
                const debit = debitKey ? parseFloat(String(row[debitKey]).replace(/[^0-9.-]/g, '') || '0') : 0;
                const credit = creditKey ? parseFloat(String(row[creditKey]).replace(/[^0-9.-]/g, '') || '0') : 0;
                // Convention: Debit is negative (Expense), Credit is positive (Income)
                // BUT bank CSVs often have positive numbers in debit columns.
                // If we have distinct columns, we subtract debit from credit.
                amount = credit - debit;
            }

            if (isNaN(amount) || Math.abs(amount) < 0.01) continue;

            // Resolve Description
            if (descKey) {
                desc = String(row[descKey]).trim();
            } else {
                desc = 'Unknown Transaction';
            }

            const date = parseDate(dateRaw);
            if (!date) continue;

            // Prepare for Insert
            const periodKey = date.substring(0, 7); // YYYY-MM
            periodsToEnsure.add(`${periodKey}-01`);

            const canonicalId = getCanonicalId(date, amount, desc, 'csv_upload');

            transactionsToInsert.push({
                organization_id: orgId,
                transaction_date: date,
                amount: amount,
                description: desc,
                raw_description: desc,
                source: 'csv_upload',
                source_id: canonicalId,
                status: 'INGESTED',
                confidence_score: 0.0,
                period_id: null // To be filled after period resolution
            });
        }

        // 1. Ensure Periods Exist
        const periodMap = new Map<string, string>(); // 'YYYY-MM-DD' -> UUID
        for (const monthDate of Array.from(periodsToEnsure)) {
            // Try to find existing
            const { data: existing } = await supabase
                .from('financial_periods')
                .select('id')
                .eq('organization_id', orgId)
                .eq('month_date', monthDate)
                .single();

            if (existing) {
                periodMap.set(monthDate.substring(0, 7), existing.id);
            } else {
                // Create New
                const { data: newPeriod, error } = await supabase
                    .from('financial_periods')
                    .insert({
                        organization_id: orgId,
                        month_date: monthDate,
                        status: 'OPEN'
                    } as any)
                    .select('id')
                    .single();

                if (newPeriod) {
                    periodMap.set(monthDate.substring(0, 7), newPeriod.id);
                } else {
                    console.error('Failed to create period', error);
                }
            }
        }

        // 2. Log Upload
        let uploadId = null;
        if (transactionsToInsert.length > 0) {
            const { data: uploadLog } = await supabase
                .from('statement_uploads')
                .insert({
                    organization_id: orgId,
                    filename: (file as any).name || 'unknown.csv',
                    upload_type: 'bank', // Generic for now
                    statement_period: transactionsToInsert[0].transaction_date, // Approx
                    record_count: transactionsToInsert.length,
                    uploaded_by: user.id
                })
                .select('id')
                .single();
            uploadId = uploadLog?.id;
        }

        // 3. Prepare Batch
        const finalBatch = transactionsToInsert.map(t => {
            const pKey = String(t.transaction_date).substring(0, 7);
            return {
                ...t,
                period_id: periodMap.get(pKey) || null,
                upload_id: uploadId
            };
        });

        // 4. Exec Upsert
        const { error } = await supabase
            .from('finance_transactions')
            .upsert(finalBatch, {
                onConflict: 'organization_id,source_id',
                ignoreDuplicates: true // Don't update if exists? Or update? 
                // Requirement: Ingest. Usually we ignore dupes to preserve existing categorization.
            });

        if (error) {
            console.error('Upsert failed', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            count: finalBatch.length,
            message: `Processed ${finalBatch.length} transactions.`
        });

    } catch (e: any) {
        console.error('Upload error', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
