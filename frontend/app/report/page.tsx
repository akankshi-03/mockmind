"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchFinalReport } from "@/lib/api";
import { FinalReport, useInterview } from "@/app/context/InterviewContext";

/* ── Score Ring SVG ─────────────────────────────────── */
function ScoreRing({ score, size = 140, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 80 ? "#10b981" : pct >= 60 ? "#6366f1" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="score-ring-track" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="score-ring-fill circle-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="28"
          fontWeight="700"
        >
          {score}
        </text>
      </svg>
      <p className="text-xs uppercase tracking-[0.15em] text-[#94a3b8]">{label}</p>
    </div>
  );
}

/* ── Category Bar ──────────────────────────────────── */
function CategoryBar({ name, value }: { name: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value * 10));
  const color =
    value >= 8 ? "#10b981" : value >= 6 ? "#6366f1" : value >= 4 ? "#f59e0b" : "#ef4444";
  const label = name.replaceAll("_", " ");

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="capitalize text-[#cbd5e1]">{label}</span>
        <span className="font-semibold text-[#f8fafc]">{value}/10</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#1e293b]">
        <div
          className="bar-fill h-2.5 rounded-full"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
        />
      </div>
    </div>
  );
}

/* ── Grade badge color ─────────────────────────────── */
function gradeColor(grade: string): string {
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "#10b981";
  if (g.startsWith("B")) return "#6366f1";
  if (g.startsWith("C")) return "#f59e0b";
  return "#ef4444";
}

