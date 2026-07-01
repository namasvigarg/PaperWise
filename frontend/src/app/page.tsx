"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Upload,
  FileText,
  BookOpen,
  ArrowRight,
  Brain,
  Sparkles,
  User,
  Check,
  Copy,
  Loader2,
  Link as LinkIcon,
  HelpCircle,
  AlertTriangle,
  Trash2
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Paper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  page_count: number;
  upload_time?: string;
}

export default function Dashboard() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "metadata" | "gaps">("summary");

  // States for dynamic requests
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [gaps, setGaps] = useState<string>("");
  const [gapsLoading, setGapsLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState<boolean>(false);

  // Upload states
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [copiedBibtex, setCopiedBibtex] = useState<boolean>(false);
  const [deleteConfirmPaperId, setDeleteConfirmPaperId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch papers on load
  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/papers`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data);
        if (data.length > 0 && !selectedPaper) {
          handleSelectPaper(data[0]);
        }
      }
    } catch (e) {
      console.error("Error fetching papers:", e);
    }
  };

  const handleSelectPaper = (paper: Paper) => {
    setSelectedPaper(paper);
    setSummary("");
    setGaps("");
    setRecommendations([]);

    // Automatically load summary for the selected paper
    fetchSummary(paper.id);
  };

  const fetchSummary = async (paperId: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper_id: paperId, message: "" })
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchGaps = async (paperId: string) => {
    setGapsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gap-detection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper_id: paperId, message: "" })
      });
      if (res.ok) {
        const data = await res.json();
        setGaps(data.gaps);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGapsLoading(false);
    }
  };

  const fetchRecommendations = async (paperId: string) => {
    setRecommendationsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper_id: paperId, message: "" })
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Trigger loading when clicking tabs
  const handleTabChange = (tab: "summary" | "metadata" | "gaps") => {
    setActiveTab(tab);
    if (!selectedPaper) return;

    if (tab === "gaps" && !gaps) {
      fetchGaps(selectedPaper.id);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !file.name.endsWith(".pdf")) {
      setErrorMsg("Please upload a valid PDF research paper.");
      return;
    }
    setErrorMsg("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setPapers((prev) => [data, ...prev]);
        handleSelectPaper(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to upload and parse paper.");
      }
    } catch (e) {
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePaper = (e: React.MouseEvent, paperId: string) => {
    e.stopPropagation();
    setDeleteConfirmPaperId(paperId);
  };

  const confirmDeletePaper = async (paperId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/papers/${paperId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updatedPapers = papers.filter((p) => p.id !== paperId);
        setPapers(updatedPapers);

        if (selectedPaper?.id === paperId) {
          if (updatedPapers.length > 0) {
            handleSelectPaper(updatedPapers[0]);
          } else {
            setSelectedPaper(null);
            setSummary("");
            setGaps("");
            setRecommendations([]);
          }
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to delete paper.");
      }
    } catch (e) {
      setErrorMsg("Failed to connect to backend server.");
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Helper to copy mock BibTeX export
  const getBibtex = () => {
    if (!selectedPaper) return "";
    const cleanTitle = selectedPaper.title.replace(/[^a-zA-Z0-9\s]/g, "");
    const bibKey = (selectedPaper.authors.split(",")[0] || "author").toLowerCase().trim().split(" ")[0] + new Date().getFullYear() + cleanTitle.split(" ")[0].toLowerCase();

    return `@article{${bibKey},
  title={${selectedPaper.title}},
  author={${selectedPaper.authors}},
  journal={arXiv preprint},
  year={${new Date().getFullYear()}}
}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  return (
    <div className="flex min-h-screen">
      {/* Visual Navigation Sidebar */}
      <Sidebar />

      {/* Custom Confirmation Modal */}
      {deleteConfirmPaperId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Delete Document?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete this paper? This action is permanent and will remove the PDF, parsed metadata, and all cached summaries/reports associated with it.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmPaperId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const paperId = deleteConfirmPaperId;
                  setDeleteConfirmPaperId(null);
                  confirmDeletePaper(paperId);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/10 cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel Area */}
      <main className="flex-1 ml-[260px] p-8 max-w-7xl animate-fade-in">
        {/* Top Header Row */}
        <header className="mb-8">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Research workspace</span>
            <h1 className="text-4xl font-extrabold font-outfit text-white tracking-tight mt-1">
              PaperWise <span className="text-gradient">Research Assistant</span>
            </h1>
            <p className="text-slate-400 text-[14px] mt-1">Upload academic PDFs to parse, summarize, extract gaps, and query references instantly.</p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-center gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Upload & PDF List */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`glass-panel border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] group ${dragOver
                  ? "border-indigo-400 bg-indigo-500/5 scale-[1.02]"
                  : "border-slate-800/80 hover:border-indigo-500/30 hover:bg-slate-900/10"
                }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
                accept=".pdf"
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                  <h4 className="text-sm font-bold text-white">Analyzing Layout & Chunking...</h4>
                  <p className="text-[11px] text-slate-400">Extracting Title, Sections & references</p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-950/60 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 border border-slate-800">
                    <Upload className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Upload research paper</h3>
                  <p className="text-xs text-slate-400 px-4">Drag and drop academic PDF, or browse. Supports multi-column format.</p>
                </>
              )}
            </div>

            {/* List of Papers */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800/60 flex-1 flex flex-col min-h-[300px]">
              <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Paper Library ({papers.length})
              </h3>

              {papers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <BookOpen className="w-8 h-8 text-slate-600 mb-3" />
                  <p className="text-xs text-slate-400">Your library is empty. Upload your first PDF to begin parsing.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[400px]">
                  {papers.map((paper) => (
                    <button
                      key={paper.id}
                      onClick={() => handleSelectPaper(paper)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 group relative ${selectedPaper?.id === paper.id
                          ? "bg-indigo-500/10 border-indigo-500/40"
                          : "bg-slate-900/30 border-slate-800/60 hover:bg-slate-800/30 hover:border-slate-800"
                        }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${selectedPaper?.id === paper.id ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-950 text-slate-500"
                        }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <h4 className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                          {paper.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">{paper.authors}</p>
                      </div>
                      <span
                        onClick={(e) => handleDeletePaper(e, paper.id)}
                        className="absolute right-3 top-3.5 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                        title="Delete paper"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Paper Workspace */}
          <div className="lg:col-span-8">
            {selectedPaper ? (
              <div className="glass-panel rounded-3xl border border-slate-800/60 overflow-hidden flex flex-col h-full min-h-[580px]">

                {/* Header Information */}
                <div className="p-6 bg-slate-950/40 border-b border-slate-800/60">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                    Parsed Document • {selectedPaper.page_count} Pages
                  </span>
                  <h2 className="text-2xl font-bold font-outfit text-white tracking-tight mt-1 line-clamp-2">
                    {selectedPaper.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    {selectedPaper.authors}
                  </p>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-slate-800/60 bg-slate-950/20 px-6">
                  {[
                    { id: "summary", label: "Executive Summary", icon: Sparkles },
                    { id: "metadata", label: "BibTeX & Metadata", icon: FileText },
                    { id: "gaps", label: "Research Gaps", icon: Brain },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-4 border-b-2 text-xs font-semibold transition-all ${activeTab === tab.id
                            ? "border-indigo-500 text-white bg-indigo-500/5"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content area */}
                <div className="p-6 flex-1 overflow-y-auto max-h-[520px]">

                  {/* Executive Summary Tab */}
                  {activeTab === "summary" && (
                    <div className="space-y-4">
                      {summaryLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                          <p className="text-xs text-slate-400">Synthesizing contributions & limitations...</p>
                        </div>
                      ) : (
                        <div className="prose prose-invert max-w-none text-xs leading-relaxed text-slate-300 space-y-4 whitespace-pre-line bg-slate-900/10 p-5 rounded-2xl border border-slate-800/40">
                          {summary}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BibTeX & Metadata Tab */}
                  {activeTab === "metadata" && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Abstract</h4>
                        <p className="text-xs leading-relaxed text-slate-300 bg-slate-900/30 p-4 rounded-xl border border-slate-800/40">
                          {selectedPaper.abstract}
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">BibTeX Citation</h4>
                          <button
                            onClick={() => copyToClipboard(getBibtex())}
                            className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5 transition-all"
                          >
                            {copiedBibtex ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedBibtex ? "Copied!" : "Copy BibTeX"}
                          </button>
                        </div>
                        <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-indigo-300 border border-slate-800/80 overflow-x-auto">
                          {getBibtex()}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Research Gaps Tab */}
                  {activeTab === "gaps" && (
                    <div className="space-y-4">
                      {gapsLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                          <p className="text-xs text-slate-400">Analyzing limitations and experimental gaps...</p>
                        </div>
                      ) : (
                        <div className="prose prose-invert max-w-none text-xs leading-relaxed text-slate-300 space-y-4 whitespace-pre-line bg-slate-900/10 p-5 rounded-2xl border border-slate-800/40">
                          {gaps}
                        </div>
                      )}
                    </div>
                  )}



                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl border border-slate-800/60 p-12 flex flex-col items-center justify-center text-center min-h-[580px]">
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-900 mb-4 animate-bounce">
                  <Brain className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Paper Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Select a paper from the Library on the left, or upload a new PDF to explore summarizations, citation mappings, and gap detection.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
