"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Calendar,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  approveQuote,
  confirmSupplies,
  markDepositPaid,
} from "@/app/actions/job-actions";
import { formatCurrency } from "@/lib/utils";
import confetti from "canvas-confetti";
import { BeforeAfterSlider } from "@/components/client-portal/BeforeAfterSlider";
import { ProgressTracker } from "@/components/portal/ProgressTracker";

interface PortalPageProps {
  params: {
    id: string;
  };
}

// Mock Job Type until schema types are fully regenerated and propagated
type PortalJob = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  start_date?: string;
  estimated_duration?: number;
  requires_supplies?: boolean;
  expected_supplies?: string[];
  supplies_confirmed_at?: string;
  deposit_required?: boolean;
  deposit_amount?: number;
  deposit_status?: string;
  quote_line_items?: {
    description: string;
    quantity: number;
    unit_price: number;
  }[];
  client?: {
    name: string;
    email: string;
  };
};

export default function PortalPage({ params }: PortalPageProps) {
  const [job, setJob] = useState<PortalJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
                    *,
                    quote_line_items (*),
                    clients (name, email)
                `,
        )
        .eq("id", params.id)
        .single();

      if (data) {
        setJob(data as any); // Cast for new fields

        // Fetch photos
        const { data: photos } = await supabase
          .from("job_photos")
          .select("*")
          .eq("job_id", params.id);

        if (photos) {
          const typedPhotos = photos as any[];
          const before = typedPhotos.find((p) => p.type === "before");
          const after = typedPhotos.find((p) => p.type === "after");
          if (before) setBeforePhoto(before.url);
          if (after) setAfterPhoto(after.url);
        }
      }
      setLoading(false);
    };
    fetchJob();
  }, [params.id, supabase]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  if (!job)
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Job not found
      </div>
    );

  const totalAmount =
    job.quote_line_items?.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    ) || 0;
  const isQuote =
    job.status === "draft" || job.status === "sent" || job.status === "quoted";
  const isOnboarding = job.status === "approved";
  const isScheduled = job.status === "scheduled";
  const isActive = job.status === "in_progress";
  const isCompleted = job.status === "completed";
  const isPaid = job.status === "paid";
  const isInvoiced = job.status === "invoiced";

  const handleApprove = () => {
    startTransition(async () => {
      await approveQuote(job.id);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      // Optimistic update
      setJob((prev) => (prev ? { ...prev, status: "approved" } : null));
    });
  };

  const handleConfirmSupplies = () => {
    startTransition(async () => {
      await confirmSupplies(job.id);
      setJob((prev) =>
        prev
          ? { ...prev, supplies_confirmed_at: new Date().toISOString() }
          : null,
      );
    });
  };

  const handlePayDeposit = () => {
    startTransition(async () => {
      await markDepositPaid(job.id);
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
        colors: ["#10B981", "#34D399"],
      });
      setJob((prev) => (prev ? { ...prev, deposit_status: "paid" } : null));
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-center pb-6 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="opacity-60 text-sm">Job ID: {job.id.slice(0, 8)}</p>
          </div>
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              isQuote
                ? "bg-blue-500/20 text-blue-300"
                : isOnboarding
                  ? "bg-purple-500/20 text-purple-300"
                  : isActive
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/10 text-white/50",
            )}
          >
            {job.status?.replace("_", " ")}
          </div>
        </header>

        {/* Progress Stepper — mirrors 10-stop workflow (client view) */}
        <div className="flex justify-between items-center px-4 md:px-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -z-10" />
          {[
            { label: "Quote", active: true, completed: !isQuote },
            {
              label: "Approved",
              active: isOnboarding || isScheduled || isActive || isCompleted,
              completed:
                isScheduled || isActive || isCompleted || isInvoiced || isPaid,
            },
            {
              label: "Scheduled",
              active: isScheduled || isActive || isCompleted,
              completed: isActive || isCompleted || isInvoiced || isPaid,
            },
            {
              label: "In Progress",
              active: isActive,
              completed: isCompleted || isInvoiced || isPaid,
            },
            {
              label: "Complete",
              active: isCompleted || isInvoiced || isPaid,
              completed: isPaid,
            },
          ].map((step, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 bg-gray-900 px-2"
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-500",
                  step.completed
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    : step.active
                      ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      : "bg-white/20",
                )}
              />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid gap-6">
          {isQuote && (
            <GlassCard className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">
                  Proposal for {job.client?.name}
                </h2>
                <p className="opacity-60 max-w-lg mx-auto">{job.description}</p>
              </div>

              <div className="bg-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {job.quote_line_items?.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white/5 font-bold">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <AnimatedButton
                  size="lg"
                  onClick={handleApprove}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="mr-2" />
                  )}
                  Approve Proposal
                </AnimatedButton>
              </div>
            </GlassCard>
          )}

          {isOnboarding && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-start">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-200">Quote Approved!</h3>
                  <p className="text-sm opacity-60">
                    We're getting things ready. Please complete the steps below
                    to secure your slot.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Deposit Card */}
                <GlassCard
                  className={cn(
                    "p-6 space-y-4",
                    job.deposit_status === "paid" ? "opacity-50" : "",
                  )}
                  intensity={
                    job.deposit_status === "paid" ? "normal" : "bright"
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-emerald-500/20 rounded-xl w-fit">
                      <DollarSign className="w-6 h-6 text-emerald-400" />
                    </div>
                    {job.deposit_status === "paid" && (
                      <CheckCircle className="text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Deposit Required</h3>
                    <p className="text-sm opacity-60">
                      To secure your start date, a 20% deposit is required.
                    </p>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(job.deposit_amount || totalAmount * 0.2)}
                  </div>

                  {job.deposit_status !== "paid" && (
                    <AnimatedButton
                      onClick={handlePayDeposit}
                      disabled={isPending}
                      className="w-full"
                    >
                      Pay Securely
                    </AnimatedButton>
                  )}
                </GlassCard>

                {/* Supplies Card */}
                {job.requires_supplies && (
                  <GlassCard className="p-6 space-y-4" intensity="bright">
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-amber-500/20 rounded-xl w-fit">
                        <Package className="w-6 h-6 text-amber-400" />
                      </div>
                      {job.supplies_confirmed_at && (
                        <CheckCircle className="text-emerald-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Supply Check</h3>
                      <p className="text-sm opacity-60">
                        Please confirm you have all required materials on site.
                      </p>
                    </div>

                    {job.expected_supplies &&
                      job.expected_supplies.length > 0 && (
                        <div className="bg-black/30 rounded-lg p-3 space-y-2">
                          <h4 className="text-sm font-semibold opacity-80 border-b border-white/10 pb-2 mb-2">
                            Required Items:
                          </h4>
                          <ul className="text-sm space-y-1 opacity-80 list-disc list-inside">
                            {job.expected_supplies.map((item, idx) => (
                              <li
                                key={idx}
                                className="break-words text-gray-300"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {!job.supplies_confirmed_at ? (
                      <AnimatedButton
                        onClick={handleConfirmSupplies}
                        disabled={isPending}
                        variant="secondary"
                        className="w-full"
                      >
                        Yes, I have them
                      </AnimatedButton>
                    ) : (
                      <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 text-sm font-bold text-center">
                        Confirmed on{" "}
                        {new Date(
                          job.supplies_confirmed_at,
                        ).toLocaleDateString()}
                      </div>
                    )}
                  </GlassCard>
                )}
              </div>
            </div>
          )}

          {(isScheduled || isActive || isCompleted || isInvoiced || isPaid) && (
            <div className="space-y-6">
              <GlassCard className="p-8 text-center space-y-4">
                <div
                  className={cn(
                    "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
                    isPaid
                      ? "bg-emerald-500/20"
                      : isInvoiced
                        ? "bg-orange-500/20"
                        : "bg-emerald-500/20",
                  )}
                >
                  {isInvoiced ? (
                    <DollarSign className="w-8 h-8 text-orange-400" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  )}
                </div>
                <h2 className="text-2xl font-bold">
                  {isActive
                    ? "Job is In Progress"
                    : isInvoiced
                      ? "Invoice Ready"
                      : isPaid
                        ? "Thank You!"
                        : isCompleted
                          ? "Job Complete"
                          : "Job is Scheduled"}
                </h2>
                <p className="opacity-60">
                  {isPaid
                    ? "Payment received. Thank you for choosing Frank's Home Improvement!"
                    : isInvoiced
                      ? "Your invoice is ready for payment."
                      : isCompleted
                        ? "Frank and the team have completed your project."
                        : isActive
                          ? "Frank and the team are working on your project."
                          : "Frank and the team are preparing for your project."}
                </p>

                {/* Invoice amount for invoiced status */}
                {isInvoiced && totalAmount > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                    <div>
                      <p className="text-sm opacity-50 uppercase tracking-wider mb-1">
                        Amount Due
                      </p>
                      <p className="text-4xl font-black text-orange-400">
                        {formatCurrency(totalAmount)}
                      </p>
                      {(job as any).payment_terms &&
                        (job as any).payment_terms !== "due_on_receipt" && (
                          <p className="text-xs opacity-40 mt-1">
                            Terms:{" "}
                            {((job as any).payment_terms as string).replace(
                              /_/g,
                              " ",
                            )}
                          </p>
                        )}
                    </div>
                    <AnimatedButton
                      size="lg"
                      className="w-full max-w-xs mx-auto"
                    >
                      <DollarSign className="mr-2 w-5 h-5" /> Pay Now
                    </AnimatedButton>
                  </div>
                )}

                {/* Paid confirmation */}
                {isPaid && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                      <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      <p className="text-emerald-400 font-bold">
                        Payment Received
                      </p>
                      {totalAmount > 0 && (
                        <p className="text-2xl font-black text-white mt-1">
                          {formatCurrency(totalAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Transformation Showcase */}
                {beforePhoto && afterPhoto && (
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <h3 className="text-xl font-bold mb-4">
                      See the Transformation
                    </h3>
                    <BeforeAfterSlider
                      beforeImage={beforePhoto}
                      afterImage={afterPhoto}
                    />
                  </div>
                )}
              </GlassCard>

              {/* Live Progress Tracker */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                  Track Progress
                </h3>
                <ProgressTracker jobId={job.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
