import { NextRequest, NextResponse } from "next/server";
import { auth } from "@infra/auth/auth";
import { uploadFile } from "@infra/storage/s3";
import { logEvent } from "@infra/logger";
import { headers } from "next/headers";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Upload de documents refuge (PDF, images). Différent de `/api/upload`
 * (images animaux uniquement, avec NSFW + blur) : ici on accepte les
 * PDF, on tolère 10 Mo, et on ne classifie pas le contenu.
 *
 * Réservé aux comptes `shelter_admin`.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (
    !session ||
    session.user.role !== "shelter_admin" ||
    !session.user.shelterId
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "Aucun fichier fourni" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Le fichier ne doit pas dépasser 10 Mo." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error:
          "Type non supporté. Formats acceptés : PDF, JPEG, PNG, WebP.",
      },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extFromMime =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";
  const key = `documents/shelters/${session.user.shelterId}/${crypto.randomUUID()}.${extFromMime}`;

  try {
    const url = await uploadFile(key, buffer, file.type);
    logEvent(
      "shelter.document.uploaded",
      {
        shelterId: session.user.shelterId,
        size: file.size,
        mime: file.type,
      },
      { userId: session.user.id }
    );
    return NextResponse.json({
      url,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  } catch (err) {
    console.error("upload doc failed", err);
    return NextResponse.json(
      { error: "Échec de l'upload" },
      { status: 500 }
    );
  }
}
