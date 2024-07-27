import sharp from "sharp";

/**
 * Génère un placeholder LQIP (Low Quality Image Placeholder) sous forme de
 * data URL base64.
 *
 * Stratégie : redimensionner l'image en 16x16 (cover, recadré centré),
 * encoder en JPEG qualité 50. Résultat ~400-700 octets, parfait pour
 * stocker en base et passer à `<Image placeholder="blur" blurDataURL=...>`.
 *
 * Renvoie `null` si sharp échoue (image corrompue par exemple) — l'upload
 * doit pouvoir continuer sans blur, c'est juste une optim visuelle.
 */
export async function generateBlurDataUrl(
  buffer: Buffer
): Promise<string | null> {
  try {
    const out = await sharp(buffer, { failOn: "none" })
      .resize(16, 16, { fit: "cover" })
      .jpeg({ quality: 50, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch (err) {
    console.warn("blur dataUrl generation failed", err);
    return null;
  }
}
