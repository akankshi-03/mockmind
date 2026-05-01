"use client";

import Link from "next/link";

const features = [
  {
    icon: "🎙️",
    title: "Voice & Text",
    desc: "Answer via microphone with Whisper transcription, or type your responses directly.",
  },
  {
    icon: "🧠",
    title: "AI Evaluation",
    desc: "Get instant feedback on communication, technical depth, and confidence from Llama 3.",
  },
  {
    icon: "📊",
    title: "Detailed Reports",
    desc: "Receive scores, strengths, weaknesses, and a personalized improvement plan after each session.",
  },
  {
    icon: "🎯",
    title: "Multiple Modes",
    desc: "HR Round, Technical, Full Interview, AI/ML, or Web Dev — choose your focus area.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-sm font-bold text-white">
            M
          </span>
          <span className="text-lg font-semibold tracking-tight text-[#f8fafc]">MockMind</span>
        </div>
        <Link
          href="/setup"
          className="rounded-lg border border-[#334155] px-4 py-2 text-sm text-[#cbd5e1] transition hover:border-[#6366f1] hover:text-[#e2e8f0]"
        >
          Get Started
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* Glow backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        <p className="animate-fade-in rounded-full border border-[#334155] bg-[#0f1420]/60 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[#818cf8]">
          AI-Powered Interview Practice
        </p>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-[#f8fafc] animate-fade-in-up sm:text-5xl lg:text-6xl">
          MockMind{" "}
          <span className="bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#22d3ee] bg-clip-text text-transparent">
            AI Interview
          </span>{" "}
          Simulator
        </h1>

        <p className="mt-5 max-w-xl text-base leading-7 text-[#94a3b8] animate-fade-in sm:text-lg">
          Practice real interviews with AI feedback. Get scored on communication,
          technical depth, and confidence — then receive a personalized improvement plan.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-fade-in-up">
          <Link href="/setup" className="btn-primary text-center">
            Start Interview →
          </Link>
          <a
            href="#features"
            className="rounded-xl border border-[#334155] px-6 py-3 text-sm font-medium text-[#cbd5e1] transition hover:border-[#6366f1] hover:text-[#e2e8f0]"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="mx-auto w-full max-w-5xl px-6 pb-20 pt-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card glass-card-hover p-6"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 text-sm font-semibold text-[#f8fafc]">{f.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#94a3b8]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[#1e293b] px-6 py-6 text-center text-xs text-[#64748b]">
        © {new Date().getFullYear()} MockMind — Built with Next.js, FastAPI &amp; Groq AI
      </footer>
    </main>
  );
}
