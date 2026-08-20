'use client';

import React, { useEffect, useState } from 'react';

interface DocumentItem {
  id: number;
  title: string;
  uploaded_at: string;
}

export default function FileList() {
  const [files, setFiles] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStoredFiles = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/documents/');
        if (res.ok) {
          const data = await res.json();
          // Ensure data is an array before setting state
          if (Array.isArray(data)) {
            setFiles(data);
          }
        }
      } catch (error) {
        console.error('Error fetching persistent documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStoredFiles();
  }, []);

  if (loading) {
    return <div className="text-xs text-slate-400 p-2">Loading documents...</div>;
  }

  return (
    <div className="bg-appGray p-4 rounded-xl border border-slate-700 w-full">
      <h3 className="text-slate-200 font-semibold mb-3 text-sm flex justify-between items-center">
        <span>Indexed Knowledge Base</span>
        <span className="bg-brandBlue text-white text-xs px-2 py-0.5 rounded-full">
          {files.length}
        </span>
      </h3>
      {files.length === 0 ? (
        <p className="text-xs text-slate-400">No documents found in index yet. Upload one!</p>
      ) : (
        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {files.map((file) => (
            <li 
              key={file.id} 
              className="text-xs text-slate-300 bg-appDark p-2.5 rounded-lg border border-slate-800 flex items-center space-x-2 truncate"
              title={file.title}
            >
              <span>📄</span>
              <span className="truncate">{file.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}