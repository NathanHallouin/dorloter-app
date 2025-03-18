import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Calendar, MapPin } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  getNewsPostBySlug,
  listPublishedNewsPosts,
  renderNewsMarkdown,
  NEWS_POST_TYPE_LABELS,
  NEWS_POST_TYPE_CLASSES,
} from "@shelters/public";

export const revalidate = 600;

interface Params {
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) return { title: "Article introuvable" };
  return {
    title: post.title,
    description: post.excerpt ?? post.title,
    alternates: { canonical: `/actualites/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? post.title,
      url: `/actualites/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverUrl ? [{ url: post.coverUrl }] : [],
    },
  };
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) notFound();

  const related = (
    await listPublishedNewsPosts({
      type: post.type,
      limit: 4,
    })
  )
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  const html = renderNewsMarkdown(post.body);
  const cl = NEWS_POST_TYPE_CLASSES[post.type];

  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <Link
          href="/actualites"
          className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-coral-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Toutes les actualités
        </Link>

        <article>
          <header className="mb-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${cl.bg} ${cl.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cl.dot}`} />
                {NEWS_POST_TYPE_LABELS[post.type]}
              </span>
              {post.publishedAt && (
                <time
                  dateTime={post.publishedAt.toISOString()}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Calendar className="h-3 w-3" />
                  {new Date(post.publishedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              )}
            </div>
            <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-base text-muted-foreground">
              {post.excerpt}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-border py-3 text-xs">
              <Link
                href={`/refuges/${post.shelterSlug}`}
                className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-coral-600"
              >
                {post.shelterName}
                {post.shelterIsVerified && (
                  <BadgeCheck className="h-3.5 w-3.5 text-coral-500" />
                )}
              </Link>
              {post.shelterCity && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {post.shelterCity}
                </span>
              )}
            </div>
          </header>

          {post.coverUrl && (
            <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-2xl bg-sable-100">
              <Image
                src={post.coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 768px) 768px, 100vw"
                priority
                unoptimized
              />
            </div>
          )}

          <div
            className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:font-bold prose-headings:text-foreground prose-a:text-coral-600 prose-a:underline prose-strong:text-foreground"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>

        {related.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              À lire aussi
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-border bg-card p-4 hover:shadow-sm"
                >
                  <Link
                    href={`/actualites/${r.slug}`}
                    className="block text-sm font-semibold text-foreground hover:text-coral-600"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {r.shelterName}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
