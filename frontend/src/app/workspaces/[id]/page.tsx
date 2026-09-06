"use client";

import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

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
  X,
} from "lucide-react";

import StudyTimer from "@/components/StudyTimer";

/* =========================================================
   TYPES
========================================================= */

type Message = {
  role: "user" | "ai";
  content: string;
  sources?: SourceType[];
};

type SourceType = {
  document_id: number;
  section?: string;
  subsection?: string;
  page_number?: number | null;
  score?: number;
};

type DocumentType = {
  id: number;
  title: string;
  uploaded_at: string;
};

type WorkspaceType = {
  id: number;
  name: string;
  description: string;
  target_hours: number;
  studied_hours: number;
  documents: DocumentType[];
  created_at: string;
};

type ToastState = {
  show: boolean;
  msg: string;
  type: "success" | "error";
};

/* =========================================================
   MARKDOWN RENDERER
========================================================= */

function AIResponse({
  content,
}: {
  content: string;
}) {
  return (
    <div className="ai-markdown">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkMath,
        ]}
        rehypePlugins={[
          rehypeKatex,
        ]}
        components={{
          /*
           * Tables are wrapped so wide tables can scroll
           * horizontally instead of breaking the chat layout.
           */
          table: ({ children }) => (
            <div className="table-wrapper">
              <table>{children}</table>
            </div>
          ),

          /*
           * Make links open safely in a new tab.
           */
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          /*
           * Code blocks.
           */
          pre: ({ children }) => (
            <pre className="code-block">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function WorkspaceChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;

  /* =======================================================
     STATE
  ======================================================= */

  const [workspace, setWorkspace] =
    useState<WorkspaceType | null>(null);

  const [loadingWorkspace, setLoadingWorkspace] =
    useState(true);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hello! Upload or check the documents in the sidebar that you would like me to reference, then ask your question.",
    },
  ]);

  const [input, setInput] = useState("");

  const [isTyping, setIsTyping] =
    useState(false);

  const [mode, setMode] =
    useState<"fast" | "power">("fast");

  const [selectedDocIds, setSelectedDocIds] =
    useState<number[]>([]);

  const [uploading, setUploading] =
    useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const [toast, setToast] =
    useState<ToastState>({
      show: false,
      msg: "",
      type: "success",
    });

  /* =======================================================
     REFS
  ======================================================= */

  const chatEndRef =
    useRef<HTMLDivElement>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /* =======================================================
     TOAST
  ======================================================= */

  const showToast = useCallback((
    msg: string,
    type: "success" | "error"
  ) => {
    setToast({
      show: true,
      msg,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        msg: "",
        type: "success",
      });
    }, 4000);
  }, []);

  /* =======================================================
     FETCH WORKSPACE
  ======================================================= */

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/workspaces/${workspaceId}/`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const contentType =
        res.headers.get("content-type");

      if (
        res.ok &&
        contentType?.includes("application/json")
      ) {
        const data: WorkspaceType =
          await res.json();

        data.documents =
          data.documents || [];

        setWorkspace(data);

        /*
         * Automatically select all documents
         * the first time the workspace loads.
         *
         * Existing selections are preserved where
         * possible after uploading/deleting documents.
         */
        setSelectedDocIds((previous) => {
          if (
            previous.length === 0 &&
            data.documents.length > 0
          ) {
            return data.documents.map(
              (document) => document.id
            );
          }

          const activeDocumentIds =
            new Set(
              data.documents.map(
                (document) => document.id
              )
            );

          return previous.filter((id) =>
            activeDocumentIds.has(id)
          );
        });
      } else {
        showToast(
          "Notebook not found or invalid response.",
          "error"
        );

        console.error(
          "Expected JSON but received:",
          contentType
        );
      }
    } catch (error) {
      console.error(
        "Workspace fetch error:",
        error
      );

      showToast(
        "Failed to connect to backend server.",
        "error"
      );
    } finally {
      setLoadingWorkspace(false);
    }
  }, [showToast, workspaceId]);

  /* =======================================================
     INITIAL WORKSPACE LOAD
  ======================================================= */

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkspace();
  }, [fetchWorkspace]);

  /* =======================================================
     AUTO-SCROLL CHAT
  ======================================================= */

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  /* =======================================================
     DOCUMENT SELECTION
  ======================================================= */

  const toggleDocSelection = (
    documentId: number
  ) => {
    setSelectedDocIds((previous) =>
      previous.includes(documentId)
        ? previous.filter(
            (id) => id !== documentId
          )
        : [...previous, documentId]
    );
  };

  const toggleSelectAll = () => {
    if (
      !workspace ||
      !workspace.documents
    ) {
      return;
    }

    const allSelected =
      selectedDocIds.length ===
      workspace.documents.length;

    if (allSelected) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(
        workspace.documents.map(
          (document) => document.id
        )
      );
    }
  };

  /* =======================================================
     FILE UPLOAD
  ======================================================= */

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    formData.append(
      "workspace_id",
      workspaceId
    );

    setUploading(true);

    try {
      const res = await fetch(
        "http://localhost:8000/api/upload/",
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.ok) {
        showToast(
          "Document indexed successfully!",
          "success"
        );

        await fetchWorkspace();
      } else {
        showToast(
          "File upload failed.",
          "error"
        );
      }
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      showToast(
        "Network upload error.",
        "error"
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /* =======================================================
     DELETE DOCUMENT
  ======================================================= */

  const handleDeleteDocument = async (
    documentId: number
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document from the notebook?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/api/documents/${documentId}/`,
        {
          method: "DELETE",
        }
      );

      if (
        res.ok ||
        res.status === 204
      ) {
        showToast(
          "Document deleted.",
          "success"
        );

        setSelectedDocIds((previous) =>
          previous.filter(
            (id) => id !== documentId
          )
        );

        await fetchWorkspace();
      } else {
        showToast(
          "Failed to delete document.",
          "error"
        );
      }
    } catch (error) {
      console.error(
        "Delete document error:",
        error
      );

      showToast(
        "Network error deleting document.",
        "error"
      );
    }
  };

  /* =======================================================
     SEND AI QUERY
  ======================================================= */

  const handleSendMessage = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !input.trim() ||
      isTyping
    ) {
      return;
    }

    if (
      selectedDocIds.length === 0
    ) {
      showToast(
        "Please check at least one document in the sidebar.",
        "error"
      );

      return;
    }

    const userQuery =
      input.trim();

    setInput("");

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userQuery,
      },
    ]);

    setIsTyping(true);

    try {
      const res = await fetch(
        "http://localhost:8000/api/ai-query/",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            query: userQuery,
            document_ids:
              selectedDocIds,
            workspace_id:
              Number(workspaceId),
            mode,
          }),
        }
      );

      const contentType =
        res.headers.get(
          "content-type"
        );

      if (
        contentType?.includes(
          "application/json"
        )
      ) {
        const data =
          await res.json();

        if (res.ok) {
          setMessages(
            (previous) => [
              ...previous,
              {
                role: "ai",
                content:
                  data.ai_response ||
                  "The AI returned an empty response.",
                sources: data.sources || [],
              },
            ]
          );
        } else {
          setMessages(
            (previous) => [
              ...previous,
              {
                role: "ai",
                content:
                  data.error ||
                  "Failed to retrieve an answer.",
              },
            ]
          );
        }
      } else {
        console.error(
          "Server returned non-JSON response:",
          res.status
        );

        setMessages(
          (previous) => [
            ...previous,
            {
              role: "ai",
              content:
                "Server Error: Django returned an invalid response. Check your backend terminal.",
            },
          ]
        );
      }
    } catch (error) {
      console.error(
        "AI query error:",
        error
      );

      setMessages(
        (previous) => [
          ...previous,
          {
            role: "ai",
            content:
              "Error connecting to backend AI service.",
          },
        ]
      );
    } finally {
      setIsTyping(false);
    }
  };

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const documents =
    workspace?.documents || [];

  const progress =
    workspace &&
    workspace.target_hours > 0
      ? Math.min(
          Math.round(
            (workspace.studied_hours /
              workspace.target_hours) *
              100
          ),
          100
        )
      : 0;

  const allDocumentsSelected =
    documents.length > 0 &&
    selectedDocIds.length ===
      documents.length;

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loadingWorkspace) {
    return (
      <main className="min-h-screen bg-appDark text-slate-400 flex items-center justify-center">
        <p className="animate-pulse">
          Loading notebook workspace...
        </p>
      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="flex h-screen bg-appDark text-appText overflow-hidden relative">

      {/* ===================================================
          MOBILE SIDEBAR OVERLAY
      =================================================== */}

      {mobileSidebarOpen && (
        <div
          onClick={() =>
            setMobileSidebarOpen(false)
          }
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 bg-appGray border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-300 ${
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >

        {/* -----------------------------------------------
            WORKSPACE HEADER
        ------------------------------------------------ */}

        <div className="p-5 border-b border-slate-800">

          <div className="flex justify-between items-center mb-3">

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brandBlue hover:underline"
            >
              <ArrowLeft size={14} />
              Back to Notebooks
            </Link>

            <button
              type="button"
              onClick={() =>
                setMobileSidebarOpen(false)
              }
              className="text-slate-400 hover:text-white md:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>

          </div>

          <h2 className="text-xl font-bold text-slate-100 truncate">
            {workspace?.name ||
              "Notebook"}
          </h2>

          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {workspace?.description ||
              "No notebook description."}
          </p>

          {/* ---------------------------------------------
              PROGRESS
          ---------------------------------------------- */}

          <div className="mt-4 pt-3 border-t border-slate-700/50">

            <div className="flex justify-between text-xs text-slate-400 mb-1">

              <span className="flex items-center gap-1">

                <Clock
                  size={12}
                  className="text-brandBlue"
                />

                Progress

              </span>

              <span>
                {workspace?.studied_hours ??
                  0}
                h /{" "}
                {workspace?.target_hours ??
                  0}
                h ({progress}%)
              </span>

            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">

              <div
                className="bg-successGreen h-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

        </div>

        {/* =================================================
            DOCUMENT SELECTION
        ================================================= */}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">

          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">

            <span>
              Context Scope (
              {selectedDocIds.length}/
              {documents.length})
            </span>

            {documents.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-brandBlue hover:underline lowercase text-xs flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={12} />

                {allDocumentsSelected
                  ? "none"
                  : "all"}
              </button>
            )}

          </div>

          {/* ---------------------------------------------
              EMPTY DOCUMENT STATE
          ---------------------------------------------- */}

          {documents.length === 0 ? (

            <div className="text-center py-8 px-4 bg-slate-900/50 border border-slate-800/80 rounded-xl">

              <FileText
                size={28}
                className="mx-auto text-slate-600 mb-2"
              />

              <p className="text-xs text-slate-400">
                No documents in this
                notebook.
              </p>

              <p className="text-[11px] text-slate-600 mt-0.5">
                Upload a PDF or TXT
                file below.
              </p>

            </div>

          ) : (

            documents.map(
              (document) => {

                const isSelected =
                  selectedDocIds.includes(
                    document.id
                  );

                return (
                  <div
                    key={document.id}
                    onClick={() =>
                      toggleDocSelection(
                        document.id
                      )
                    }
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                      isSelected
                        ? "bg-slate-800/90 border-brandBlue/60 text-slate-100 shadow-xs"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >

                    <div className="flex items-center gap-2.5 truncate">

                      {isSelected ? (
                        <CheckSquare
                          size={16}
                          className="text-brandBlue shrink-0"
                        />
                      ) : (
                        <Square
                          size={16}
                          className="text-slate-600 shrink-0"
                        />
                      )}

                      <FileText
                        size={16}
                        className="text-aiPurple shrink-0"
                      />

                      <span
                        className="text-xs font-medium truncate"
                        title={
                          document.title
                        }
                      >
                        {document.title}
                      </span>

                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();

                        handleDeleteDocument(
                          document.id
                        );
                      }}
                      className="text-slate-500 hover:text-red-400 p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
                      title="Delete document"
                      aria-label={`Delete ${document.title}`}
                    >
                      <Trash2 size={14} />
                    </button>

                  </div>
                );
              }
            )

          )}

        </div>

        {/* =================================================
            UPLOAD
        ================================================= */}

        <div className="p-4 border-t border-slate-800 bg-appGray">

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.txt,.md"
          />

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-brandBlue hover:bg-brandBlue/80 text-white py-3 rounded-xl text-sm font-medium transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            <UploadCloud size={18} />

            <span>
              {uploading
                ? "Indexing..."
                : "Upload Document"}
            </span>

          </button>

        </div>

      </aside>

      {/* ===================================================
          MAIN CHAT
      =================================================== */}

      <section className="flex-1 flex flex-col h-full bg-appDark relative min-w-0">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="h-16 border-b border-slate-800 flex items-center px-4 md:px-6 justify-between bg-appDark/80 backdrop-blur-xs shrink-0">

          <div className="flex items-center gap-3 min-w-0">

            <button
              type="button"
              onClick={() =>
                setMobileSidebarOpen(true)
              }
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 md:hidden cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>

            <div className="truncate">

              <h1 className="text-sm font-bold text-slate-200 truncate">
                {workspace?.name ||
                  "Workspace"}
              </h1>

              <span className="text-[11px] text-slate-500">
                {selectedDocIds.length}{" "}
                of {documents.length}{" "}
                files in RAG context
              </span>

            </div>

          </div>

          {/* ---------------------------------------------
              STUDY TIMER
          ---------------------------------------------- */}

          <div className="flex items-center gap-3 shrink-0">

            <StudyTimer
              workspaceId={workspaceId}
              onHoursLogged={
                fetchWorkspace
              }
            />

          </div>

        </header>

        {/* =================================================
            MESSAGE FEED
        ================================================= */}

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {messages.map(
            (message, index) => {

              const isUser =
                message.role === "user";

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-start gap-3 max-w-4xl ${
                    isUser
                      ? "ml-auto flex-row-reverse"
                      : ""
                  }`}
                >

                  {/* ---------------------------------------
                      AVATAR
                  ---------------------------------------- */}

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      isUser
                        ? "bg-brandBlue text-white"
                        : "bg-aiPurple text-white"
                    }`}
                  >
                    {isUser ? (
                      <User size={16} />
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>

                  {/* ---------------------------------------
                      MESSAGE CONTENT
                  ---------------------------------------- */}

                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md min-w-0 max-w-full ${
                      isUser
                        ? "bg-brandBlue text-white rounded-tr-none"
                        : "bg-appGray border border-slate-700/60 text-slate-200 rounded-tl-none"
                    }`}
                  >

                    {isUser ? (

                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                    ) : (

                      <>
                        <AIResponse content={message.content} />
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-4 border-t border-slate-600/60 pt-3 text-xs text-slate-400">
                            <p className="mb-2 font-semibold uppercase tracking-wide text-slate-500">
                              Sources
                            </p>
                            <ul className="space-y-1">
                              {message.sources.map((source, sourceIndex) => (
                                <li key={`${source.document_id}-${sourceIndex}`}>
                                  Document {source.document_id}
                                  {source.section ? ` - ${source.section}` : ""}
                                  {source.page_number ? `, page ${source.page_number}` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>

                    )}

                  </div>

                </div>
              );
            }
          )}

          {/* =================================================
              TYPING INDICATOR
          ================================================= */}

          {isTyping && (

            <div className="flex items-start gap-3 max-w-3xl">

              <div className="w-8 h-8 rounded-full bg-aiPurple text-white flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>

              <div className="p-4 rounded-2xl bg-appGray border border-slate-700/60 text-slate-400 text-sm animate-pulse rounded-tl-none">
                Searching scoped documents
                and generating answer...
              </div>

            </div>

          )}

          <div ref={chatEndRef} />

        </div>

        {/* =================================================
            INPUT AREA
        ================================================= */}

        <div className="p-4 md:p-6 border-t border-slate-800 bg-appDark shrink-0">

          {/* -----------------------------------------------
              MODEL SELECTION
          ------------------------------------------------ */}

          <div className="flex items-center gap-2 mb-3 max-w-4xl mx-auto md:px-0">

            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              AI Mode:
            </span>

            <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">

              <button
                type="button"
                onClick={() =>
                  setMode("fast")
                }
                className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  mode === "fast"
                    ? "bg-brandBlue text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Fast (Flash)
              </button>

              <button
                type="button"
                onClick={() =>
                  setMode("power")
                }
                className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  mode === "power"
                    ? "bg-aiPurple text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Power (Pro)
              </button>

            </div>

          </div>

          {/* -----------------------------------------------
              CHAT FORM
          ------------------------------------------------ */}

          <form
            onSubmit={
              handleSendMessage
            }
            className="relative flex items-center max-w-4xl mx-auto"
          >

            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              placeholder={
                selectedDocIds.length ===
                0
                  ? "Select documents in the sidebar to begin chatting..."
                  : "Ask a question..."
              }
              disabled={
                isTyping ||
                selectedDocIds.length ===
                  0
              }
              className="w-full bg-appGray border border-slate-600 rounded-full py-4 pl-6 pr-14 text-sm md:text-base text-appText placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brandBlue shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={
                !input.trim() ||
                isTyping ||
                selectedDocIds.length ===
                  0
              }
              className="absolute right-2 w-10 h-10 rounded-full bg-aiPurple flex items-center justify-center text-white hover:bg-aiPurple/80 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Send message"
            >
              <Send
                size={18}
                className="ml-0.5"
              />
            </button>

          </form>

          {/* -----------------------------------------------
              DISCLAIMER
          ------------------------------------------------ */}

          <div className="text-center mt-2 hidden md:block">

            <span className="text-xs text-slate-500">
              Answers prioritize your selected
              study materials and may supplement
              missing information when necessary.
            </span>

          </div>

        </div>

      </section>

      {/* ===================================================
          TOAST
      =================================================== */}

      <div
        className={`fixed bottom-8 right-8 transform transition-transform duration-300 ${
          toast.show
            ? "translate-y-0"
            : "translate-y-[150%]"
        } ${
          toast.type === "success"
            ? "bg-successGreen"
            : "bg-red-500"
        } text-white py-3 px-5 rounded-xl shadow-2xl flex items-center gap-3 z-50`}
      >

        {toast.type === "success" ? (
          <CheckCircle size={20} />
        ) : (
          <AlertCircle size={20} />
        )}

        <span className="text-sm font-medium">
          {toast.msg}
        </span>

      </div>

      {/* ===================================================
          GLOBAL AI MARKDOWN STYLES
      =================================================== */}

      <style jsx global>{`

        /* =================================================
           BASE
        ================================================= */

        .ai-markdown {
          line-height: 1.75;
          overflow-wrap: anywhere;
          word-break: normal;
          min-width: 0;
        }

        .ai-markdown > *:first-child {
          margin-top: 0;
        }

        .ai-markdown > *:last-child {
          margin-bottom: 0;
        }

        /* =================================================
           HEADINGS
        ================================================= */

        .ai-markdown h1,
        .ai-markdown h2,
        .ai-markdown h3,
        .ai-markdown h4,
        .ai-markdown h5,
        .ai-markdown h6 {
          color: #f1f5f9;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 1.4rem;
          margin-bottom: 0.65rem;
        }

        .ai-markdown h1 {
          font-size: 1.4rem;
        }

        .ai-markdown h2 {
          font-size: 1.25rem;
        }

        .ai-markdown h3 {
          font-size: 1.1rem;
        }

        .ai-markdown h4 {
          font-size: 1rem;
        }

        .ai-markdown h5,
        .ai-markdown h6 {
          font-size: 0.95rem;
        }

        /* =================================================
           PARAGRAPHS
        ================================================= */

        .ai-markdown p {
          margin-top: 0.65rem;
          margin-bottom: 0.65rem;
        }

        /* =================================================
           EMPHASIS
        ================================================= */

        .ai-markdown strong {
          color: #ffffff;
          font-weight: 700;
        }

        .ai-markdown em {
          color: #cbd5e1;
        }

        /* =================================================
           LISTS
        ================================================= */

        .ai-markdown ul,
        .ai-markdown ol {
          margin-top: 0.7rem;
          margin-bottom: 0.7rem;
          padding-left: 1.6rem;
        }

        .ai-markdown ul {
          list-style-type: disc;
        }

        .ai-markdown ol {
          list-style-type: decimal;
        }

        .ai-markdown li {
          margin-top: 0.3rem;
          margin-bottom: 0.3rem;
          padding-left: 0.15rem;
        }

        .ai-markdown li > ul,
        .ai-markdown li > ol {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        /* =================================================
           BLOCKQUOTES
        ================================================= */

        .ai-markdown blockquote {
          border-left: 3px solid #64748b;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #cbd5e1;
        }

        .ai-markdown blockquote p {
          margin: 0.4rem 0;
        }

        /* =================================================
           HORIZONTAL RULE
        ================================================= */

        .ai-markdown hr {
          border: 0;
          border-top: 1px solid #334155;
          margin: 1.35rem 0;
        }

        /* =================================================
           INLINE CODE
        ================================================= */

        .ai-markdown code {
          background: rgba(15, 23, 42, 0.9);
          color: #c4b5fd;
          padding: 0.15rem 0.4rem;
          border-radius: 0.35rem;
          font-size: 0.9em;
          overflow-wrap: anywhere;
        }

        /* =================================================
           CODE BLOCKS
        ================================================= */

        .ai-markdown pre,
        .ai-markdown .code-block {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 0.75rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
          max-width: 100%;
        }

        .ai-markdown pre code,
        .ai-markdown .code-block code {
          background: transparent;
          padding: 0;
          color: #e2e8f0;
          font-size: 0.85rem;
          white-space: pre;
        }

        /* =================================================
           TABLE CONTAINER
        ================================================= */

        .ai-markdown .table-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          margin: 1rem 0;
          border-radius: 0.75rem;
          -webkit-overflow-scrolling: touch;
        }

        /* =================================================
           TABLE
        ================================================= */

        .ai-markdown table {
          width: 100%;
          min-width: 500px;
          border-collapse: collapse;
          font-size: 0.9rem;
          table-layout: auto;
        }

        .ai-markdown th,
        .ai-markdown td {
          border: 1px solid #334155;
          padding: 0.65rem 0.75rem;
          text-align: left;
          vertical-align: top;
        }

        .ai-markdown th {
          background: #1e293b;
          color: #f1f5f9;
          font-weight: 700;
          white-space: nowrap;
        }

        .ai-markdown td {
          background: rgba(
            15,
            23,
            42,
            0.35
          );
          color: #cbd5e1;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .ai-markdown tbody tr:hover td {
          background: rgba(
            30,
            41,
            59,
            0.55
          );
        }

        /* =================================================
           TABLE CODE / MATH
        ================================================= */

        .ai-markdown td code,
        .ai-markdown th code {
          white-space: normal;
        }

        .ai-markdown td .katex,
        .ai-markdown th .katex {
          white-space: nowrap;
        }

        /* =================================================
           KATEX / LATEX
        ================================================= */

        .ai-markdown .katex-display {
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0.75rem 0;
          margin: 1rem 0;
          -webkit-overflow-scrolling: touch;
        }

        .ai-markdown .katex {
          color: #f8fafc;
          font-size: 1.05em;
        }

        /*
         * Keep mathematical expressions from destroying
         * the width of the chat bubble.
         */
        .ai-markdown .katex-display > .katex {
          white-space: nowrap;
        }

        /* =================================================
           LINKS
        ================================================= */

        .ai-markdown a {
          color: #60a5fa;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .ai-markdown a:hover {
          color: #93c5fd;
        }

        /* =================================================
           IMAGES
        ================================================= */

        .ai-markdown img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1rem 0;
        }

        /* =================================================
           MOBILE
        ================================================= */

        @media (max-width: 640px) {

          .ai-markdown {
            font-size: 0.9rem;
          }

          .ai-markdown table {
            min-width: 450px;
          }

          .ai-markdown th,
          .ai-markdown td {
            padding: 0.55rem 0.6rem;
          }

          .ai-markdown .katex {
            font-size: 0.95em;
          }

        }

      `}</style>

    </main>
  );
}