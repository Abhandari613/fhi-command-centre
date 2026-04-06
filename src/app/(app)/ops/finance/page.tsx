import {
  getUncategorizedTransactions,
  getTaxCategories,
} from "@/app/actions/finance";
import { getCompletedJobsFinanceSummary } from "@/app/actions/finance-bridge-actions";
import {
  getAgingSummary,
  getAgedReceivables,
} from "@/app/actions/receivables-actions";
import { CFODashboardClient } from "./CFODashboardClient";

export const metadata = {
  title: "Money | Frank's Home Improvement",
};

export default async function FinancePage() {
  const [transactions, categories, jobProfits, agingSummary, receivables] =
    await Promise.all([
      getUncategorizedTransactions(),
      getTaxCategories(),
      getCompletedJobsFinanceSummary(),
      getAgingSummary(),
      getAgedReceivables(),
    ]);

  const paidJobs = jobProfits.filter((j: any) => j.status === "paid");
  const totalRevenue = paidJobs.reduce(
    (sum: number, j: any) => sum + (Number(j.revenue) || 0),
    0,
  );
  const avgMargin =
    paidJobs.length > 0
      ? paidJobs.reduce(
          (sum: number, j: any) => sum + (Number(j.margin_pct) || 0),
          0,
        ) / paidJobs.length
      : 0;

  return (
    <CFODashboardClient
      transactions={transactions as any[]}
      categories={categories as any[]}
      jobProfits={jobProfits as any[]}
      agingSummary={agingSummary}
      receivables={receivables}
      totalRevenue={totalRevenue}
      avgMargin={avgMargin}
      pendingCount={transactions.length}
      outstandingTotal={agingSummary.grand_total}
    />
  );
}
