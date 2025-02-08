import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode-svg";
import { getReportWithPhotos } from "@lost-found/public";
import { PrintControls } from "./print-controls";
import { placeholderPets } from "@shared/utils/placeholder-images";

const fallbackPhotos = Object.values(placeholderPets);

type Format = "a4" | "a5" | "a6" | "sticker";

const FORMAT_META: Record<
  Format,
  { label: string; widthMm: number; heightMm: number }
> = {
  a4: { label: "A4 (210×297)", widthMm: 210, heightMm: 297 },
  a5: { label: "A5 (148×210)", widthMm: 148, heightMm: 210 },
  a6: { label: "A6 boîte aux lettres (105×148)", widthMm: 105, heightMm: 148 },
  sticker: { label: "Sticker carré (80×80)", widthMm: 80, heightMm: 80 },
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await getReportWithPhotos(id);
  return {
    title: report?.petName
      ? `Affiche · ${report.petName}`
      : "Affiche de recherche",
    robots: { index: false, follow: false },
  };
}

export default async function AffichePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const format = (
    sp.format && sp.format in FORMAT_META ? sp.format : "a4"
  ) as Format;

  const report = await getReportWithPhotos(id);
  if (!report) notFound();

  const meta = FORMAT_META[format];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";
  const fiche = `${baseUrl}/perdus-trouves/${report.id}`;

  // QR code SVG inline (pas de roundtrip réseau, intègre direct)
  const qr = new QRCode({
    content: fiche,
    padding: 0,
    width: 256,
    height: 256,
    color: "#000000",
    background: "#ffffff",
    ecl: "M",
    container: "svg-viewbox",
  }).svg();

  const primaryPhoto =
    report.photos.find((p) => p.isPrimary) ?? report.photos[0] ?? null;
  const photoSrc =
    primaryPhoto?.url ??
    fallbackPhotos[
      (report.petName ?? "X").charCodeAt(0) % fallbackPhotos.length
    ]!;

  const dateEvent = new Date(report.dateEvent).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Sticky controls (cachés à l'impression) */}
      <PrintControls
        reportId={report.id}
        currentFormat={format}
        formats={Object.entries(FORMAT_META).map(([k, v]) => ({
          key: k,
          label: v.label,
        }))}
      />

      {/* Feuille à imprimer */}
      <main className="affiche-page">
        <style>{`
          @page {
            size: ${meta.widthMm}mm ${meta.heightMm}mm;
            margin: 0;
          }
          @media print {
            html, body { background: white !important; }
            .affiche-controls { display: none !important; }
            .affiche-sheet { box-shadow: none !important; margin: 0 !important; }
          }
          .affiche-sheet {
            width: ${meta.widthMm}mm;
            min-height: ${meta.heightMm}mm;
            background: white;
            color: #1f1414;
            padding: ${format === "sticker" ? "6mm" : "12mm"};
            margin: 24px auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            font-family: ui-sans-serif, system-ui, sans-serif;
          }
        `}</style>

        <article
          className="affiche-sheet"
          data-format={format}
          aria-label="Affiche imprimable de recherche"
        >
          {format === "sticker" ? (
            <StickerLayout
              report={report}
              photoSrc={photoSrc}
              qrSvg={qr}
              fiche={fiche}
            />
          ) : format === "a6" ? (
            <CompactLayout
              report={report}
              photoSrc={photoSrc}
              qrSvg={qr}
              fiche={fiche}
              dateEvent={dateEvent}
            />
          ) : (
            <FullLayout
              report={report}
              photoSrc={photoSrc}
              qrSvg={qr}
              fiche={fiche}
              dateEvent={dateEvent}
              format={format}
            />
          )}
        </article>
      </main>
    </>
  );
}

// ─── Layouts ───────────────────────────────────────────────────────────────

interface ReportLite {
  type: "perdu" | "trouve";
  species: "chat" | "chien";
  petName: string | null;
  breed: string | null;
  color: string | null;
  sex: "male" | "femelle" | "inconnu";
  description: string;
  distinctiveSigns: string | null;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isChipped: boolean;
}

function labelType(type: "perdu" | "trouve"): string {
  return type === "perdu" ? "PERDU" : "TROUVÉ";
}

function labelSex(sex: "male" | "femelle" | "inconnu"): string {
  if (sex === "male") return "Mâle";
  if (sex === "femelle") return "Femelle";
  return "—";
}

