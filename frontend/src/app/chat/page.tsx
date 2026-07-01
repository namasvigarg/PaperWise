"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { 
  Send, 
  BookOpen, 
  MessageSquare, 
  FileText, 
  Loader2, 
  Check, 
  Sparkles,
  Link as LinkIcon,
  HelpCircle
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Paper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  page_count: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
}


const consolidateSections = (rawSections: Record<string, string>, abstractText: string): Record<string, string> => {
  const consolidated: Record<string, string> = {
    "Introduction": abstractText ? `Abstract:\n${abstractText}\n\n` : "",
    "Related Work": "",
    "Methodology": "",
    "Experiments": "",
    "Conclusion": ""
  };

  Object.entries(rawSections).forEach(([rawKey, text]) => {
    const rawKeyLower = rawKey.toLowerCase();
    
    // Ignore Abstract key if it is identical to raw text since we already prepended abstractText
    if (rawKeyLower === "abstract") {
      return;
    }

    let matchedCategory: "Introduction" | "Related Work" | "Methodology" | "Experiments" | "Conclusion" | null = null;
    
    if (rawKeyLower.includes("introduction") || rawKeyLower.includes("intro")) {
      matchedCategory = "Introduction";
    } else if (
      rawKeyLower.includes("related work") || 
      rawKeyLower.includes("literature review") || 
      rawKeyLower.includes("literature") || 
      rawKeyLower.includes("autonomy and new technologies") || 
      rawKeyLower.includes("autonomy")
    ) {
      matchedCategory = "Related Work";
    } else if (
      rawKeyLower.includes("methodology") || 
      rawKeyLower.includes("method") || 
      rawKeyLower.includes("data collection") || 
      rawKeyLower.includes("participants") || 
      rawKeyLower.includes("research question") || 
      rawKeyLower.includes("design")
    ) {
      matchedCategory = "Methodology";
    } else if (
      rawKeyLower.includes("experiments") || 
      rawKeyLower.includes("experiment") || 
      rawKeyLower.includes("findings") || 
      rawKeyLower.includes("results") || 
      rawKeyLower.includes("usage") || 
      rawKeyLower.includes("resources") || 
      rawKeyLower.includes("encounters") || 
      rawKeyLower.includes("language practiced") || 
      rawKeyLower.includes("study performance")
    ) {
      matchedCategory = "Experiments";
    } else if (
      rawKeyLower.includes("conclusion") || 
      rawKeyLower.includes("discussion") || 
      rawKeyLower.includes("future work") || 
      rawKeyLower.includes("limitations")
    ) {
      matchedCategory = "Conclusion";
    }
    
    if (!matchedCategory) {
      if (rawKeyLower.startsWith("1") || rawKeyLower.includes("title page") || rawKeyLower.includes("research paper") || rawKeyLower.includes("metadata") || rawKeyLower.includes("mariusz kruk")) {
        matchedCategory = "Introduction";
      } else if (rawKeyLower.startsWith("2")) {
        matchedCategory = "Related Work";
      } else if (rawKeyLower.startsWith("3")) {
        matchedCategory = "Methodology";
      } else if (rawKeyLower.startsWith("4")) {
        matchedCategory = "Experiments";
      } else if (rawKeyLower.startsWith("5") || rawKeyLower.startsWith("6")) {
        matchedCategory = "Conclusion";
      }
    }

    if (matchedCategory) {
      consolidated[matchedCategory] = consolidated[matchedCategory]
        ? consolidated[matchedCategory] + "\n\n" + text
        : text;
    }
  });

  if (!consolidated["Introduction"]) {
    consolidated["Introduction"] = "No explicit Introduction content extracted from the paper.";
  }
  if (!consolidated["Related Work"]) {
    consolidated["Related Work"] = "No explicit Related Work or Literature Review content extracted from the paper.";
  }
  if (!consolidated["Methodology"]) {
    consolidated["Methodology"] = "No explicit Methodology content extracted from the paper.";
  }
  if (!consolidated["Experiments"]) {
    consolidated["Experiments"] = "No explicit Experiments or Findings content extracted from the paper.";
  }
  if (!consolidated["Conclusion"]) {
    consolidated["Conclusion"] = "No explicit Conclusion or Discussion content extracted from the paper.";
  }

  Object.keys(consolidated).forEach((key) => {
    consolidated[key] = consolidated[key].trim();
  });

  return consolidated;
};

