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

    def parse(self):
        """
        Main parsing method: extracts text, metadata, sections, and references.
        """
        self.extract_pages()
        self.extract_metadata_heuristics()
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

    def extract_metadata_heuristics(self):
        """
        Extracts Title, Authors, and Abstract from the first pages using text patterns.
        """
        first_page_text = self.pages[0]["text"] if self.pages else ""
        
        # Simple heuristics for abstract
        abstract = ""
        abstract_match = re.search(r'(?i)abstract[\s\.:\n]+(.*?)(?=\n\s*(?:1\.?\s+)?(?:introduction|intro|keywords|categories)\b)', first_page_text, re.DOTALL)
        if abstract_match:
            abstract = abstract_match.group(1).strip()
        else:
            # Fallback abstract parsing
            abstract_match = re.search(r'(?i)abstract[\s\.:\n]+(.*)', first_page_text, re.DOTALL)
            if abstract_match:
                abstract = abstract_match.group(1)[:1500].strip()

        # Simple heuristics for Title
        # Title is usually the very first lines before author details
        lines = [line.strip() for line in first_page_text.split('\n') if line.strip()]
        title = lines[0] if lines else "Unknown Title"
        if len(title) < 10 and len(lines) > 1:
            title += " " + lines[1]
        
        # Clean title from common headers
        if title.lower().startswith("arxiv:") or "journal of" in title.lower():
            title = lines[1] if len(lines) > 1 else title

        # Simple heuristics for authors
        # Authors usually follow title and precede abstract
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
        # Common section heading patterns:
        # 1. Introduction, 2. Related Work, etc. Or Roman Numerals: I. Introduction, II. Background
        # Or just bold capital headers on their own line
        heading_regex = re.compile(
            r'^(?:(?:[IVXLCDM]+\.?\s+)|(?:\d+(?:\.\d+)*\.?\s+))?([A-Z][A-Za-z0-9\s]{2,40})$'
        )
        
        current_section = "Title Page / Metadata"
        self.sections = {current_section: ""}
        
        for page in self.pages:
            lines = page["text"].split('\n')
            for line in lines:
                line_strip = line.strip()
                if not line_strip:
                    continue
                
                # Check if this line looks like a header
                is_header = False
                # If uppercase and relatively short
                if line_strip.isupper() and len(line_strip) < 60:
                    is_header = True
                elif heading_regex.match(line_strip):
                    is_header = True
                
                # Exclude lines that are equations or numbers or part of tables
                if is_header and not re.match(r'^(?:Eq|Table|Fig|Figure|Algorithm)\b', line_strip, re.IGNORECASE):
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
