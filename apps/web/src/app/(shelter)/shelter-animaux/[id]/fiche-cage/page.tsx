import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode-svg";
import { requireShelter } from "@infra/auth/session";
import { getPetWithDetails } from "@adoption/public";
import { PrintControls } from "./print-controls";
import { placeholderPets } from "@shared/utils/placeholder-images";

const fallbackPhotos = Object.values(placeholderPets);

type Format = "a5" | "a6" | "sticker";

const FORMAT_META: Record<
  Format,
  { label: string; widthMm: number; heightMm: number }
> = {
  a5: { label: "A5 (148×210)", widthMm: 148, heightMm: 210 },
  a6: { label: "A6 boîte (105×148)", widthMm: 105, heightMm: 148 },
  sticker: { label: "Sticker (80×80)", widthMm: 80, heightMm: 80 },
};

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  disponible: {
    label: "À adopter",
    color: "#15803d",
    bg: "#dcfce7",
  },
  reserve: {
    label: "Réservé",
    color: "#5d4690",
    bg: "#eae5f6",
  },
  adopte: {
    label: "Adopté",
    color: "#a53a2a",
    bg: "#ffe8e1",
  },
  retire: {
    label: "Retiré",
    color: "#6b5e4f",
    bg: "#f3f0ea",
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const pet = await getPetWithDetails(id);
  return {
    title: pet ? `Fiche cage · ${pet.name}` : "Fiche cage",
    robots: { index: false, follow: false },
  };
}

export default async function FicheCagePage({
  params,
  searchParams,
}: PageProps) {
  const session = await requireShelter();
  const { id } = await params;
  const sp = await searchParams;
  const format = (
    sp.format && sp.format in FORMAT_META ? sp.format : "a6"
  ) as Format;

  const pet = await getPetWithDetails(id);
  if (!pet) notFound();
  if (pet.shelterId !== session.user.shelterId) redirect("/shelter-animaux");

  const meta = FORMAT_META[format];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";
  const fiche = `${baseUrl}/adopter/${pet.id}`;

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
    pet.photos.find((p) => p.isPrimary) ?? pet.photos[0] ?? null;
  const photoSrc =
    primaryPhoto?.url ??
    fallbackPhotos[pet.name.charCodeAt(0) % fallbackPhotos.length]!;

  const status = STATUS_META[pet.status] ?? STATUS_META.disponible!;

  return (
    <>
      <PrintControls
        petId={pet.id}
        currentFormat={format}
        formats={Object.entries(FORMAT_META).map(([k, v]) => ({
          key: k,
          label: v.label,
        }))}
      />

      <main className="fiche-cage-page">
        <style>{`
          @page {
            size: ${meta.widthMm}mm ${meta.heightMm}mm;
            margin: 0;
          }
          @media print {
            html, body { background: white !important; }
            .fiche-controls { display: none !important; }
            .fiche-sheet { box-shadow: none !important; margin: 0 !important; }
          }
          .fiche-sheet {
            width: ${meta.widthMm}mm;
            min-height: ${meta.heightMm}mm;
            background: white;
            color: #1f1414;
            padding: ${format === "sticker" ? "5mm" : "10mm"};
            margin: 24px auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            font-family: ui-sans-serif, system-ui, sans-serif;
          }
        `}</style>

        <article
          className="fiche-sheet"
          data-format={format}
          aria-label="Fiche cage imprimable"
        >
          {format === "sticker" ? (
            <StickerLayout
              pet={pet}
              photoSrc={photoSrc}
              qrSvg={qr}
              statusLabel={status.label}
              statusColor={status.color}
              statusBg={status.bg}
            />
          ) : format === "a6" ? (
            <CompactLayout
              pet={pet}
              photoSrc={photoSrc}
              qrSvg={qr}
              fiche={fiche}
              statusLabel={status.label}
              statusColor={status.color}
              statusBg={status.bg}
            />
          ) : (
            <FullLayout
              pet={pet}
              photoSrc={photoSrc}
              qrSvg={qr}
              fiche={fiche}
              statusLabel={status.label}
              statusColor={status.color}
              statusBg={status.bg}
            />
          )}
        </article>
      </main>
    </>
  );
}

// ─── Layouts ───────────────────────────────────────────────────────────────

