"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Archive,
  Edit,
  ExternalLink,
  Eye,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  archiveNewsPost,
  deleteNewsPost,
  upsertNewsPost,
  NEWS_POST_TYPES,
  NEWS_POST_TYPE_LABELS,
  NEWS_POST_TYPE_CLASSES,
  NEWS_POST_STATUS_LABELS,
  type NewsPost,
  type NewsPostType,
} from "@shelters/public.client";

interface Props {
  initialPosts: NewsPost[];
}

export function PostsManager({ initialPosts }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<NewsPost | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer "${title}" définitivement ?`)) return;
    startTransition(async () => {
      const result = await deleteNewsPost(id);
      if (!result.success) {
        toast.error(result.error ?? "Suppression impossible.");
        return;
      }
      toast.success("Article supprimé.");
      router.refresh();
    });
  }

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveNewsPost(id);
      if (!result.success) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success("Article archivé.");
      router.refresh();
    });
  }

  if (editing) {
    return (
      <PostEditor
        post={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvel article
        </Button>
      </div>

      {initialPosts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun article pour le moment. Lancez-vous : un récit
          d&apos;adoption, un appel à l&apos;aide, un compte-rendu
          d&apos;événement…
        </p>
      ) : (
        <ul className="space-y-2">
          {initialPosts.map((p) => {
            const cl = NEWS_POST_TYPE_CLASSES[p.type];
            return (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${cl.dot}`}
                        />
                        {NEWS_POST_TYPE_LABELS[p.type]}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <h3 className="truncate text-base font-semibold text-foreground">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {p.excerpt}
                      </p>
                    )}
                    {p.status === "refuse" && p.rejectedReason && (
                      <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800">
                        Motif du refus : {p.rejectedReason}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {p.publishedAt
                        ? `Publié le ${new Date(p.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                        : `Mis à jour le ${new Date(p.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {p.status === "publie" && (
                      <Link
                        href={`/actualites/${p.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-sable-50"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir
                      </Link>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(p)}
                      disabled={isPending}
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Éditer
                    </Button>
                    {p.status === "publie" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleArchive(p.id)}
                        disabled={isPending}
                      >
                        <Archive className="mr-1 h-3.5 w-3.5" />
                        Archiver
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(p.id, p.title)}
                      disabled={isPending}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: NewsPost["status"] }) {
  const styles: Record<NewsPost["status"], string> = {
    brouillon: "bg-sable-100 text-sable-800",
    en_attente_modo: "bg-amber-100 text-amber-800",
    publie: "bg-emerald-100 text-emerald-800",
    refuse: "bg-rose-100 text-rose-800",
    archive: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}
    >
      {NEWS_POST_STATUS_LABELS[status]}
    </span>
  );
}

function PostEditor({
  post,
  onClose,
  onSaved,
}: {
  post: NewsPost | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<NewsPostType>(post?.type ?? "autre");
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [coverUrl, setCoverUrl] = useState(post?.coverUrl ?? "");
  const [isPending, startTransition] = useTransition();

  function submit(publish: boolean) {
    startTransition(async () => {
      const result = await upsertNewsPost({
        id: post?.id,
        type,
        title,
        excerpt,
        body,
        coverUrl,
        publish,
      });
      if (!result.success) {
        toast.error(result.error ?? "Enregistrement impossible.");
        return;
      }
      const statusMsg =
        result.data?.status === "publie"
          ? "Article publié."
          : result.data?.status === "en_attente_modo"
            ? "Article envoyé en modération."
            : "Brouillon enregistré.";
      toast.success(statusMsg);
      onSaved();
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          {post ? "Modifier l'article" : "Nouvel article"}
        </h2>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          <X className="mr-1 h-4 w-4" />
          Fermer
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="post-type">Type d&apos;article</Label>
          <select
            id="post-type"
            value={type}
            onChange={(e) => setType(e.target.value as NewsPostType)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {NEWS_POST_TYPES.map((t) => (
              <option key={t} value={t}>
                {NEWS_POST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="post-cover">Image de couverture (URL)</Label>
          <Input
            id="post-cover"
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="post-title">Titre</Label>
        <Input
          id="post-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Le retour de Mistigri à la maison"
          maxLength={255}
        />
      </div>

      <div>
        <Label htmlFor="post-excerpt">
          Résumé court (facultatif, max 500 caractères)
        </Label>
        <Textarea
          id="post-excerpt"
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Une phrase pour donner envie de cliquer."
          maxLength={500}
        />
      </div>

      <div>
        <Label htmlFor="post-body">
          Contenu (markdown léger : **gras**, *italique*, ## titre, listes, liens)
        </Label>
        <Textarea
          id="post-body"
          rows={14}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Adopté en janvier, Mistigri a vite trouvé sa place…\n\n## Son histoire\n\nAprès trois mois en pension, …\n\n- Joueur\n- Affectueux\n- Sociable avec les enfants`}
          className="font-mono text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {body.length} caractères. Minimum 50.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => submit(false)}
          disabled={isPending}
        >
          Enregistrer le brouillon
        </Button>
        <Button type="button" onClick={() => submit(true)} disabled={isPending}>
          <Eye className="mr-1.5 h-4 w-4" />
          Publier
        </Button>
      </div>
    </div>
  );
}
