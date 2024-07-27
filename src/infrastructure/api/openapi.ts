/**
 * Document OpenAPI 3.1 minimal pour `/api/v1/*`.
 *
 * Stratégie : on écrit le document à la main (un objet JSON tapé) plutôt
 * que de l'auto-générer depuis les schémas Zod. C'est ~30 lignes par route
 * et ça reste très lisible. Quand on aura 15+ routes, basculer vers
 * `zod-openapi` ou `@asteasolutions/zod-to-openapi` est trivial — la forme
 * du document ne change pas.
 *
 * Le document est servi sur `/api/v1/openapi.json` et consommé par :
 *   - `openapi-typescript` pour générer le client TS de l'app mobile
 *   - Postman / Insomnia / Hoppscotch pour explorer manuellement
 *   - Les outils de validation contractuelle (Spectral, etc.)
 */

const COMMON_RESPONSES = {
  Unauthorized: {
    description: "Authentification requise.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiError" },
      },
    },
  },
  Forbidden: {
    description: "Action non autorisée pour cet utilisateur.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiError" },
      },
    },
  },
  NotFound: {
    description: "Ressource introuvable.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiError" },
      },
    },
  },
  ValidationError: {
    description: "Données invalides — voir `error.details.issues`.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiError" },
      },
    },
  },
  RateLimited: {
    description:
      "Trop de requêtes. Header `Retry-After` indique le délai en secondes.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiError" },
      },
    },
  },
} as const;

