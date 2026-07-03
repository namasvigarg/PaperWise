# PaperWise

PaperWise is an AI-powered research assistant for reading, understanding, and comparing academic papers. Upload a PDF (or pull one straight from arXiv) and get instant summaries, an interactive Q&A chat grounded in the paper's own content, side-by-side paper comparisons, literature review generation, concept explanations, and related-paper recommendations.

**Live demo:** [paperwise-psi.vercel.app](https://paperwise-psi.vercel.app)

## Features

- **PDF Upload & Parsing** — Extracts structured content (sections, references, metadata) from academic PDFs.
- **AI Summarization** — Generates concise summaries of uploaded papers.
- **Chat with a Paper** — Ask natural-language questions about a paper and get answers grounded in its content via a Retrieval-Augmented Generation (RAG) pipeline.
- **Paper Comparison** — Compare two papers side by side.
- **Literature Review Generation** — Synthesize a literature review across multiple uploaded papers.
- **Research Gap Detection** — Surface potential gaps or open questions in a paper's research.
- **Concept Explanation** — Get plain-language explanations of specific concepts/terms found in a paper.
- **Related Paper Recommendations** — Finds similar papers via the arXiv API.
- **User Accounts & Persistence** — Auth and paper storage backed by Supabase.
- **Flexible LLM Backend** — Uses Gemini or OpenAI when an API key is configured, and falls back to local SentenceTransformers-based embeddings/rule-based summarization when no key is provided.

## Tech Stack

**Frontend**
- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase JS client (auth & data)
- Lucide icons

**Backend**
- [FastAPI](https://fastapi.tiangolo.com) (Python)
- PyMuPDF for PDF parsing
- LangChain + Sentence-Transformers for embeddings / RAG
- OpenAI SDK (compatible with OpenAI and Gemini endpoints)
- Supabase (REST) for persistence

**Infra**
- Docker & Docker Compose for local orchestration
- Deployed on Vercel (frontend)

## Project Structure

```
PaperWise/
├── backend/
│   ├── main.py            # FastAPI app & API routes
│   ├── parser.py          # Academic PDF parsing
│   ├── rag.py              # RAG engine (embeddings, retrieval, chat)
│   ├── arxiv_service.py    # arXiv search/recommendation integration
│   ├── supabase_db.py      # Supabase persistence layer
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js routes (auth, chat, compare, lit-review, profile, ...)
│   │   ├── components/     # Shared UI components
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- (Optional) Docker & Docker Compose
- (Optional) An OpenAI or Gemini API key — the app runs locally without one, using local models
- (Optional) A Supabase project — for auth and persistent storage

### 1. Clone the repository

```bash
git clone https://github.com/namasvigarg/PaperWise.git
cd PaperWise
```

### 2. Configure environment variables

Copy the example env file and fill in any keys you want to use:

```bash
cp .env.example .env
```

```env
# Optional: If not provided, the app falls back to local SentenceTransformers
# and rule-based local models for summarization/chat completions.
OPENAI_API_KEY=your_openai_api_key_here

# Backend service configuration
BACKEND_URL=http://localhost:8000
PORT=8000
HOST=127.0.0.1

# Optional: Supabase (for auth & persistence)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_or_anon_key

# Optional: Gemini (used instead of OpenAI if set)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run with Docker Compose (recommended)

```bash
docker-compose up --build
```

- Backend available at `http://localhost:8000`
- Frontend available at `http://localhost:3000`

### 4. Run manually (without Docker)

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in the frontend environment so it can reach the backend.

Then open [http://localhost:3000](http://localhost:3000).

## API Overview

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload and parse a PDF |
| `GET` | `/api/papers` | List all stored papers |
| `GET` | `/api/papers/{paper_id}` | Get a specific paper |
| `DELETE` | `/api/papers/{paper_id}` | Delete a paper |
| `POST` | `/api/summarize` | Generate a summary for a paper |
| `POST` | `/api/chat` | Ask a question about a paper (RAG-based) |
| `POST` | `/api/compare` | Compare two papers |
| `POST` | `/api/recommend` | Get related paper recommendations from arXiv |
| `POST` | `/api/gap-detection` | Detect potential research gaps in a paper |
| `POST` | `/api/literature-review` | Generate a literature review across papers |
| `POST` | `/api/explain-concept` | Explain a specific concept from a paper |

## Deployment

- **Frontend:** Deployable to [Vercel](https://vercel.com) out of the box (Next.js).
- **Backend:** Deployable via the included `Dockerfile`/`docker-compose.yml` to any container host (Render, Railway, Fly.io, a VPS, etc.).

Make sure `NEXT_PUBLIC_API_URL` on the frontend points to your deployed backend URL, and that CORS on the backend is restricted to your production frontend origin before going live.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open a pull request or file an issue.
