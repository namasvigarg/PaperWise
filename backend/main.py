import os
import uuid
import json
import shutil
import urllib.parse
import hashlib
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
from dotenv import load_dotenv

# Local imports
from parser import AcademicPDFParser
from rag import RAGEngine
from arxiv_service import ArxivService

# Load environment variables
load_dotenv()

app = FastAPI(title="PaperWise API", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories for persistence
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
PAPERS_DIR = os.path.join(DATA_DIR, "papers")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(PAPERS_DIR, exist_ok=True)

# In-memory store for active RAG engines
rag_engines: Dict[str, RAGEngine] = {}

class ChatRequest(BaseModel):
    paper_id: str
    message: str
    openai_key: Optional[str] = None

class CompareRequest(BaseModel):
    paper_id_1: str
    paper_id_2: str
    openai_key: Optional[str] = None

class LitReviewRequest(BaseModel):
    paper_ids: List[str]
    openai_key: Optional[str] = None

class ConceptRequest(BaseModel):
    paper_id: str
    concept: str
    openai_key: Optional[str] = None

def get_openai_client(user_key: Optional[str] = None) -> Optional[openai.OpenAI]:
    """
    Returns an initialized client pointing to either Gemini or OpenAI endpoints.
    """
    # 1. Check if Gemini API is configured
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
        return openai.OpenAI(
            api_key=gemini_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        
    # 2. Check OpenAI API configurations
    api_key = user_key or os.getenv("OPENAI_API_KEY")
    if api_key:
        return openai.OpenAI(api_key=api_key)
    return None

def call_llm(prompt: str, system_prompt: str = "You are a helpful AI research assistant.", user_key: Optional[str] = None) -> str:
    """
    Utility helper to request completions from Gemini or OpenAI, with a mock fallback if no API key is set.
    """
    client = get_openai_client(user_key)
    if client:
        try:
            # Route to Gemini model name if Gemini client config is loaded
            is_gemini = bool(os.getenv("GEMINI_API_KEY"))
            model_name = "gemini-2.5-flash" if is_gemini else "gpt-4o-mini"
            
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content
        except Exception as e:
            provider = "Gemini" if os.getenv("GEMINI_API_KEY") else "OpenAI"
            return f"Error contacting {provider} API: {str(e)}"
    
    # Fallback/Mock LLM implementation for demo purposes when no API key exists
    return mock_llm_fallback(prompt)

def mock_llm_fallback(prompt: str) -> str:
    """
    Generates rule-based mock responses for demo compatibility.
    """
    prompt_lower = prompt.lower()
    if "summar" in prompt_lower or "tldr" in prompt_lower:
        return """### TL;DR
This paper introduces an innovative methodology to address current limitations in state-of-the-art representations.

### Executive Summary
The authors present a detailed framework that leverages contextual information to optimize training speed and generalization metrics. By conducting extensive evaluations against industry standard datasets, they demonstrate a 15% increase in baseline performance metrics.

### Key Contributions
* Formulates a robust architectural workflow that optimizes training pipelines.
* Validates hypothesis on multi-modal representation frameworks.
* Releases source code and benchmarks to the open-source community.

### Limitations & Future Work
* Evaluation was conducted on medium-scale datasets only; future studies should scale testing parameters.
* High dependency on hyperparameter tuning remains.
* Future work proposes to incorporate reinforcement learning loops."""
    
    if "compare" in prompt_lower:
        return """### Paper Comparison Analysis

| Dimension | Paper A | Paper B |
| :--- | :--- | :--- |
| **Primary Focus** | Optimization of neural attention blocks | Representation learning in sparse graphs |
| **Dataset Used** | CIFAR-100, ImageNet | OGB-LSC, CiteSeer |
| **Accuracy / Score**| 89.2% Top-1 Accuracy | 92.5% ROC-AUC |
| **Key Advantage** | High inference speedups | Superior handling of sparse relations |
| **Limitations** | Expensive training phases | Scalability issues on giant dynamic graphs |
"""

    if "literature review" in prompt_lower:
        return """# Joint Literature Review Report

## Executive Summary
This synthesis covers the selected research works on neural architectures and optimization methods. The studies collectively present methods for increasing representation quality and reducing parameters.

## Common Themes
1. **Model Parameter Reductions**: Almost all reviewed papers focus heavily on reducing the parameters required for robust representation.
2. **Context-Aware Embeddings**: Incorporating deep relational links within vector indices is a recurring methodology.

## Research Gaps
* None of the analyzed architectures fully account for dynamic real-time data streaming shifts.
* High hardware requirements remain a significant barrier to mainstream application.
"""

    # Chat RAG responses - try to summarize the context
    if "context:" in prompt_lower:
        # Extract context if present to pretend RAG works
        return "Based on the retrieved context, the paper discusses key mechanisms and experimental parameters. Specifically, on **Page 2** they show high performance, and in **Section 4.1** they discuss parameters. (Mock Citation: [Page 2, Section: Introduction])"
        
    return "This is a local fallback response. Set your `OPENAI_API_KEY` in the environment variables to activate full LLM reasoning capabilities."


def get_or_create_rag_engine(paper_id: str, paper_data: Dict[str, Any], openai_key: Optional[str] = None) -> RAGEngine:
    """
    Initializes or retrieves the RAGEngine for a paper.
    """
    if paper_id in rag_engines:
        return rag_engines[paper_id]
        
    # Get client pointing to either Gemini or OpenAI
    client = get_openai_client(openai_key)
    engine = RAGEngine(api_client=client)
    engine.chunk_paper(paper_data)
    engine.compute_embeddings()
    rag_engines[paper_id] = engine
    return engine


@app.get("/api/papers")
def list_papers():
    """
    Retrieves metadata of all uploaded papers.
    """
    papers = []
    for filename in os.listdir(PAPERS_DIR):
        if filename.endswith(".json"):
            paper_path = os.path.join(PAPERS_DIR, filename)
            try:
                with open(paper_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    papers.append({
                        "id": data.get("id"),
                        "title": data.get("metadata", {}).get("title", "Unknown"),
                        "authors": data.get("metadata", {}).get("authors", "Unknown"),
                        "abstract": data.get("metadata", {}).get("abstract", "No abstract"),
                        "page_count": data.get("page_count", 0),
                        "upload_time": data.get("upload_time", "")
                    })
            except Exception as e:
                print(f"Error loading {filename}: {e}")
    return papers


@app.get("/api/papers/{paper_id}")
def get_paper_details(paper_id: str):
    """
    Retrieves full details of a specific paper including sections.
    """
    json_path = os.path.join(PAPERS_DIR, f"{paper_id}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Paper not found.")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            paper_data = json.load(f)
            return paper_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading paper data: {str(e)}")


@app.delete("/api/papers/{paper_id}")
def delete_paper(paper_id: str):
    """
    Deletes a paper, its parsed metadata, and associated caches.
    """
    json_path = os.path.join(PAPERS_DIR, f"{paper_id}.json")
    pdf_path = os.path.join(UPLOADS_DIR, f"{paper_id}.pdf")
    summary_path = os.path.join(PAPERS_DIR, f"{paper_id}_summary.txt")
    gaps_path = os.path.join(PAPERS_DIR, f"{paper_id}_gaps.txt")
    
    deleted = False
    if os.path.exists(json_path):
        os.remove(json_path)
        deleted = True
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
        deleted = True
        
    if os.path.exists(summary_path):
        os.remove(summary_path)
    if os.path.exists(gaps_path):
        os.remove(gaps_path)
        
    # Clean compare caches
    for filename in os.listdir(PAPERS_DIR):
        if filename.startswith("compare_") and paper_id in filename:
            try:
                os.remove(os.path.join(PAPERS_DIR, filename))
            except Exception as e:
                print(f"Error removing cached compare file {filename}: {e}")
                
    if paper_id in rag_engines:
        del rag_engines[paper_id]
        
    if not deleted:
        raise HTTPException(status_code=404, detail="Paper not found.")
        
    return {"message": "Paper and associated caches deleted successfully."}


@app.post("/api/upload")
async def upload_paper(file: UploadFile = File(...), openai_key: Optional[str] = Form(None)):
    """
    Uploads a PDF, parses metadata and sections, and caches it.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    paper_id = str(uuid.uuid4())
    pdf_filename = f"{paper_id}.pdf"
    pdf_path = os.path.join(UPLOADS_DIR, pdf_filename)
    
    # Save the file
    try:
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save PDF: {str(e)}")

    # Parse the PDF
    try:
        parser = AcademicPDFParser(pdf_path)
        parsed_data = parser.parse()
    except Exception as e:
        # Cleanup
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")
        
    # Enrich details
    parsed_data["id"] = paper_id
    parsed_data["pdf_path"] = pdf_path
    
    import datetime
    parsed_data["upload_time"] = datetime.datetime.now().isoformat()
    
    # Save metadata as JSON
    json_path = os.path.join(PAPERS_DIR, f"{paper_id}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(parsed_data, f, ensure_ascii=False, indent=2)
        
    # Pre-index RAG engine
    try:
        get_or_create_rag_engine(paper_id, parsed_data, openai_key)
    except Exception as e:
        print(f"RAG Indexing error on upload: {e}")
        
    return {
        "id": paper_id,
        "title": parsed_data["metadata"]["title"],
        "authors": parsed_data["metadata"]["authors"],
        "abstract": parsed_data["metadata"]["abstract"],
        "page_count": parsed_data["page_count"]
    }


@app.post("/api/summarize")
def summarize_paper(request: ChatRequest):
    """
    Generates structured summaries of a paper.
    """
    json_path = os.path.join(PAPERS_DIR, f"{request.paper_id}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Paper not found.")
        
    # Check cache first
    summary_cache_path = os.path.join(PAPERS_DIR, f"{request.paper_id}_summary.txt")
    if os.path.exists(summary_cache_path):
        try:
            with open(summary_cache_path, "r", encoding="utf-8") as f:
                return {"summary": f.read()}
        except Exception as e:
            print(f"Error reading summary cache: {e}")

    with open(json_path, "r", encoding="utf-8") as f:
        paper_data = json.load(f)
        
    title = paper_data["metadata"]["title"]
    abstract = paper_data["metadata"]["abstract"]
    
    # Compile top sections text to summarize
    text_content = ""
    for sec, txt in list(paper_data["sections"].items())[:4]:
        text_content += f"## {sec}\n{txt[:1500]}\n\n"
        
    prompt = f"""Generate a high-quality summary of the following research paper.
Title: {title}
Abstract: {abstract}

Sample Text from Paper:
{text_content}

Your response must be formatted in clear Markdown.
CRITICAL: Do NOT include any introductory or concluding conversational filler (e.g., "Sure, here is the summary...", "I hope this helps"). Start immediately with the first heading.
Keep the text under each heading extremely concise, direct, and to the point, avoiding unnecessary wordiness.

Markdown structure:
1. **TL;DR**: 2-3 lines summarizing the core achievement.
2. **Executive Summary**: A concise paragraph overview.
3. **Key Contributions**: Bullet points detailing main advances.
4. **Limitations & Future Work**: Key challenges and directions.
"""
    
    summary = call_llm(prompt, system_prompt="You are a research paper analysis AI. Provide crisp academic summaries.", user_key=request.openai_key)
    
    # Save to cache
    try:
        with open(summary_cache_path, "w", encoding="utf-8") as f:
            f.write(summary)
    except Exception as e:
        print(f"Error writing summary cache: {e}")

    return {"summary": summary}


@app.post("/api/chat")
def chat_with_paper(request: ChatRequest):
    """
    RAG chat endpoint returning answer + exact retrieved source chunks.
    """
    json_path = os.path.join(PAPERS_DIR, f"{request.paper_id}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Paper not found.")
        
    with open(json_path, "r", encoding="utf-8") as f:
        paper_data = json.load(f)
        
    engine = get_or_create_rag_engine(request.paper_id, paper_data, request.openai_key)
    
    # Retrieve top chunks
    chunks = engine.retrieve(request.message, top_k=5)
    
    # Format and call LLM
    prompt = engine.format_prompt(request.message, chunks)
    answer = call_llm(prompt, system_prompt="You are an expert academic chatbot. Be precise and cite source pages.", user_key=request.openai_key)
    
    return {
        "answer": answer,
        "sources": [
            {
                "page_num": c["page_num"],
                "section": c["section"],
                "text": c["text"],
                "score": c.get("score", 0.0)
            } for c in chunks
        ]
    }


@app.post("/api/compare")
def compare_papers(request: CompareRequest):
    """
    Compares two papers side-by-side.
    """
    json_path1 = os.path.join(PAPERS_DIR, f"{request.paper_id_1}.json")
    json_path2 = os.path.join(PAPERS_DIR, f"{request.paper_id_2}.json")
    
    if not os.path.exists(json_path1) or not os.path.exists(json_path2):
        raise HTTPException(status_code=404, detail="One or both papers not found.")
        
    # Check cache first
    ids = sorted([request.paper_id_1, request.paper_id_2])
    compare_cache_path = os.path.join(PAPERS_DIR, f"compare_{ids[0]}_{ids[1]}.txt")
    if os.path.exists(compare_cache_path):
        try:
            with open(compare_cache_path, "r", encoding="utf-8") as f:
                return {"comparison": f.read()}
        except Exception as e:
            print(f"Error reading compare cache: {e}")

    with open(json_path1, "r", encoding="utf-8") as f:
        p1 = json.load(f)
    with open(json_path2, "r", encoding="utf-8") as f:
        p2 = json.load(f)
        
    prompt = f"""Compare the following two research papers side-by-side.
    
Paper A:
Title: {p1["metadata"]["title"]}
Authors: {p1["metadata"]["authors"]}
Abstract: {p1["metadata"]["abstract"]}

Paper B:
Title: {p2["metadata"]["title"]}
Authors: {p2["metadata"]["authors"]}
Abstract: {p2["metadata"]["abstract"]}

Create a Markdown comparison report.
CRITICAL: Do NOT include any introductory or concluding conversational text. Start immediately with the first heading.
Keep the text under each heading extremely concise, direct, and to the point, avoiding unnecessary wordiness.

Include:
1. **Comparison Table**: A summary comparison table comparing dimensions such as: Methodology, Main Dataset, Accuracy/Performance metrics, Primary Strengths, Limitations.
2. **Narrative Analysis**: A brief, concise narrative analysis highlighting which paper to choose for which research scenario.
"""

    comparison = call_llm(prompt, system_prompt="You are a research review panelist. Compare academic papers objectively.", user_key=request.openai_key)
    
    # Save to cache
    try:
        with open(compare_cache_path, "w", encoding="utf-8") as f:
            f.write(comparison)
    except Exception as e:
        print(f"Error writing compare cache: {e}")

    return {"comparison": comparison}


@app.post("/api/recommend")
def recommend_related_papers(request: ChatRequest):
    """
    Fetches related papers from arXiv.
    """
    json_path = os.path.join(PAPERS_DIR, f"{request.paper_id}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Paper not found.")
        
    with open(json_path, "r", encoding="utf-8") as f:
        paper_data = json.load(f)
        
    title = paper_data["metadata"]["title"]
    
    service = ArxivService()
    recommendations = service.search_similar_papers(title, max_results=6)
    
    return {"recommendations": recommendations}


@app.post("/api/gap-detection")
def detect_research_gaps(request: ChatRequest):
    """
    Analyzes the limitations and future work to output research gaps.
    """
    json_path = os.path.join(PAPERS_DIR, f"{request.paper_id}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Paper not found.")
        
    # Check cache first
    gaps_cache_path = os.path.join(PAPERS_DIR, f"{request.paper_id}_gaps.txt")
    if os.path.exists(gaps_cache_path):
        try:
            with open(gaps_cache_path, "r", encoding="utf-8") as f:
                return {"gaps": f.read()}
        except Exception as e:
            print(f"Error reading gaps cache: {e}")

    with open(json_path, "r", encoding="utf-8") as f:
        paper_data = json.load(f)
        
    # Compile text about limitations and future work
    target_sections = []
    for key, text in paper_data["sections"].items():
        if any(w in key.lower() for w in ["limitation", "future work", "discussion", "conclusion"]):
            target_sections.append(f"## {key}\n{text[:2000]}")
            
    target_text = "\n\n".join(target_sections) if target_sections else paper_data["metadata"]["abstract"]
    
    prompt = f"""Based on the following excerpts (limitations, discussions) from the paper:
"{paper_data["metadata"]["title"]}"

Excerpts:
{target_text}

Generate a "Research Gap & Future Directions Analysis" report.
CRITICAL: Do NOT include any introductory or concluding conversational text. Start immediately with the first heading.
Keep the text under each heading extremely concise, direct, and to the point, avoiding unnecessary wordiness.

Markdown structure:
1. **Identified Limitations**: Critical analysis of what this paper fails to address or constraints on its results.
2. **Key Open Questions**: Unresolved issues raised in the text.
3. **Proposed Experiment Directions**: Synthesize 3 concrete future experiment designs or architectural changes that a master's/PhD student could implement to extend this research.
"""

    gaps = call_llm(prompt, system_prompt="You are a PhD advisor helping students find research gaps in published literature.", user_key=request.openai_key)
    
    # Save to cache
    try:
        with open(gaps_cache_path, "w", encoding="utf-8") as f:
            f.write(gaps)
    except Exception as e:
        print(f"Error writing gaps cache: {e}")

    return {"gaps": gaps}


@app.post("/api/literature-review")
def generate_literature_review(request: LitReviewRequest):
    """
    Compiles a structured literature review of multiple papers.
    """
    # Check cache first
    ids = sorted(request.paper_ids)
    ids_hash = hashlib.md5("".join(ids).encode('utf-8')).hexdigest()
    lit_cache_path = os.path.join(PAPERS_DIR, f"lit_{ids_hash}.txt")
    if os.path.exists(lit_cache_path):
        try:
            with open(lit_cache_path, "r", encoding="utf-8") as f:
                return {"review": f.read()}
        except Exception as e:
            print(f"Error reading lit review cache: {e}")

    papers_summary = []
    for pid in request.paper_ids:
        json_path = os.path.join(PAPERS_DIR, f"{pid}.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                papers_summary.append(
                    f"Title: {data['metadata']['title']}\nAbstract: {data['metadata']['abstract']}\n"
                )
                
    if not papers_summary:
        raise HTTPException(status_code=400, detail="No valid papers found to review.")
        
    prompt = f"""Generate a comprehensive academic Literature Review based on the following {len(papers_summary)} papers:

{chr(10).join(papers_summary)}

Your output must be a professional academic synthesis in Markdown.
CRITICAL: Do NOT include any introductory or concluding conversational text. Start immediately with the first heading.
Keep the text under each heading extremely concise, direct, and to the point, avoiding unnecessary wordiness.

Markdown structure:
1. **Executive Summary**: High-level synthesis.
2. **Common Methodology Trends**: What methods, architectures, or frameworks do these papers share?
3. **Key Research Divergences**: Where do their findings or approaches contrast?
4. **Synthesized Research Gaps**: What topics or problems are neglected by all of them combined?
5. **Timeline / Development Flow**: Organize these papers into a conceptual evolution lineage.
"""

    review = call_llm(prompt, system_prompt="You are an expert academic reviewer writing a state-of-the-art literature review survey.", user_key=request.openai_key)
    
    # Save to cache
    try:
        with open(lit_cache_path, "w", encoding="utf-8") as f:
            f.write(review)
    except Exception as e:
        print(f"Error writing lit review cache: {e}")

    return {"review": review}


@app.post("/api/explain-concept")
def explain_concept(request: ConceptRequest):
    """
    Explains a concept/term using the paper as context.
    """
    json_path = os.path.join(PAPERS_DIR, f"{request.paper_id}.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Paper not found.")
        
    with open(json_path, "r", encoding="utf-8") as f:
        paper_data = json.load(f)
        
    engine = get_or_create_rag_engine(request.paper_id, paper_data, request.openai_key)
    
    # Retrieve top context matches for the concept term
    chunks = engine.retrieve(request.concept, top_k=3)
    context_str = "\n\n".join([f"Page {c['page_num']}: {c['text'][:1000]}" for c in chunks])
    
    prompt = f"""Explain the concept: "{request.concept}"
In the context of the paper: "{paper_data['metadata']['title']}"

Here are relevant excerpts from the paper:
{context_str}

Provide a beginner-friendly explanation. Break down the mathematical/technical details into intuitive metaphors, then explain exactly how it is applied or discussed in this paper.
"""

    explanation = call_llm(prompt, system_prompt="You are an expert technical communicator who explains complex AI topics to beginners.", user_key=request.openai_key)
    return {"explanation": explanation}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    # Disable reload in production to prevent high CPU usage and port scan timeouts
    reload_mode = os.getenv("DEV_MODE", "false").lower() == "true"
    uvicorn.run("main:app", host=host, port=port, reload=reload_mode)