export function buildOpenApiDocument(siteUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Dorloter API",
      version: "1.0.0",
      description:
        "API publique Dorloter — adoption, perdus/trouvés, refuges, pensions. " +
        "Stable, versionnée. Format réponse : `{ data: ... }` ou `{ error: { code, message } }`. " +
        "Auth via cookie (web) ou `Authorization: Bearer <token>` (mobile).",
      contact: {
        name: "Dorloter",
        url: "https://dorloter.fr",
        email: "hello@dorloter.fr",
      },
      license: {
        name: "Propriétaire",
        url: `${siteUrl}/cgu`,
      },
    },
    servers: [
      {
        url: `${siteUrl}/api/v1`,
        description: "Production",
      },
    ],
    tags: [
      { name: "adoption", description: "Animaux à adopter en refuge." },
      { name: "lost-found", description: "Signalements perdus / trouvés." },
      { name: "shelters", description: "Refuges et associations partenaires." },
      { name: "pensions", description: "Pensions professionnelles agréées." },
      { name: "me", description: "Profil de l'utilisateur courant." },
      {
        name: "notifications",
        description: "Inbox et notifications utilisateur.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Token Better Auth obtenu via `POST /api/auth/sign-in/email`.",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "__Secure-better-auth.session_token",
          description: "Cookie de session — utilisé par le web.",
        },
      },
      schemas: {
        ApiError: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string",
                  description: "Code d'erreur stable. Ne change jamais.",
                  enum: [
                    "VALIDATION_FAILED",
                    "BAD_REQUEST",
                    "INVALID_PARAM",
                    "UNAUTHORIZED",
                    "FORBIDDEN",
                    "NOT_FOUND",
                    "CONFLICT",
                    "DUPLICATE",
                    "GONE",
                    "UNPROCESSABLE",
                    "RATE_LIMITED",
                    "INTERNAL_ERROR",
                    "SERVICE_UNAVAILABLE",
                  ],
                  "x-enum-descriptions": {
                    VALIDATION_FAILED:
                      "Schéma Zod KO. `details.issues` liste les champs invalides.",
                    NOT_FOUND: "Ressource introuvable ou inaccessible à l'user.",
                    UNAUTHORIZED: "Pas de session — login requis.",
                    FORBIDDEN: "Connecté mais pas le droit d'effectuer l'action.",
                    CONFLICT:
                      "État serveur incompatible (ex. doublon, déjà candidaté).",
                    GONE: "Ressource existait mais n'est plus disponible.",
                    UNPROCESSABLE:
                      "Action invalide pour l'état courant (ex. pet adopté).",
                    RATE_LIMITED:
                      "Quota dépassé — voir header `Retry-After`.",
                  },
                },
                message: { type: "string" },
                details: {
                  type: "object",
                  additionalProperties: true,
                  description:
                    "Contexte additionnel — structure dépend du code.",
                },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          required: ["cursor", "hasMore"],
          properties: {
            cursor: {
              type: "string",
              nullable: true,
              description:
                "Cursor à passer en query param `?cursor=...` pour la page suivante. `null` si fin de liste.",
            },
            hasMore: { type: "boolean" },
          },
        },
        Pet: {
          type: "object",
          required: [
            "id",
            "species",
            "name",
            "sex",
            "isSterilized",
            "isChipped",
            "isVaccinated",
            "okWithCats",
            "okWithDogs",
            "okWithChildren",
            "status",
            "photos",
            "createdAt",
            "updatedAt",
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            species: { type: "string", enum: ["chat", "chien"] },
            name: { type: "string", maxLength: 255 },
            description: { type: "string", nullable: true },
            breed: { type: "string", nullable: true, maxLength: 100 },
            color: { type: "string", nullable: true, maxLength: 100 },
            sex: { type: "string", enum: ["male", "femelle", "inconnu"] },
            ageCategory: {
              type: "string",
              enum: ["chaton", "jeune", "adulte", "senior"],
              nullable: true,
            },
            estimatedBirth: {
              type: "string",
              format: "date",
              nullable: true,
            },
            isSterilized: { type: "boolean" },
            isChipped: { type: "boolean" },
            isVaccinated: { type: "boolean" },
            fivFelv: {
              type: "string",
              enum: [
                "negatif",
                "fiv_positif",
                "felv_positif",
                "fiv_felv_positif",
                "non_teste",
              ],
              nullable: true,
            },
            indoorOnly: { type: "boolean", nullable: true },
            okWithCats: {
              type: "string",
              enum: ["oui", "non", "inconnu"],
            },
            okWithDogs: {
              type: "string",
              enum: ["oui", "non", "inconnu"],
            },
            okWithChildren: {
              type: "string",
              enum: ["oui", "non", "inconnu"],
            },
            specialNeeds: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["disponible", "reserve", "adopte", "retire"],
            },
            adoptionFee: {
              type: "number",
              nullable: true,
              description: "Frais d'adoption en EUR.",
            },
            photos: {
              type: "array",
              items: { $ref: "#/components/schemas/PetPhoto" },
            },
            shelter: {
              oneOf: [
                { $ref: "#/components/schemas/PetShelter" },
                { type: "null" },
              ],
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        PetPhoto: {
          type: "object",
          required: ["id", "url", "isPrimary", "order"],
          properties: {
            id: { type: "string", format: "uuid" },
            url: { type: "string", format: "uri" },
            blurDataUrl: {
              type: "string",
              nullable: true,
              description:
                "LQIP base64 (~500 octets) — utilisable comme placeholder.",
            },
            isPrimary: { type: "boolean" },
            order: { type: "integer", minimum: 0 },
          },
        },
        PetShelter: {
          type: "object",
          required: ["id", "slug", "name", "isVerified"],
          properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string" },
            name: { type: "string" },
            address: { type: "string", nullable: true },
            isVerified: { type: "boolean" },
          },
        },
        ShelterSummary: {
          type: "object",
          description:
            "Refuge ou association — version annuaire (sans coordonnées détaillées).",
          required: [
            "id",
            "slug",
            "name",
            "isVerified",
            "available",
            "adopted",
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            address: { type: "string", nullable: true },
            logoUrl: { type: "string", format: "uri", nullable: true },
            coverUrl: { type: "string", format: "uri", nullable: true },
            isVerified: {
              type: "boolean",
              description: "Refuge vérifié manuellement par l'équipe Dorloter.",
            },
            foundedYear: { type: "integer", nullable: true },
            available: {
              type: "integer",
              description: "Animaux à adopter actuellement.",
            },
            adopted: {
              type: "integer",
              description: "Adoptions concrétisées (cumulé).",
            },
          },
        },
        Shelter: {
          allOf: [
            { $ref: "#/components/schemas/ShelterSummary" },
            {
              type: "object",
              required: ["reserved", "followers", "createdAt", "updatedAt"],
              properties: {
                missionLong: { type: "string", nullable: true },
                siret: {
                  type: "string",
                  nullable: true,
                  description: "Numéro SIRET — public légalement.",
                },
                phone: { type: "string", nullable: true },
                email: { type: "string", format: "email", nullable: true },
                website: { type: "string", format: "uri", nullable: true },
                donationUrl: {
                  type: "string",
                  format: "uri",
                  nullable: true,
                },
                visitHours: { type: "string", nullable: true },
                location: {
                  type: "object",
                  nullable: true,
                  required: ["latitude", "longitude"],
                  properties: {
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                },
                reserved: { type: "integer" },
                followers: { type: "integer" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          ],
        },
        ReportSummary: {
          type: "object",
          description:
            "Signalement perdu / trouvé — version liste (sans description longue, sans coordonnées de contact).",
          required: [
            "id",
            "type",
            "status",
            "species",
            "sex",
            "dateEvent",
            "location",
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["perdu", "trouve"] },
            status: {
              type: "string",
              enum: ["actif", "resolu", "expire"],
            },
            species: { type: "string", enum: ["chat", "chien"] },
            petName: { type: "string", nullable: true },
            breed: { type: "string", nullable: true },
            color: { type: "string", nullable: true },
            sex: { type: "string", enum: ["male", "femelle", "inconnu"] },
            dateEvent: { type: "string", format: "date" },
            address: { type: "string", nullable: true },
            location: {
              type: "object",
              required: ["latitude", "longitude"],
              properties: {
                latitude: { type: "number" },
                longitude: { type: "number" },
              },
            },
            primaryPhoto: {
              type: "object",
              nullable: true,
              required: ["url"],
              properties: {
                url: { type: "string", format: "uri" },
                blurDataUrl: { type: "string", nullable: true },
              },
            },
            distanceMeters: {
              type: "integer",
              nullable: true,
              description:
                "Distance au point de référence en mètres, si la requête contenait `lat`/`lng`/`radiusKm`. Sinon null.",
            },
          },
        },
        Report: {
          allOf: [
            { $ref: "#/components/schemas/ReportSummary" },
            {
              type: "object",
              required: [
                "description",
                "isChipped",
                "photos",
                "hasContact",
                "createdAt",
                "updatedAt",
              ],
              properties: {
                description: { type: "string" },
                isChipped: { type: "boolean" },
                chipNumber: { type: "string", nullable: true },
                distinctiveSigns: { type: "string", nullable: true },
                notes: { type: "string", nullable: true },
                photos: {
                  type: "array",
                  items: { $ref: "#/components/schemas/ReportPhoto" },
                },
                hasContact: {
                  type: "boolean",
                  description:
                    "Vrai si le signalement a un téléphone ou email associé. **Les valeurs ne sont jamais retournées en clair** — utilisez l'endpoint de révélation (rate-limité).",
                },
                resolvedAt: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          ],
        },
        ReportPhoto: {
          type: "object",
          required: ["id", "url", "isPrimary", "order"],
          properties: {
            id: { type: "string", format: "uuid" },
            url: { type: "string", format: "uri" },
            blurDataUrl: { type: "string", nullable: true },
            isPrimary: { type: "boolean" },
            order: { type: "integer", minimum: 0 },
          },
        },
        PetCard: {
          type: "object",
          description:
            "Version allégée de Pet, optimisée pour les listes (pas de description, pas de photos secondaires).",
          required: [
            "id",
            "species",
            "name",
            "sex",
            "status",
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            species: { type: "string", enum: ["chat", "chien"] },
            name: { type: "string" },
            breed: { type: "string", nullable: true },
            color: { type: "string", nullable: true },
            sex: { type: "string", enum: ["male", "femelle", "inconnu"] },
            ageCategory: {
              type: "string",
              enum: ["chaton", "jeune", "adulte", "senior"],
              nullable: true,
            },
            status: {
              type: "string",
              enum: ["disponible", "reserve", "adopte", "retire"],
            },
            adoptionFee: { type: "number", nullable: true },
            primaryPhoto: {
              type: "object",
              nullable: true,
              required: ["url"],
              properties: {
                url: { type: "string", format: "uri" },
                blurDataUrl: { type: "string", nullable: true },
              },
            },
            shelter: {
              type: "object",
              nullable: true,
              required: ["id", "slug", "name"],
              properties: {
                id: { type: "string", format: "uuid" },
                slug: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
        PensionRating: {
          type: "object",
          required: ["average", "count"],
          properties: {
            average: {
              type: "number",
              minimum: 1,
              maximum: 5,
              description: "Moyenne des avis publiés, deux décimales.",
            },
            count: {
              type: "integer",
              minimum: 0,
              description: "Nombre d'avis publiés.",
            },
          },
        },
        PensionPhoto: {
          type: "object",
          required: ["id", "url", "isPrimary", "order"],
          properties: {
            id: { type: "string", format: "uuid" },
            url: { type: "string", format: "uri" },
            blurDataUrl: { type: "string", nullable: true },
            isPrimary: { type: "boolean" },
            order: { type: "integer", minimum: 0 },
          },
        },
        PensionSummary: {
          type: "object",
          description:
            "Pension agréée — version annuaire (sans coordonnées détaillées, sans services).",
          required: [
            "id",
            "slug",
            "name",
            "acceptsCats",
            "acceptsDogs",
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            address: { type: "string", nullable: true },
            logoUrl: { type: "string", format: "uri", nullable: true },
            coverUrl: { type: "string", format: "uri", nullable: true },
            acceptsCats: { type: "boolean" },
            acceptsDogs: { type: "boolean" },
            pricePerDayCat: {
              type: "number",
              nullable: true,
              description: "Prix par jour chat en EUR.",
            },
            pricePerDayDog: {
              type: "number",
              nullable: true,
              description: "Prix par jour chien en EUR.",
            },
            rating: {
              oneOf: [
                { $ref: "#/components/schemas/PensionRating" },
                { type: "null" },
              ],
            },
          },
        },
        Me: {
          type: "object",
          description: "Profil complet de l'utilisateur courant.",
          required: [
            "id",
            "email",
            "emailVerified",
            "name",
            "role",
            "resolvedCount",
            "createdAt",
            "updatedAt",
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            emailVerified: { type: "boolean" },
            name: { type: "string" },
            image: { type: "string", format: "uri", nullable: true },
            role: {
              type: "string",
              enum: [
                "user",
                "shelter_admin",
                "pension_admin",
                "platform_admin",
              ],
            },
            shelterId: {
              type: "string",
              format: "uuid",
              nullable: true,
              description:
                "Si l'user est admin d'un refuge — utilisé pour afficher les onglets backoffice.",
            },
            pensionId: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            phone: { type: "string", nullable: true },
            location: {
              type: "object",
              nullable: true,
              required: ["latitude", "longitude"],
              properties: {
                latitude: { type: "number" },
                longitude: { type: "number" },
              },
            },
            notificationRadiusKm: {
              type: "integer",
              nullable: true,
              description: "Rayon (km) pour les alertes perdus/trouvés proches.",
            },
            resolvedCount: {
              type: "integer",
              minimum: 0,
              description: "Nombre de retrouvailles confirmées (badge profil).",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        NotificationType: {
          type: "string",
          enum: [
            "match_found",
            "application_update",
            "new_cat_nearby",
            "report_nearby",
            "new_message",
          ],
        },
        Notification: {
          type: "object",
          required: [
            "id",
            "type",
            "title",
            "isRead",
            "createdAt",
          ],
          properties: {
            id: { type: "string", format: "uuid" },
            type: { $ref: "#/components/schemas/NotificationType" },
            title: { type: "string" },
            body: { type: "string", nullable: true },
            data: {
              type: "object",
              additionalProperties: true,
              nullable: true,
              description:
                "Payload contextuel — structure dépend du `type` (ex. `reportId`, `petId`, `applicationId`).",
            },
            isRead: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        RevealedContact: {
          type: "object",
          required: ["phone", "email"],
          properties: {
            phone: { type: "string", nullable: true },
            email: { type: "string", format: "email", nullable: true },
          },
        },
        ApplicationCreate: {
          type: "object",
          required: ["petId", "motivation"],
          properties: {
            petId: { type: "string", format: "uuid" },
            housingType: {
              type: "string",
              enum: ["appartement", "maison", "autre"],
            },
            hasOutdoorAccess: { type: "boolean", default: false },
            hasOtherPets: { type: "string" },
            hasChildren: { type: "boolean", default: false },
            childrenAges: { type: "string" },
            experience: { type: "string" },
            motivation: {
              type: "string",
              minLength: 20,
              description: "Pourquoi cet animal — au moins 20 caractères.",
            },
            availability: { type: "string" },
          },
        },
        ApplicationCreated: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        FavoriteToggleResult: {
          type: "object",
          required: ["isFavorite", "petName", "applicationsCount"],
          properties: {
            isFavorite: {
              type: "boolean",
              description: "Nouvelle vérité après toggle.",
            },
            petName: { type: "string", nullable: true },
            applicationsCount: {
              type: "integer",
              nullable: true,
              description:
                "Candidatures actives sur ce pet — null si on vient de retirer le favori.",
            },
          },
        },
        ReportPhotoInput: {
          type: "object",
          required: ["url"],
          properties: {
            url: {
              type: "string",
              format: "uri",
              maxLength: 2048,
              description: "URL S3 obtenue après upload via `/api/upload`.",
            },
            blurDataUrl: {
              type: "string",
              maxLength: 8192,
              nullable: true,
              description: "LQIP base64 facultatif.",
            },
          },
        },
        ReportCreate: {
          type: "object",
          required: [
            "type",
            "species",
            "description",
            "latitude",
            "longitude",
            "dateEvent",
          ],
          properties: {
            type: { type: "string", enum: ["perdu", "trouve"] },
            species: { type: "string", enum: ["chat", "chien"] },
            petName: { type: "string", maxLength: 255 },
            description: { type: "string", minLength: 10 },
            breed: { type: "string", maxLength: 100 },
            color: { type: "string", maxLength: 100 },
            sex: {
              type: "string",
              enum: ["male", "femelle", "inconnu"],
              default: "inconnu",
            },
            isChipped: { type: "boolean", default: false },
            chipNumber: { type: "string", maxLength: 50 },
            distinctiveSigns: { type: "string" },
            latitude: { type: "number", minimum: -90, maximum: 90 },
            longitude: { type: "number", minimum: -180, maximum: 180 },
            address: { type: "string" },
            dateEvent: {
              type: "string",
              format: "date",
              description: "Date de perte ou de découverte (ISO YYYY-MM-DD).",
            },
            contactPhone: { type: "string", maxLength: 20 },
            contactEmail: { type: "string", format: "email", maxLength: 255 },
            notes: { type: "string" },
            photos: {
              type: "array",
              maxItems: 8,
              items: { $ref: "#/components/schemas/ReportPhotoInput" },
            },
          },
        },
        ReportCreated: {
          type: "object",
          required: ["id", "matchCount"],
          properties: {
            id: { type: "string", format: "uuid" },
            matchCount: {
              type: "integer",
              minimum: 0,
              description: "Nombre de correspondances détectées à la création.",
            },
          },
        },
        Pension: {
          allOf: [
            { $ref: "#/components/schemas/PensionSummary" },
            {
              type: "object",
              required: [
                "siret",
                "services",
                "photos",
                "createdAt",
                "updatedAt",
              ],
              properties: {
                siret: {
                  type: "string",
                  description:
                    "Numéro SIRET — public légalement (registre INSEE). " +
                    "Permet d'afficher la mention 'agrément vérifié'.",
                },
                agrementNumber: {
                  type: "string",
                  nullable: true,
                  description:
                    "Certificat de capacité ou ICPE (si renseigné).",
                },
                phone: { type: "string", nullable: true },
                email: { type: "string", format: "email", nullable: true },
                website: { type: "string", format: "uri", nullable: true },
                location: {
                  type: "object",
                  nullable: true,
                  required: ["latitude", "longitude"],
                  properties: {
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                },
                capacityCats: { type: "integer", nullable: true },
                capacityDogs: { type: "integer", nullable: true },
                services: {
                  type: "object",
                  description:
                    "Services offerts — toutes les clés sont retournées " +
                    "avec un booléen explicite (pas d'omission).",
                  required: [
                    "medication",
                    "grooming",
                    "outdoorAccess",
                    "nightStaff",
                    "transport",
                    "senior",
                  ],
                  properties: {
                    medication: { type: "boolean" },
                    grooming: { type: "boolean" },
                    outdoorAccess: { type: "boolean" },
                    nightStaff: { type: "boolean" },
                    transport: { type: "boolean" },
                    senior: { type: "boolean" },
                  },
                },
                openingHours: { type: "string", nullable: true },
                photos: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PensionPhoto" },
                },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          ],
        },
      },
      responses: COMMON_RESPONSES,
    },
    paths: {
      "/pets": {
        get: {
          tags: ["adoption"],
          summary: "Catalogue paginé des animaux à adopter",
          description:
            "Liste les pets en statut `disponible`. Filtres par espèce, sexe, " +
            "âge, compatibilité, refuge, recherche texte. Pagination cursor-based.",
          parameters: [
            {
              name: "species",
              in: "query",
              schema: { type: "string", enum: ["chat", "chien"] },
            },
            {
              name: "sex",
              in: "query",
              schema: {
                type: "string",
                enum: ["male", "femelle", "inconnu"],
              },
            },
            {
              name: "ageCategory",
              in: "query",
              schema: {
                type: "string",
                enum: ["chaton", "jeune", "adulte", "senior"],
              },
            },
            {
              name: "okWithCats",
              in: "query",
              schema: { type: "boolean" },
              description: "Si true, ne retourne que les pets compatibles avec les chats.",
            },
            {
              name: "okWithDogs",
              in: "query",
              schema: { type: "boolean" },
            },
            {
              name: "okWithChildren",
              in: "query",
              schema: { type: "boolean" },
            },
            {
              name: "shelterId",
              in: "query",
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "search",
              in: "query",
              schema: { type: "string", maxLength: 100 },
              description: "Recherche dans nom + description (insensible casse).",
            },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string" },
              description:
                "Cursor opaque obtenu via `pagination.cursor` de la page précédente.",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "Page de résultats.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data", "pagination"],
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/PetCard" },
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
          },
        },
      },
      "/pets/{id}": {
        get: {
          tags: ["adoption"],
          summary: "Fiche détaillée d'un animal à adopter",
          description:
            "Retourne le pet, ses photos, et son refuge minimal. Pas d'auth requise.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Animal trouvé.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { $ref: "#/components/schemas/Pet" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/pets/{id}/similar": {
        get: {
          tags: ["adoption"],
          summary: "Animaux similaires à un pet de référence",
          description:
            "Heuristique : même espèce, priorité même refuge puis même catégorie " +
            "d'âge. Pas de pagination — retourne `limit` items max (défaut 4).",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 12,
                default: 4,
              },
            },
          ],
          responses: {
            "200": {
              description: "Liste de pets similaires.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/PetCard" },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/shelters": {
        get: {
          tags: ["shelters"],
          summary: "Annuaire paginé des refuges",
          description:
            "Liste les refuges et associations partenaires, triés par nom. " +
            "Filtres `verifiedOnly` et `search`. Pagination cursor-based.",
          parameters: [
            {
              name: "verifiedOnly",
              in: "query",
              schema: { type: "boolean" },
              description:
                "Si true, ne retourne que les refuges vérifiés par Dorloter.",
            },
            {
              name: "search",
              in: "query",
              schema: { type: "string", maxLength: 100 },
              description: "Recherche dans nom + description (insensible casse).",
            },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string" },
              description:
                "Cursor opaque obtenu via `pagination.cursor` de la page précédente.",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "Page de résultats.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data", "pagination"],
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/ShelterSummary",
                        },
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
          },
        },
      },
      "/shelters/{slug}": {
        get: {
          tags: ["shelters"],
          summary: "Fiche détaillée d'un refuge",
          description:
            "Retourne le refuge complet avec stats publiques (à adopter, " +
            "réservés, adoptés, followers) et coordonnées.",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: {
                type: "string",
                pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                maxLength: 255,
              },
            },
          ],
          responses: {
            "200": {
              description: "Refuge trouvé.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { $ref: "#/components/schemas/Shelter" },
                    },
                  },
                },
              },
            },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/reports": {
        get: {
          tags: ["lost-found"],
          summary: "Liste paginée des signalements perdus / trouvés",
          description:
            "Tri par `dateEvent DESC` (ou par distance si `lat`/`lng`/`radiusKm` " +
            "passés). `bbox` (cartographie) et `near` (recherche) sont " +
            "exclusifs entre eux.\n\n" +
            "**Sécurité** : les réponses ne contiennent jamais de coordonnées " +
            "de contact en clair. Utilisez l'endpoint de révélation pour les " +
            "obtenir au cas par cas.",
          parameters: [
            {
              name: "type",
              in: "query",
              schema: { type: "string", enum: ["perdu", "trouve"] },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["actif", "resolu", "expire"],
                default: "actif",
              },
            },
            {
              name: "species",
              in: "query",
              schema: { type: "string", enum: ["chat", "chien"] },
            },
            {
              name: "bbox",
              in: "query",
              schema: { type: "string", pattern: "^-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?$" },
              description:
                "Bbox `west,south,east,north` (degrés décimaux, < 5° de côté). Exclusif avec `lat`/`lng`/`radiusKm`.",
              example: "2.2,48.8,2.5,48.9",
            },
            {
              name: "lat",
              in: "query",
              schema: { type: "number", minimum: -90, maximum: 90 },
              description: "À combiner avec `lng` et `radiusKm`.",
            },
            {
              name: "lng",
              in: "query",
              schema: { type: "number", minimum: -180, maximum: 180 },
            },
            {
              name: "radiusKm",
              in: "query",
              schema: { type: "number", minimum: 0.1, maximum: 200 },
            },
            {
              name: "sinceDays",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 365 },
              description:
                "Si défini, ne retourne que les signalements créés depuis N jours.",
            },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 30 },
            },
          ],
          responses: {
            "200": {
              description: "Page de résultats.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data", "pagination"],
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ReportSummary" },
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
          },
        },
        post: {
          tags: ["lost-found"],
          summary: "Créer un signalement perdu / trouvé",
          description:
            "Auth requise. Rate-limité (5/h/IP). Lance le matching à la " +
            "création — le retour contient `matchCount` (correspondances " +
            "candidates).\n\n" +
            "**Anti-doublon** : refus 409 si l'user a déjà un signalement actif " +
            "très similaire (description proche, < 30j). Inviter à éditer plutôt qu'à recréer.",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReportCreate" },
              },
            },
          },
          responses: {
            "201": {
              description: "Signalement créé.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { $ref: "#/components/schemas/ReportCreated" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "409": {
              description: "Signalement actif similaire existant.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiError" },
                },
              },
            },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/reports/{id}": {
        get: {
          tags: ["lost-found"],
          summary: "Fiche détaillée d'un signalement",
          description:
            "Retourne le signalement avec photos et description longue. " +
            "Les coordonnées de contact ne sont **jamais** exposées en clair " +
            "(`hasContact: boolean` uniquement).",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Signalement trouvé.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { $ref: "#/components/schemas/Report" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/pensions": {
        get: {
          tags: ["pensions"],
          summary: "Annuaire paginé des pensions agréées",
          description:
            "Liste les pensions vérifiées (SIRET et agrément contrôlés " +
            "manuellement par Dorloter). Tri alphabétique. Filtres par " +
            "espèce acceptée, prix max, services offerts, recherche texte. " +
            "Pagination cursor-based.",
          parameters: [
            {
              name: "acceptsCats",
              in: "query",
              schema: { type: "boolean" },
              description: "Si true, ne retourne que les pensions acceptant les chats.",
            },
            {
              name: "acceptsDogs",
              in: "query",
              schema: { type: "boolean" },
            },
            {
              name: "maxPriceCat",
              in: "query",
              schema: { type: "number", exclusiveMinimum: 0, maximum: 1000 },
              description: "Prix max/jour chat en EUR.",
            },
            {
              name: "maxPriceDog",
              in: "query",
              schema: { type: "number", exclusiveMinimum: 0, maximum: 1000 },
            },
            {
              name: "services",
              in: "query",
              schema: { type: "string", maxLength: 200 },
              description:
                "Liste de services requis, séparés par virgules. " +
                "Valeurs autorisées : `medication`, `grooming`, " +
                "`outdoorAccess`, `nightStaff`, `transport`, `senior`. " +
                "Les valeurs inconnues sont ignorées.",
              example: "medication,transport",
            },
            {
              name: "search",
              in: "query",
              schema: { type: "string", maxLength: 100 },
              description: "Recherche dans nom + adresse (insensible casse).",
            },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string" },
              description:
                "Cursor opaque obtenu via `pagination.cursor` de la page précédente.",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "Page de résultats.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data", "pagination"],
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/PensionSummary",
                        },
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
          },
        },
      },
      "/me": {
        get: {
          tags: ["me"],
          summary: "Profil de l'utilisateur courant",
          description:
            "Retourne le profil complet de l'utilisateur connecté. " +
            "Ne contient **jamais** la `pushSubscription` ni les " +
            "`notificationPreferences` — endpoints dédiés.",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "200": {
              description: "Profil utilisateur.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { $ref: "#/components/schemas/Me" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/notifications": {
        get: {
          tags: ["notifications"],
          summary: "Inbox paginée des notifications",
          description:
            "Liste les notifications de l'user courant, plus récentes d'abord. " +
            "Cursor-based. Retourne aussi `unreadCount` global pour le badge.",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            {
              name: "unreadOnly",
              in: "query",
              schema: { type: "boolean" },
              description: "Si true, ne retourne que les non lues.",
            },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 30 },
            },
          ],
          responses: {
            "200": {
              description: "Page de notifications + compteur global non lu.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data", "pagination", "unreadCount"],
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Notification" },
                      },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                      unreadCount: {
                        type: "integer",
                        minimum: 0,
                        description:
                          "Total non lu, indépendant du filtre `unreadOnly`.",
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/notifications/unread-count": {
        get: {
          tags: ["notifications"],
          summary: "Compteur de notifications non lues",
          description: "Endpoint léger pour rafraîchir le badge mobile.",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "200": {
              description: "Compteur courant.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: {
                        type: "object",
                        required: ["count"],
                        properties: {
                          count: { type: "integer", minimum: 0 },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/notifications/{id}/read": {
        post: {
          tags: ["notifications"],
          summary: "Marquer une notification comme lue",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "204": { description: "Notification marquée comme lue." },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/notifications/read-all": {
        post: {
          tags: ["notifications"],
          summary: "Marquer toutes les notifications comme lues",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "204": { description: "Toutes les notifications marquées." },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/reports/{id}/reveal-contact": {
        post: {
          tags: ["lost-found"],
          summary: "Révéler les coordonnées de contact d'un signalement actif",
          description:
            "Renvoie le téléphone/email associés au signalement. Endpoint **rate-limité** " +
            "(30/h/IP) et **loggué** (audit anti-scraping).\n\n" +
            "Renvoie 410 Gone si le signalement n'est plus actif (résolu / expiré).",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Coordonnées révélées.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { $ref: "#/components/schemas/RevealedContact" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "404": { $ref: "#/components/responses/NotFound" },
            "410": {
              description: "Signalement résolu ou expiré.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiError" },
                },
              },
            },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/applications": {
        post: {
          tags: ["adoption"],
          summary: "Soumettre une candidature d'adoption",
          description:
            "Crée une candidature pour le pet `petId`. Rate-limité (10/h/IP). " +
            "Empêche les doublons : un même user ne peut candidater qu'une fois par pet.",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApplicationCreate" },
              },
            },
          },
          responses: {
            "201": {
              description: "Candidature créée.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { $ref: "#/components/schemas/ApplicationCreated" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "409": {
              description: "Déjà candidaté pour ce pet.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiError" },
                },
              },
            },
            "422": {
              description: "Pet non disponible.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiError" },
                },
              },
            },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/favorites": {
        post: {
          tags: ["adoption"],
          summary: "Toggle un favori",
          description:
            "Ajoute ou retire `petId` des favoris de l'user. Idempotent : la " +
            "réponse contient `isFavorite` (la nouvelle vérité).",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["petId"],
                  properties: {
                    petId: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Toggle appliqué.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: {
                        $ref: "#/components/schemas/FavoriteToggleResult",
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/pensions/{slug}": {
        get: {
          tags: ["pensions"],
          summary: "Fiche détaillée d'une pension agréée",
          description:
            "Retourne la pension complète avec photos, services normalisés, " +
            "note moyenne, agrément SIRET et coordonnées. Seules les pensions " +
            "vérifiées sont accessibles (les fiches en attente renvoient 404).",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: {
                type: "string",
                pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                maxLength: 255,
              },
            },
          ],
          responses: {
            "200": {
              description: "Pension trouvée.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { $ref: "#/components/schemas/Pension" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationError" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
    },
  };
}
