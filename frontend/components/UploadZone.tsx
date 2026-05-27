"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, AlertCircle, Loader2, X, Plus, FilePlus2 } from "lucide-react";
import { uploadFilms } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      return [...prev, ...incoming.filter((f) => !names.has(f.name))];
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
      router.push(`/analyze/${job_id}?filenames=${encodeURIComponent(filenames.join(","))}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
      setUploading(false);
    }
  }, [files, router]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  return (
    <div className="w-full max-w-xl">
      {/* Drop zone */}
      <div
        className={`upload-zone rounded-lg p-8 cursor-pointer flex flex-col items-center gap-4 ${dragging ? "dragging" : ""}`}
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
          onChange={(e) => {
            const selected = Array.from(e.target.files ?? []);
            if (selected.length) addFiles(selected);
            e.target.value = "";
          }}
        />

        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: dragging ? "var(--color-accent-dim)" : "var(--color-surface-raised)",
            border: "1px solid var(--color-border-strong)",
          }}
        >
          {dragging ? (
            <FilePlus2 size={20} style={{ color: "var(--color-accent)" }} />
          ) : (
            <Upload size={20} style={{ color: "var(--color-text-muted)" }} />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
            {dragging ? "Release to add documents" : "Drop film documents here"}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
            Press kits · Scripts · Financial summaries · Pitch decks
          </p>
        </div>

        <Button variant="outline" size="sm" className="pointer-events-none">
          Choose PDFs
        </Button>

        <p className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
          PDF only · Max 50 MB per file · Up to 10 files
        </p>
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div
          className="mt-3 rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--color-border-strong)" }}
        >
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{
              background: "var(--color-surface-raised)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-dim)" }}>
              {files.length} {files.length === 1 ? "document" : "documents"} queued
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Plus size={11} /> Add more
            </button>
          </div>

          {files.map((file) => (
            <div
              key={file.name}
              className="px-3 py-2.5 flex items-center gap-2.5"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <FileText size={13} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
              <span
                className="flex-1 text-xs truncate"
                style={{ color: "var(--color-text-muted)" }}
              >
                {file.name}
              </span>
              <Badge variant="secondary">{formatBytes(file.size)}</Badge>
              {!uploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                  className="transition-colors"
                  style={{ color: "var(--color-text-dim)" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--color-error)")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--color-text-dim)")}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}

          <div className="px-3 py-2.5" style={{ background: "var(--color-surface-raised)" }}>
            <Button
              onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
              disabled={uploading}
              className="w-full"
              size="default"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading {files.length} {files.length === 1 ? "file" : "files"}…
                </>
              ) : (
                <>
                  <FileText size={14} />
                  Run Acquisition Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs animate-fade-in"
          style={{
            background: "var(--color-error-dim)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "var(--color-error)",
          }}
        >
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
