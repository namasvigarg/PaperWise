import os
import json
import requests
from typing import List, Dict, Any, Optional

# Load URL and Key from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def is_configured() -> bool:
    """Checks whether Supabase configuration is set in the environment variables."""
    return bool(SUPABASE_URL and SUPABASE_KEY)

def get_headers() -> dict:
    """Returns headers required for Supabase authentication and REST communication."""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

def save_paper(paper_id: str, parsed_data: Dict[str, Any]) -> bool:
    """Saves or updates parsed paper metadata into the papers table on Supabase."""
    if not is_configured():
        return False
    
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/papers"
    payload = {
        "id": paper_id,
        "raw_data": parsed_data
    }
    
    try:
        headers = get_headers()
        # Instruct PostgREST to perform an upsert/merge-duplicates
        headers["Prefer"] = "resolution=merge-duplicates"
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code in [200, 201]:
            print(f"Paper {paper_id} successfully saved to Supabase.")
            return True
        else:
            print(f"Failed to save paper to Supabase: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        return False

def get_paper(paper_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves raw_data from Supabase for a single paper."""
    if not is_configured():
        return None
        
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/papers?id=eq.{paper_id}&select=raw_data"
    try:
        response = requests.get(url, headers=get_headers(), timeout=15)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return data[0].get("raw_data")
        else:
            print(f"Failed to get paper from Supabase: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error reading from Supabase: {e}")
    return None

def list_papers() -> Optional[List[Dict[str, Any]]]:
    """Retrieves summaries of all papers registered in Supabase without downloading full bodies."""
    if not is_configured():
        return None
        
    # Optimize query to fetch only the metadata, page count, and upload time rather than the massive full body JSON (raw_data)
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/papers?select=id,raw_data->metadata,raw_data->page_count,raw_data->upload_time"
    try:
        response = requests.get(url, headers=get_headers(), timeout=15)
        if response.status_code == 200:
            results = []
            for item in response.json():
                metadata = item.get("metadata") or {}
                results.append({
                    "id": item.get("id"),
                    "title": metadata.get("title", "Unknown"),
                    "authors": metadata.get("authors", "Unknown"),
                    "abstract": metadata.get("abstract", "No abstract"),
                    "page_count": item.get("page_count", 0),
                    "upload_time": item.get("upload_time")
                })
            return results
        else:
            print(f"Failed to list papers from Supabase: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error listing from Supabase: {e}")
    return None

def delete_paper(paper_id: str) -> bool:
    """Deletes a paper from Supabase."""
    if not is_configured():
        return False
        
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/papers?id=eq.{paper_id}"
    try:
        response = requests.delete(url, headers=get_headers(), timeout=15)
        if response.status_code in [200, 204]:
            print(f"Paper {paper_id} deleted from Supabase.")
            return True
        else:
            print(f"Failed to delete paper from Supabase: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error deleting from Supabase: {e}")
    return False
