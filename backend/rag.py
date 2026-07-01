import os
import numpy as np
from typing import List, Dict, Any, Optional
import openai

class SimpleRecursiveCharacterTextSplitter:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200, separators: list = None):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", " ", ""]

    def split_text(self, text: str) -> List[str]:
        def _split(text_to_split, separators):
            if len(text_to_split) <= self.chunk_size:
                return [text_to_split]
            
            for sep in separators:
                if sep == "":
                    break
                splits = text_to_split.split(sep)
                if len(splits) > 1:
                    current_chunk = ""
                    results = []
                    for s in splits:
                        # Check if adding this split exceeds chunk_size
                        if len(current_chunk) + (len(sep) if current_chunk else 0) + len(s) > self.chunk_size:
                            if current_chunk:
                                results.append(current_chunk)
                                # Overlap from the end of current_chunk
                                overlap_start = max(0, len(current_chunk) - self.chunk_overlap)
                                current_chunk = current_chunk[overlap_start:]
                            
                            if len(s) > self.chunk_size:
                                next_seps = separators[separators.index(sep)+1:]
                                results.extend(_split(s, next_seps))
                                current_chunk = ""
                            else:
                                current_chunk = s
                        else:
                            if current_chunk:
                                current_chunk += sep + s
                            else:
                                current_chunk = s
                    if current_chunk:
                        results.append(current_chunk)
                    return results
            
            return [text_to_split[i:i+self.chunk_size] for i in range(0, len(text_to_split), self.chunk_size - self.chunk_overlap)]

        return _split(text, self.separators)

