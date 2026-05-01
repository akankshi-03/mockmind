"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseResumePdf, startInterview } from "@/lib/api";
import { useInterview } from "@/app/context/InterviewContext";

const QUESTION_OPTIONS = [5, 10, 15];

export default function SetupPage() {
  const router = useRouter();
  const { setSetup, setFirstQuestion, reset } = useInterview();

  const interviewModes = ["HR Round", "Technical Round", "Full Interview", "AIML Interview", "Web Dev Interview"];
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [interviewMode, setInterviewMode] = useState("Full Interview");
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [resumeText, setResumeText] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = useMemo(
    () => role.trim() && company.trim() && resumeText.trim() && !isStarting && !isParsingPdf,
    [role, company, resumeText, isStarting, isParsingPdf],
  );

  async function handlePdfUpload(file: File | null) {
    if (!file) return;
    setError(null);
    setIsParsingPdf(true);
    try {
      const text = await parseResumePdf(file);
      setResumeText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to parse resume PDF.");
    } finally {
      setIsParsingPdf(false);
    }
  }

  async function handleStartInterview() {
    if (!canStart) return;
    setError(null);
    setIsStarting(true);

    try {
      reset();
      setSetup(role.trim(), company.trim(), interviewMode, resumeText.trim(), totalQuestions);

      const { question } = await startInterview({
        role: role.trim(),
        company: company.trim(),
        interviewMode,
        resumeText: resumeText.trim(),
      });

      setFirstQuestion(question);
      router.push("/interview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start interview.");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      {/* ── Full-screen loading overlay ── */}
      {isStarting ? (
        <div className="loading-overlay">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="loading-spinner" />
            <p className="text-lg font-medium text-[#f8fafc]">Preparing your interview...</p>
            <p className="text-sm text-[#94a3b8]">AI is crafting your first question</p>
          </div>
        </div>
      ) : null}

      <section className="glass-card w-full max-w-3xl p-8 md:p-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-[#818cf8]">MockMind AI</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#f8fafc]">Interview Setup</h1>
          <p className="mt-2 text-sm text-[#94a3b8]">
            Configure your role, upload/paste your resume, and launch an AI interview simulation.
          </p>
        </div>

        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm text-[#cbd5e1]">Target Role</span>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Engineer"
              className="w-full rounded-xl border border-[#1e293b] bg-[#0b1220] px-4 py-3 text-sm outline-none transition focus:border-[#6366f1]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-[#cbd5e1]">Target Company</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stripe"
              className="w-full rounded-xl border border-[#1e293b] bg-[#0b1220] px-4 py-3 text-sm outline-none transition focus:border-[#6366f1]"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm text-[#cbd5e1]">Interview Mode</span>
              <select
                value={interviewMode}
                onChange={(e) => setInterviewMode(e.target.value)}
                className="w-full rounded-xl border border-[#1e293b] bg-[#0b1220] px-4 py-3 text-sm outline-none transition focus:border-[#6366f1]"
              >
                {interviewModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-sm text-[#cbd5e1]">Number of Questions</span>
              <div className="flex gap-2">
                {QUESTION_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTotalQuestions(n)}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      totalQuestions === n
                        ? "border-[#6366f1] bg-[#6366f1]/15 text-[#c7d2fe]"
                        : "border-[#1e293b] bg-[#0b1220] text-[#94a3b8] hover:border-[#334155]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-[#cbd5e1]">Resume</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-[#334155] bg-[#0b1220] px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#6366f1]">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handlePdfUpload(e.target.files?.[0] ?? null)}
                />
                Upload PDF
              </label>
              {isParsingPdf ? (
                <p className="text-sm text-[#67e8f9]">Parsing resume PDF...</p>
              ) : (
                <p className="text-xs text-[#64748b]">Or paste resume text below.</p>
              )}
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={11}
              placeholder="Paste your resume text here..."
              className="w-full rounded-xl border border-[#1e293b] bg-[#0b1220] px-4 py-3 text-sm outline-none transition focus:border-[#6366f1]"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-[#7f1d1d] bg-[#1f1012] px-4 py-3 text-sm text-[#fecaca]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleStartInterview}
          disabled={!canStart}
          className="btn-primary mt-8 w-full"
        >
          {isStarting ? "Starting interview..." : "Start Interview"}
        </button>
      </section>
    </main>
  );
}
