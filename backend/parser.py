import fitz
import re
import os

class AcademicPDFParser:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        self.metadata = {}
        self.pages = []
        self.sections = {}
        self.references_raw = []

    def parse(self, llm_bridge=None):
        """
        Main parsing method: extracts text, metadata, sections, and references.
        """
        self.extract_pages()
        self.extract_metadata_heuristics(llm_bridge=llm_bridge)
        self.extract_sections()
        self.extract_references()
        return {
            "metadata": self.metadata,
            "sections": self.sections,
            "references": self.references_raw,
            "pages": self.pages,
            "page_count": len(self.doc)
        }

    def extract_pages(self):
        """
        Extracts plain text and page metadata page by page, handling columns properly.
        """
        self.pages = []
        for page_num in range(len(self.doc)):
            page = self.doc[page_num]
            # Use "blocks" layout to parse multi-column PDFs correctly.
            # Page text returned by blocks sorts elements left-to-right, top-to-bottom.
            blocks = page.get_text("blocks")
            # Sort blocks primarily by y-coordinate (top-to-bottom) and then x-coordinate (left-to-right)
            # which works best for multi-column academic documents
            blocks.sort(key=lambda b: (b[1], b[0]))
            
            page_text = ""
            for b in blocks:
                # b[4] is the text content of the block
                block_text = b[4].strip()
                if block_text:
                    page_text += block_text + "\n\n"
                    
            self.pages.append({
                "page_num": page_num + 1,
                "text": page_text
            })

    def extract_metadata_heuristics(self, llm_bridge=None):
        """
        Extracts Title, Authors, and Abstract from the first pages using text patterns.
        """
        first_page_text = self.pages[0]["text"] if self.pages else ""
        
        # 1. Try LLM extraction if bridge is available
        if llm_bridge:
            try:
                import json
                llm_prompt = f"""You are an expert academic metadata extractor. Given the plain text of the first page of a research paper, extract:
1. Title: The exact title of the research paper (not the journal name, volume, or "Research paper" label).
2. Authors: Comma-separated list of author names (exclude affiliations, departments, or emails).
3. Abstract: The abstract text.

Format your response as a valid JSON object with keys "title", "authors", and "abstract". 
Provide ONLY the JSON block. Do not include any explanation or markdown formatting outside the JSON block.

First Page Text:
{first_page_text[:4000]}
"""
                res_str = llm_bridge(llm_prompt)
                clean_json = res_str.strip()
                if clean_json.startswith("```"):
                    clean_json = re.sub(r'^```(?:json)?\n', '', clean_json)
                    clean_json = re.sub(r'\n```$', '', clean_json)
                metadata = json.loads(clean_json)
                if metadata.get("title") and metadata.get("authors"):
                    self.metadata = {
                        "title": metadata.get("title").strip(),
                        "authors": metadata.get("authors").strip(),
                        "abstract": metadata.get("abstract", "No abstract found.").strip()
                    }
                    return
            except Exception as e:
                print(f"LLM metadata extraction failed, falling back to font-size heuristics. Error: {e}")

        # 2. Fallback: Font-size based heuristics
        try:
            page = self.doc[0]
            blocks = page.get_text("dict")["blocks"]
            spans = []
            for b in blocks:
                if "lines" in b:
                    for l in b["lines"]:
                        for s in l["spans"]:
                            spans.append(s)
            
            if spans:
                noise_patterns = [
                    r'^research\s+paper', r'^research\s+article', r'^article', r'^review',
                    r'^journal\s+of', r'^arxiv:', r'^proceedings', r'^volume', r'^issn', r'^http',
                    r'^doi:', r'^www\.', r'^copyright', r'\b20\d{2}\b'
                ]
                filtered_spans = []
                for s in spans:
                    text_clean = s["text"].strip().lower()
                    if not text_clean:
                        continue
                    is_noise = False
                    for pattern in noise_patterns:
                        if re.search(pattern, text_clean):
                            if len(text_clean) < 50:
                                is_noise = True
                                break
                    if not is_noise:
                        filtered_spans.append(s)
                
                if not filtered_spans:
                    filtered_spans = spans
                
                max_size = max(s["size"] for s in filtered_spans)
                title_spans = [s for s in filtered_spans if s["size"] >= max_size - 1.0]
                title_spans.sort(key=lambda s: (s["bbox"][1], s["bbox"][0]))
                title = " ".join(s["text"].strip() for s in title_spans)
                title = re.sub(r'\s+', ' ', title).strip()
                
                abstract_idx = -1
                for idx, s in enumerate(spans):
                    if "abstract" in s["text"].strip().lower() and s["size"] < max_size:
                        abstract_idx = idx
                        break
                
                authors_text = ""
                if abstract_idx != -1:
                    last_title_idx = -1
                    for s_t in title_spans:
                        try:
                            idx = spans.index(s_t)
                            if idx > last_title_idx:
                                last_title_idx = idx
                        except ValueError:
                            pass
                    
                    if last_title_idx != -1 and last_title_idx < abstract_idx:
                        author_spans = spans[last_title_idx + 1: abstract_idx]
                        author_candidates = []
                        for s in author_spans:
                            txt = s["text"].strip()
                            if txt and not txt.startswith("___") and "@" not in txt and "email" not in txt.lower():
                                author_candidates.append(txt)
                        authors_text = ", ".join(author_candidates)
                
                if authors_text:
                    authors_text = re.sub(r'\s+', ' ', authors_text).strip()
                else:
                    authors_text = "Unknown Authors"
                    
                abstract = ""
                abstract_match = re.search(r'(?i)abstract[\s\.:\n]+(.*?)(?=\n\s*(?:1\.?\s+)?(?:introduction|intro|keywords|categories)\b)', first_page_text, re.DOTALL)
                if abstract_match:
                    abstract = abstract_match.group(1).strip()
                else:
                    abstract_match = re.search(r'(?i)abstract[\s\.:\n]+(.*)', first_page_text, re.DOTALL)
                    if abstract_match:
                        abstract = abstract_match.group(1)[:1500].strip()
                    
                self.metadata = {
                    "title": title or "Unknown Title",
                    "authors": authors_text,
                    "abstract": self.clean_text_formatting(abstract) if abstract else "No abstract found."
                }
                return
        except Exception as e:
            print(f"Font-size heuristics failed, falling back to simple text heuristics. Error: {e}")

        # 3. Final Fallback: Simple text-based heuristics (original code)
        abstract = ""
        abstract_match = re.search(r'(?i)abstract[\s\.:\n]+(.*?)(?=\n\s*(?:1\.?\s+)?(?:introduction|intro|keywords|categories)\b)', first_page_text, re.DOTALL)
        if abstract_match:
            abstract = abstract_match.group(1).strip()
        else:
            abstract_match = re.search(r'(?i)abstract[\s\.:\n]+(.*)', first_page_text, re.DOTALL)
            if abstract_match:
                abstract = abstract_match.group(1)[:1500].strip()

        lines = [line.strip() for line in first_page_text.split('\n') if line.strip()]
        title = lines[0] if lines else "Unknown Title"
        if len(title) < 10 and len(lines) > 1:
            title += " " + lines[1]
        
        if title.lower().startswith("arxiv:") or "journal of" in title.lower():
            title = lines[1] if len(lines) > 1 else title

        authors = "Unknown Authors"
        if len(lines) > 1:
            author_lines = []
            for line in lines[1:5]:
                if "abstract" in line.lower() or "introduction" in line.lower() or "@" in line or "email" in line.lower():
                    break
                author_lines.append(line)
            if author_lines:
                authors = ", ".join(author_lines)

        self.metadata = {
            "title": self.metadata.get("title", title),
            "authors": self.metadata.get("authors", authors),
            "abstract": self.clean_text_formatting(abstract) if abstract else "No abstract found."
        }

    def clean_text_formatting(self, text: str) -> str:
        """
        Cleans text from PDF by merging lines within paragraphs while preserving
        paragraph breaks, lists, tables, and headers.
        """
        if not text:
            return ""
        text = text.replace("\r\n", "\n")
        paragraphs = text.split("\n\n")
        cleaned_paragraphs = []
        
        for p in paragraphs:
            lines = p.split("\n")
            cleaned_lines = []
            current_paragraph_lines = []
            
            for line in lines:
                line_strip = line.strip()
                if not line_strip:
                    continue
                
                # Check if the line is a list item or a table row
                # List items start with bullet points or numbers/letters followed by a dot/parenthesis
                # Table rows might have multiple spaces or look like a header
                is_list_or_table = (
                    re.match(r'^(?:[•\-*▪o]|(?:\d+|[a-zA-Z])\.)', line_strip) or
                    len(re.findall(r'\s{3,}', line_strip)) > 1 or
                    line_strip.startswith("Table ") or
                    line_strip.startswith("Figure ")
                )
                
                if is_list_or_table:
                    if current_paragraph_lines:
                        cleaned_lines.append(" ".join(current_paragraph_lines))
                        current_paragraph_lines = []
                    cleaned_lines.append(line_strip)
                else:
                    # If this line is a continuation of a list item, append to the previous list item
                    if not current_paragraph_lines and cleaned_lines and re.match(r'^(?:[•\-*▪o]|(?:\d+|[a-zA-Z])\.)', cleaned_lines[-1]):
                        cleaned_lines[-1] = cleaned_lines[-1] + " " + line_strip
                    else:
                        current_paragraph_lines.append(line_strip)
            
            if current_paragraph_lines:
                cleaned_lines.append(" ".join(current_paragraph_lines))
            
            cleaned_p = "\n".join(cleaned_lines)
            if cleaned_p:
                cleaned_paragraphs.append(cleaned_p)
                
        return "\n\n".join(cleaned_paragraphs)

    def extract_sections(self):
        """
        Segments the document text into logical sections based on section headers.
        """
        # Regex for numbered headings (e.g., 1. Introduction, 1.2 Section, I. Preface, A. Appendix)
        numbered_heading_regex = re.compile(
            r'^(?:[IVXLCDM]+\.?\s+|\d+(?:\.\d+)*\.?\s+)([A-Z][A-Za-z0-9\s,\.]{1,80})$'
        )
        
        # Common unnumbered academic section names
        UNNUMBERED_HEADINGS = {
            "abstract", "introduction", "related work", "literature review", 
            "methodology", "methods", "experiments", "experimental design", 
            "experimental setup", "results", "discussion", "conclusion", 
            "conclusions", "references", "bibliography", "acknowledgements",
            "appendix", "findings", "discussion and conclusions"
        }
        
        current_section = "Title Page / Metadata"
        self.sections = {current_section: ""}
        
        for page in self.pages:
            lines = page["text"].split('\n')
            for line in lines:
                line_strip = line.strip()
                if not line_strip:
                    continue
                
                is_header = False
                
                # 1. Check if numbered heading
                if numbered_heading_regex.match(line_strip):
                    is_header = True
                # 2. Check if it matches unnumbered standard headings (case-insensitive)
                elif line_strip.lower() in UNNUMBERED_HEADINGS:
                    is_header = True
                # 3. Check if it is fully uppercase (e.g. "PROPOSED SYSTEM"), not starting with common noise
                elif line_strip.isupper() and len(line_strip) >= 4 and len(line_strip) < 60:
                    # Ignore table/figure captions or equations
                    if not re.match(r'^(?:Eq|Table|Fig|Figure|Algorithm)\b', line_strip, re.IGNORECASE):
                        # Ignore abbreviations with periods like B.A. or M.A.
                        if not re.match(r'^[A-Z]\.(?:[A-Z]\.)+$', line_strip):
                            is_header = True
                
                if is_header:
                    current_section = line_strip
                    if current_section not in self.sections:
                        self.sections[current_section] = ""
                else:
                    self.sections[current_section] += line_strip + "\n"

        # Cleanup empty sections and apply text formatting cleanup
        self.sections = {k: self.clean_text_formatting(v) for k, v in self.sections.items() if v.strip()}

    def extract_references(self):
        """
        Finds the References section and splits it into individual citations.
        """
        references_text = ""
        # Search for a section that looks like References / Bibliography
        for key in self.sections.keys():
            if re.search(r'(?i)\b(references|bibliography|literature cited)\b', key):
                references_text = self.sections[key]
                break
        
        if not references_text:
            # Fallback: scan pages from the back to find "References"
            for page in reversed(self.pages):
                text = page["text"]
                ref_match = re.search(r'(?i)\b(?:references|bibliography|literature cited)\b', text)
                if ref_match:
                    references_text = text[ref_match.end():] + "\n" + references_text
                    break
        
        if not references_text:
            self.references_raw = []
            return

        # Split references by index labels [1], [2], [Vaswani17], etc.
        # or numbers starting on a newline like "1. Vaswani..."
        ref_items = []
        # Pattern to match starting of a reference item
        ref_split_pattern = r'\n+(?:\[(?:\d+|[A-Za-z]+\+?\d*)\]|\d+\.\s+)'
        
        # Find all starts of items
        splits = list(re.finditer(ref_split_pattern, references_text))
        
        if splits:
            last_pos = 0
            for i in range(len(splits)):
                start = splits[i].start()
                if last_pos != 0:
                    ref_items.append(references_text[last_pos:start].strip())
                last_pos = start
            ref_items.append(references_text[last_pos:].strip())
        else:
            # Fallback: Split by newline if no bracket/numbered structure is found
            ref_items = [r.strip() for r in references_text.split('\n') if len(r.strip()) > 30]

        # Filter out headers and page numbers
        self.references_raw = [item for item in ref_items if len(item) > 15]

def test_parsing():
    import sys
    if len(sys.argv) < 2:
        print("Usage: python parser.py <pdf_path>")
        return
    parser = AcademicPDFParser(sys.argv[1])
    res = parser.parse()
    print("Parsed Title:", res["metadata"]["title"])
    print("Parsed Authors:", res["metadata"]["authors"])
    print("Abstract Length:", len(res["metadata"]["abstract"]))
    print("Detected Sections:", list(res["sections"].keys()))
    print("Number of References:", len(res["references"]))

if __name__ == "__main__":
    test_parsing()
