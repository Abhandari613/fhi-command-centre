"use server";

import { ReceiptAgent } from "@/lib/clients/fhi/services/receipt-agent";
import { uploadReceiptSchema, UploadReceiptInput } from "@/lib/schemas/receiptSchema";


import { ReceiptData } from "@/lib/clients/fhi/services/receipt-agent";


import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

import { withActionValidation } from '@/lib/core/actions/wrapper';
import { createActionError, ActionResult } from '@/lib/core/actions/types';

/**
 * @intent Processes an uploaded receipt image, extracts data via AI, and attempts to match it with an existing finance transaction.
 * @generated AI-assisted
 */
export async function processAndSaveReceipt(input: unknown): Promise<ActionResult<ReceiptData & { matchFound: boolean, transactionId?: string }>> {
    return withActionValidation(uploadReceiptSchema, input, async (validatedData) => {
        try {
            const { fileBase64, imageUrl } = validatedData;
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return { success: false, error: createActionError('UNAUTHORIZED', 'Unauthorized access', 401) };
            }

            // 2. Initialize Agent & Extract Data
            const agent = new ReceiptAgent();
            const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
            const receiptData = await agent.extractReceiptData(base64Data);

            // 3. Get Organization ID
            const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
            if (!profile?.organization_id) {
                return { success: false, error: createActionError('MISSING_ORG', 'Validation failed: No org found', 403) };
            }

            // 4. Save Receipt to DB
            // Determine status based on data quality
            const status = (receiptData.totalAmount && receiptData.date) ? 'processed' : 'needs_review';

            const { data: receiptRecord, error: insertError } = await supabase
                .from('receipts')
                .insert({
                    organization_id: profile.organization_id,
                    merchant: receiptData.merchantName || 'Unknown Merchant',
                    date: receiptData.date || new Date().toISOString(),
                    total: receiptData.totalAmount || 0,
                    status: status,
                    uploaded_by: user.id,
                    image_url: imageUrl || null
                })
                .select()
                .single();

            if (insertError || !receiptRecord) {
                console.error("DB Insert Error:", insertError);
                return { success: false, error: createActionError('DB_INSERT_FAILED', 'Failed to save receipt record', 500) };
            }

            // 5. Attempt Matching
            let matchFound = false;
            let transactionId: string | undefined;

            if (receiptData.totalAmount > 0 && receiptData.date) {
                // Define tolerance window
                const receiptDate = new Date(receiptData.date);
                const minDate = new Date(receiptDate); minDate.setDate(minDate.getDate() - 4);
                const maxDate = new Date(receiptDate); maxDate.setDate(maxDate.getDate() + 4);

                // Fetch candidate transactions
                const { data: candidates } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('organization_id', profile.organization_id)
                    .is('receipt_id', null) // Not already linked
                    .gte('date', minDate.toISOString().split('T')[0])
                    .lte('date', maxDate.toISOString().split('T')[0]);

                if (candidates && candidates.length > 0) {
                    // Find amount match (within 2%)
                    const match = candidates.find(tx => {
                        const diff = Math.abs(tx.amount - receiptData.totalAmount);
                        return diff < (receiptData.totalAmount * 0.02);
                    });

                    if (match) {
                        // LINK THEM
                        await supabase
                            .from('transactions')
                            .update({
                                receipt_id: receiptRecord.id,
                                merchant: receiptData.merchantName
                            })
                            .eq('id', match.id);

                        await supabase
                            .from('receipts')
                            .update({ status: 'matched' })
                            .eq('id', receiptRecord.id);

                        matchFound = true;
                        transactionId = match.id;
                    }
                }
            }

            revalidatePath('/ops/receipts');
            revalidatePath('/ops/finance');

            return {
                success: true,
                data: {
                    ...receiptData,
                    matchFound,
                    transactionId
                }
            };

        } catch (error: unknown) {
            console.error("Receipt Processing Error:", error);
            return { success: false, error: createActionError('PROCESSING_FAILED', 'Failed to process receipt', 500) };
        }
    });
}

