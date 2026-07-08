"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, AlertCircle, Loader2, X, Plus } from "lucide-react";
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

  // Dedupe on more than name so two different files that happen to share a
  // filename (e.g. from different folders) aren't silently dropped.
  const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

  const addFiles = useCallback((incoming: File[]) => {
    setError(null);
    const valid: File[] = [];
    const skipped: string[] = [];
    for (const f of incoming) {
      const err = validateFile(f);
      if (err) skipped.push(err);
      else valid.push(f);
    }
    if (skipped.length > 0) setError(`Skipped: ${skipped.join(" ")}`);
    if (valid.length === 0) return;
    setFiles((prev) => {
      const keys = new Set(prev.map(fileKey));
      const deduped = valid.filter((f) => !keys.has(fileKey(f)));
      return [...prev, ...deduped];
    });
  }, []);

  const removeFile = (key: string) =>
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));

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
    <div className="w-full">
      {/* Drop zone */}
      <div
        className={`upload-zone-trade cursor-pointer text-center ${dragging ? "dragging" : ""}`}
        style={{ padding: "52px 36px 40px" }}
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
          className="mx-auto flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: "rgba(201,79,50,0.08)",
            border: "1px solid rgba(201,79,50,0.3)",
            marginBottom: 18,
            fontSize: 22,
            color: "#c94f32",
          }}
        >
          ⤒
        </div>

        <p className="font-display" style={{ fontSize: 24, color: "#1a160f" }}>
          {dragging ? "Release to add" : "Drop film documents here"}
        </p>
        <p style={{ fontSize: 13, color: "#837b6c", margin: "8px 0 20px" }}>
          {dragging ? "Files will be added to the queue" : "Press kits · Scripts · Financial summaries · Pitch decks"}
        </p>

        <button className="btn-primary pointer-events-none" style={{ fontSize: 14, padding: "12px 28px", borderRadius: 8 }}>
          {isEmpty ? "Choose PDFs" : "Add more"}
        </button>

        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "#b3aa99", marginTop: 18 }}>
          PDF ONLY · MAX 50MB · MULTIPLE FILES · NO SIGNUP
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="trade-card mt-4 overflow-hidden">
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ background: "#f2ede2", borderBottom: "1px solid var(--color-border)" }}
          >
            <p className="mono-label">
              {files.length} {files.length === 1 ? "DOCUMENT" : "DOCUMENTS"} QUEUED
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="flex items-center gap-1 transition-colors"
              style={{ fontSize: 11, color: "#5c564a" }}
            >
              <Plus size={12} /> Add more
            </button>
          </div>

          {files.map((file) => (
            <div
              key={fileKey(file)}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderBottom: "1px solid var(--color-border-row)" }}
            >
              <FileText size={14} className="shrink-0" style={{ color: "#c94f32", opacity: 0.8 }} />
              <span className="flex-1 text-sm truncate" style={{ color: "#3a352b" }}>
                {file.name}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#837b6c" }} className="shrink-0">
                {formatBytes(file.size)}
              </span>
              {!uploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(fileKey(file)); }}
                  className="shrink-0 transition-colors"
                  style={{ color: "#b3aa99" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}

          <div className="px-4 py-3" style={{ background: "#f2ede2" }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
              disabled={uploading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ padding: "10px 0" }}
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
          className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: "rgba(201,79,50,0.06)",
            border: "1px solid rgba(201,79,50,0.25)",
            color: "#c94f32",
          }}
        >
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
