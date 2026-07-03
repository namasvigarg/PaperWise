"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Paper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  page_count: number;
  upload_time?: string;
}

interface PaperContextType {
  papers: Paper[];
  setPapers: React.Dispatch<React.SetStateAction<Paper[]>>;
  loading: boolean;
  fetchPapers: () => Promise<void>;
}

const PaperContext = createContext<PaperContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function PaperProvider({ children }: { children: React.ReactNode }) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPapers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/papers`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data);
      }
    } catch (e) {
      console.error("Error fetching papers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  return (
    <PaperContext.Provider value={{ papers, setPapers, loading, fetchPapers }}>
      {children}
    </PaperContext.Provider>
  );
}

export function usePapers() {
  const context = useContext(PaperContext);
  if (context === undefined) {
    throw new Error("usePapers must be used within a PaperProvider");
  }
  return context;
}