interface PetLite {
  name: string;
  species: "chat" | "chien";
  breed: string | null;
  color: string | null;
  sex: "male" | "femelle" | "inconnu";
  ageCategory: "chaton" | "jeune" | "adulte" | "senior" | null;
  status: string;
  okWithCats: "oui" | "non" | "inconnu";
  okWithDogs: "oui" | "non" | "inconnu";
  okWithChildren: "oui" | "non" | "inconnu";
}

function labelSex(sex: "male" | "femelle" | "inconnu"): string {
  if (sex === "male") return "Mâle";
  if (sex === "femelle") return "Femelle";
  return "—";
}

function labelAge(
  age: "chaton" | "jeune" | "adulte" | "senior" | null
): string {
  if (!age) return "—";
  const map = {
    chaton: "Chaton",
    jeune: "Jeune",
    adulte: "Adulte",
    senior: "Senior",
  };
  return map[age];
}

function labelCompat(c: "oui" | "non" | "inconnu"): string {
  if (c === "oui") return "✓";
  if (c === "non") return "✗";
  return "?";
}

function FullLayout({
  pet,
  photoSrc,
  qrSvg,
  fiche,
  statusLabel,
  statusColor,
  statusBg,
}: {
  pet: PetLite;
  photoSrc: string;
  qrSvg: string;
  fiche: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
}) {
  return (
    <>
      <header
        style={{
          background: "#e8634d",
          color: "white",
          padding: "5mm 8mm",
          marginLeft: "-10mm",
          marginRight: "-10mm",
          marginTop: "-10mm",
          marginBottom: "5mm",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "3.5mm",
            fontWeight: 700,
            letterSpacing: "0.18em",
            lineHeight: 1,
            opacity: 0.92,
          }}
        >
          FICHE ANIMAL
        </div>
        <div
          style={{
            marginTop: "1.5mm",
            fontSize: "4mm",
            fontWeight: 700,
            opacity: 0.92,
          }}
        >
          {pet.species === "chat" ? "Chat" : "Chien"}
          {pet.breed ? ` · ${pet.breed}` : ""}
        </div>
      </header>

      <div
        style={{
          width: "100%",
          aspectRatio: "1/1",
          background: "#f3f0ea",
          marginBottom: "5mm",
          overflow: "hidden",
          borderRadius: "2mm",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt={pet.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "3mm",
          marginBottom: "4mm",
        }}
      >
        <h1
          style={{
            fontSize: "12mm",
            fontWeight: 900,
            lineHeight: 1,
            margin: 0,
            color: "#1f1414",
          }}
        >
          {pet.name}
        </h1>
        <span
          style={{
            background: statusBg,
            color: statusColor,
            padding: "1mm 3mm",
            borderRadius: "10mm",
            fontSize: "3.5mm",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel}
        </span>
      </div>

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          rowGap: "2mm",
          columnGap: "4mm",
          fontSize: "4mm",
          margin: 0,
          marginBottom: "5mm",
        }}
      >
        <Cell label="Sexe" value={labelSex(pet.sex)} />
        <Cell label="Âge" value={labelAge(pet.ageCategory)} />
        {pet.color && <Cell label="Couleur" value={pet.color} />}
      </dl>

      <div
        style={{
          background: "#faf9f6",
          border: "0.5mm solid #e6e0d5",
          padding: "3mm 4mm",
          borderRadius: "2mm",
          marginBottom: "5mm",
        }}
      >
        <div
          style={{
            fontSize: "2.8mm",
            fontWeight: 700,
            color: "#867662",
            letterSpacing: "0.12em",
            marginBottom: "1.5mm",
          }}
        >
          COMPATIBILITÉS
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "2mm",
            fontSize: "3.5mm",
          }}
        >
          <Compat label="Chats" value={pet.okWithCats} />
          <Compat label="Chiens" value={pet.okWithDogs} />
          <Compat label="Enfants" value={pet.okWithChildren} />
        </div>
      </div>

      <footer
        style={{
          marginTop: "auto",
          paddingTop: "4mm",
          borderTop: "0.5mm solid #1f1414",
          display: "flex",
          alignItems: "center",
          gap: "5mm",
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: "3.5mm",
              fontWeight: 700,
              margin: 0,
              marginBottom: "1mm",
            }}
          >
            Sa fiche complète :
          </p>
          <p
            style={{
              fontSize: "3mm",
              margin: 0,
              color: "#867662",
              wordBreak: "break-all",
            }}
          >
            {fiche}
          </p>
        </div>
        <div
          style={{ width: "26mm", height: "26mm", flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: scaleSvg(qrSvg) }}
        />
      </footer>

      <div
        style={{
          textAlign: "center",
          fontSize: "2.5mm",
          color: "#a4937b",
          marginTop: "3mm",
          letterSpacing: "0.1em",
        }}
      >
        DORLOTER · adoption responsable
      </div>
    </>
  );
}