export default function ChatPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  
  // Paper sections
  const [sections, setSections] = useState<Dict<string>>({});
  const [activeSection, setActiveSection] = useState<string>("");
  const [sectionsLoading, setSectionsLoading] = useState<boolean>(false);

  // Chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPapers();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Save messages to sessionStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("chat_messages", JSON.stringify(messages));
    }
  }, [messages]);

  const fetchPapers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/papers`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data);
        if (data.length > 0) {
          const savedPaperId = sessionStorage.getItem("chat_selected_paper_id");
          const savedPaper = data.find((p: Paper) => p.id === savedPaperId);
          if (savedPaper) {
            handleSelectPaper(savedPaper, true);
          } else {
            handleSelectPaper(data[0], false);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching papers:", e);
    }
  };

  const handleSelectPaper = async (paper: Paper, restore: boolean = false) => {
    setSelectedPaper(paper);
    sessionStorage.setItem("chat_selected_paper_id", paper.id);

    if (restore) {
      const savedMessages = sessionStorage.getItem("chat_messages");
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([
          {
            role: "assistant",
            content: `Hi! I have successfully indexed **${paper.title}**. Ask me anything about the methodology, dataset, results, or limitations, and I will cite the specific pages and sections in my answer.`
          }
        ]);
      }
      const savedActiveSection = sessionStorage.getItem("chat_active_section");
      if (savedActiveSection) {
        setActiveSection(savedActiveSection);
      } else {
        setActiveSection("Introduction");
      }
    } else {
      const initialMsgs = [
        {
          role: "assistant" as const,
          content: `Hi! I have successfully indexed **${paper.title}**. Ask me anything about the methodology, dataset, results, or limitations, and I will cite the specific pages and sections in my answer.`
        }
      ];
      setMessages(initialMsgs);
      sessionStorage.setItem("chat_messages", JSON.stringify(initialMsgs));
      sessionStorage.setItem("chat_active_section", "Introduction");
      setActiveSection("Introduction");
    }

    setSectionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/papers/${paper.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sections && Object.keys(data.sections).length > 0) {
          const consolidated = consolidateSections(data.sections, paper.abstract);
          setSections(consolidated);
        } else {
          setSections({
            "Introduction": paper.abstract || "No content available",
            "Related Work": "No content available",
            "Methodology": "No content available",
            "Experiments": "No content available",
            "Conclusion": "No content available"
          });
        }
      } else {
        setSections({
          "Introduction": paper.abstract || "No content available",
          "Related Work": "No content available",
          "Methodology": "No content available",
          "Experiments": "No content available",
          "Conclusion": "No content available"
        });
      }
    } catch (e) {
      console.error(e);
      setSections({
        "Introduction": paper.abstract || "No content available",
        "Related Work": "No content available",
        "Methodology": "No content available",
        "Experiments": "No content available",
        "Conclusion": "No content available"
      });
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedPaper) return;
    
    const userMsg = inputMessage;
    setInputMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper_id: selectedPaper.id,
          message: userMsg
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev, 
          { 
            role: "assistant", 
            content: data.answer, 
            sources: data.sources 
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I encountered an error answering your question. Please verify your connection." }
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error connecting to backend API." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper to parse citations in text and highlight them as links
  const parseCitations = (text: string) => {
    // Matches patterns like [Page 3, Section: Methodology] or [Page 4]
    const citationRegex = /\[Page\s+(\d+)(?:,\s+Section:\s*([^\]]+))?\]/gi;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      // Add text before match
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const pageNum = match[1];
      const sectionName = match[2] || "";
      const citationText = match[0];

      // Render citation link
      parts.push(
        <button
          key={matchIndex}
          onClick={() => {
            // Find section and select it in the browser
            if (sectionName) {
              const matchedSec = Object.keys(sections).find(s => s.toLowerCase().includes(sectionName.toLowerCase()));
              if (matchedSec) {
                setActiveSection(matchedSec);
                sessionStorage.setItem("chat_active_section", matchedSec);
              }
            } else {
              // Select introduction as fallback
              setActiveSection("Introduction");
              sessionStorage.setItem("chat_active_section", "Introduction");
            }
          }}
          className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[11px] font-bold border border-indigo-500/30 hover:bg-indigo-500/40 hover:text-white transition-all mx-0.5"
        >
          {citationText}
        </button>
      );

      lastIndex = citationRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-[260px] p-8 max-w-7xl animate-fade-in flex flex-col h-screen">
        
        {/* Top bar with paper selector */}
        <header className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">RAG Mode</span>
            <h1 className="text-3xl font-extrabold font-outfit text-white tracking-tight mt-0.5">
              Chat with <span className="text-gradient">Paper</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Selector */}
            <select
              value={selectedPaper?.id || ""}
              onChange={(e) => {
                const pap = papers.find(p => p.id === e.target.value);
                if (pap) handleSelectPaper(pap);
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[280px]"
            >
              {papers.length === 0 && <option>No papers indexed</option>}
              {papers.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </header>

        {selectedPaper ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 mb-6">
            
            {/* Left Pane: Paper browser */}
            <div className="lg:col-span-5 glass-panel rounded-3xl border border-slate-800/60 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4.5 bg-slate-950/40 border-b border-slate-800/60 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Document Viewer
                </span>
                <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                  {selectedPaper.page_count} Pages
                </span>
              </div>

              {/* Sections list */}
              <div className="flex border-b border-slate-800/60 bg-slate-950/20 overflow-x-auto">
                {Object.keys(sections).map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      setActiveSection(sec);
                      sessionStorage.setItem("chat_active_section", sec);
                    }}
                    className={`px-4 py-3 text-[11px] font-bold border-b-2 whitespace-nowrap transition-all ${
                      activeSection === sec
                        ? "border-indigo-500 text-white bg-indigo-500/5"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>

              {/* Section Content Display */}
              <div className="p-6 flex-1 overflow-y-auto">
                {sectionsLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed text-slate-300 whitespace-pre-line">
                    <h3 className="text-sm font-bold text-white mb-3">{activeSection}</h3>
                    {sections[activeSection]}
                  </div>
                )}
              </div>
            </div>

            {/* Right Pane: Chat Interface */}
            <div className="lg:col-span-7 glass-panel rounded-3xl border border-slate-800/60 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Co-Pilot</span>
              </div>

              {/* Messages list */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 max-w-[85%] ${
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-slate-900/80 border border-slate-800/80 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      {msg.role === "user" ? msg.content : parseCitations(msg.content)}
                    </div>
                    
                    {/* Render Citations Sources if assistant */}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 w-full space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Retrieved References:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {msg.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              title={src.text}
                              className="text-[9px] bg-slate-950 border border-slate-850 text-slate-400 px-2 py-1 rounded hover:border-slate-800 transition-all flex items-center gap-1 cursor-default"
                            >
                              <LinkIcon className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                              <span>Page {src.page_num} ({src.section})</span>
                              <span className="text-indigo-500/80 font-bold ml-1">{(src.score * 100).toFixed(0)}% Match</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-850 p-4 rounded-2xl max-w-[120px] rounded-bl-none text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-slate-950/40 border-t border-slate-800/60 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Ask about methodology, main datasets, mathematical blocks..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || chatLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-3 rounded-xl shadow-lg shadow-indigo-600/10 transition-all shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="glass-panel rounded-3xl border border-slate-800/60 p-12 flex flex-col items-center justify-center text-center flex-grow mb-6">
            <BookOpen className="w-10 h-10 text-indigo-400 animate-pulse mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">No Papers Indexed</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Please go back to the Dashboard page and upload a research paper to index it for RAG Chat capability.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper typing dictionary
type Dict<T> = { [key: string]: T };
