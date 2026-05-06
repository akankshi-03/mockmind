# 🎙️ MockMind — AI Interview Simulator

> Practice real interviews with AI feedback. Get scored on communication, technical depth, and confidence — then receive a personalized improvement plan.

🔗 **Live App:** [mockmind-azure.vercel.app](https://mockmind-azure.vercel.app)

---

## ✨ Features

- 🎙️ **Voice & Text** — Answer via microphone (Whisper transcription) or type directly
- 🧠 **AI Evaluation** — Real-time feedback on every answer using Llama 3
- 📊 **Detailed Report** — Scores, strengths, weaknesses, improvement plan after each session
- 🎯 **Multiple Modes** — HR Round, Technical, Full Interview, AI/ML, Web Dev
- 📄 **Resume-Based Questions** — Upload PDF or paste resume text
- 📈 **Live Scoring** — Communication, Technical Depth, Confidence tracked in real-time

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Python FastAPI |
| AI Chat | Groq API — Llama 3.3 70B |
| Speech-to-Text | Groq Whisper Large V3 |
| Deployment (Frontend) | Vercel |
| Deployment (Backend) | Render |

---

## 🚀 Run Locally

### Prerequisites
- Node.js 18+
- Python 3.10+
- Groq API Key → [console.groq.com](https://console.groq.com)

### 1. Clone the repo
```bash
git clone https://github.com/akankshi-03/mockmind.git
cd mockmind
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_groq_api_key_here" > .env

# Start backend
uvicorn main:app --reload
# Running at http://localhost:8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local

# Start frontend
npm run dev
# Running at http://localhost:3000
```

### 4. Open App
```
http://localhost:3000
```

---

## 🌐 Deploy Your Own

### Backend → Render
1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo → select `backend` folder
4. Add environment variables:
   ```
   GROQ_API_KEY=your_key_here
   ALLOWED_ORIGINS=*
   ```
5. Deploy!

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect your GitHub repo → select `frontend` folder
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-render-url.onrender.com
   ```
4. Deploy!

---

## 📁 Project Structure

```
mockmind/
├── frontend/               # Next.js App
│   ├── src/
│   │   ├── app/            # Pages & layouts
│   │   ├── components/     # UI components
│   │   └── context/        # Interview state
│   ├── .env.local          # Local env vars
│   └── package.json
│
├── backend/                # FastAPI Server
│   ├── main.py             # All API endpoints
│   ├── requirements.txt
│   └── .env                # Groq API key
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/parse-resume` | Extract text from PDF |
| POST | `/start-interview` | Get first AI question |
| POST | `/answer` | Submit answer, get feedback + next question |
| POST | `/transcribe` | Audio → text via Whisper |
| POST | `/final-report` | Generate full performance report |
| GET | `/health` | Check server status |

---

## 🎯 Interview Modes

| Mode | Focus |
|------|-------|
| HR Round | Behavioral, communication, personality |
| Technical Round | DSA, system design, problem solving |
| Full Interview | Mix of HR + Technical |
| AI/ML Interview | ML concepts, models, evaluation |
| Web Dev Interview | Frontend, backend, APIs, system design |

---

## 👩‍💻 Built By

**Akankshi** — [@akankshi-03](https://github.com/akankshi-03)

---

## 📄 License

MIT License — free to use and modify!
