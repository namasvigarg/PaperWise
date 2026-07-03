"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { 
  Library, 
  Sparkles, 
  Loader2, 
  CheckSquare, 
  Square,
  AlertTriangle
} from "lucide-react";

import { usePapers, Paper } from "@/context/PaperContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LitReviewPage() {
  const { papers } = usePapers();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedIdsInitialized, setSelectedIdsInitialized] = useState<boolean>(false);
  
  // Results
  const [review, setReview] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const savedReview = sessionStorage.getItem("lit_review_result");
    if (savedReview) setReview(savedReview);
  }, []);

  useEffect(() => {
    if (selectedIds.length > 0) {
      sessionStorage.setItem("lit_selected_ids", JSON.stringify(selectedIds));
    } else {
      sessionStorage.removeItem("lit_selected_ids");
    }
  }, [selectedIds]);

  useEffect(() => {
    if (review) {
      sessionStorage.setItem("lit_review_result", review);
    } else {
      sessionStorage.removeItem("lit_review_result");
    }
  }, [review]);

  useEffect(() => {
    if (papers.length > 0 && !selectedIdsInitialized) {
      const savedSelectedIds = sessionStorage.getItem("lit_selected_ids");
      if (savedSelectedIds) {
        try {
          const parsed = JSON.parse(savedSelectedIds);
          // Filter to make sure they are still valid paper IDs
          const valid = parsed.filter((id: string) => papers.some(p => p.id === id));
          setSelectedIds(valid);
        } catch (e) {
          setSelectedIds(papers.slice(0, 3).map(p => p.id));
        }
      } else {
        setSelectedIds(papers.slice(0, 3).map(p => p.id));
      }
      setSelectedIdsInitialized(true);
    }
  }, [papers, selectedIdsInitialized]);

  const handleToggleSelect = (paperId: string) => {
    setSelectedIds(prev => 
      prev.includes(paperId) 
        ? prev.filter(id => id !== paperId) 
        : [...prev, paperId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === papers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(papers.map(p => p.id));
    }
  };

  const handleGenerateReview = async () => {
    if (selectedIds.length < 2) {
      setErrorMsg("Please select at least 2 papers to perform a literature review.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    setReview("");

    try {
      const res = await fetch(`${API_BASE}/api/literature-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper_ids: selectedIds
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReview(data.review);
      } else {
        setErrorMsg("Failed to generate literature review synthesis.");
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
        <header className="mb-6 shrink-0">
          <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Synthesis Workspace</span>
          <h1 className="text-3xl font-extrabold font-outfit text-white tracking-tight mt-0.5">
            Automatic <span className="text-gradient">Literature Review</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Select multiple papers from your library to compile a unified state-of-the-art methodology survey.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 flex-1 mb-6">
          
          {/* Left Column: Multi-Selector Checkboxes */}
          <div className="lg:col-span-4 glass-panel rounded-3xl border border-slate-800/60 p-5 flex flex-col min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Library className="w-4 h-4 text-indigo-400" />
                Select Papers ({selectedIds.length})
              </span>
              <button
                onClick={handleSelectAll}
                disabled={papers.length === 0}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold disabled:opacity-50"
              >
                {selectedIds.length === papers.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            {/* Checkbox selector scroll area */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5">
              {papers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <Library className="w-8 h-8 mb-2" />
                  <p className="text-xs">Upload papers in the dashboard library first.</p>
                </div>
              ) : (
                papers.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleToggleSelect(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected 
                          ? "bg-indigo-500/10 border-indigo-500/30" 
                          : "bg-slate-900/30 border-slate-800/50 hover:bg-slate-800/20"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 text-indigo-400">
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug">{p.title}</h4>
                        <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">{p.authors}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Synthesize Button */}
            <div className="mt-4 pt-3 border-t border-slate-800/60 shrink-0">
              <button
                onClick={handleGenerateReview}
                disabled={loading || selectedIds.length < 2}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/15 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Synthesize Review
              </button>
            </div>
          </div>

          {/* Right Column: Survey Result pane */}
          <div className="lg:col-span-8 glass-panel rounded-3xl border border-slate-800/60 p-6 overflow-y-auto min-h-0 flex flex-col">
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-center gap-3 text-xs shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex-grow overflow-y-auto">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Synthesizing multi-paper contexts...</p>
                  <p className="text-[10px] text-slate-500">Mapping lineages, shared trends, and methodology gaps</p>
                </div>
              ) : review ? (
                <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-300 bg-slate-900/15 p-6 rounded-2xl border border-slate-800/40">
                  <div className="flex items-center gap-2 mb-4 text-white">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold">Joint Literature Review Generated</h3>
                  </div>
                  <MarkdownRenderer content={review} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-900 mb-3 text-slate-500">
                    <Library className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Literature Review Workspace</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Select 2 or more research documents from the checklist card on the left, then click "Synthesize Review" to generate a literature review survey.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
