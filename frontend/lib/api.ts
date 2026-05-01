"use client";

import type { FinalReport, HistoryEntry } from "@/app/context/InterviewContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) message = String(data.detail);
    } catch {
      // Fall back to status-based message when JSON parsing fails.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function parseResumePdf(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE_URL}/parse-resume`, {
    method: "POST",
    body: form,
  });

  const data = await parseJsonOrThrow<{ text: string }>(response);
  return data.text;
}

export async function startInterview(payload: {
  resumeText: string;
  role: string;
  company: string;
  interviewMode: string;
}): Promise<{ question: string }> {
  const response = await fetch(`${API_BASE_URL}/start-interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_text: payload.resumeText,
      role: payload.role,
      company: payload.company,
      interview_mode: payload.interviewMode,
    }),
  });

  return parseJsonOrThrow<{ question: string }>(response);
}

export async function submitAnswer(payload: {
  question: string;
  answer: string;
  resumeText: string;
  role: string;
  interviewMode: string;
  history: HistoryEntry[];
  questionNumber: number;
  endInterview?: boolean;
}): Promise<{
  feedback: string;
  mistake_explanation: string;
  correct_concept: string;
  scores: {
    communication: number;
    technical_depth: number;
    confidence: number;
  };
  speaking_scores: {
    confidence: number;
    fluency: number;
    clarity: number;
    fillers: number;
  };
  next_question: string | null;
  is_last: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: payload.question,
      answer: payload.answer,
      resume_text: payload.resumeText,
      role: payload.role,
      interview_mode: payload.interviewMode,
      history: payload.history,
      question_number: payload.questionNumber,
      end_interview: Boolean(payload.endInterview),
    }),
  });

  return parseJsonOrThrow(response);
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", new File([audioBlob], "answer.webm", { type: audioBlob.type || "audio/webm" }));

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: "POST",
    body: form,
  });

  const data = await parseJsonOrThrow<{ text: string }>(response);
  return data.text;
}

export async function fetchFinalReport(payload: {
  history: HistoryEntry[];
  role: string;
  interviewMode: string;
  resumeText: string;
}): Promise<FinalReport> {
  const response = await fetch(`${API_BASE_URL}/final-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      history: payload.history,
      role: payload.role,
      interview_mode: payload.interviewMode,
      resume_text: payload.resumeText,
    }),
  });

  return parseJsonOrThrow<FinalReport>(response);
}
