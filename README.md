# PaperWise 📚🔬

PaperWise is an advanced, AI-powered academic research assistant and literature synthesis tool. Built with a FastAPI backend and a Next.js frontend, it helps researchers, students, and academics upload PDF research papers to instantly parse metadata, detect research gaps, compare papers side-by-side, generate literature reviews, and perform semantic search/chat via Retrieval-Augmented Generation (RAG).

---

## 🌟 Key Features

* **Automatic Literature Review:** Synthesizes multiple papers simultaneously into structured surveys, mapping methodology trends, research divergences, and lineage.
* **Semantic RAG Chat:** Ask questions and chat directly with uploaded research papers using context-aware vector retrieval.
* **Side-by-Side Comparison:** Compare two papers side-by-side, comparing their methodologies, contributions, and gaps.
* **Robust PDF Parsing:** Extract sections, titles, authors, abstracts, page counts, and metadata from academic PDFs.
* **Supabase Cloud Sync:** Securely syncs papers and user profiles to a Supabase database with seamless local disk fallbacks.
* **Gemini API Key Rotation:** Features an automatic key rotation failover system using secondary Gemini keys to prevent rate limits (`429` quota errors).
* **Local Embedding Fallback:** Falls back to running SentenceTransformers locally if API services are unavailable or local embeddings are preferred.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** Next.js (App Router, TypeScript)
* **Styling:** Tailwind CSS (Modern Dark Mode, glassmorphism UI)
* **Icons:** Lucide React

### Backend
* **API Framework:** FastAPI (Python)
* **Vector Store:** FAISS (Facebook AI Similarity Search)
* **Embeddings:** Gemini API (`models/gemini-embedding-001`) or Local `all-MiniLM-L6-v2` (via SentenceTransformers)
* **LLM Engine:** Gemini API (`gemini-2.5-flash` via OpenAI-compatible endpoints)
* **Database Client:** Supabase REST Client

---

## 🚀 Setup & Installation

### Prerequisites
* **Python** 3.10+
* **Node.js** 18+ & npm/yarn/pnpm

---

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell)
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory:
   ```env
   # LLM Configurations (Optional: local mock fallbacks are used if not provided)
   GEMINI_API_KEY=your_primary_gemini_key_here
   GEMINI_API_KEY_SECONDARY=your_secondary_gemini_key_here

   # Server Settings
   PORT=8000
   HOST=127.0.0.1
   USE_LOCAL_EMBEDDINGS=true  # Set to false to use Gemini API embeddings

   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_service_role_key_here
   ```
5. Run the server:
   ```bash
   python main.py
   ```
   The backend will run on `http://127.0.0.1:8000`.

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🗄️ Database Setup (Supabase)

To enable database synchronization and user authentication, set up a Supabase project and execute the following SQL schema in your Supabase **SQL Editor** to create the `papers` table:

```sql
-- Create the papers table
CREATE TABLE papers (
    id TEXT PRIMARY KEY,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) if required
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- Allow public read access (or restrict to authenticated users)
CREATE POLICY "Allow public read access" ON papers FOR SELECT USING (true);
CREATE POLICY "Allow service role inserts" ON papers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role deletes" ON papers FOR DELETE USING (true);
```

---

## 🌐 Production Deployment

### Backend (Deployed on Render)
1. Set up a Web Service on Render.
2. Link your GitHub repository.
3. Configure the following environment variables:
   * `GEMINI_API_KEY`
   * `GEMINI_API_KEY_SECONDARY`
   * `SUPABASE_URL`
   * `SUPABASE_KEY`
   * `USE_LOCAL_EMBEDDINGS` = `false` *(Recommended for Render Free tier to avoid memory crashes)*
4. Set the **Build Command** to: `pip install -r requirements.txt`
5. Set the **Start Command** to: `python main.py`

### Frontend (Deployed on Vercel)
1. Set up a new project on Vercel linked to your repository.
2. Configure the environment variables:
   * `NEXT_PUBLIC_API_URL` = `https://your-backend-name.onrender.com`
   * `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_supabase_anon_key`
3. Click **Deploy**. *(Note: If you add environment variables later, you must trigger a redeployment on Vercel so they are baked in at build time)*
