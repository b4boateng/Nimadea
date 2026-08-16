"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, Send, Trash2, Bot, User, CheckCircle, AlertCircle } from "lucide-react";

type Message = { role: "user" | "ai"; content: string };
type ToastState = { show: boolean; msg: string; type: "success" | "error" };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! Upload your study documents and ask me anything about them." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState>({ show: false, msg: "", type: "success" });
  
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "kb">("chat"); // Mobile tab state
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3000);
  };

  // --- API LOGIC: QUERY OLLAMA ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userQuery = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/api/query/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!res.ok) throw new Error("Network response was not ok");
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", content: data.ai_response || "Sorry, I couldn't find an answer." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", content: "⚠️ Connection error. Make sure Django and Docker are running." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- API LOGIC: UPLOAD DOCUMENT ---
  const handleFileUpload = async (file: File) => {
    const validTypes = ['application/pdf', 'text/plain', 'text/csv', 'text/markdown'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|csv|md)$/i)) {
      showToast("Invalid file type. Use PDF, TXT, CSV, or MD", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/upload/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      
      setUploadedFiles(prev => [...prev, file.name]);
      showToast("File uploaded and indexed!", "success");
    } catch (error) {
      showToast("Upload failed. Ensure Django is running.", "error");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full relative">
      
      {/* MOBILE TABS */}
      <div className="md:hidden flex p-4 pb-0 z-10">
        <div className="flex p-1 bg-appGray rounded-full w-full">
          <button onClick={() => setActiveTab("chat")} className={`flex-1 py-2 text-sm rounded-full transition-colors ${activeTab === "chat" ? "bg-brandBlue text-white" : "text-slate-400"}`}>Chat</button>
          <button onClick={() => setActiveTab("kb")} className={`flex-1 py-2 text-sm rounded-full transition-colors ${activeTab === "kb" ? "bg-brandBlue text-white" : "text-slate-400"}`}>Knowledge Base</button>
        </div>
      </div>

      {/* LEFT COLUMN: KNOWLEDGE BASE (Hidden on Mobile unless KB tab is active) */}
      <div className={`${activeTab === "kb" ? "flex" : "hidden"} md:flex w-full md:w-80 flex-shrink-0 bg-appDark border-r border-slate-700/50 flex-col p-6 gap-6 overflow-y-auto`}>
        <div>
          <h2 className="text-lg font-semibold text-appText mb-1">Knowledge Base</h2>
          <p className="text-sm text-slate-400">Upload documents to build your RAG context.</p>
        </div>

        {/* Drag & Drop Zone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragging ? "border-brandBlue bg-brandBlue/10" : "border-slate-700 hover:border-brandBlue hover:bg-slate-800/50"}`}
        >
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} className="hidden" accept=".pdf,.txt,.csv,.md" />
          <UploadCloud size={32} className={`mb-3 ${isDragging ? "text-brandBlue" : "text-slate-400"}`} />
          <span className="text-sm font-medium text-appText">Tap or Drag & Drop</span>
          <span className="text-xs text-slate-500 mt-1">.pdf, .txt, .csv, .md</span>
        </div>

        {/* Uploaded Files List */}
        <div className="flex-1 flex flex-col gap-3">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Indexed Files ({uploadedFiles.length})</h3>
          {uploadedFiles.map((fileName, idx) => (
            <div key={idx} className="bg-appGray rounded-lg p-3 flex items-center gap-3 border border-slate-700/50">
              <FileText size={18} className="text-brandBlue flex-shrink-0" />
              <span className="text-sm text-appText truncate flex-1">{fileName}</span>
              <CheckCircle size={16} className="text-successGreen flex-shrink-0" />
            </div>
          ))}
          {uploadedFiles.length === 0 && (
            <div className="text-center p-4 text-sm text-slate-500 bg-appGray rounded-lg border border-slate-700/50">No files uploaded yet.</div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: AI CHAT (Hidden on Mobile unless Chat tab is active) */}
      <div className={`${activeTab === "chat" ? "flex" : "hidden"} md:flex flex-1 flex-col bg-appDark relative pb-16 md:pb-0`}>
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-4 max-w-3xl ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${msg.role === "user" ? "bg-brandBlue" : "bg-aiPurple"}`}>
                {msg.role === "user" ? <User size={18} className="text-white" /> : <Bot size={20} className="text-white" />}
              </div>
              <div className={`rounded-2xl p-4 shadow-sm ${msg.role === "user" ? "bg-brandBlue text-white rounded-tr-sm" : "bg-appGray text-appText rounded-tl-sm border border-slate-700/50"}`}>
                <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {/* Thinking Indicator */}
          {isTyping && (
            <div className="flex items-start gap-4 max-w-3xl self-start">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-aiPurple flex items-center justify-center flex-shrink-0 shadow-md">
                 <Bot size={20} className="text-white" />
               </div>
               <div className="bg-appGray rounded-2xl rounded-tl-sm p-5 border border-slate-700/50 flex gap-2">
                 <div className="w-2 h-2 rounded-full bg-aiPurple animate-bounce" style={{ animationDelay: "0ms" }}></div>
                 <div className="w-2 h-2 rounded-full bg-aiPurple animate-bounce" style={{ animationDelay: "150ms" }}></div>
                 <div className="w-2 h-2 rounded-full bg-aiPurple animate-bounce" style={{ animationDelay: "300ms" }}></div>
               </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-appDark via-appDark to-transparent">
          <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..." 
              disabled={isTyping}
              className="w-full bg-appGray border border-slate-600 rounded-full py-4 pl-6 pr-14 text-sm md:text-base text-appText placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brandBlue focus:border-transparent shadow-lg transition-all"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isTyping}
              className="absolute right-2 w-10 h-10 rounded-full bg-aiPurple flex items-center justify-center text-white hover:bg-aiPurple/80 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-2 hidden md:block">
            <span className="text-xs text-slate-500">AI can make mistakes. Consider verifying important information from the source documents.</span>
          </div>
        </div>

      </div>

      {/* Global Toast Notification */}
      <div className={`fixed bottom-24 md:bottom-8 right-4 md:right-8 transform transition-transform duration-300 ${toast.show ? "translate-y-0" : "translate-y-[150%]"} ${toast.type === "success" ? "bg-successGreen" : "bg-red-500"} text-white py-3 px-5 rounded-xl shadow-2xl flex items-center gap-3 z-50`}>
        {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span className="text-sm font-medium">{toast.msg}</span>
      </div>

    </div>
  );
}