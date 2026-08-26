"use client";
import { useState, useRef, useEffect, use } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Send,
  Trash2,
  Bot,
  User,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  Square,
  Clock,
  CheckCheck,
  Menu,
  X
} from "lucide-react";
import StudyTimer from "@/components/StudyTimer";

type Message = { role: "user" | "ai"; content: string };
type DocumentType = { id: number; title: string; uploaded_at: string };
type WorkspaceType = {
  id: number;
  name: string;
  description: string;
  target_hours: number;
  studied_hours: number;
  documents: DocumentType[];
  created_at: string;
};

export default function WorkspaceChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  const [workspace, setWorkspace] = useState<WorkspaceType | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hello! Upload or check the documents in the sidebar that you would like me to reference, then ask your question.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // NEW: State to track which AI model the user wants to use
  const [mode, setMode] = useState<"fast" | "power">("fast");
  
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    msg: "",
    type: "success" as "success" | "error",
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWorkspace = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/workspaces/${workspaceId}/`, {
        headers: {
          "Accept": "application/json",
        },
      });
      
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data: WorkspaceType = await res.json();
        
        data.documents = data.documents || [];
        setWorkspace(data);

        setSelectedDocIds((prev) => {
          if (prev.length === 0 && data.documents.length > 0) {
            return data.documents.map((d) => d.id);
          }
          const activeIds = new Set(data.documents.map((d) => d.id));
          return prev.filter((id) => activeIds.has(id));
        });
      } else {
        showToast("Notebook not found or invalid response.", "error");
        console.error("Expected JSON but received:", contentType);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to connect to backend server.", "error");
    } finally {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 4000);
  };

  const toggleDocSelection = (id: number) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!workspace || !workspace.documents) return;
    if (selectedDocIds.length === workspace.documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(workspace.documents.map((d) => d.id));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("workspace_id", workspaceId);

    setUploading(true);
    try {
      const res = await fetch("http://localhost:8000/api/upload/", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        showToast("Document indexed successfully!", "success");
        await fetchWorkspace();
      } else {
        showToast("File upload failed.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network upload error.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document from the notebook?")) return;

    try {
      const res = await fetch(`http://localhost:8000/api/documents/${docId}/`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 204) {
        showToast("Document deleted.", "success");
        setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
        await fetchWorkspace();
      } else {
        showToast("Failed to delete document.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error deleting document.", "error");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    if (selectedDocIds.length === 0) {
      showToast("Please check at least one document in the sidebar.", "error");
      return;
    }

    const userQuery = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/api/ai-query/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json" 
        },
        body: JSON.stringify({
          query: userQuery,
          document_ids: selectedDocIds,
          mode: mode // NEW: Pass the selected mode to Django
        }),
      });

      const contentType = res.headers.get("content-type");
      
      // Safe parsing
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        
        if (res.ok) {
          setMessages((prev) => [...prev, { role: "ai", content: data.ai_response }]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: data.error || "Failed to retrieve an answer." },
          ]);
        }
      } else {
        console.error("Server returned non-JSON response:", res.status);
        setMessages((prev) => [
          ...prev, 
          { role: "ai", content: "Server Error: Django returned an invalid response. Check your terminal." }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Error connecting to backend AI service." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const docs = workspace?.documents || [];
  const progress =
    workspace && workspace.target_hours > 0
      ? Math.min(Math.round((workspace.studied_hours / workspace.target_hours) * 100), 100)
      : 0;

  if (loadingWorkspace) {
    return (
      <main className="min-h-screen bg-appDark text-slate-400 flex items-center justify-center">
        <p className="animate-pulse">Loading notebook workspace...</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-appDark text-appText overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Left Sidebar: Document List & Scoped Toggles */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 bg-appGray border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-300 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-slate-800">
          <div className="flex justify-between items-center mb-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brandBlue hover:underline"
            >
              <ArrowLeft size={14} /> Back to Notebooks
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="text-slate-400 hover:text-white md:hidden cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <h2 className="text-xl font-bold text-slate-100 truncate">{workspace?.name || "Notebook"}</h2>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {workspace?.description || "No notebook description."}
          </p>

          {/* Notebook Study Progress Meter */}
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-brandBlue" /> Progress
              </span>
              <span>
                {workspace?.studied_hours ?? 0}h / {workspace?.target_hours ?? 0}h ({progress}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-successGreen h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Document Selection Scope */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Context Scope ({selectedDocIds.length}/{docs.length})</span>
            {docs.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-brandBlue hover:underline lowercase text-xs flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={12} />
                {selectedDocIds.length === docs.length ? "none" : "all"}
              </button>
            )}
          </div>

          {docs.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-900/50 border border-slate-800/80 rounded-xl">
              <FileText size={28} className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">No documents in this notebook.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Upload a PDF or TXT file below.</p>
            </div>
          ) : (
            docs.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDocSelection(doc.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                    isSelected
                      ? "bg-slate-800/90 border-brandBlue/60 text-slate-100 shadow-xs"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {isSelected ? (
                      <CheckSquare size={16} className="text-brandBlue shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-600 shrink-0" />
                    )}
                    <FileText size={16} className="text-aiPurple shrink-0" />
                    <span className="text-xs font-medium truncate" title={doc.title}>
                      {doc.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Upload Action Button */}
        <div className="p-4 border-t border-slate-800 bg-appGray">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.txt,.md"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-brandBlue hover:bg-brandBlue/80 text-white py-3 rounded-xl text-sm font-medium transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            <UploadCloud size={18} />
            <span>{uploading ? "Indexing..." : "Upload Document"}</span>
          </button>
        </div>
      </aside>

      {/* Main RAG Chat Interface */}
      <section className="flex-1 flex flex-col h-full bg-appDark relative min-w-0">
        {/* Workspace Top Bar */}
        <header className="h-16 border-b border-slate-800 flex items-center px-4 md:px-6 justify-between bg-appDark/80 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div className="truncate">
              <h1 className="text-sm font-bold text-slate-200 truncate">{workspace?.name || "Workspace"}</h1>
              <span className="text-[11px] text-slate-500">
                {selectedDocIds.length} of {docs.length} files in RAG context
              </span>
            </div>
          </div>

          {/* Embedded Study Timer Widget */}
          <div className="flex items-center gap-3">
            <StudyTimer workspaceId={workspaceId} onHoursLogged={fetchWorkspace} />
          </div>
        </header>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((m, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 max-w-3xl ${
                m.role === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  m.role === "user" ? "bg-brandBlue text-white" : "bg-aiPurple text-white"
                }`}
              >
                {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                  m.role === "user"
                    ? "bg-brandBlue text-white rounded-tr-none"
                    : "bg-appGray border border-slate-700/60 text-slate-200 rounded-tl-none"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-3 max-w-3xl">
              <div className="w-8 h-8 rounded-full bg-aiPurple text-white flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="p-4 rounded-2xl bg-appGray border border-slate-700/60 text-slate-400 text-sm animate-pulse rounded-tl-none">
                Searching scoped documents and generating answer...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Query Input Footer */}
        <div className="p-4 md:p-6 border-t border-slate-800 bg-appDark">
          
          {/* NEW: Model Selection Toggle */}
          <div className="flex items-center gap-2 mb-3 max-w-4xl mx-auto md:px-0">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">AI Mode:</span>
            <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setMode("fast")}
                className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${mode === "fast" ? "bg-brandBlue text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Fast (Flash)
              </button>
              <button
                type="button"
                onClick={() => setMode("power")}
                className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${mode === "power" ? "bg-aiPurple text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Power (Pro)
              </button>
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedDocIds.length === 0
                  ? "Select documents in the sidebar to begin chatting..."
                  : "Ask questions based on the checked files..."
              }
              disabled={isTyping || selectedDocIds.length === 0}
              className="w-full bg-appGray border border-slate-600 rounded-full py-4 pl-6 pr-14 text-sm md:text-base text-appText placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brandBlue shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping || selectedDocIds.length === 0}
              className="absolute right-2 w-10 h-10 rounded-full bg-aiPurple flex items-center justify-center text-white hover:bg-aiPurple/80 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-2 hidden md:block">
            <span className="text-xs text-slate-500">
              Answers are strictly synthesized from files checked in this notebook.
            </span>
          </div>
        </div>
      </section>

      {/* Global Toast Notification */}
      <div
        className={`fixed bottom-8 right-8 transform transition-transform duration-300 ${
          toast.show ? "translate-y-0" : "translate-y-[150%]"
        } ${toast.type === "success" ? "bg-successGreen" : "bg-red-500"} text-white py-3 px-5 rounded-xl shadow-2xl flex items-center gap-3 z-50`}
      >
        {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span className="text-sm font-medium">{toast.msg}</span>
      </div>
    </main>
  );
}