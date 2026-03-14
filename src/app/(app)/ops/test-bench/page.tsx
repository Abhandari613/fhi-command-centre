"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { TEST_FIXTURES, TestFixture } from "@/lib/test-fixtures";
import {
  FlaskConical,
  Play,
  PlayCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type RunResult = {
  fixtureId: string;
  success: boolean;
  draft?: any;
  extractedData?: any;
  error?: string;
  duration: number;
};

export default function TestBenchPage() {
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const runFixture = async (fixture: TestFixture): Promise<RunResult> => {
    const start = Date.now();
    try {
      const res = await fetch("/api/test/email-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fixture.payload),
      });

      const data = await res.json();
      const duration = Date.now() - start;

      if (!res.ok || !data.success) {
        return {
          fixtureId: fixture.id,
          success: false,
          error: data.error || "Unknown error",
          duration,
        };
      }

      return {
        fixtureId: fixture.id,
        success: true,
        draft: data.draft,
        extractedData: data.extractedData,
        duration,
      };
    } catch (err: any) {
      return {
        fixtureId: fixture.id,
        success: false,
        error: err.message,
        duration: Date.now() - start,
      };
    }
  };

  const handleRun = async (fixture: TestFixture) => {
    setRunning(fixture.id);
    const result = await runFixture(fixture);
    setResults((prev) => ({ ...prev, [fixture.id]: result }));
    setRunning(null);
    setExpanded(fixture.id);
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    for (const fixture of TEST_FIXTURES) {
      setRunning(fixture.id);
      const result = await runFixture(fixture);
      setResults((prev) => ({ ...prev, [fixture.id]: result }));
      setRunning(null);
    }
    setRunningAll(false);
  };

  const passCount = Object.values(results).filter((r) => r.success).length;
  const failCount = Object.values(results).filter((r) => !r.success).length;

  const scenarioLabel: Record<string, string> = {
    new_work_order: "New WO",
    add_photos: "Add Photos",
    punch_list: "Punch List",
  };

  const scenarioColor: Record<string, string> = {
    new_work_order: "bg-blue-500/20 text-blue-400",
    add_photos: "bg-yellow-500/20 text-yellow-400",
    punch_list: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">
              Test Bench
            </h1>
          </div>
          <p className="text-sm opacity-70">
            Simulate inbound emails to test the ingestion pipeline
          </p>
        </div>
        <button
          onClick={handleRunAll}
          disabled={runningAll}
          className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-5 py-3 flex items-center gap-2 transition-all active:scale-[0.98] min-h-[48px] disabled:opacity-50"
        >
          {runningAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlayCircle className="w-5 h-5" />
          )}
          Run All
        </button>
      </header>

      {/* Results summary */}
      {(passCount > 0 || failCount > 0) && (
        <div className="flex gap-4 text-sm">
          {passCount > 0 && (
            <span className="text-green-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {passCount} passed
            </span>
          )}
          {failCount > 0 && (
            <span className="text-red-400 font-bold flex items-center gap-1">
              <XCircle className="w-4 h-4" /> {failCount} failed
            </span>
          )}
        </div>
      )}

      {/* Fixtures */}
      <div className="space-y-3">
        {TEST_FIXTURES.map((fixture) => {
          const result = results[fixture.id];
          const isRunning = running === fixture.id;
          const isExpanded = expanded === fixture.id;

          return (
            <GlassCard key={fixture.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 opacity-50 flex-shrink-0" />
                      <span className="font-bold text-sm truncate">
                        {fixture.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          scenarioColor[fixture.scenario]
                        }`}
                      >
                        {scenarioLabel[fixture.scenario]}
                      </span>
                      {result && (
                        <span className="flex-shrink-0">
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-50 pl-6">
                      {fixture.description}
                    </p>
                    {result && (
                      <p className="text-xs opacity-40 pl-6 mt-1">
                        {result.duration}ms
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {result && (
                      <button
                        onClick={() =>
                          setExpanded(isExpanded ? null : fixture.id)
                        }
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleRun(fixture)}
                      disabled={isRunning || runningAll}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-30"
                    >
                      {isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded result */}
              {isExpanded && result && (
                <div className="border-t border-white/5 p-4 bg-white/[0.02]">
                  {result.success ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-bold uppercase opacity-50 block mb-1">
                          AI Extracted Data
                        </span>
                        <pre className="text-xs opacity-80 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(result.extractedData, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase opacity-50 block mb-1">
                          Draft ID
                        </span>
                        <span className="text-xs font-mono opacity-60">
                          {result.draft?.id}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-400 text-sm">
                      <span className="font-bold">Error:</span> {result.error}
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
