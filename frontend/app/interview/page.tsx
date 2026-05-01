"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAnswer, transcribeAudio } from "@/lib/api";
import { useInterview } from "@/app/context/InterviewContext";

type RecorderState = "idle" | "recording" | "processing";
type RetryAction = "submit" | "transcribe" | "record" | "end";

export default function InterviewPage() {
  const router = useRouter();
  const {
    role,
    interviewMode,
    resumeText,
    currentQuestion,
    questionNumber,
    totalQuestions,
    history,
    liveScores,
    liveSpeakingScores,
    isLast,
    inputMode,
    addHistoryEntry,
    setCurrentQuestion,
    setQuestionNumber,
    setLiveScores,
    setLiveSpeakingScores,
    setIsLast,
    setInputMode,
  } = useInterview();

  const [answerInput, setAnswerInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [mistakeExplanation, setMistakeExplanation] = useState("");
  const [correctConcept, setCorrectConcept] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<RetryAction | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);
  const [speechEnabled, setSpeechEnabled] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!role || !resumeText || !currentQuestion) {
      router.replace("/setup");
    }
  }, [role, resumeText, currentQuestion, router]);

  // Real progress based on totalQuestions
  const progressPercent = Math.min(100, Math.round((questionNumber / totalQuestions) * 100));
  const isLastQuestion = questionNumber >= totalQuestions;

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    if (!speechEnabled || !currentQuestion) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [currentQuestion, speechEnabled]);

  // Can submit: text mode just needs text, voice mode needs text too (from transcript)
  const canSubmit = answerInput.trim().length > 0 && !isSubmitting;

  async function handleTranscribe(blob: Blob) {
    try {
      const transcript = await transcribeAudio(blob);
      setAnswerInput((prev) => (prev ? `${prev}\n${transcript}` : transcript));
      setRetryAction(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to transcribe recording.";
      setError(message);
      setToastMessage(message);
      setRetryAction("transcribe");
    }
  }

  async function handleSubmitAnswer(fromRetry = false) {
    const answer = answerInput.trim();
    if (!answer || isSubmitting || !currentQuestion) return;

    setError(null);
    setIsSubmitting(true);
    setIsAiThinking(true);
    if (!fromRetry) setRetryAction(null);

    // Auto-end if this is the last question
    const shouldEnd = isLastQuestion;

    try {
      const response = await submitAnswer({
        question: currentQuestion,
        answer,
        role,
        interviewMode,
        resumeText,
        history,
        questionNumber,
        endInterview: shouldEnd,
      });

      addHistoryEntry({
        question: currentQuestion,
        answer,
        feedback: response.feedback,
        mistake_explanation: response.mistake_explanation,
        correct_concept: response.correct_concept,
        scores: response.scores,
        speaking_scores: response.speaking_scores,
      });
      setLiveScores(response.scores);
      setLiveSpeakingScores(response.speaking_scores);
      setFeedback(response.feedback);
      setMistakeExplanation(response.mistake_explanation);
      setCorrectConcept(response.correct_concept);
      setIsLast(response.is_last);
      setAnswerInput("");

      if (shouldEnd || response.is_last || !response.next_question) {
        router.push("/report");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 450));
      setCurrentQuestion(response.next_question);
      setQuestionNumber(questionNumber + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit answer.";
      setError(message);
      setToastMessage(message);
      setRetryAction("submit");
    } finally {
      setIsSubmitting(false);
      setIsAiThinking(false);
    }
  }

  async function handleEndInterview() {
    if (isSubmitting || !currentQuestion || !answerInput.trim()) return;
    setRetryAction(null);
    setIsSubmitting(true);
    setIsAiThinking(true);
    try {
      const response = await submitAnswer({
        question: currentQuestion,
        answer: answerInput.trim(),
        role,
        interviewMode,
        resumeText,
        history,
        questionNumber,
        endInterview: true,
      });
      addHistoryEntry({
        question: currentQuestion,
        answer: answerInput.trim(),
        feedback: response.feedback,
        mistake_explanation: response.mistake_explanation,
        correct_concept: response.correct_concept,
        scores: response.scores,
        speaking_scores: response.speaking_scores,
      });
      setLiveScores(response.scores);
      setLiveSpeakingScores(response.speaking_scores);
      setIsLast(true);
      router.push("/report");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to end interview.";
      setError(message);
      setToastMessage(message);
      setRetryAction("end");
    } finally {
      setIsSubmitting(false);
      setIsAiThinking(false);
    }
  }

  async function startRecording(fromRetry = false) {
    setError(null);
    setPermissionDenied(false);
    if (!fromRetry) setRetryAction(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setRecorderState("processing");
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setLastAudioBlob(audioBlob);
          await handleTranscribe(audioBlob);
        } catch {
          // Errors are handled in handleTranscribe.
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          setRecorderState("idle");
        }
      };

      recorder.start();
      setRecorderState("recording");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Microphone access denied or unavailable.";
      setPermissionDenied(true);
      setError(message);
      setToastMessage("Microphone access denied. Switch to Text Mode to continue.");
      setRetryAction("record");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recorderState === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  // Status label
  const statusLabel = isSpeaking
    ? "AI speaking question..."
    : recorderState === "recording"
      ? "Recording answer..."
      : isAiThinking
        ? "AI analyzing your response..."
        : "Session active";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      {/* ── Loading overlay for AI thinking ── */}
      {isAiThinking ? (
        <div className="loading-overlay">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="loading-spinner" />
            <p className="text-lg font-medium text-[#f8fafc]">AI is analyzing your response...</p>
            <p className="text-sm text-[#94a3b8]">Generating feedback and next question</p>
          </div>
        </div>
      ) : null}

      {/* ── Header ── */}
      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#818cf8]">Live Interview Session</p>
          <span className="rounded-full border border-[#334155] bg-[#0b1220] px-3 py-1 text-xs text-[#67e8f9]">
            {statusLabel}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-[#f8fafc]">
            Question {questionNumber}
            <span className="ml-2 text-sm font-normal text-[#64748b]">of {totalQuestions}</span>
          </h1>
          <span className="rounded-full border border-[#334155] px-3 py-1 text-xs text-[#cbd5e1]">
            {isLastQuestion ? "Final Question" : interviewMode}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#1e293b]">
          <div
            className="h-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[#64748b]">
          {history.length} answered • {totalQuestions - questionNumber} remaining
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-[#334155] px-3 py-1 text-xs text-[#cbd5e1] hover:border-[#6366f1]"
            onClick={() => setSpeechEnabled((v) => !v)}
          >
            {speechEnabled ? "🔊 Voice: ON" : "🔇 Voice: OFF"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-[#334155] px-3 py-1 text-xs text-[#cbd5e1] hover:border-[#6366f1]"
            onClick={() => {
              if (!currentQuestion || !speechEnabled || !("speechSynthesis" in window)) return;
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(currentQuestion);
              u.onstart = () => setIsSpeaking(true);
              u.onend = () => setIsSpeaking(false);
              u.onerror = () => setIsSpeaking(false);
              window.speechSynthesis.speak(u);
            }}
          >
            Repeat question
          </button>

          {/* ── Input mode toggle ── */}
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-toggle-btn ${inputMode === "text" ? "active" : ""}`}
              onClick={() => setInputMode("text")}
            >
              ✏️ Text
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${inputMode === "voice" ? "active" : ""}`}
              onClick={() => setInputMode("voice")}
            >
              🎙️ Voice
            </button>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card lg:col-span-2 p-6">
          <h2 className="text-lg font-medium text-[#f8fafc]">Interview Chat</h2>

          {/* Chat history */}
          <div className="mt-4 space-y-3 rounded-xl border border-[#1e293b] bg-[#0b1220] p-4 max-h-80 overflow-y-auto">
            {history.slice(-4).map((entry, idx) => (
              <div key={`${entry.question}-${idx}`} className="space-y-2 animate-fade-in">
                <div className="chat-bubble-ai max-w-[90%] p-3 text-sm leading-6 text-[#e2e8f0]">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-[#a5b4fc]">AI</p>
                  {entry.question}
                </div>
                <div className="ml-auto chat-bubble-user max-w-[90%] p-3 text-sm leading-6 text-[#dbeafe]">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-[#67e8f9]">You</p>
                  {entry.answer}
                </div>
              </div>
            ))}

            {!isAiThinking && currentQuestion ? (
              <div key={currentQuestion} className="chat-bubble-ai max-w-[90%] animate-fade-in-up p-4 text-sm leading-7 text-[#e2e8f0]">
                <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-[#a5b4fc]">AI</p>
                {currentQuestion}
              </div>
            ) : null}

            {isAiThinking ? (
              <div className="chat-bubble-ai inline-flex items-center gap-2 p-3 text-sm text-[#cbd5e1] animate-fade-in">
                <span>AI is thinking</span>
                <span className="typing-dot h-2 w-2 rounded-full bg-[#a5b4fc]" />
                <span className="typing-dot h-2 w-2 rounded-full bg-[#a5b4fc]" />
                <span className="typing-dot h-2 w-2 rounded-full bg-[#a5b4fc]" />
              </div>
            ) : null}
          </div>

          {/* ── Answer input area ── */}
          {inputMode === "text" ? (
            <div className="mt-4">
              <textarea
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                rows={4}
                disabled={isSubmitting}
                placeholder="Type your answer here..."
                className="w-full rounded-xl border border-[#1e293b] bg-[#0b1220] px-4 py-3 text-sm text-[#e2e8f0] outline-none transition focus:border-[#6366f1] disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && canSubmit) {
                    handleSubmitAnswer();
                  }
                }}
              />
              <p className="mt-1 text-xs text-[#64748b]">Ctrl+Enter to submit</p>
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-xl border border-[#1e293b] bg-[#0b1220] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.15em] text-[#64748b]">Voice Transcript</p>
                <textarea
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  placeholder="Your spoken answer transcript will appear here after recording. You can also edit it."
                  className="mt-2 w-full resize-none bg-transparent text-sm text-[#cbd5e1] outline-none disabled:opacity-50"
                />
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (recorderState === "recording") stopRecording();
                    else startRecording();
                  }}
                  disabled={recorderState === "processing" || isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#334155] px-4 py-3 text-sm text-[#cbd5e1] hover:border-[#22d3ee] disabled:opacity-50"
                >
                  {recorderState === "recording" ? (
                    <span className="relative inline-flex h-3 w-3 items-center justify-center">
                      <span className="recording-pulse absolute inline-flex h-3 w-3 rounded-full bg-[#ef4444]" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ef4444]" />
                    </span>
                  ) : null}
                  {recorderState === "recording"
                    ? "Recording... Click to stop"
                    : recorderState === "processing"
                      ? "Transcribing..."
                      : "🎙️ Record Voice"}
                </button>
              </div>
            </>
          )}

          {/* ── Action buttons ── */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleSubmitAnswer()}
              disabled={!canSubmit}
              className="btn-primary sm:min-w-48 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner-sm" />
                  Submitting...
                </>
              ) : isLastQuestion ? (
                "Submit Final Answer"
              ) : (
                "Submit & Next"
              )}
            </button>
            {!isLastQuestion ? (
              <button
                type="button"
                onClick={() => handleEndInterview()}
                disabled={!canSubmit}
                className="rounded-xl border border-[#6366f1] px-4 py-3 text-sm text-[#c7d2fe] hover:bg-[#6366f1]/10 disabled:opacity-40"
              >
                End Interview Early
              </button>
            ) : null}
          </div>

          {permissionDenied ? (
            <div className="mt-4 rounded-xl border border-[#7f1d1d] bg-[#1f1012] p-4 text-sm text-[#fecaca]">
              <p>Microphone access is blocked. Switch to <strong>Text Mode</strong> or retry permission.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setInputMode("text"); setPermissionDenied(false); setError(null); }}
                  className="rounded-lg border border-[#6366f1] px-3 py-2 text-xs text-[#c7d2fe] hover:bg-[#6366f1]/10"
                >
                  Switch to Text Mode
                </button>
                <button
                  type="button"
                  onClick={() => startRecording(true)}
                  className="rounded-lg border border-[#ef4444] px-3 py-2 text-xs text-[#fecaca] hover:bg-[#7f1d1d]/30"
                >
                  Retry permission
                </button>
              </div>
            </div>
          ) : null}

          {/* ── Feedback panel ── */}
          {feedback ? (
            <div className="mt-6 rounded-xl border border-[#1f2937] bg-[#0b1220] p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-[#67e8f9]">Latest AI Feedback</p>
              <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">{feedback}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[#3f1d1d] bg-[#1f1012] p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#fca5a5]">Mistake Identified</p>
                  <p className="mt-1 text-sm text-[#fecaca]">{mistakeExplanation}</p>
                </div>
                <div className="rounded-lg border border-[#1e3a8a] bg-[#0c1730] p-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-[#93c5fd]">Correct Concept</p>
                  <p className="mt-1 text-sm text-[#bfdbfe]">{correctConcept}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Error display ── */}
          {error && !permissionDenied ? (
            <div className="mt-4 rounded-xl border border-[#7f1d1d] bg-[#1f1012] px-4 py-3 text-sm text-[#fecaca]">
              <p>{error}</p>
              {retryAction ? (
                <button
                  type="button"
                  onClick={() => {
                    if (retryAction === "submit") handleSubmitAnswer(true);
                    if (retryAction === "record") startRecording(true);
                    if (retryAction === "transcribe" && lastAudioBlob) handleTranscribe(lastAudioBlob);
                    if (retryAction === "end") handleEndInterview();
                  }}
                  className="mt-3 rounded-lg border border-[#ef4444] px-3 py-2 text-xs hover:bg-[#7f1d1d]/30"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ── Sidebar: Live Scores ── */}
        <aside className="glass-card p-6">
          <h2 className="text-lg font-medium text-[#f8fafc]">Live Dashboard</h2>
          <div className="mt-4 space-y-4">
            {[
              { label: "Communication", value: liveScores.communication, color: "#6366f1" },
              { label: "Technical Depth", value: liveScores.technical_depth, color: "#8b5cf6" },
              { label: "Confidence", value: liveScores.confidence, color: "#22d3ee" },
              { label: "Fluency", value: liveSpeakingScores.fluency, color: "#10b981" },
              { label: "Clarity", value: liveSpeakingScores.clarity, color: "#f59e0b" },
              { label: "Filler Control", value: liveSpeakingScores.fillers, color: "#ec4899" },
            ].map((score) => (
              <div key={score.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-[#94a3b8]">
                  <span>{score.label}</span>
                  <span className="font-medium text-[#f8fafc]">{score.value}/10</span>
                </div>
                <div className="h-2 rounded-full bg-[#1e293b]">
                  <div
                    className="bar-fill h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, score.value * 10))}%`,
                      background: `linear-gradient(90deg, ${score.color}, ${score.color}99)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-2 border-t border-[#1e293b] pt-4 text-xs text-[#64748b]">
            <div className="flex justify-between">
              <span>Progress</span>
              <span className="text-[#cbd5e1]">{questionNumber} / {totalQuestions}</span>
            </div>
            <div className="flex justify-between">
              <span>Answered</span>
              <span className="text-[#cbd5e1]">{history.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode</span>
              <span className="text-[#cbd5e1]">{interviewMode}</span>
            </div>
            <div className="flex justify-between">
              <span>Input</span>
              <span className="text-[#cbd5e1]">{inputMode === "text" ? "Text" : "Voice"}</span>
            </div>
          </div>
        </aside>
      </section>

      {/* ── Toast ── */}
      {toastMessage ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-[#7f1d1d] bg-[#1f1012] px-4 py-3 text-sm text-[#fecaca] shadow-2xl animate-fade-in">
          <p>{toastMessage}</p>
        </div>
      ) : null}
    </main>
  );
}
