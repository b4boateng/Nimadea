"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, Send, Trash2, Bot, User, CheckCircle, AlertCircle } from "lucide-react";
import FileList from '@/components/FileList';

type Message = { role: "user" | "ai"; content: string };
type ToastState = { show: boolean; msg: string; type: "success" | "error" };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! Upload your study documents and ask me anything about them." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, msg: "", type: "success" });
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "kb">("chat"); 
  
  // A trigger state to force FileList component to refetch when a new file uploads successfully
  const [refreshKey, setRefreshKey] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Handle File Upload to Django Backend
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/upload/", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        showToast(`Successfully indexed "${file.name}"!`, "success");
        // Trigger the file list sidebar to re-fetch from the database instantly
        setRefreshKey(prev => prev + 1);
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to upload file.", "error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast("Network error connecting to Django backend.", "error");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Handle Chat Submission to Django AI Query Endpoint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userQuery = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/api/query/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "ai", content: data.ai_response }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", content: "Error: Failed to retrieve answer from local AI model." }]);
      }
    } catch (error) {
      console.error("Query error:", error);
      setMessages(prev => [...prev, { role: "ai", content: "Network error connecting to the AI backend." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <main className="flex h-screen bg-appDark text-appText overflow-hidden">
      
      {/* Sidebar / Knowledge Base Panel */}
      <aside className={`w-full md:w-80 bg-appGray border-r border-slate-800 flex flex-col p-4 space-y-4 ${activeTab === 'kb' ? 'flex' : 'hidden md:flex'}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-brandBlue tracking-wide">Nimadea AI</h1>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md border border-slate-700">RAG + Ollama</span>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
            isDragging ? 'border-brandBlue bg-brandBlue/10' : 'border-slate-700 hover:border-slate-500 bg-appDark/50'
          }`}
        >
          <UploadCloud size={32} className="text-brandBlue animate-pulse" />
          <p className="text-xs text-slate-300 font-medium">Drag & drop files here, or <span className="text-brandBlue underline">browse</span></p>
          <p className="text-[10px] text-slate-500">Supports PDF, TXT, MD</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".pdf,.txt,.md"
          />
        </div>

        {/* Live Persistent File Listing Component */}
        <div className="flex-1 overflow-y-auto">
          <FileList key={refreshKey} />
        </div>
      </aside>

      {/* Main Chat Interface */}
      <section className={`flex-1 flex flex-col h-full bg-appDark ${activeTab === 'chat' ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Mobile Navigation Header */}
        <div className="md:hidden flex border-b border-slate-800 bg-appGray">
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`flex-1 py-3 text-xs font-semibold text-center ${activeTab === 'chat' ? 'text-brandBlue border-b-2 border-brandBlue' : 'text-slate-400'}`}
          >
            Chat Workspace
          </button>
          <button 
            onClick={() => setActiveTab('kb')} 
            className={`flex-1 py-3 text-xs font-semibold text-center ${activeTab === 'kb' ? 'text-brandBlue border-b-2 border-brandBlue' : 'text-slate-400'}`}
          >
            Knowledge Base
          </button>
        </div>

        {/* Chat Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brandBlue text-white' : 'bg-aiPurple text-white shadow-lg'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md ${
                msg.role === 'user' 
                  ? 'bg-brandBlue text-white rounded-tr-none' 
                  : 'bg-appGray text-appText border border-slate-700 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-3 max-w-3xl mx-auto">
              <div className="w-8 h-8 rounded-full bg-aiPurple text-white flex items-center justify-center shrink-0 shadow-lg">
                <Bot size={16} />
              </div>
              <div className="bg-appGray text-slate-400 p-4 rounded-2xl rounded-tl-none border border-slate-700 text-sm flex items-center space-x-2">
                <span className="w-2 h-2 bg-brandBlue rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-brandBlue rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-brandBlue rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Form */}
        <div className="p-4 md:p-6 bg-appDark border-t border-slate-800">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your uploaded documents..."
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
            <span className="text-xs text-slate-500">AI can make mistakes. Verify important information from source documents.</span>
          </div>
        </div>
      </section>

      {/* Global Toast Notification */}
      <div className={`fixed bottom-24 md:bottom-8 right-4 md:right-8 transform transition-transform duration-300 ${toast.show ? "translate-y-0" : "translate-y-[150%]"} ${toast.type === "success" ? "bg-successGreen" : "bg-red-500"} text-white py-3 px-5 rounded-xl shadow-2xl flex items-center gap-3 z-50`}>
        {toast.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span className="text-sm font-medium">{toast.msg}</span>
      </div>

    </main>
  );
}