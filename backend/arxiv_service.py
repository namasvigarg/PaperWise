import requests
import xml.etree.ElementTree as ET
import urllib.parse
from typing import List, Dict, Any

class ArxivService:
    def __init__(self):
        self.base_url = "http://export.arxiv.org/api/query"

    def search_similar_papers(self, title: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Queries arXiv API using the title as keywords to find similar papers.
        """
        # Clean title: remove special characters, keep words
        clean_title = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in title)
        # Use first 8 words for a broad keyword query
        keywords = " ".join(clean_title.split()[:8])
        
        # Build query
        query_param = f'ti:"{keywords}" OR all:"{keywords}"'
        encoded_query = urllib.parse.quote(query_param)
        url = f"{self.base_url}?search_query={encoded_query}&max_results={max_results}"
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                print(f"arXiv API error: Status code {response.status_code}")
                return []
            
            return self.parse_arxiv_xml(response.text)
        except Exception as e:
            print(f"Error fetching from arXiv: {e}")
            return []

    def parse_arxiv_xml(self, xml_data: str) -> List[Dict[str, Any]]:
        """
        Parses XML string returned by arXiv API and extracts list of dict papers.
        """
        papers = []
        try:
            # Handle XML namespaces
            namespaces = {
                'atom': 'http://www.w3.org/2005/Atom',
                'opensearch': 'http://a9.com/-/spec/opensearch/1.1/',
                'arxiv': 'http://arxiv.org/schemas/atom'
            }
            
            root = ET.fromstring(xml_data)
            
            for entry in root.findall('atom:entry', namespaces):
                title = entry.find('atom:title', namespaces)
                summary = entry.find('atom:summary', namespaces)
                paper_id = entry.find('atom:id', namespaces)
                published = entry.find('atom:published', namespaces)
                
                authors = []
                for author in entry.findall('atom:author', namespaces):
                    name = author.find('atom:name', namespaces)
                    if name is not None:
                        authors.append(name.text.strip())
                
                # Check for PDF links
                pdf_url = ""
                for link in entry.findall('atom:link', namespaces):
                    if link.attrib.get('title') == 'pdf' or link.attrib.get('type') == 'application/pdf':
                        pdf_url = link.attrib.get('href', '')
                        break
                
                # If pdf_url not found, check matching href with pdf
                if not pdf_url:
                    for link in entry.findall('atom:link', namespaces):
                        href = link.attrib.get('href', '')
                        if 'pdf' in href:
                            pdf_url = href
                            break
                            
                # Fallback to web link if pdf not found
                web_url = paper_id.text.strip() if paper_id is not None else ""
                
                papers.append({
                    "title": title.text.strip().replace('\n', ' ') if title is not None else "Unknown Title",
                    "abstract": summary.text.strip().replace('\n', ' ') if summary is not None else "No summary available",
                    "authors": authors,
                    "published": published.text[:10] if published is not None else "Unknown Date",
                    "pdf_url": pdf_url or web_url,
                    "url": web_url
                })
        except Exception as e:
            print(f"Error parsing arXiv XML: {e}")
            
        return papers

if __name__ == "__main__":
    service = ArxivService()
    results = service.search_similar_papers("Attention Is All You Need", 3)
    for p in results:
        print("-", p["title"], "by", p["authors"])
