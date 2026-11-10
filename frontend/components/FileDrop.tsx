"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

export const WORK_TYPES = [".pdf", ".docx", ".txt", ".md", ".py", ".js", ".ts", ".java", ".ipynb"];
export const TEXT_TYPES = [".txt", ".md", ".py", ".js", ".ts", ".java", ".ipynb"];
export const MAX_BYTES = 5 * 1024 * 1024;

export const ext = (n: string) => (n.includes(".") ? n.slice(n.lastIndexOf(".")).toLowerCase() : "");
export const fileSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
export const isText = (f: File) => TEXT_TYPES.includes(ext(f.name));

/**
 * File upload field: drag and drop or browse, one file, validated by type and size.
 * Used everywhere work is handed in, so uploads look and behave the same across the system.
 */
export default function FileDrop({
  id, label, file, onFile, accept = WORK_TYPES, maxBytes = MAX_BYTES, hint, disabled = false,
}: {
  id: string;
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept?: string[];
  maxBytes?: number;
  hint?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const take = (f?: File | null) => {
    if (!f) return;
    if (!accept.includes(ext(f.name))) { setErr(`${ext(f.name) || "That"} files can't be accepted. Accepted formats: ${accept.join(", ")}.`); return; }
    if (f.size > maxBytes) { setErr(`That file is ${fileSize(f.size)}. The maximum size is ${fileSize(maxBytes)}.`); return; }
    setErr(null);
    onFile(f);
  };
  const clear = () => { onFile(null); setErr(null); if (input.current) input.current.value = ""; };
  const browse = () => { if (!disabled) input.current?.click(); };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); if (!disabled) take(e.dataTransfer.files?.[0]); };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); browse(); }
  };

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-[13px] font-medium text-ink">{label}</p>
      <input id={id} ref={input} type="file" accept={accept.join(",")} hidden onChange={(e) => take(e.target.files?.[0])} />

      {file ? (
        <div className="flex items-center gap-3 rounded border border-line bg-white px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-accent-soft text-accent"><FileText size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-ink2">{fileSize(file.size)} · {ext(file.name).slice(1).toUpperCase() || "File"}</p>
          </div>
          <button type="button" onClick={browse} disabled={disabled} className="text-[13px] font-medium text-accent hover:underline disabled:opacity-50">Replace</button>
          <button type="button" onClick={clear} disabled={disabled} aria-label={`Remove ${file.name}`} className="rounded p-1 text-ink2 hover:bg-muted disabled:opacity-50"><X size={15} /></button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-hint`}
          aria-disabled={disabled}
          onClick={browse}
          onKeyDown={onKey}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded border-2 border-dashed px-6 py-8 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-white hover:border-accent hover:bg-subtle"} ${disabled ? "pointer-events-none opacity-60" : ""}`}
        >
          <UploadCloud size={26} className="text-accent" />
          <p className="text-sm text-ink">
            {dragging ? <span className="font-medium text-accent">Drop the file to upload</span> : <><span className="font-medium text-accent underline underline-offset-2">Choose a file</span> or drag it here</>}
          </p>
          <p id={`${id}-hint`} className="text-xs text-ink2">{hint ?? `${accept.join(", ")} · max ${fileSize(maxBytes)}`}</p>
        </div>
      )}

      {err && <p className="mt-2 text-sm text-[#b42318]" role="alert">{err}</p>}
    </div>
  );
}