class RAGEngine:
    def __init__(self, use_openai: bool = False, openai_api_key: Optional[str] = None, api_client: Optional[openai.OpenAI] = None):
        self.client = api_client
        self.local_model = None
        self.local_model_name = "all-MiniLM-L6-v2"
        
        # If client is not passed but use_openai/key is provided, we can build it
        if not self.client and (use_openai or openai_api_key or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")):
            # Build the client dynamically
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            if gemini_api_key:
                self.client = openai.OpenAI(
                    api_key=gemini_api_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                )
            else:
                api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
                if api_key:
                    self.client = openai.OpenAI(api_key=api_key)

        if self.client:
            is_gemini = "generativelanguage.googleapis.com" in str(self.client.base_url) or bool(os.getenv("GEMINI_API_KEY"))
            if is_gemini:
                self.model_name = "models/gemini-embedding-001"
                self.embedding_dim = 3072
            else:
                self.model_name = "text-embedding-3-small"
                self.embedding_dim = 1536
        else:
            self.embedding_dim = 384
            
        self.chunks = []
        self.embeddings = None
        self.faiss_index = None

    def _get_local_model(self):
        if self.local_model is None:
            print("Loading local sentence-transformers model...")
            from sentence_transformers import SentenceTransformer
            self.local_model = SentenceTransformer(self.local_model_name)
        return self.local_model

    def chunk_paper(self, parsed_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Chunks the document sections into small texts, keeping track of page numbers and section names.
        """
        text_splitter = SimpleRecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        chunks = []
        
        # We walk through sections and split them
        for section_name, section_text in parsed_data.get("sections", {}).items():
            split_texts = text_splitter.split_text(section_text)
            for idx, text in enumerate(split_texts):
                # Try to map this chunk back to a page number
                # We do this by searching which page contains this chunk text
                page_num = 1
                for page in parsed_data.get("pages", []):
                    # Check if a substantial part of the chunk is in the page text
                    sample_text = text[:100]
                    if sample_text in page["text"]:
                        page_num = page["page_num"]
                        break
                
                chunks.append({
                    "chunk_id": f"{section_name}_{idx}",
                    "text": text,
                    "section": section_name,
                    "page_num": page_num
                })
        
        self.chunks = chunks
        return chunks

    def compute_embeddings(self):
        """
        Generates vector embeddings for all chunks.
        """
        if not self.chunks:
            return
            
        texts = [c["text"] for c in self.chunks]
        
        if self.client:
            # Generate embeddings via API (OpenAI or Gemini)
            response = self.client.embeddings.create(
                input=texts,
                model=self.model_name
            )
            self.embeddings = np.array([data.embedding for data in response.data], dtype=np.float32)
        else:
            # Generate local embeddings
            local_model = self._get_local_model()
            self.embeddings = np.array(local_model.encode(texts), dtype=np.float32)

        # Build index
        self.build_index()

    def build_index(self):
        """
        Indexes embeddings using FAISS. If FAISS encounters any issue, falls back to raw numpy operations.
        """
        try:
            import faiss
            # Create FAISS FlatL2 Index
            self.faiss_index = faiss.IndexFlatIP(self.embedding_dim)
            # Normalize embeddings for cosine similarity
            norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            normalized_embeddings = self.embeddings / np.where(norms == 0, 1, norms)
            self.faiss_index.add(normalized_embeddings)
            print("Successfully initialized FAISS index.")
        except Exception as e:
            print(f"FAISS indexing failed, falling back to NumPy search. Error: {e}")
            self.faiss_index = None

    def get_query_embedding(self, query: str) -> np.ndarray:
        """
        Generates a vector embedding for the query.
        """
        if self.client:
            response = self.client.embeddings.create(
                input=[query],
                model=self.model_name
            )
            return np.array(response.data[0].embedding, dtype=np.float32)
        else:
            local_model = self._get_local_model()
            return np.array(local_model.encode([query])[0], dtype=np.float32)

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves top_k relevant chunks using cosine similarity.
        """
        if self.embeddings is None or len(self.chunks) == 0:
            return []
            
        query_emb = self.get_query_embedding(query)
        
        # Normalize query vector
        query_norm = np.linalg.norm(query_emb)
        if query_norm > 0:
            query_emb = query_emb / query_norm

        if self.faiss_index is not None:
            # Query FAISS
            # Add extra dimension for search
            query_emb_expanded = np.expand_dims(query_emb, axis=0)
            distances, indices = self.faiss_index.search(query_emb_expanded, top_k)
            
            results = []
            for score, idx in zip(distances[0], indices[0]):
                if idx < len(self.chunks) and idx >= 0:
                    chunk = self.chunks[idx].copy()
                    chunk["score"] = float(score)
                    results.append(chunk)
            return results
        else:
            # NumPy Cosine Similarity Fallback
            norms = np.linalg.norm(self.embeddings, axis=1)
            normalized_embeddings = self.embeddings / np.where(norms[:, None] == 0, 1, norms[:, None])
            
            similarities = np.dot(normalized_embeddings, query_emb)
            top_indices = np.argsort(similarities)[::-1][:top_k]
            
            results = []
            for idx in top_indices:
                chunk = self.chunks[idx].copy()
                chunk["score"] = float(similarities[idx])
                results.append(chunk)
            return results

    def format_prompt(self, query: str, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Formats the context and constructs the prompt for the LLM.
        """
        context_str = ""
        for i, chunk in enumerate(retrieved_chunks):
            context_str += f"[Chunk {i+1} | Page {chunk['page_num']} | Section: {chunk['section']}]\n"
            context_str += f"{chunk['text']}\n\n"
            
        prompt = f"""You are an AI Research Paper Assistant. Answer the user's question about the research paper using the context below.

Context:
---------------------
{context_str}
---------------------

Question: {query}

Instructions:
1. Provide a comprehensive, accurate, and detailed answer using ONLY the retrieved context.
2. You MUST include inline citations whenever you reference specific information (e.g. "[Page 3, Section: Methodology]").
3. Citing the page number and section from the source chunk metadata is critical.
4. If the context does not contain the answer, say "I cannot find the answer in the paper." and list what relevant concepts were found instead.
"""
        return prompt
