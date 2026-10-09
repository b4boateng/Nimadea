"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";
import {
  FolderPlus,
  Trash2,
  BookOpen,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
  FileText
} from "lucide-react";

type Workspace = {
  id: number;
  name: string;
  description: string;
  target_hours: number;
  studied_hours: number;
  documents: { id: number; title: string }[];
  created_at: string;
};

export default function WorkspacesDashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [targetHours, setTargetHours] = useState(10);
  const [toast, setToast] = useState({
    show: false,
    msg: "",
    type: "success" as "success" | "error",
  });

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 4000);
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await authFetch("/api/workspaces/");
      
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setWorkspaces(data);
      } else {
        showToast("Failed to load notebooks (Invalid server response).", "error");
        console.error("Expected JSON but received:", contentType);
      }
    } catch (err) {
      console.error(err);
      showToast("Network error connecting to backend.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // The request updates state after the external fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await authFetch("/api/workspaces/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          target_hours: targetHours,
        }),
      });

      if (res.ok) {
        setNewName("");
        setNewDesc("");
        setTargetHours(10);
        setShowModal(false);
        await fetchWorkspaces();
        showToast("Notebook created successfully!", "success");
      } else {
        showToast("Failed to create notebook.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error creating notebook.", "error");
    }
  };

  const handleDeleteWorkspace = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this notebook and all its indexed files?")) {
      return;
    }

    try {
      const res = await authFetch(`/api/workspaces/${id}/`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 204) {
        setWorkspaces((prev) => prev.filter((w) => w.id !== id));
        showToast("Notebook deleted successfully.", "success");
      } else {
        showToast("Failed to delete notebook.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error deleting notebook.", "error");
    }
  };

  return (
    <main className="min-h-screen bg-appDark text-appText p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-brandBlue to-aiPurple bg-clip-text text-transparent">
              Nimadea Study Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Select or create a subject notebook to manage documents, track hours, and query Ollama.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-aiPurple hover:bg-aiPurple/80 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-lg cursor-pointer"
          >
            <FolderPlus size={20} />
            <span>New Notebook</span>
          </button>
        </div>

        {/* Workspaces Content Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse">
            Loading your study notebooks...
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20 bg-appGray/40 border border-slate-800 rounded-2xl p-8">
            <BookOpen size={48} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-medium text-slate-300">No notebooks created yet</h3>
            <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
              Create your first subject folder to start organizing study materials and interacting with the local AI.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-brandBlue text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-brandBlue/80 transition cursor-pointer"
            >
              Create First Notebook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => {
              const progress =
                ws.target_hours > 0
                  ? Math.min(Math.round((ws.studied_hours / ws.target_hours) * 100), 100)
                  : 0;

              return (
                <Link
                  key={ws.id}
                  href={`/workspaces/${ws.id}`}
                  className="bg-appGray border border-slate-700/60 rounded-2xl p-6 hover:border-brandBlue transition-all shadow-xl flex flex-col justify-between group relative cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h3 className="text-xl font-semibold text-slate-100 group-hover:text-brandBlue transition truncate">
                        {ws.name}
                      </h3>
                      <button
                        onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title="Delete Notebook"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-6">
                      {ws.description || "No notebook description provided."}
                    </p>
                  </div>

                  <div>
                    {/* Hours Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-brandBlue" /> Studied: {ws.studied_hours}h / {ws.target_hours}h
                        </span>
                        <span className="font-semibold text-slate-300">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-successGreen h-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-700/50 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} className="text-aiPurple" />
                        {ws.documents?.length || 0} files indexed
                      </span>
                      <span className="flex items-center gap-1 text-brandBlue font-medium group-hover:translate-x-1 transition-transform">
                        Open Notebook <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-appGray border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <h2 className="text-xl font-bold mb-4 text-slate-100">Create Subject Notebook</h2>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Notebook / Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-brandBlue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Topics, lecture notes, syllabus..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-brandBlue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Target Study Hours
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetHours}
                  onChange={(e) => setTargetHours(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-brandBlue"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-aiPurple text-white hover:bg-aiPurple/80 transition cursor-pointer"
                >
                  Create Notebook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast */}
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