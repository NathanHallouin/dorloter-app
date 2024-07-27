import { NextRequest, NextResponse } from "next/server";
import { auth } from "@infra/auth/auth";
import { uploadFile } from "@infra/storage/s3";
import { classifyImage } from "@infra/nsfw";
import { generateBlurDataUrl } from "@infra/image/blur";
import { logEvent } from "@infra/logger";
import { headers } from "next/headers";

// Route Node (pas edge) — TFjs nécessite les bindings natifs de node.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
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

  const maxSize = 5 * 1024 * 1024; // 5 Mo
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "Le fichier ne doit pas dépasser 5 Mo" },
      { status: 400 }
    );
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez JPEG, PNG ou WebP." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Modération NSFW locale (nsfwjs). Non bloquant en cas d'erreur modèle —
  // la modération communautaire via content_reports reste le second filet.
  const nsfw = await classifyImage(buffer);
  if (!nsfw.safe) {
    logEvent(
      "upload.nsfw_rejected",
      { reason: nsfw.reason, scores: nsfw.scores, size: file.size },
      { level: "warn", userId: session.user.id }
    );
    return NextResponse.json(
      {
        error:
          "Cette image a été détectée comme inappropriée. Si vous pensez qu'il s'agit d'une erreur, contactez moderation@dorloter.fr.",
      },
      { status: 422 }
    );
  }

  const ext = file.type.split("/")[1];
  const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  // Upload + génération du blur en parallèle. Le blur est best-effort :
  // si sharp échoue, on continue sans (l'image s'affiche sans LQIP).
  const [url, blurDataUrl] = await Promise.all([
    uploadFile(key, buffer, file.type),
    generateBlurDataUrl(buffer),
  ]);

  return NextResponse.json({ url, blurDataUrl });
}
