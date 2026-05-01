"""
MockMind — AI Interview Simulator Backend (STABLE VERSION)
FastAPI + Groq (safe production-ready MVP)
"""

import io
import json
import os
import tempfile
from pathlib import Path

from dotenv import dotenv_values, load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from PyPDF2 import PdfReader

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = (BACKEND_DIR / ".env").resolve()


def _mask_key(value: str | None) -> str:
    if not value:
        return "(not set)"
    value = value.strip()
    if len(value) <= 11:
        return "****"
    return f"{value[:7]}...{value[-4:]}"


def _load_groq_key_from_backend_env() -> str:
    # Clear inherited value first so stale/system values cannot leak in.
    os.environ.pop("GROQ_API_KEY", None)

    loaded = load_dotenv(dotenv_path=ENV_PATH, override=True)
    env_values = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    file_key = (env_values.get("GROQ_API_KEY") or "").strip()

    # Enforce backend/.env as the only source of truth.
    if file_key:
        os.environ["GROQ_API_KEY"] = file_key
    else:
        os.environ.pop("GROQ_API_KEY", None)

    final_key = (os.getenv("GROQ_API_KEY") or "").strip()
    print(f"[env] dotenv file: {ENV_PATH} (exists={ENV_PATH.exists()}, loaded={loaded})")
    print(f"[env] effective GROQ_API_KEY: {_mask_key(final_key)}")
    return final_key

# ---------------- APP ----------------
app = FastAPI(
    title="MockMind API",
    description="AI Interview Simulator Backend",
    version="1.0.0",
)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
print(f"[cors] allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- GROQ ----------------
def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        print("❌ GROQ_API_KEY missing at runtime")
        return None

    print("✅ GROQ_API_KEY loaded successfully")
    return Groq(api_key=api_key)

client = get_groq_client()

CHAT_MODEL = "llama-3.3-70b-versatile"
WHISPER_MODEL = "whisper-large-v3"


def _require_client():
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY not configured",
        )


# ---------------- SAFE CHAT ----------------
def _chat(messages, temperature=0.7):
    _require_client()
    try:
        res = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=1024,
        )
        return res.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq error: {str(e)}")


# ---------------- SAFE JSON PARSER ----------------
def _parse_json(raw: str):
    try:
        text = raw.strip()

        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])

        return json.loads(text)

    except Exception:
        try:
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1:
                return json.loads(raw[start:end + 1])
        except:
            pass

        return {}


def _score_1_to_10(value, default=5):
    try:
        score = int(value)
    except Exception:
        score = default
    return max(1, min(10, score))


# ---------------- MODELS ----------------
class StartInterviewRequest(BaseModel):
    resume_text: str
    role: str
    company: str
    interview_mode: str = "Full Interview"


class AnswerRequest(BaseModel):
    question: str
    answer: str
    resume_text: str
    role: str
    interview_mode: str = "Full Interview"
    history: list
    question_number: int
    end_interview: bool = False


class FinalReportRequest(BaseModel):
    history: list
    role: str
    interview_mode: str = "Full Interview"
    resume_text: str


# ---------------- 1. PARSE RESUME ----------------
@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF allowed")

    try:
        content = await file.read()
        reader = PdfReader(io.BytesIO(content))
        text = "\n".join([p.extract_text() or "" for p in reader.pages])

        return {"text": text.strip()}

    except Exception as e:
        raise HTTPException(422, str(e))


# ---------------- 2. START INTERVIEW (FIXED STRICT MODE) ----------------
@app.post("/start-interview")
async def start_interview(req: StartInterviewRequest):
    try:
        prompt = f"""
You are a recruiter at {req.company} conducting a {req.interview_mode} for {req.role}.

STRICT MODE CONTROL:

If interview_mode is "HR Round":
- ONLY ask behavioral and HR questions
- DO NOT ask coding, system design, or technical questions
- DO NOT ask about project implementation or technologies
- Focus ONLY on:
  communication, teamwork, leadership, conflict handling, strengths, weaknesses, motivation

If interview_mode is "Technical Round":
- ONLY ask technical questions
- Deep dive into implementation, decisions, trade-offs, debugging

If interview_mode is "Full Interview":
- Mix HR + Technical

If interview_mode is "AIML Interview":
- Ask ML concepts, models, evaluation, deployment

If interview_mode is "Web Dev Interview":
- Ask frontend/backend, APIs, system design

VERY IMPORTANT:
- Follow the selected mode STRICTLY
- DO NOT switch modes
- DO NOT mix HR and technical unless Full Interview

Resume:
{req.resume_text[:1500]}

Ask ONLY ONE opening question.
Keep it natural and conversational.

Return JSON:
{{"question": "..."}}
"""

        raw = _chat([{"role": "system", "content": prompt}], 0.6)

        data = _parse_json(raw)
        q = data.get("question")

        if not q:
            q = "Tell me about yourself."

        return {"question": q}

    except Exception as e:
        print("start-interview error:", e)
        return {"question": "Tell me about yourself."}