function CompactLayout({
  pet,
  photoSrc,
  qrSvg,
  fiche,
  statusLabel,
  statusColor,
  statusBg,
}: {
  pet: PetLite;
  photoSrc: string;
  qrSvg: string;
  fiche: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
}) {
  return (
    <>
      <header
        style={{
          background: "#e8634d",
          color: "white",
          padding: "2.5mm 5mm",
          marginLeft: "-10mm",
          marginRight: "-10mm",
          marginTop: "-10mm",
          marginBottom: "4mm",
          textAlign: "center",
          fontSize: "3mm",
          fontWeight: 700,
          letterSpacing: "0.16em",
        }}
      >
        FICHE ANIMAL · DORLOTER
      </header>

      <div style={{ display: "flex", gap: "4mm", marginBottom: "4mm" }}>
        <div
          style={{
            width: "28mm",
            height: "28mm",
            background: "#f3f0ea",
            overflow: "hidden",
            borderRadius: "1.5mm",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoSrc}
            alt={pet.name}
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
              marginBottom: "1.5mm",
            }}
          >
            {pet.name}
          </h1>
          <span
            style={{
              display: "inline-block",
              background: statusBg,
              color: statusColor,
              padding: "0.5mm 2mm",
              borderRadius: "6mm",
              fontSize: "2.5mm",
              fontWeight: 700,
              marginBottom: "1.5mm",
            }}
          >
            {statusLabel}
          </span>
          <p style={{ fontSize: "2.8mm", margin: 0, lineHeight: 1.3 }}>
            {pet.species === "chat" ? "Chat" : "Chien"}
            {pet.breed ? ` · ${pet.breed}` : ""}
            <br />
            {labelSex(pet.sex)} · {labelAge(pet.ageCategory)}
          </p>
        </div>
      </div>

      <div
        style={{
          fontSize: "2.6mm",
          marginBottom: "3mm",
          color: "#3d362f",
        }}
      >
        Chats {labelCompat(pet.okWithCats)} · Chiens{" "}
        {labelCompat(pet.okWithDogs)} · Enfants{" "}
        {labelCompat(pet.okWithChildren)}
      </div>

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
            Adoptez-le en ligne →
          </p>
          <p
            style={{
              fontSize: "2mm",
              color: "#867662",
              margin: 0,
              wordBreak: "break-all",
            }}
          >
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
  pet,
  photoSrc,
  qrSvg,
  statusLabel,
  statusColor,
  statusBg,
}: {
  pet: PetLite;
  photoSrc: string;
  qrSvg: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
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
      <span
        style={{
          background: statusBg,
          color: statusColor,
          padding: "1mm 3mm",
          borderRadius: "10mm",
          fontSize: "3mm",
          fontWeight: 700,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {statusLabel}
      </span>
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
          alt={pet.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div
        style={{ fontSize: "5mm", fontWeight: 900, lineHeight: 1, margin: 0 }}
      >
        {pet.name}
      </div>
      <div
        style={{ width: "22mm", height: "22mm", flexShrink: 0 }}
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
      <dt
        style={{
          fontWeight: 700,
          color: "#867662",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{value}</dd>
    </>
  );
}

function Compat({
  label,
  value,
}: {
  label: string;
  value: "oui" | "non" | "inconnu";
}) {
  const color =
    value === "oui" ? "#15803d" : value === "non" ? "#a53a2a" : "#867662";
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "5mm",
          fontWeight: 900,
          color,
          lineHeight: 1,
        }}
      >
        {labelCompat(value)}
      </div>
      <div
        style={{
          fontSize: "2.5mm",
          color: "#867662",
          marginTop: "0.5mm",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function scaleSvg(svg: string): string {
  return svg.replace(
    /<svg[^>]*>/,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%" shape-rendering="crispEdges">'
  );
}
