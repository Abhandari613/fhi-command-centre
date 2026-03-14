
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load env vars using dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env.local with dotenv:", result.error);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL present:", !!SUPABASE_URL);
console.log("Service Key present:", !!SUPABASE_SERVICE_ROLE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase keys in environment after loading .env.local");
    // Fallback: Try reading manually if dotenv failed (unlikely if path is correct)
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function seedFinanceData() {
    console.log("--- STARTING FINANCE SEED ---");

    // 1. Get Organization (First one found)
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('id, name').limit(1);
    if (orgError || !orgs || orgs.length === 0) {
        console.error("Failed to find an organization:", orgError);
        return;
    }
    const orgId = orgs[0].id;
    console.log(`Target Organization: ${orgs[0].name} (${orgId})`);

    // 2. Get Tax Categories (for optional categorization)
    const { data: categories } = await supabase.from('tax_categories').select('id, name');
    const categoryMap = new Map<string, string>();
    categories?.forEach(c => categoryMap.set(c.name, c.id));

    // Helpers
    const getRandomDate = (start: Date, end: Date) => {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
    };

    const getRandomAmount = (min: number, max: number, isExpense: boolean) => {
        const val = (Math.random() * (max - min) + min).toFixed(2);
        return isExpense ? -1 * parseFloat(val) : parseFloat(val);
    };

    // Data Sources
    const checkingDescriptions = [
        { desc: "Home Depot", type: 'expense', cat: 'Cost of Goods Sold (COGS)', range: [50, 500] },
        { desc: "Lowes", type: 'expense', cat: 'Cost of Goods Sold (COGS)', range: [30, 300] },
        { desc: "Sherwin Williams", type: 'expense', cat: 'Cost of Goods Sold (COGS)', range: [100, 1000] },
        { desc: "Shell Fuel", type: 'expense', cat: 'Automobile Expenses', range: [40, 120] },
        { desc: "Tim Hortons", type: 'expense', cat: 'Meals & Entertainment', range: [5, 20] },
        { desc: "Subcontractor - Mike", type: 'expense', cat: 'Subcontractors', range: [500, 2000] },
        { desc: "Subcontractor - Dave", type: 'expense', cat: 'Subcontractors', range: [400, 1500] },
        { desc: "Deposit - Smith Job", type: 'income', cat: 'Sales / Revenue', range: [1000, 5000] },
        { desc: "Payment - Jones Reno", type: 'income', cat: 'Sales / Revenue', range: [2000, 8000] },
        { desc: "E-Transfer - Small Fix", type: 'income', cat: 'Sales / Revenue', range: [100, 500] },
        { desc: "Bank Fee", type: 'expense', cat: 'Bank Fees', range: [10, 30] },
        { desc: "Insurance Premium", type: 'expense', cat: 'Insurance', range: [200, 200] },
    ];

    const ccDescriptions = [
        { desc: "Amazon Marketplace", type: 'expense', cat: 'Office Supplies', range: [20, 150] },
        { desc: "Adobe Creative Cloud", type: 'expense', cat: 'Office Supplies', range: [80, 80] },
        { desc: "Google Workspace", type: 'expense', cat: 'Office Supplies', range: [20, 20] },
        { desc: "Home Hardware", type: 'expense', cat: 'Cost of Goods Sold (COGS)', range: [10, 100] },
        { desc: "Petro Canada", type: 'expense', cat: 'Automobile Expenses', range: [50, 100] },
        { desc: "U-Haul Rental", type: 'expense', cat: 'Rent & Lease', range: [40, 200] },
        { desc: "Facebook Ads", type: 'expense', cat: 'Advertising & Marketing', range: [100, 500] },
        { desc: "Lunch - Client Meeting", type: 'expense', cat: 'Meals & Entertainment', range: [30, 80] },
    ];

    const generateTransactions = (count: number, sourceName: string, templates: any[]) => {
        const txns = [];
        for (let i = 0; i < count; i++) {
            const tmpl = templates[Math.floor(Math.random() * templates.length)];
            const date = getRandomDate(new Date('2026-01-01'), new Date('2026-01-31'));
            const amount = getRandomAmount(tmpl.range[0], tmpl.range[1], tmpl.type === 'expense');

            // 70% chance of being auto-categorized if category exists
            const catId = (Math.random() > 0.3 && categoryMap.has(tmpl.cat)) ? categoryMap.get(tmpl.cat) : null;
            const status = catId ? 'AUTO_CLASSIFIED' : 'INGESTED';

            txns.push({
                organization_id: orgId,
                transaction_date: date,
                amount: amount,
                description: tmpl.desc,
                raw_description: `${tmpl.desc} - POS TRANS ${Math.floor(Math.random() * 10000)}`,
                source: 'seed_script', // Marking as seed
                source_id: `${sourceName}-${uuidv4()}`,
                status: status,
                category_id: catId,
                confidence_score: catId ? 0.8 : 0.0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        return txns;
    };

    // 3. Generate Data
    console.log("Generating 100 Checking Transactions...");
    const checkingTxns = generateTransactions(100, 'checking', checkingDescriptions);

    console.log("Generating 100 Credit Card Transactions...");
    const ccTxns = generateTransactions(100, 'credit_card', ccDescriptions);

    const allTxns = [...checkingTxns, ...ccTxns];

    // 4. Insert in Batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < allTxns.length; i += BATCH_SIZE) {
        const batch = allTxns.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('finance_transactions').insert(batch);
        if (error) {
            console.error(`Error inserting batch ${i}:`, error);
        } else {
            console.log(`Inserted batch ${i} - ${i + batch.length}`);
        }
    }

    console.log("--- SEED COMPLETE ---");
}

seedFinanceData().catch(console.error);