# ---------------- 3. ANSWER ----------------
@app.post("/answer")
async def answer(req: AnswerRequest):

    is_last = bool(req.end_interview)

    history = "\n".join(
        [f"Q:{h.get('question')} A:{h.get('answer')}" for h in req.history]
    )

    prompt = f"""
You are a realistic conversational interviewer for role {req.role}.
Interview mode: {req.interview_mode}

STRICT MODE CONTROL:

If interview_mode is "HR Round":
- DO NOT evaluate technical correctness
- Focus only on communication, clarity, confidence, personality
- Ask ONLY HR/behavioral questions
- DO NOT ask coding, tech stack, or implementation questions

If interview_mode is "Technical Round":
- Focus on correctness, depth, and problem-solving
- Ask technical follow-ups

If interview_mode is "Full Interview":
- Mix HR + Technical

IMPORTANT:
- Follow interview mode strictly
- DO NOT switch modes

Resume:
{req.resume_text}

History:
{history}

Current question:
{req.question}

Candidate answer:
{req.answer}

Current question number: {req.question_number}

Evaluate:
1) Content quality
2) Speaking quality (confidence, fluency, clarity)

If weak:
- Explain mistake simply
- Give correct concept

Generate next question based on mode.

If end_interview is true → next_question = null

Return JSON:
{{
  "feedback": "2-4 sentence actionable feedback",
  "mistake_explanation": "...",
  "correct_concept": "...",
  "scores": {{
    "communication": 0,
    "technical_depth": 0,
    "confidence": 0
  }},
  "speaking_scores": {{
    "confidence": 0,
    "fluency": 0,
    "clarity": 0,
    "fillers": 0
  }},
  "next_question": "...",
  "is_last": {str(is_last).lower()}
}}
"""

    raw = _chat([{"role": "system", "content": prompt}], 0.5)

    data = _parse_json(raw)

    data["is_last"] = is_last

    data["feedback"] = data.get("feedback") or "Thanks for your response. Keep answers specific and structured."
    data["mistake_explanation"] = data.get("mistake_explanation") or "No major conceptual mistake detected."
    data["correct_concept"] = data.get("correct_concept") or "Continue strengthening fundamentals with concise examples."

    scores = data.get("scores") or {}
    data["scores"] = {
        "communication": _score_1_to_10(scores.get("communication", 5)),
        "technical_depth": _score_1_to_10(scores.get("technical_depth", 5)),
        "confidence": _score_1_to_10(scores.get("confidence", 5)),
    }
    speaking_scores = data.get("speaking_scores") or {}
    data["speaking_scores"] = {
        "confidence": _score_1_to_10(speaking_scores.get("confidence", data["scores"]["confidence"])),
        "fluency": _score_1_to_10(speaking_scores.get("fluency", 5)),
        "clarity": _score_1_to_10(speaking_scores.get("clarity", 5)),
        "fillers": _score_1_to_10(speaking_scores.get("fillers", 5)),
    }

    if is_last:
        data["next_question"] = None
    elif not data.get("next_question"):
        data["next_question"] = "Can you walk me through a specific project decision you made and why?"

    return data


# ---------------- 4. TRANSCRIBE ----------------
@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    _require_client()

    try:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
        tmp.write(await file.read())
        tmp.close()

        with open(tmp.name, "rb") as f:
            res = client.audio.transcriptions.create(
                model=WHISPER_MODEL,
                file=f,
                response_format="text",
            )

        return {"text": res}

    except Exception as e:
        raise HTTPException(502, str(e))


# ---------------- 5. FINAL REPORT ----------------
@app.post("/final-report")
async def report(req: FinalReportRequest):

    history = "\n".join(
        [f"Q:{h.get('question')} A:{h.get('answer')}" for h in req.history]
    )

    prompt = f"""
Evaluate interview:

Role: {req.role}
Interview mode: {req.interview_mode}
Resume: {req.resume_text}

History:
{history}

Return JSON:
{{
"overall_score": 0,
"grade": "A",
"summary": "...",
"strengths": [],
"weaknesses": [],
"improvement_plan": [],
"category_scores": {{
"communication": 0,
"technical_depth": 0,
"confidence": 0
}},
"hire_chance": 0,
"hire_recommendation": "Hire"
}}
"""

    raw = _chat([{"role": "system", "content": prompt}], 0.4)
    data = _parse_json(raw) or {}
    category_scores = data.get("category_scores") or {}
    data["category_scores"] = {
        "communication": _score_1_to_10(category_scores.get("communication", 5)),
        "technical_depth": _score_1_to_10(category_scores.get("technical_depth", 5)),
        "confidence": _score_1_to_10(category_scores.get("confidence", 5)),
    }
    try:
        hire_chance = int(data.get("hire_chance", 50))
    except Exception:
        hire_chance = 50
    data["hire_chance"] = max(1, min(100, hire_chance))
    data["overall_score"] = int(data.get("overall_score", 60) or 60)
    data["grade"] = data.get("grade") or "B"
    data["summary"] = data.get("summary") or "Interview completed with mixed performance."
    data["strengths"] = data.get("strengths") or []
    data["weaknesses"] = data.get("weaknesses") or []
    data["improvement_plan"] = data.get("improvement_plan") or []
    data["hire_recommendation"] = data.get("hire_recommendation") or "Lean Hire"
    return data


# ---------------- HEALTH ----------------
@app.get("/health")
def health():
    return {
        "status": "ok",
        "groq": client is not None
    }
