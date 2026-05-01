"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

/* ── Types ──────────────────────────────────────────────────────────── */
export interface Scores {
  communication: number;
  technical_depth: number;
  confidence: number;
}

export interface SpeakingScores {
  confidence: number;
  fluency: number;
  clarity: number;
  fillers: number;
}

export interface HistoryEntry {
  question: string;
  answer: string;
  feedback?: string;
  mistake_explanation?: string;
  correct_concept?: string;
  scores?: Scores;
  speaking_scores?: SpeakingScores;
}

export interface FinalReport {
  overall_score: number;
  grade: string;
  summary?: string;
  strengths: string[];
  weaknesses: string[];
  improvement_plan: string[];
  category_scores?: Record<string, number>;
  hire_chance?: number;
  hire_recommendation?: string;
}

export type InputMode = "text" | "voice";

interface InterviewState {
  /* setup */
  role: string;
  company: string;
  interviewMode: string;
  resumeText: string;
  totalQuestions: number;

  /* interview */
  currentQuestion: string;
  questionNumber: number;
  history: HistoryEntry[];
  liveScores: Scores;
  liveSpeakingScores: SpeakingScores;
  isLast: boolean;
  inputMode: InputMode;

  /* report */
  report: FinalReport | null;
}

interface InterviewActions {
  setSetup: (role: string, company: string, interviewMode: string, resumeText: string, totalQuestions: number) => void;
  setFirstQuestion: (question: string) => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  setCurrentQuestion: (q: string) => void;
  setQuestionNumber: (n: number) => void;
  setLiveScores: (s: Scores) => void;
  setLiveSpeakingScores: (s: SpeakingScores) => void;
  setIsLast: (v: boolean) => void;
  setInputMode: (m: InputMode) => void;
  setReport: (r: FinalReport) => void;
  reset: () => void;
}

const initialScores: Scores = { communication: 0, technical_depth: 0, confidence: 0 };
const initialSpeakingScores: SpeakingScores = { confidence: 0, fluency: 0, clarity: 0, fillers: 0 };

const initialState: InterviewState = {
  role: "",
  company: "",
  interviewMode: "Full Interview",
  resumeText: "",
  totalQuestions: 10,
  currentQuestion: "",
  questionNumber: 1,
  history: [],
  liveScores: { ...initialScores },
  liveSpeakingScores: { ...initialSpeakingScores },
  isLast: false,
  inputMode: "text",
  report: null,
};

const STORAGE_KEY = "mockmind_session";

function loadFromStorage(): InterviewState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InterviewState;
    // Basic validation — must have role to be a valid session
    if (parsed.role && parsed.resumeText) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(state: InterviewState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

function clearStorage() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

const InterviewContext = createContext<(InterviewState & InterviewActions) | null>(null);

export function InterviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InterviewState>(() => {
    return loadFromStorage() ?? { ...initialState };
  });

  // Persist to sessionStorage on every state change (skip first render to avoid SSR mismatch)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveToStorage(state);
  }, [state]);

  const setSetup = useCallback((role: string, company: string, interviewMode: string, resumeText: string, totalQuestions: number) => {
    setState((s) => ({ ...s, role, company, interviewMode, resumeText, totalQuestions }));
  }, []);

  const setFirstQuestion = useCallback((question: string) => {
    setState((s) => ({ ...s, currentQuestion: question, questionNumber: 1 }));
  }, []);

  const addHistoryEntry = useCallback((entry: HistoryEntry) => {
    setState((s) => ({ ...s, history: [...s.history, entry] }));
  }, []);

  const setCurrentQuestion = useCallback((q: string) => {
    setState((s) => ({ ...s, currentQuestion: q }));
  }, []);

  const setQuestionNumber = useCallback((n: number) => {
    setState((s) => ({ ...s, questionNumber: n }));
  }, []);

  const setLiveScores = useCallback((scores: Scores) => {
    setState((s) => ({ ...s, liveScores: scores }));
  }, []);

  const setLiveSpeakingScores = useCallback((scores: SpeakingScores) => {
    setState((s) => ({ ...s, liveSpeakingScores: scores }));
  }, []);

  const setIsLast = useCallback((v: boolean) => {
    setState((s) => ({ ...s, isLast: v }));
  }, []);

  const setInputMode = useCallback((m: InputMode) => {
    setState((s) => ({ ...s, inputMode: m }));
  }, []);

  const setReport = useCallback((r: FinalReport) => {
    setState((s) => ({ ...s, report: r }));
  }, []);

  const reset = useCallback(() => {
    clearStorage();
    setState({ ...initialState });
  }, []);

  return (
    <InterviewContext.Provider
      value={{
        ...state,
        setSetup,
        setFirstQuestion,
        addHistoryEntry,
        setCurrentQuestion,
        setQuestionNumber,
        setLiveScores,
        setLiveSpeakingScores,
        setIsLast,
        setInputMode,
        setReport,
        reset,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const ctx = useContext(InterviewContext);
  if (!ctx) throw new Error("useInterview must be used within InterviewProvider");
  return ctx;
}
