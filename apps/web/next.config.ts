import path from "node:path";
import type { NextConfig } from "next";

// Dérivation automatique du `remotePatterns` depuis `S3_PUBLIC_URL`.
// Marche en dev (http://localhost:9000/miaou-photos) et en prod
// (https://cdn.miaou.cat/miaou-photos) sans toucher ce fichier.
function s3Pattern() {
  const url = process.env.S3_PUBLIC_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      pathname: `${parsed.pathname.replace(/\/$/, "")}/**`,
    };
  } catch {
    return null;
  }
}

const pattern = s3Pattern();

const isProd = process.env.NODE_ENV === "production";

// ─── CSP ────────────────────────────────────────────────────────────────────
// Stricte en prod, permissive en dev (Next dev a besoin d'eval pour HMR).
// On autorise :
//   - images : S3, Unsplash (placeholder), data: et blob: (uploads locaux)
//   - tuiles : api.maptiler.com + tiles.openfreemap.org (fallback)
//   - workers : blob: (MapLibre GL utilise des Web Workers)
//   - connexions : self + MapTiler pour fetch des styles
const s3Host = pattern?.hostname ?? "localhost";
const imgSources = [
  "'self'",
  "data:",
  "blob:",
  `${pattern?.protocol ?? "http"}://${s3Host}${pattern?.port ? `:${pattern.port}` : ""}`,
  "https://images.unsplash.com",
].join(" ");

const cspProd = [
  `default-src 'self'`,
  // 'unsafe-inline' nécessaire pour les styles Tailwind JIT + inline de MapLibre ;
  // 'unsafe-eval' nécessaire pour MapLibre GL (expression parser dynamique).
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src ${imgSources}`,
  `font-src 'self' data:`,
  `connect-src 'self' https://api.maptiler.com https://tiles.openfreemap.org`,
  `worker-src 'self' blob:`,
  `frame-ancestors 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: isProd
      ? cspProd
      : `${cspProd}; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'`,
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Caméra & géoloc autorisées pour l'app (signalement perdu/trouvé)
    value: "camera=(self), geolocation=(self), microphone=()",
  },
];

const nextConfig: NextConfig = {
  // Bundle minimal pour Docker (serveur + deps + assets publics uniquement).
  output: "standalone",
  // Monorepo : étendre le tracing de fichiers à la racine du workspace pour
  // que le standalone embarque @dorloter/api-client et les workspace-deps.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Transpile les packages workspace TypeScript consommés en source brut.
  transpilePackages: ["@dorloter/api-client"],
  // Bibliothèques avec bindings natifs (.node) ou code dynamique non bundlable :
  // on les laisse résolues au runtime via le node_modules du serveur. Sans ça,
  // la branche test de @mapbox/node-pre-gyp fait échouer le build sur un
  // require('nock') introuvable.
  serverExternalPackages: [
    "@tensorflow/tfjs-node",
    "nsfwjs",
    "sharp",
  ],
  images: {
    remotePatterns: [
      ...(pattern ? [pattern] : []),
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/miaou-photos/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
