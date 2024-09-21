"use client";

/**
 * Bouton enregistrement vocal pour le composer web.
 *
 * Utilise `MediaRecorder` natif (audio/webm; codecs=opus par défaut),
 * uploade sur S3 via le presign, puis envoie un message avec attachment
 * voice. Affichage pendant l'enregistrement : timer + bouton stop + cancel.
 */

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";

export interface VoiceUpload {
  url: string;
  durationMs: number;
  mimeType: "audio/webm" | "audio/mp4";
}

interface VoiceRecorderProps {
  disabled?: boolean;
  onUploaded: (upload: VoiceUpload) => Promise<void> | void;
}

export function VoiceRecorder({ disabled, onUploaded }: VoiceRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(
      () => setElapsed(Date.now() - startedAtRef.current),
      200
    );
    return () => clearInterval(id);
  }, [recording]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Enregistrement audio non supporté par ce navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Micro inaccessible : ${err.message}`
          : "Micro inaccessible."
      );
      cleanup();
    }
  }

  async function stopAndUpload() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    const durationMs = Date.now() - startedAtRef.current;
    const done = new Promise<Blob>((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          const type = recorder.mimeType || "audio/webm";
          resolve(new Blob(chunksRef.current, { type }));
        },
        { once: true }
      );
    });
    recorder.stop();
    const blob = await done;
    cleanup();

    if (durationMs < 500) {
      toast.error("Trop court — maintiens un peu plus longtemps.");
      return;
    }

    setUploading(true);
    try {
      const mimeType: "audio/webm" | "audio/mp4" =
        blob.type.startsWith("audio/mp4") ? "audio/mp4" : "audio/webm";

      // On passe par l'endpoint serveur qui upload côté serveur — pas
      // de presign + PUT direct vers S3. Voir
      // `/api/v1/uploads/voice/route.ts` pour le raisonnement (MinIO
      // local pas joignable depuis le mobile en dev).
      const form = new FormData();
      form.append("file", blob, `voice.${mimeType.split("/")[1]}`);
      const uploadRes = await fetch("/api/v1/uploads/voice", {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) {
        const errBody = (await uploadRes.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(
          errBody?.error?.message ?? `Upload audio échoué (${uploadRes.status})`
        );
      }
      const uploaded = (await uploadRes.json()) as {
        data: { url: string; key: string };
      };

      await onUploaded({
        url: uploaded.data.url,
        durationMs,
        mimeType,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Envoi du message vocal échoué."
      );
    } finally {
      setUploading(false);
    }
  }

  function cancel() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    cleanup();
  }

  function cleanup() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setElapsed(0);
  }

  if (recording) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-coral-200 bg-coral-50 px-3 py-2">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-coral-500" />
        <span className="tabular-nums text-sm font-medium text-coral-700">
          {formatTime(elapsed)}
        </span>
        <span className="flex-1 text-xs text-coral-700">Enregistrement…</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={cancel}
          aria-label="Annuler"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          onClick={stopAndUpload}
          aria-label="Envoyer le message vocal"
          disabled={uploading}
        >
          {uploading ? (
            <Square className="h-4 w-4 animate-pulse" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={start}
      disabled={disabled || uploading}
      aria-label="Enregistrer un message vocal"
    >
      <Mic className="h-4 w-4 text-coral-500" />
    </Button>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
