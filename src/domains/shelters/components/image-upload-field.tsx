"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  name: string;
  label: string;
  hint?: string;
  initialUrl?: string | null;
  aspect?: "square" | "wide";
}

/**
 * Upload d'une image unique, intégré à un form parent. Pose un `<input
 * type="hidden" name={name}>` avec l'URL résultante (vide = suppression).
 */
export function ImageUploadField({
  name,
  label,
  hint,
  initialUrl,
  aspect = "square",
}: ImageUploadFieldProps) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Upload échoué.");
        return;
      }
      setUrl(json.url);
    } catch {
      toast.error("Upload échoué.");
    } finally {
      setUploading(false);
    }
  }

  const aspectClass = aspect === "wide" ? "aspect-[3/1]" : "aspect-square";
  const sizeClass = aspect === "wide" ? "w-full max-w-lg" : "w-32";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input type="hidden" name={name} value={url} />
      <div
        className={`relative overflow-hidden rounded-lg border border-border bg-sable-100 ${aspectClass} ${sizeClass}`}
      >
        {url ? (
          <>
            <Image
              src={url}
              alt={label}
              fill
              sizes={aspect === "wide" ? "512px" : "128px"}
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => setUrl("")}
              className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-destructive"
              aria-label="Retirer l'image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-coral-600">
            {uploading ? (
              <span>Upload…</span>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Ajouter</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