function FullLayout({
  report,
  photoSrc,
  qrSvg,
  fiche,
  dateEvent,
  format,
}: {
  report: ReportLite;
  photoSrc: string;
  qrSvg: string;
  fiche: string;
  dateEvent: string;
  format: "a4" | "a5";
}) {
  const isA4 = format === "a4";
  return (
    <>
      <header
        style={{
          background: report.type === "perdu" ? "#e8634d" : "#5d4690",
          color: "white",
          padding: isA4 ? "8mm 10mm" : "6mm 8mm",
          marginLeft: isA4 ? "-12mm" : "-12mm",
          marginRight: isA4 ? "-12mm" : "-12mm",
          marginTop: isA4 ? "-12mm" : "-12mm",
          marginBottom: isA4 ? "8mm" : "6mm",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: isA4 ? "10mm" : "8mm",
            fontWeight: 900,
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          ANIMAL {labelType(report.type)}
        </div>
        <div
          style={{
            marginTop: "2mm",
            fontSize: isA4 ? "5mm" : "4mm",
            fontWeight: 600,
            opacity: 0.92,
          }}
        >
          {report.species === "chat" ? "Chat" : "Chien"}
          {report.breed ? ` · ${report.breed}` : ""}
        </div>
      </header>

      {/* Photo principale */}
      <div
        style={{
          width: "100%",
          aspectRatio: "4/3",
          background: "#f3f0ea",
          marginBottom: isA4 ? "8mm" : "6mm",
          position: "relative",
          overflow: "hidden",
          borderRadius: "2mm",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt={report.petName ?? "Animal"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Nom */}
      <h1
        style={{
          fontSize: isA4 ? "14mm" : "10mm",
          fontWeight: 900,
          lineHeight: 1,
          margin: 0,
          marginBottom: isA4 ? "5mm" : "3mm",
          color: report.type === "perdu" ? "#e8634d" : "#5d4690",
        }}
      >
        {report.petName ?? "Sans nom"}
      </h1>

      {/* Infos clés en grille */}
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          rowGap: "2mm",
          columnGap: "4mm",
          fontSize: isA4 ? "4.5mm" : "3.5mm",
          margin: 0,
          marginBottom: isA4 ? "6mm" : "4mm",
        }}
      >
        <Cell
          label={report.type === "perdu" ? "Disparu le" : "Trouvé le"}
          value={dateEvent}
        />
        {report.address && <Cell label="Lieu" value={report.address} />}
        {report.color && <Cell label="Couleur" value={report.color} />}
        {report.sex !== "inconnu" && (
          <Cell label="Sexe" value={labelSex(report.sex)} />
        )}
        {report.isChipped && <Cell label="Pucé" value="Oui" />}
      </dl>

      {/* Description courte */}
      {report.description && (
        <p
          style={{
            fontSize: isA4 ? "4mm" : "3mm",
            lineHeight: 1.4,
            margin: 0,
            marginBottom: isA4 ? "5mm" : "3mm",
            color: "#3d362f",
          }}
        >
          {report.description.slice(0, isA4 ? 350 : 200)}
          {report.description.length > (isA4 ? 350 : 200) ? "…" : ""}
        </p>
      )}

      {report.distinctiveSigns && (
        <p
          style={{
            fontSize: isA4 ? "3.8mm" : "3mm",
            lineHeight: 1.4,
            margin: 0,
            marginBottom: isA4 ? "5mm" : "3mm",
            color: "#3d362f",
            fontStyle: "italic",
          }}
        >
          <strong>Signes distinctifs : </strong>
          {report.distinctiveSigns.slice(0, isA4 ? 200 : 120)}
          {report.distinctiveSigns.length > (isA4 ? 200 : 120) ? "…" : ""}
        </p>
      )}

      {/* Footer contact + QR */}
      <footer
        style={{
          marginTop: "auto",
          paddingTop: isA4 ? "5mm" : "3mm",
          borderTop: "0.5mm solid #1f1414",
          display: "flex",
          alignItems: "center",
          gap: isA4 ? "8mm" : "5mm",
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: isA4 ? "4.5mm" : "3.5mm",
              fontWeight: 700,
              margin: 0,
              marginBottom: "1mm",
            }}
          >
            Si vous l&apos;avez vu·e, contactez :
          </p>
          {report.contactPhone && (
            <p
              style={{
                fontSize: isA4 ? "7mm" : "5mm",
                fontWeight: 900,
                margin: 0,
                color: report.type === "perdu" ? "#e8634d" : "#5d4690",
              }}
            >
              {report.contactPhone}
            </p>
          )}
          {report.contactEmail && !report.contactPhone && (
            <p
              style={{
                fontSize: isA4 ? "4.5mm" : "3.5mm",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {report.contactEmail}
            </p>
          )}
          <p
            style={{
              fontSize: isA4 ? "3mm" : "2.5mm",
              color: "#867662",
              margin: 0,
              marginTop: "2mm",
            }}
          >
            Fiche complète : {fiche}
          </p>
        </div>
        <div
          style={{
            width: isA4 ? "30mm" : "22mm",
            height: isA4 ? "30mm" : "22mm",
            flexShrink: 0,
          }}
          dangerouslySetInnerHTML={{ __html: scaleSvg(qrSvg) }}
        />
      </footer>

      {/* Watermark Dorloter */}
      <div
        style={{
          textAlign: "center",
          fontSize: isA4 ? "2.5mm" : "2mm",
          color: "#a4937b",
          marginTop: isA4 ? "3mm" : "2mm",
          letterSpacing: "0.1em",
        }}
      >
        Affiche éditée via DORLOTER · plateforme française d&apos;adoption et
        retrouvailles
      </div>
    </>
  );
}

function CompactLayout({
  report,
  photoSrc,
  qrSvg,
  fiche,
  dateEvent,
}: {
  report: ReportLite;
  photoSrc: string;
  qrSvg: string;
  fiche: string;
  dateEvent: string;
}) {
  return (
    <>
      <header
        style={{
          background: report.type === "perdu" ? "#e8634d" : "#5d4690",
          color: "white",
          padding: "3mm 5mm",
          marginLeft: "-12mm",
          marginRight: "-12mm",
          marginTop: "-12mm",
          marginBottom: "4mm",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "5mm",
            fontWeight: 900,
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          {report.species === "chat" ? "CHAT" : "CHIEN"}{" "}
          {labelType(report.type)}
        </div>
      </header>

      <div style={{ display: "flex", gap: "4mm", marginBottom: "4mm" }}>
        <div
          style={{
            width: "30mm",
            height: "30mm",
            background: "#f3f0ea",
            overflow: "hidden",
            borderRadius: "1mm",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt={report.petName ?? "Animal"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: "8mm",
              fontWeight: 900,
              lineHeight: 1,
              margin: 0,
              marginBottom: "2mm",
              color: report.type === "perdu" ? "#e8634d" : "#5d4690",
            }}
          >
            {report.petName ?? "Sans nom"}
          </h1>
          <p style={{ fontSize: "3mm", margin: 0, lineHeight: 1.3 }}>
            {report.breed ?? ""}
            {report.color ? ` · ${report.color}` : ""}
            <br />
            {dateEvent}
            {report.address ? ` · ${report.address}` : ""}
          </p>
        </div>
      </div>

      {report.description && (
        <p
          style={{
            fontSize: "2.8mm",
            lineHeight: 1.4,
            margin: 0,
            marginBottom: "3mm",
          }}
        >
          {report.description.slice(0, 150)}
          {report.description.length > 150 ? "…" : ""}
        </p>
      )}

      <footer
        style={{
          marginTop: "auto",
          paddingTop: "3mm",
          borderTop: "0.5mm solid #1f1414",
          display: "flex",
          alignItems: "center",
          gap: "4mm",
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "2.8mm", fontWeight: 700, margin: 0 }}>
            Vous l&apos;avez vu·e ?
          </p>
          {report.contactPhone && (
            <p
              style={{
                fontSize: "5mm",
                fontWeight: 900,
                margin: 0,
                color: report.type === "perdu" ? "#e8634d" : "#5d4690",
              }}
            >
              {report.contactPhone}
            </p>
          )}
          <p style={{ fontSize: "2mm", color: "#867662", margin: 0 }}>
            {fiche}
          </p>
        </div>
        <div
          style={{ width: "20mm", height: "20mm", flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: scaleSvg(qrSvg) }}
        />
      </footer>
    </>
  );
}

function StickerLayout({
  report,
  photoSrc,
  qrSvg,
}: {
  report: ReportLite;
  photoSrc: string;
  qrSvg: string;
  fiche: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2mm",
        textAlign: "center",
        height: "100%",
      }}
    >
      <div
        style={{
          background: report.type === "perdu" ? "#e8634d" : "#5d4690",
          color: "white",
          padding: "1.5mm 3mm",
          borderRadius: "10mm",
          fontSize: "3.5mm",
          fontWeight: 900,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {labelType(report.type)}
      </div>
      <div
        style={{
          width: "26mm",
          height: "26mm",
          borderRadius: "50%",
          overflow: "hidden",
          background: "#f3f0ea",
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt={report.petName ?? "Animal"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div
        style={{ fontSize: "4mm", fontWeight: 900, lineHeight: 1, margin: 0 }}
      >
        {report.petName ?? "Inconnu"}
      </div>
      <div
        style={{ width: "20mm", height: "20mm", flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: scaleSvg(qrSvg) }}
      />
      <div
        style={{
          fontSize: "2mm",
          color: "#867662",
          letterSpacing: "0.05em",
          marginTop: "auto",
        }}
      >
        DORLOTER.FR
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt style={{ fontWeight: 700, color: "#867662" }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{value}</dd>
    </>
  );
}

/**
 * Force le SVG du QR à remplir son container (qrcode-svg génère un SVG
 * avec width/height en pixels fixes que l'on veut remplacer par 100%).
 */
function scaleSvg(svg: string): string {
  return svg.replace(
    /<svg[^>]*>/,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%" shape-rendering="crispEdges">'
  );
}
