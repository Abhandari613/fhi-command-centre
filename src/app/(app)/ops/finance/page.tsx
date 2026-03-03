
import { getUncategorizedTransactions, getTaxCategories } from '@/app/actions/finance';
import { TransactionList } from '@/components/finance/TransactionList';
import { UploadZone } from '@/components/finance/UploadZone';
import { AutoCategorizeButton } from '@/components/finance/AutoCategorizeButton';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Finance Dashboard | Frank\'s Home Improvement',
};

export default async function FinancePage() {
    const transactions = await getUncategorizedTransactions();
    const categories = await getTaxCategories();

    // Server Action Wrapped for Upload Refresh
    // When generic client component finishes upload, it can call this via router.refresh() 
    // or we pass a callback that calls a server action to revalidate.
    // Actually simplicity: UploadZone calls router.refresh() (implied by onUploadComplete in client component)

    return (
        <div className="w-full pb-20">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                            CFO Dashboard
                        </h1>
                        <p className="text-white/60 text-lg">
                            Reconcile accounts and track cash flow.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/* Summary Metrics Placeholders */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
                            <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Pending</div>
                            <div className="text-2xl font-mono font-bold text-white">{transactions.length}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: Upload & Context */}
                    <div className="space-y-8">
                        {/* Upload Zone */}
                        <section>
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                Ingest Data
                            </h2>
                            <UploadZone />
                        </section>

                        {/* Cash Flow Placeholders (Future Phase) */}
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 opacity-50 grayscale hover:grayscale-0 transition-all">
                            <h3 className="text-white font-bold mb-2">Cash Flow (Coming Soon)</h3>
                            <div className="h-32 flex items-end gap-2">
                                {[40, 60, 30, 80, 50, 90, 20].map((h, i) => (
                                    <div key={i} className="flex-1 bg-white/20 rounded-t-lg" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: The Clearing House */}
                    {/* RIGHT COLUMN: The Clearing House */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Clearing House
                            </h2>
                            <div className="flex items-center gap-2">
                                <AutoCategorizeButton />
                                <span className="text-xs text-white/40 px-3 py-1 bg-white/5 rounded-full">
                                    {transactions.length} items to review
                                </span>
                            </div>
                        </div>

                        <div className="bg-black/20 rounded-3xl p-1 border border-white/5 min-h-[500px]">
                            <TransactionList
                                initialTransactions={transactions as any[]}
                                categories={categories as any[]}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
