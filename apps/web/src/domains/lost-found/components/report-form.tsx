"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Cat,
  Check,
  ChevronDown,
  Dog,
  Download,
  ExternalLink,
  Heart,
  HelpCircle,
  Info,
  Search,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { LocationPicker } from "@/components/map/location-picker";
import { createReport } from "@lost-found/actions";
import { importReportFromUrl } from "@lost-found/actions/import";
import { cn } from "@shared/utils";

type ReportType = "perdu" | "trouve";
type Species = "chat" | "chien";
type Sex = "male" | "femelle" | "inconnu";

interface PhotoState {
  file?: File;
  previewUrl: string;
  uploadedUrl?: string;
  blurDataUrl?: string | null;
  uploading: boolean;
  error?: string;
  imported?: boolean;
}

const STEPS = [
  { id: 1, label: "Type" },
  { id: 2, label: "Photo & lieu" },
  { id: 3, label: "Description" },
] as const;

export function ReportForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [type, setType] = useState<ReportType | null>(null);
  const [species, setSpecies] = useState<Species | null>(null);
  const [location, setLocation] =
    useState<{ latitude: number; longitude: number } | null>(null);
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Champs prefillables par l'import
  const [petName, setPetName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<Sex>("inconnu");
  const [distinctiveSigns, setDistinctiveSigns] = useState("");
  const [address, setAddress] = useState("");
  const [dateEvent, setDateEvent] = useState("");
  const [isChipped, setIsChipped] = useState(false);
  const [chipNumber, setChipNumber] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  // Import PetAlert
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSource, setImportSource] = useState<string | null>(null);

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    const res = await importReportFromUrl(importUrl.trim());
    setImporting(false);

    if (!res.success || !res.data) {
      toast.error(res.error ?? "Échec de l'import.");
      return;
    }

    const d = res.data;
    if (d.type) setType(d.type);
    if (d.petName) setPetName(d.petName);
    if (d.description) setDescription(d.description);
    if (d.color) setColor(d.color);
    if (d.breed) setBreed(d.breed);
    if (d.sex) setSex(d.sex);
    if (d.address) setAddress(d.address);
    if (d.dateEvent) setDateEvent(d.dateEvent);
    if (d.photoUrls.length > 0) {
      setPhotos(
        d.photoUrls.map((url) => ({
          previewUrl: url,
          uploadedUrl: url,
          uploading: false,
          imported: true,
        }))
      );
    }
    setImportSource(d.sourceUrl);
    if (!species) setSpecies("chat");

    toast.success("Annonce importée. Vérifiez et publiez.");
    setStep(2);
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).slice(0, 5 - photos.length);
    const next = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }));
    setPhotos((p) => [...p, ...next]);

    for (const photo of next) {
      const idx = photos.length + next.indexOf(photo);
      try {
        const formData = new FormData();
        formData.append("file", photo.file!);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload échoué");
        setPhotos((p) =>
          p.map((ph, i) =>
            i === idx
              ? {
                  ...ph,
                  uploadedUrl: json.url,
                  blurDataUrl: json.blurDataUrl ?? null,
                  uploading: false,
                }
              : ph
          )
        );
      } catch (err) {
        setPhotos((p) =>
          p.map((ph, i) =>
            i === idx
              ? {
                  ...ph,
                  uploading: false,
                  error: err instanceof Error ? err.message : "Erreur",
                }
              : ph
          )
        );
      }
    }
  }

  function removePhoto(index: number) {
    setPhotos((p) => {
      const removed = p[index];
      if (removed && removed.file) URL.revokeObjectURL(removed.previewUrl);
      return p.filter((_, i) => i !== index);
    });
  }

  // Étape 1 → 2 : impose le choix type + species avant d'avancer.
  function goNext() {
    if (step === 1) {
      if (!type) {
        toast.error("Choisissez perdu ou trouvé.");
        return;
      }
      if (!species) {
        toast.error("Choisissez l'espèce.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!location) {
        toast.error("Indiquez le lieu sur la carte.");
        return;
      }
      if (photos.some((p) => p.uploading)) {
        toast.error("Attendez la fin de l'upload.");
        return;
      }
      setStep(3);
      return;
    }
  }

  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!type || !species || !location) {
      toast.error("Il manque le type, l'espèce ou le lieu.");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("La description doit faire au moins 10 caractères.");
      return;
    }
    if (!dateEvent) {
      toast.error("Indiquez la date.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.set("type", type);
    formData.set("species", species);
    formData.set("petName", petName);
    formData.set("description", description);
    formData.set("color", color);
    formData.set("breed", breed);
    formData.set("sex", sex);
    formData.set("isChipped", isChipped ? "on" : "");
    formData.set("chipNumber", chipNumber);
    formData.set("distinctiveSigns", distinctiveSigns);
    formData.set("address", address);
    formData.set("dateEvent", dateEvent);
    formData.set("contactPhone", contactPhone);
    formData.set("contactEmail", contactEmail);
    formData.set("notes", notes);
    formData.set("latitude", String(location.latitude));
    formData.set("longitude", String(location.longitude));
    for (const photo of photos) {
      if (photo.uploadedUrl) {
        formData.append("photoUrl", photo.uploadedUrl);
        // Pairé par index avec photoUrl — chaîne vide si pas de blur, le
        // serveur gère l'absence (placeholder optionnel).
        formData.append("photoBlur", photo.blurDataUrl ?? "");
      }
    }

    const result = await createReport(formData);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Erreur lors de la création.");
      return;
    }

    const matchCount = result.data?.matchCount ?? 0;
    if (matchCount > 0) {
      toast.success(
        `Signalement publié. ${matchCount} piste${matchCount > 1 ? "s" : ""} déjà identifiée${matchCount > 1 ? "s" : ""}.`
      );
    } else {
      toast.success("Signalement publié. On surveille les annonces compatibles.");
    }

    router.push(`/perdus-trouves/${result.data!.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ProgressBar currentStep={step} />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Honeypot anti-bot global */}
        <input
          type="text"
          name="_hp"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          style={{ position: "absolute", left: "-9999px", width: 0, height: 0 }}
        />

        {step === 1 && (
          <Step1Type
            type={type}
            species={species}
            onTypeChange={setType}
            onSpeciesChange={setSpecies}
            importUrl={importUrl}
            importing={importing}
            importSource={importSource}
            onImportUrlChange={setImportUrl}
            onImport={handleImport}
          />
        )}

        {step === 2 && (
          <Step2PhotoLocation
            type={type!}
            photos={photos}
            location={location}
            address={address}
            onAddressChange={setAddress}
            onLocationChange={setLocation}
            onFilesSelected={handleFilesSelected}
            onRemovePhoto={removePhoto}
          />
        )}

        {step === 3 && (
          <Step3Description
            type={type!}
            species={species!}
            petName={petName}
            description={description}
            color={color}
            breed={breed}
            sex={sex}
            dateEvent={dateEvent}
            distinctiveSigns={distinctiveSigns}
            isChipped={isChipped}
            chipNumber={chipNumber}
            contactPhone={contactPhone}
            contactEmail={contactEmail}
            notes={notes}
            showDetails={showDetails}
            onPetNameChange={setPetName}
            onDescriptionChange={setDescription}
            onColorChange={setColor}
            onBreedChange={setBreed}
            onSexChange={setSex}
            onDateEventChange={setDateEvent}
            onDistinctiveSignsChange={setDistinctiveSigns}
            onIsChippedChange={setIsChipped}
            onChipNumberChange={setChipNumber}
            onContactPhoneChange={setContactPhone}
            onContactEmailChange={setContactEmail}
            onNotesChange={setNotes}
            onToggleDetails={() => setShowDetails((s) => !s)}
          />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-5">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={submitting}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Précédent
            </Button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <Button type="button" onClick={goNext}>
              Continuer
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? "Publication…" : "Publier le signalement"}
            </Button>
          )}
        </div>

        {step === 3 && (
          <p className="text-center text-xs text-muted-foreground">
            Vous pourrez compléter la fiche (signes distinctifs, contact,
            notes) après publication.
          </p>
        )}
      </form>
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: number }) {
  const total = STEPS.length;
  const percent = (currentStep / total) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Étape {currentStep} / {total}
        </span>
        <span className="tabular-nums">{Math.round(percent)} %</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-sable-200">
        <div
          className="h-full rounded-full bg-coral-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
          aria-hidden
        />
      </div>
      <ol className="mt-3 flex items-center justify-between gap-2 text-xs">
        {STEPS.map((s) => (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-1.5",
              s.id === currentStep
                ? "font-semibold text-coral-700"
                : s.id < currentStep
                  ? "text-foreground"
                  : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                s.id < currentStep
                  ? "bg-coral-500 text-white"
                  : s.id === currentStep
                    ? "bg-coral-100 text-coral-700"
                    : "bg-sable-200 text-muted-foreground"
              )}
            >
              {s.id < currentStep ? <Check className="h-3 w-3" /> : s.id}
            </span>
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Step 1 ────────────────────────────────────────────────────────────────

function Step1Type({
  type,
  species,
  onTypeChange,
  onSpeciesChange,
  importUrl,
  importing,
  importSource,
  onImportUrlChange,
  onImport,
}: {
  type: ReportType | null;
  species: Species | null;
  onTypeChange: (t: ReportType) => void;
  onSpeciesChange: (s: Species) => void;
  importUrl: string;
  importing: boolean;
  importSource: string | null;
  onImportUrlChange: (v: string) => void;
  onImport: () => void;
}) {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">
          Que se passe-t-il ?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deux taps pour qu&apos;on commence à chercher en face.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <BigPickButton
          active={type === "perdu"}
          onClick={() => onTypeChange("perdu")}
          icon={<Search className="h-7 w-7" />}
          title="Je cherche le mien"
          subtitle="Mon animal a disparu, je veux le retrouver."
        />
        <BigPickButton
          active={type === "trouve"}
          onClick={() => onTypeChange("trouve")}
          icon={<Heart className="h-7 w-7" fill="currentColor" />}
          title="J'en ai trouvé un"
          subtitle="Un animal est venu, je cherche sa famille."
        />
      </div>

      {type && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            De quoi s&apos;agit-il ?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <BigPickButton
              active={species === "chat"}
              onClick={() => onSpeciesChange("chat")}
              icon={<Cat className="h-6 w-6" />}
              title="Un chat"
            />
            <BigPickButton
              active={species === "chien"}
              onClick={() => onSpeciesChange("chien")}
              icon={<Dog className="h-6 w-6" />}
              title="Un chien"
            />
          </div>
        </div>
      )}

      <details className="group rounded-xl border border-lavande-200 bg-lavande-50/40 p-4">
        <summary className="flex cursor-pointer items-start gap-2.5 list-none">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-lavande-700" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              Déjà posté sur PetAlert ?
            </p>
            <p className="text-xs text-muted-foreground">
              Importez votre annonce en collant son URL.
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
        </summary>
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              value={importUrl}
              onChange={(e) => onImportUrlChange(e.target.value)}
              placeholder="https://petalert.fr/annonce/…"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={onImport}
              disabled={importing || !importUrl.trim()}
              variant="secondary"
            >
              {importing ? "Import…" : "Importer"}
            </Button>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            N&apos;importez que <strong>vos propres annonces</strong>. Les
            photos sont rapatriées chez Dorloter.
          </p>
          {importSource && (
            <p className="flex items-center gap-1 text-xs text-lavande-700">
              Importé depuis{" "}
              <a
                href={importSource}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline"
              >
                {new URL(importSource).hostname}
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          )}
        </div>
      </details>
    </section>
  );
}

function BigPickButton({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400",
        active
          ? "border-coral-500 bg-coral-50"
          : "border-border bg-card hover:border-coral-300"
      )}
    >
      <span
        className={cn(
          "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-coral-500 text-white" : "bg-coral-50 text-coral-600"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
}

// ─── Step 2 ────────────────────────────────────────────────────────────────

function Step2PhotoLocation({
  type,
  photos,
  location,
  address,
  onAddressChange,
  onLocationChange,
  onFilesSelected,
  onRemovePhoto,
}: {
  type: ReportType;
  photos: PhotoState[];
  location: { latitude: number; longitude: number } | null;
  address: string;
  onAddressChange: (v: string) => void;
  onLocationChange: (v: { latitude: number; longitude: number } | null) => void;
  onFilesSelected: (files: FileList | null) => void;
  onRemovePhoto: (i: number) => void;
}) {
  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">Photo & lieu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La photo et la géolocalisation sont les indices les plus utiles
          pour rapprocher deux annonces.
        </p>
      </header>

      <div className="space-y-3">
        <Label>Photos {photos.length === 0 && "(au moins une, idéalement)"}</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-sable-100"
            >
              <Image
                src={photo.previewUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
              {photo.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white">
                  Upload…
                </div>
              )}
              {photo.imported && (
                <div className="absolute bottom-1 left-1 rounded bg-lavande-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Importée
                </div>
              )}
              {photo.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/80 p-2 text-xs text-white">
                  {photo.error}
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="Supprimer la photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {photos.length < 5 && (
            <>
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-coral-400 hover:text-coral-500">
                <Camera className="h-5 w-5" />
                <span className="text-xs">Prendre</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    onFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-coral-400 hover:text-coral-500">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Galerie</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          5 photos max · JPEG, PNG ou WebP, 5 Mo chacune.
        </p>
      </div>

      <div className="space-y-3">
        <Label>
          {type === "perdu"
            ? "Lieu probable de la disparition"
            : "Lieu où vous l'avez trouvé"}
        </Label>
        <LocationPicker value={location} onChange={onLocationChange} />
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-normal">
            Adresse (optionnel)
          </Label>
          <Input
            id="address"
            name="address"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="15 rue de Rivoli, 75001 Paris"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Step 3 ────────────────────────────────────────────────────────────────

function Step3Description({
  type,
  species,
  petName,
  description,
  color,
  breed,
  sex,
  dateEvent,
  distinctiveSigns,
  isChipped,
  chipNumber,
  contactPhone,
  contactEmail,
  notes,
  showDetails,
  onPetNameChange,
  onDescriptionChange,
  onColorChange,
  onBreedChange,
  onSexChange,
  onDateEventChange,
  onDistinctiveSignsChange,
  onIsChippedChange,
  onChipNumberChange,
  onContactPhoneChange,
  onContactEmailChange,
  onNotesChange,
  onToggleDetails,
}: {
  type: ReportType;
  species: Species;
  petName: string;
  description: string;
  color: string;
  breed: string;
  sex: Sex;
  dateEvent: string;
  distinctiveSigns: string;
  isChipped: boolean;
  chipNumber: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  showDetails: boolean;
  onPetNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onBreedChange: (v: string) => void;
  onSexChange: (v: Sex) => void;
  onDateEventChange: (v: string) => void;
  onDistinctiveSignsChange: (v: string) => void;
  onIsChippedChange: (v: boolean) => void;
  onChipNumberChange: (v: string) => void;
  onContactPhoneChange: (v: string) => void;
  onContactEmailChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onToggleDetails: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const charsLeft = 10 - description.trim().length;

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">
          Décrivez l&apos;animal
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Plus c&apos;est précis, plus le système peut faire le lien avec une
          annonce en face.
        </p>
      </header>

      {type === "perdu" && (
        <div className="space-y-2">
          <Label htmlFor="petName">
            {species === "chien" ? "Nom du chien" : "Nom du chat"}
          </Label>
          <Input
            id="petName"
            value={petName}
            onChange={(e) => onPetNameChange(e.target.value)}
            maxLength={255}
            placeholder={species === "chien" ? "Rex, Luna…" : "Mistigri, Felix…"}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          required
          minLength={10}
          rows={4}
          placeholder="Couleur du pelage, taille, comportement, signes particuliers…"
        />
        <p className="text-xs text-muted-foreground">
          {charsLeft > 0
            ? `Encore ${charsLeft} caractère${charsLeft > 1 ? "s" : ""}.`
            : "Parfait."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="color">Couleur principale</Label>
          <Input
            id="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            placeholder="Noir, tigré, roux…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="breed">Race (si connue)</Label>
          <Input
            id="breed"
            value={breed}
            onChange={(e) => onBreedChange(e.target.value)}
            placeholder="Européen, Siamois…"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sex">Sexe</Label>
          <Select value={sex} onValueChange={(v) => onSexChange(v as Sex)}>
            <SelectTrigger id="sex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Mâle</SelectItem>
              <SelectItem value="femelle">Femelle</SelectItem>
              <SelectItem value="inconnu">Inconnu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateEvent">
            {type === "perdu" ? "Date de la disparition" : "Date de la découverte"} *
          </Label>
          <Input
            id="dateEvent"
            type="date"
            value={dateEvent}
            onChange={(e) => onDateEventChange(e.target.value)}
            required
            max={today}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleDetails}
        aria-expanded={showDetails}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium hover:bg-muted/60"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          Détails complémentaires (optionnel)
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition",
            showDetails && "rotate-180"
          )}
        />
      </button>

      {showDetails && (
        <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-5">
          <div className="space-y-2">
            <Label htmlFor="distinctiveSigns">Signes distinctifs</Label>
            <Textarea
              id="distinctiveSigns"
              value={distinctiveSigns}
              onChange={(e) => onDistinctiveSignsChange(e.target.value)}
              rows={2}
              placeholder="Cicatrice, oreille coupée, collier, tatouage…"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isChipped"
              checked={isChipped}
              onChange={(e) => onIsChippedChange(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="isChipped" className="font-normal">
              Pucé (identifiant électronique)
            </Label>
          </div>

          {isChipped && (
            <div className="space-y-2">
              <Label htmlFor="chipNumber">Numéro de puce (si connu)</Label>
              <Input
                id="chipNumber"
                value={chipNumber}
                onChange={(e) => onChipNumberChange(e.target.value)}
                maxLength={50}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Téléphone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => onContactPhoneChange(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => onContactEmailChange(e.target.value)}
                maxLength={255}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ces coordonnées seront visibles publiquement sur la fiche.
          </p>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes complémentaires</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      )}
    </section>
  );
}
