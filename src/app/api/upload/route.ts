import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { uploadFile } from "@/lib/s3";
import { headers } from "next/headers";

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
  const ext = file.type.split("/")[1];
  const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const url = await uploadFile(key, buffer, file.type);

  return NextResponse.json({ url });
}
