# CLAUDE.md · packages/api-client

> Client `openapi-fetch` typé (`@dorloter/api-client`), **généré** depuis
> l'OpenAPI de l'API et consommé par `apps/mobile`. Ce fichier complète le
> [CLAUDE.md racine](../../CLAUDE.md).
>
> À ne pas confondre avec `packages/client`, la couche API écrite à la main
> pour les fronts web.

## Génération

`src/types.gen.ts` est **généré, jamais édité à la main**. Régénération, API lancée sur :8080 :

```bash
bun api:types      # depuis la racine du dépôt
```

L'OpenAPI servi par l'API est encore **partiel** : l'annotation exhaustive est un chantier ouvert. Le fichier committé reste néanmoins valide, parce que le contrat de l'API n'a pas bougé. Régénérer aujourd'hui appauvrirait le typage plutôt que de l'améliorer · ne le faire qu'après avoir complété les annotations côté API.

## Conséquence pratique

`types.gen.ts` fait donc autorité sur le contrat attendu par le mobile, y compris pour des endpoints que l'API ne sert pas encore. C'est ainsi que le contrat de `POST /uploads/presign` a été réimplémenté à l'identique : les champs y étaient décrits, il suffisait de s'y conformer pour que le mobile fonctionne sans régénération.

Avant de modifier une route existante côté API, vérifier ici ce que le mobile attend.

## Commandes

```bash
bun run typecheck  # tsc --noEmit
```
