"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { 
  Columns, 
  Sparkles, 
  Loader2, 
  HelpCircle,
  AlertCircle
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

import { usePapers, Paper } from "@/context/PaperContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ComparePage() {
  const { papers } = usePapers();
  const [paperA, setPaperA] = useState<string>("");
  const [paperB, setPaperB] = useState<string>("");
  const [compareInitialized, setCompareInitialized] = useState<boolean>(false);
  
  // Results
  const [comparison, setComparison] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const savedComparison = sessionStorage.getItem("compare_result");
    if (savedComparison) setComparison(savedComparison);
  }, []);

  useEffect(() => {
    if (paperA) sessionStorage.setItem("compare_paper_a", paperA);
  }, [paperA]);

  useEffect(() => {
    if (paperB) sessionStorage.setItem("compare_paper_b", paperB);
  }, [paperB]);

  useEffect(() => {
    if (comparison) {
      sessionStorage.setItem("compare_result", comparison);
    } else {
      sessionStorage.removeItem("compare_result");
    }
  }, [comparison]);

  useEffect(() => {
    if (papers.length > 0 && !compareInitialized) {
      const savedPaperA = sessionStorage.getItem("compare_paper_a");
      const savedPaperB = sessionStorage.getItem("compare_paper_b");

      if (papers.length > 1) {
        setPaperA(savedPaperA && papers.some((p: Paper) => p.id === savedPaperA) ? savedPaperA : papers[0].id);
        setPaperB(savedPaperB && papers.some((p: Paper) => p.id === savedPaperB) ? savedPaperB : papers[1].id);
      } else if (papers.length > 0) {
        setPaperA(savedPaperA && papers.some((p: Paper) => p.id === savedPaperA) ? savedPaperA : papers[0].id);
        setPaperB(savedPaperB && papers.some((p: Paper) => p.id === savedPaperB) ? savedPaperB : papers[0].id);
      }
      setCompareInitialized(true);
    }
  }, [papers, compareInitialized]);

  const handleCompare = async () => {
    if (!paperA || !paperB) {
      setErrorMsg("Please select two papers to compare.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    setComparison("");

    try {
      const res = await fetch(`${API_BASE}/api/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper_id_1: paperA,
          paper_id_2: paperB
        })
      });
      if (res.ok) {
        const data = await res.json();
        setComparison(data.comparison);
      } else {
        setErrorMsg("Failed to generate comparative report.");
      }
    } catch (e) {
      setErrorMsg("Error contacting backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-[260px] p-8 max-w-7xl animate-fade-in flex flex-col h-screen">
        
        {/* Header */}
        <header className="mb-8 shrink-0">
          <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Analysis Suite</span>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-tight mt-0.5">
            Paper <span className="text-gradient">Comparison Tool</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Select two papers to compare their methodology, datasets, accuracy, and core strengths.</p>
        </header>

        {/* Paper Selection Header */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-3xl mb-8 flex flex-col sm:flex-row items-center gap-6 shrink-0">
          
          {/* Paper A Dropdown */}
          <div className="flex-1 w-full">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Paper A</label>
            <select
              value={paperA}
              onChange={(e) => setPaperA(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Paper A</option>
              {papers.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* VS Divider */}
          <div className="text-slate-500 font-bold text-xs uppercase font-outfit px-2 shrink-0">VS</div>

          {/* Paper B Dropdown */}
          <div className="flex-1 w-full">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Paper B</label>
            <select
              value={paperB}
              onChange={(e) => setPaperB(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Paper B</option>
              {papers.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Compare Button */}
          <div className="w-full sm:w-auto shrink-0 sm:self-end">
            <button
              onClick={handleCompare}
              disabled={loading || papers.length === 0}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/15 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Columns className="w-4 h-4" />}
              Generate Comparison
            </button>
          </div>

        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-center gap-3 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Results Pane */}
        <div className="flex-1 glass-panel rounded-3xl border border-slate-800/60 p-6 overflow-y-auto min-h-0">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Running LLM Comparative Inference...</p>
              <p className="text-[10px] text-slate-500">Parsing methodologies, abstracts, and benchmarking metrics</p>
            </div>
          ) : comparison ? (
            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-300 bg-slate-900/15 p-6 rounded-2xl border border-slate-800/40">
              <div className="flex items-center gap-2 mb-4 text-white">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">Comparative Report Generated</h3>
              </div>
              <MarkdownRenderer content={comparison} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-900 mb-3 text-slate-500">
                <Columns className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">No Comparison Active</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Select two research documents from your library above and click "Generate Comparison" to build a structured comparative framework.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