export default function ReportPage() {
  const router = useRouter();
  const { history, role, interviewMode, resumeText, totalQuestions, report, setReport, reset } =
    useInterview();
  const [loading, setLoading] = useState(!report);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function loadReport(showLoading = true) {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data: FinalReport = await fetchFinalReport({
        history,
        role,
        interviewMode,
        resumeText,
      });
      setReport(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate final report.";
      setError(message);
      setToastMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!role || !resumeText || history.length === 0) {
      router.replace("/setup");
      return;
    }

    if (report) return;

    let mounted = true;
    fetchFinalReport({ history, role, interviewMode, resumeText })
      .then((data: FinalReport) => {
        if (mounted) setReport(data);
      })
      .catch((err: unknown) => {
        if (mounted) {
          const message =
            err instanceof Error ? err.message : "Failed to generate final report.";
          setError(message);
          setToastMessage(message);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [history, role, interviewMode, resumeText, report, router, setReport]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const categoryEntries = useMemo(
    () => Object.entries(report?.category_scores ?? {}),
    [report?.category_scores],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6">
      {/* ── Header ── */}
      <section className="glass-card p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#818cf8]">Final Evaluation</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#f8fafc]">Interview Report</h1>
        <p className="mt-2 text-sm text-[#94a3b8]">
          Role: <span className="text-[#cbd5e1]">{role}</span> • Questions answered:{" "}
          <span className="text-[#cbd5e1]">{history.length}/{totalQuestions}</span> • Mode:{" "}
          <span className="text-[#cbd5e1]">{interviewMode}</span>
        </p>
      </section>

      {/* ── Loading state ── */}
      {loading ? (
        <section className="glass-card mt-6 p-8 animate-fade-in">
          <div className="flex flex-col items-center gap-5 py-10">
            <div className="loading-spinner" />
            <div className="text-center">
              <p className="text-lg font-medium text-[#f8fafc]">Generating your report...</p>
              <p className="mt-2 text-sm text-[#94a3b8]">
                AI is evaluating {history.length} answers across multiple dimensions
              </p>
            </div>
            <div className="mt-4 grid w-full max-w-md gap-3">
              <div className="skeleton h-4 w-3/4 mx-auto" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-5/6" />
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Error state ── */}
      {error ? (
        <section className="mt-6 rounded-xl border border-[#7f1d1d] bg-[#1f1012] px-4 py-3 text-sm text-[#fecaca]">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadReport()}
            className="mt-3 rounded-lg border border-[#ef4444] px-3 py-2 text-xs hover:bg-[#7f1d1d]/30"
          >
            Retry generating report
          </button>
        </section>
      ) : null}

      {/* ── Report content ── */}
      {report ? (
        <div className="mt-6 space-y-6 animate-fade-in-up">
          {/* ── Top scores: ring + pills ── */}
          <section className="glass-card p-6 md:p-8">
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-around">
              <ScoreRing score={report.overall_score} label="Overall Score" />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {/* Grade */}
                <div className="rounded-xl border border-[#1e293b] bg-[#0b1220] px-5 py-4 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#64748b]">Grade</p>
                  <p
                    className="mt-2 text-3xl font-bold"
                    style={{ color: gradeColor(report.grade) }}
                  >
                    {report.grade}
                  </p>
                </div>

                {/* Hire Chance */}
                <div className="rounded-xl border border-[#1e293b] bg-[#0b1220] px-5 py-4 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#64748b]">Hire Chance</p>
                  <p className="mt-2 text-3xl font-bold text-[#f8fafc]">
                    {report.hire_chance ? `${report.hire_chance}%` : "N/A"}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="col-span-2 rounded-xl border border-[#1e293b] bg-[#0b1220] px-5 py-4 text-center sm:col-span-1">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#64748b]">Verdict</p>
                  <p className="mt-2 text-lg font-semibold text-[#f8fafc]">
                    {report.hire_recommendation}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Summary ── */}
          <section className="glass-card p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-[#67e8f9]">Summary</p>
            <p className="mt-3 text-sm leading-7 text-[#cbd5e1]">{report.summary}</p>
          </section>

          {/* ── Category Scores with bars ── */}
          {categoryEntries.length > 0 ? (
            <section className="glass-card p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-[#818cf8]">
                Category Breakdown
              </p>
              <div className="mt-5 space-y-4">
                {categoryEntries.map(([name, value]) => (
                  <CategoryBar key={name} name={name} value={value} />
                ))}
              </div>
            </section>
          ) : null}

          {/* ── Strengths & Weaknesses ── */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10b981]/15 text-xs">✓</span>
                <p className="text-xs uppercase tracking-[0.15em] text-[#10b981]">Strengths</p>
              </div>
              <ul className="mt-4 space-y-2">
                {report.strengths.map((item, idx) => (
                  <li
                    key={`s-${idx}`}
                    className="flex items-start gap-3 rounded-lg border border-[#10b981]/10 bg-[#10b981]/5 px-4 py-3 text-sm text-[#cbd5e1]"
                  >
                    <span className="mt-0.5 text-[#10b981]">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f59e0b]/15 text-xs">!</span>
                <p className="text-xs uppercase tracking-[0.15em] text-[#f59e0b]">
                  Areas for Improvement
                </p>
              </div>
              <ul className="mt-4 space-y-2">
                {report.weaknesses.map((item, idx) => (
                  <li
                    key={`w-${idx}`}
                    className="flex items-start gap-3 rounded-lg border border-[#f59e0b]/10 bg-[#f59e0b]/5 px-4 py-3 text-sm text-[#cbd5e1]"
                  >
                    <span className="mt-0.5 text-[#f59e0b]">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── Improvement Plan ── */}
          <section className="glass-card p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22d3ee]/15 text-xs">📋</span>
              <p className="text-xs uppercase tracking-[0.15em] text-[#22d3ee]">
                Improvement Plan
              </p>
            </div>
            <ol className="mt-4 space-y-3">
              {report.improvement_plan.map((step, idx) => (
                <li
                  key={`p-${idx}`}
                  className="flex items-start gap-4 rounded-lg border border-[#1e293b] bg-[#0b1220] px-4 py-3 text-sm text-[#cbd5e1]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/15 text-xs font-semibold text-[#a5b4fc]">
                    {idx + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {/* ── Actions ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                reset();
                router.push("/setup");
              }}
            >
              Start New Interview
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Toast ── */}
      {toastMessage ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-[#7f1d1d] bg-[#1f1012] px-4 py-3 text-sm text-[#fecaca] shadow-2xl animate-fade-in">
          <p>{toastMessage}</p>
        </div>
      ) : null}
    </main>
  );
}
