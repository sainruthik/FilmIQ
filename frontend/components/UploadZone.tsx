"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, AlertCircle, Loader2, X, Plus } from "lucide-react";
import { uploadFilms } from "@/lib/api";
import { useRouter } from "next/navigation";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith(".pdf")) return `"${file.name}" is not a PDF.`;
    if (file.size > 50 * 1024 * 1024) return `"${file.name}" exceeds 50 MB.`;
    return null;
  };

  const addFiles = useCallback((incoming: File[]) => {
    setError(null);
    for (const f of incoming) {
      const err = validateFile(f);
      if (err) { setError(err); return; }
    }
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const deduped = incoming.filter((f) => !names.has(f.name));
      return [...prev, ...deduped];
    });
  }, []);

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const { job_id, filenames } = await uploadFilms(files);
      const namesParam = encodeURIComponent(filenames.join(","));
      router.push(`/analyze/${job_id}?filenames=${namesParam}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
      setUploading(false);
    }
  }, [files, router]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      addFiles(dropped);
    },
    [addFiles]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) addFiles(selected);
    e.target.value = "";
  };

  const isEmpty = files.length === 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Drop zone */}
      <div
        className={`upload-zone rounded-2xl p-10 cursor-pointer flex flex-col items-center gap-5 transition-all ${dragging ? "dragging" : ""}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={onInputChange}
        />

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
          style={{
            background: dragging ? "rgba(201,168,76,0.14)" : "rgba(201,168,76,0.07)",
            border: "1px solid rgba(201,168,76,0.3)",
          }}
        >
          {dragging ? (
            <FileText size={26} className="text-gold" />
          ) : (
            <Upload size={26} className="text-gold opacity-80" />
          )}
        </div>

        <div className="text-center">
          {dragging ? (
            <>
              <p className="font-display text-xl text-cream mb-1">Release to add</p>
              <p className="text-sm text-[var(--color-text-muted)] font-sans">
                Files will be added to the queue
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-xl text-cream mb-1">
                Drop film documents here
              </p>
              <p className="text-sm text-[var(--color-text-muted)] font-sans mb-4">
                Press kits · Scripts · Financial summaries · Pitch decks
              </p>
              <div className="flex items-center gap-2 justify-center">
                <button className="btn-gold px-6 py-2.5 rounded-lg text-sm font-sans font-semibold pointer-events-none">
                  Choose PDFs
                </button>
                {!isEmpty && (
                  <span className="text-xs font-sans text-[var(--color-text-dim)] pointer-events-none">
                    or add more
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-[var(--color-text-dim)] font-sans">
          PDF only · Max 50 MB per file · Multiple files supported
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div
          className="mt-4 rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ background: "rgba(201,168,76,0.04)", borderBottom: "1px solid var(--color-border)" }}
          >
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.15em] text-gold">
              {files.length} {files.length === 1 ? "Document" : "Documents"} Queued
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="flex items-center gap-1 text-[11px] font-sans text-[var(--color-text-muted)] hover:text-gold transition-colors"
            >
              <Plus size={12} /> Add more
            </button>
          </div>

          {files.map((file) => (
            <div
              key={file.name}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <FileText size={14} className="text-gold shrink-0 opacity-70" />
              <span className="flex-1 text-sm font-sans text-[var(--color-text-muted)] truncate">
                {file.name}
              </span>
              <span className="text-xs font-sans text-[var(--color-text-dim)] shrink-0">
                {formatBytes(file.size)}
              </span>
              {!uploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                  className="text-[var(--color-text-dim)] hover:text-[var(--color-error)] transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          <div className="px-4 py-3" style={{ background: "rgba(201,168,76,0.03)" }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
              disabled={uploading}
              className="btn-gold w-full py-2.5 rounded-lg text-sm font-sans font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading {files.length} {files.length === 1 ? "file" : "files"}…
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Analyze {files.length === 1 ? "Document" : `${files.length} Documents`}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-sans animate-fade-in"
          style={{
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.25)",
            color: "var(--color-error)",
          }}
        >
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
