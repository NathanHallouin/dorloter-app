# syntax=docker/dockerfile:1
#
# Image de prod de l'API Dorloter (NestJS). Contexte de build = apps/api
# (autonome ; les migrations .sql sont copiées à côté du bundle) :
#
#   docker build -t dorloter-api apps/api

# --- Étape build : compile TypeScript -> dist ---------------------------------
FROM node:24-slim AS build
WORKDIR /src
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY migrations ./migrations
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- Étape runtime : image légère, non-root -----------------------------------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
# ca-certificates : TLS sortant éventuel (SMTP, stockage objet).
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app && useradd --system --gid app app
WORKDIR /app
COPY --from=build /src/node_modules ./node_modules
COPY --from=build /src/dist ./dist
COPY --from=build /src/package.json ./package.json
USER app
EXPOSE 8080
ENV BIND_ADDR=0.0.0.0:8080
CMD ["node", "dist/main.js"]
