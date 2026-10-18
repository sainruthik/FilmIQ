"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
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

  return (
    <div className="w-full max-w-[440px]">
      {/* Drop zone */}
      <div
        className={`grid gap-1 p-6 rounded bg-sheet border cursor-pointer transition-[border-color,transform] duration-200 active:scale-[0.99] ${
          dragging ? "border-solid border-ink" : "border-dashed border-graphite hover:border-solid hover:border-ink"
        }`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        // dragleave also fires when crossing into a child element; only
        // clear the state once the pointer has actually left the zone.
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Choose PDF documents to analyze, or drop them here"
        aria-disabled={uploading}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
        <p className="text-20 font-semibold">{dragging ? "Release to add" : "Drop PDFs here"}</p>
        <p className="text-13 text-graphite">
          Scripts, press kits, financials. Up to 50 MB each.
        </p>
        {/* Visual only: the whole zone is the button. */}
        <span aria-hidden className="btn justify-self-start mt-3 pointer-events-none">
          {files.length === 0 ? "Choose files" : "Add more files"}
        </span>
      </div>

      {/* Queue */}
      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-13 text-graphite mb-1">
            {files.length} {files.length === 1 ? "document" : "documents"} ready
          </p>
          {/* Capped so the Analyze button stays near the drop zone. */}
          <ul className="max-h-56 overflow-y-auto border-t border-rule">
            {files.map((file) => (
              <li key={fileKey(file)} className="flex items-center gap-3 py-2 border-b border-rule">
                <span className="flex-1 min-w-0 truncate">{file.name}</span>
                <span className="text-13 text-graphite tabular-nums shrink-0">{formatBytes(file.size)}</span>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(fileKey(file))}
                    aria-label={`Remove ${file.name}`}
                    className="-m-2 p-2 shrink-0 text-graphite hover:text-cherry transition-colors"
                  >
                    <X size={16} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="btn w-full mt-4"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Uploading {files.length} {files.length === 1 ? "file" : "files"}
              </>
            ) : (
              `Analyze ${files.length === 1 ? "document" : `${files.length} documents`}`
            )}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 pl-4 border-l-2 border-cherry text-cherry text-13">
          {error}
        </p>
      )}
    </div>
  );
}
