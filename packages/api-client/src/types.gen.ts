/**
 * Types TypeScript du client API Dorloter — GÉNÉRÉS AUTOMATIQUEMENT.
 * Ne pas éditer à la main. Régénérer via : `bun api:types`.
 *
 * Source : apps/web/src/infrastructure/api/openapi.ts → buildOpenApiDocument()
 */

export interface paths {
    "/pets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Catalogue paginé des animaux à adopter
         * @description Liste les pets en statut `disponible`. Filtres par espèce, sexe, âge, compatibilité, refuge, recherche texte. Pagination cursor-based.
         */
        get: {
            parameters: {
                query?: {
                    species?: "chat" | "chien";
                    sex?: "male" | "femelle" | "inconnu";
                    ageCategory?: "chaton" | "jeune" | "adulte" | "senior";
                    /** @description Si true, ne retourne que les pets compatibles avec les chats. */
                    okWithCats?: boolean;
                    okWithDogs?: boolean;
                    okWithChildren?: boolean;
                    shelterId?: string;
                    /** @description Recherche dans nom + description (insensible casse). */
                    search?: string;
                    /** @description Cursor opaque obtenu via `pagination.cursor` de la page précédente. */
                    cursor?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Page de résultats. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["PetCard"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pets/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fiche détaillée d'un animal à adopter
         * @description Retourne le pet, ses photos, et son refuge minimal. Pas d'auth requise.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Animal trouvé. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Pet"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                404: components["responses"]["NotFound"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pets/{id}/similar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Animaux similaires à un pet de référence
         * @description Heuristique : même espèce, priorité même refuge puis même catégorie d'âge. Pas de pagination — retourne `limit` items max (défaut 4).
         */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                };
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Liste de pets similaires. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["PetCard"][];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                404: components["responses"]["NotFound"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/shelters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Annuaire paginé des refuges
         * @description Liste les refuges et associations partenaires, triés par nom. Filtres `verifiedOnly` et `search`. Pagination cursor-based.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Si true, ne retourne que les refuges vérifiés par Dorloter. */
                    verifiedOnly?: boolean;
                    /** @description Recherche dans nom + description (insensible casse). */
                    search?: string;
                    /** @description Cursor opaque obtenu via `pagination.cursor` de la page précédente. */
                    cursor?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Page de résultats. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ShelterSummary"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/shelters/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fiche détaillée d'un refuge
         * @description Retourne le refuge complet avec stats publiques (à adopter, réservés, adoptés, followers) et coordonnées.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    slug: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Refuge trouvé. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Shelter"];
                        };
                    };
                };
                404: components["responses"]["NotFound"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Liste paginée des signalements perdus / trouvés
         * @description Tri par `dateEvent DESC` (ou par distance si `lat`/`lng`/`radiusKm` passés). `bbox` (cartographie) et `near` (recherche) sont exclusifs entre eux.
         *
         *     **Sécurité** : les réponses ne contiennent jamais de coordonnées de contact en clair. Utilisez l'endpoint de révélation pour les obtenir au cas par cas.
         */
        get: {
            parameters: {
                query?: {
                    type?: "perdu" | "trouve";
                    status?: "actif" | "resolu" | "expire";
                    species?: "chat" | "chien";
                    /**
                     * @description Bbox `west,south,east,north` (degrés décimaux, < 5° de côté). Exclusif avec `lat`/`lng`/`radiusKm`.
                     * @example 2.2,48.8,2.5,48.9
                     */
                    bbox?: string;
                    /** @description À combiner avec `lng` et `radiusKm`. */
                    lat?: number;
                    lng?: number;
                    radiusKm?: number;
                    /** @description Si défini, ne retourne que les signalements créés depuis N jours. */
                    sinceDays?: number;
                    cursor?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Page de résultats. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ReportSummary"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
            };
        };
        put?: never;
        /**
         * Créer un signalement perdu / trouvé
         * @description Auth requise. Rate-limité (5/h/IP). Lance le matching à la création — le retour contient `matchCount` (correspondances candidates).
         *
         *     **Anti-doublon** : refus 409 si l'user a déjà un signalement actif très similaire (description proche, < 30j). Inviter à éditer plutôt qu'à recréer.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ReportCreate"];
                };
            };
            responses: {
                /** @description Signalement créé. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ReportCreated"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                401: components["responses"]["Unauthorized"];
                /** @description Signalement actif similaire existant. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
                429: components["responses"]["RateLimited"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fiche détaillée d'un signalement
         * @description Retourne le signalement avec photos et description longue. Les coordonnées de contact ne sont **jamais** exposées en clair (`hasContact: boolean` uniquement).
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Signalement trouvé. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Report"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                404: components["responses"]["NotFound"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pensions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Annuaire paginé des pensions agréées
         * @description Liste les pensions vérifiées (SIRET et agrément contrôlés manuellement par Dorloter). Tri alphabétique. Filtres par espèce acceptée, prix max, services offerts, recherche texte. Pagination cursor-based.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Si true, ne retourne que les pensions acceptant les chats. */
                    acceptsCats?: boolean;
                    acceptsDogs?: boolean;
                    /** @description Prix max/jour chat en EUR. */
                    maxPriceCat?: number;
                    maxPriceDog?: number;
                    /**
                     * @description Liste de services requis, séparés par virgules. Valeurs autorisées : `medication`, `grooming`, `outdoorAccess`, `nightStaff`, `transport`, `senior`. Les valeurs inconnues sont ignorées.
                     * @example medication,transport
                     */
                    services?: string;
                    /** @description Recherche dans nom + adresse (insensible casse). */
                    search?: string;
                    /** @description Cursor opaque obtenu via `pagination.cursor` de la page précédente. */
                    cursor?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Page de résultats. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["PensionSummary"][];
                            pagination: components["schemas"]["Pagination"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Profil de l'utilisateur courant
         * @description Retourne le profil complet de l'utilisateur connecté. Ne contient **jamais** la `pushSubscription` ni les `notificationPreferences` — endpoints dédiés.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Profil utilisateur. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Me"];
                        };
                    };
                };
                401: components["responses"]["Unauthorized"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Inbox paginée des notifications
         * @description Liste les notifications de l'user courant, plus récentes d'abord. Cursor-based. Retourne aussi `unreadCount` global pour le badge.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Si true, ne retourne que les non lues. */
                    unreadOnly?: boolean;
                    cursor?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Page de notifications + compteur global non lu. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Notification"][];
                            pagination: components["schemas"]["Pagination"];
                            /** @description Total non lu, indépendant du filtre `unreadOnly`. */
                            unreadCount: number;
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                401: components["responses"]["Unauthorized"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications/unread-count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Compteur de notifications non lues
         * @description Endpoint léger pour rafraîchir le badge mobile.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Compteur courant. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                count: number;
                            };
                        };
                    };
                };
                401: components["responses"]["Unauthorized"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications/{id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Marquer une notification comme lue */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Notification marquée comme lue. */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                400: components["responses"]["ValidationError"];
                401: components["responses"]["Unauthorized"];
                404: components["responses"]["NotFound"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/notifications/read-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Marquer toutes les notifications comme lues */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Toutes les notifications marquées. */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                401: components["responses"]["Unauthorized"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/devices/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enregistre un Expo push token
         * @description Idempotent — ré-appel avec le même `(userId, expoPushToken)` rafraîchit `lastSeenAt`. À appeler après login mobile et à chaque démarrage si le token a changé (Expo en redonne parfois un nouveau).
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["DeviceRegistration"];
                };
            };
            responses: {
                /** @description Device enregistré (ou rafraîchi). */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["DeviceToken"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                401: components["responses"]["Unauthorized"];
                429: components["responses"]["RateLimited"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/devices/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Retire un device token enregistré
         * @description Appelé typiquement à la déconnexion mobile pour ne plus recevoir de push.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Device retiré. */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                400: components["responses"]["ValidationError"];
                401: components["responses"]["Unauthorized"];
                404: components["responses"]["NotFound"];
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/{id}/reveal-contact": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Révéler les coordonnées de contact d'un signalement actif
         * @description Renvoie le téléphone/email associés au signalement. Endpoint **rate-limité** (30/h/IP) et **loggué** (audit anti-scraping).
         *
         *     Renvoie 410 Gone si le signalement n'est plus actif (résolu / expiré).
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Coordonnées révélées. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["RevealedContact"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                404: components["responses"]["NotFound"];
                /** @description Signalement résolu ou expiré. */
                410: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
                429: components["responses"]["RateLimited"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/applications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Soumettre une candidature d'adoption
         * @description Crée une candidature pour le pet `petId`. Rate-limité (10/h/IP). Empêche les doublons : un même user ne peut candidater qu'une fois par pet.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ApplicationCreate"];
                };
            };
            responses: {
                /** @description Candidature créée. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["ApplicationCreated"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                401: components["responses"]["Unauthorized"];
                404: components["responses"]["NotFound"];
                /** @description Déjà candidaté pour ce pet. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
                /** @description Pet non disponible. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiError"];
                    };
                };
                429: components["responses"]["RateLimited"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/favorites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Toggle un favori
         * @description Ajoute ou retire `petId` des favoris de l'user. Idempotent : la réponse contient `isFavorite` (la nouvelle vérité).
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: uuid */
                        petId: string;
                    };
                };
            };
            responses: {
                /** @description Toggle appliqué. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["FavoriteToggleResult"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                401: components["responses"]["Unauthorized"];
                404: components["responses"]["NotFound"];
                429: components["responses"]["RateLimited"];
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/pensions/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fiche détaillée d'une pension agréée
         * @description Retourne la pension complète avec photos, services normalisés, note moyenne, agrément SIRET et coordonnées. Seules les pensions vérifiées sont accessibles (les fiches en attente renvoient 404).
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    slug: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pension trouvée. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["Pension"];
                        };
                    };
                };
                400: components["responses"]["ValidationError"];
                404: components["responses"]["NotFound"];
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ApiError: {
            error: {
                /**
                 * @description Code d'erreur stable. Ne change jamais.
                 * @enum {string}
                 */
                code: "VALIDATION_FAILED" | "BAD_REQUEST" | "INVALID_PARAM" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "DUPLICATE" | "GONE" | "UNPROCESSABLE" | "RATE_LIMITED" | "INTERNAL_ERROR" | "SERVICE_UNAVAILABLE";
                message: string;
                /** @description Contexte additionnel — structure dépend du code. */
                details?: {
                    [key: string]: unknown;
                };
            };
        };
        Pagination: {
            /** @description Cursor à passer en query param `?cursor=...` pour la page suivante. `null` si fin de liste. */
            cursor: string | null;
            hasMore: boolean;
        };
        Pet: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            species: "chat" | "chien";
            name: string;
            description?: string | null;
            breed?: string | null;
            color?: string | null;
            /** @enum {string} */
            sex: "male" | "femelle" | "inconnu";
            /** @enum {string|null} */
            ageCategory?: "chaton" | "jeune" | "adulte" | "senior" | null;
            /** Format: date */
            estimatedBirth?: string | null;
            isSterilized: boolean;
            isChipped: boolean;
            isVaccinated: boolean;
            /** @enum {string|null} */
            fivFelv?: "negatif" | "fiv_positif" | "felv_positif" | "fiv_felv_positif" | "non_teste" | null;
            indoorOnly?: boolean | null;
            /** @enum {string} */
            okWithCats: "oui" | "non" | "inconnu";
            /** @enum {string} */
            okWithDogs: "oui" | "non" | "inconnu";
            /** @enum {string} */
            okWithChildren: "oui" | "non" | "inconnu";
            specialNeeds?: string | null;
            /** @enum {string} */
            status: "disponible" | "reserve" | "adopte" | "retire";
            /** @description Frais d'adoption en EUR. */
            adoptionFee?: number | null;
            photos: components["schemas"]["PetPhoto"][];
            shelter?: components["schemas"]["PetShelter"] | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        PetPhoto: {
            /** Format: uuid */
            id: string;
            /** Format: uri */
            url: string;
            /** @description LQIP base64 (~500 octets) — utilisable comme placeholder. */
            blurDataUrl?: string | null;
            isPrimary: boolean;
            order: number;
        };
        PetShelter: {
            /** Format: uuid */
            id: string;
            slug: string;
            name: string;
            address?: string | null;
            isVerified: boolean;
        };
        /** @description Refuge ou association — version annuaire (sans coordonnées détaillées). */
        ShelterSummary: {
            /** Format: uuid */
            id: string;
            slug: string;
            name: string;
            description?: string | null;
            address?: string | null;
            /** Format: uri */
            logoUrl?: string | null;
            /** Format: uri */
            coverUrl?: string | null;
            /** @description Refuge vérifié manuellement par l'équipe Dorloter. */
            isVerified: boolean;
            foundedYear?: number | null;
            /** @description Animaux à adopter actuellement. */
            available: number;
            /** @description Adoptions concrétisées (cumulé). */
            adopted: number;
        };
        Shelter: components["schemas"]["ShelterSummary"] & {
            missionLong?: string | null;
            /** @description Numéro SIRET — public légalement. */
            siret?: string | null;
            phone?: string | null;
            /** Format: email */
            email?: string | null;
            /** Format: uri */
            website?: string | null;
            /** Format: uri */
            donationUrl?: string | null;
            visitHours?: string | null;
            location?: {
                latitude: number;
                longitude: number;
            } | null;
            reserved: number;
            followers: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        /** @description Signalement perdu / trouvé — version liste (sans description longue, sans coordonnées de contact). */
        ReportSummary: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            type: "perdu" | "trouve";
            /** @enum {string} */
            status: "actif" | "resolu" | "expire";
            /** @enum {string} */
            species: "chat" | "chien";
            petName?: string | null;
            breed?: string | null;
            color?: string | null;
            /** @enum {string} */
            sex: "male" | "femelle" | "inconnu";
            /** Format: date */
            dateEvent: string;
            address?: string | null;
            location: {
                latitude: number;
                longitude: number;
            };
            primaryPhoto?: {
                /** Format: uri */
                url: string;
                blurDataUrl?: string | null;
            } | null;
            /** @description Distance au point de référence en mètres, si la requête contenait `lat`/`lng`/`radiusKm`. Sinon null. */
            distanceMeters?: number | null;
        };
        Report: components["schemas"]["ReportSummary"] & {
            description: string;
            isChipped: boolean;
            chipNumber?: string | null;
            distinctiveSigns?: string | null;
            notes?: string | null;
            photos: components["schemas"]["ReportPhoto"][];
            /** @description Vrai si le signalement a un téléphone ou email associé. **Les valeurs ne sont jamais retournées en clair** — utilisez l'endpoint de révélation (rate-limité). */
            hasContact: boolean;
            /** Format: date-time */
            resolvedAt?: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        ReportPhoto: {
            /** Format: uuid */
            id: string;
            /** Format: uri */
            url: string;
            blurDataUrl?: string | null;
            isPrimary: boolean;
            order: number;
        };
        /** @description Version allégée de Pet, optimisée pour les listes (pas de description, pas de photos secondaires). */
        PetCard: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            species: "chat" | "chien";
            name: string;
            breed?: string | null;
            color?: string | null;
            /** @enum {string} */
            sex: "male" | "femelle" | "inconnu";
            /** @enum {string|null} */
            ageCategory?: "chaton" | "jeune" | "adulte" | "senior" | null;
            /** @enum {string} */
            status: "disponible" | "reserve" | "adopte" | "retire";
            adoptionFee?: number | null;
            primaryPhoto?: {
                /** Format: uri */
                url: string;
                blurDataUrl?: string | null;
            } | null;
            shelter?: {
                /** Format: uuid */
                id: string;
                slug: string;
                name: string;
            } | null;
        };
        PensionRating: {
            /** @description Moyenne des avis publiés, deux décimales. */
            average: number;
            /** @description Nombre d'avis publiés. */
            count: number;
        };
        PensionPhoto: {
            /** Format: uuid */
            id: string;
            /** Format: uri */
            url: string;
            blurDataUrl?: string | null;
            isPrimary: boolean;
            order: number;
        };
        /** @description Pension agréée — version annuaire (sans coordonnées détaillées, sans services). */
        PensionSummary: {
            /** Format: uuid */
            id: string;
            slug: string;
            name: string;
            description?: string | null;
            address?: string | null;
            /** Format: uri */
            logoUrl?: string | null;
            /** Format: uri */
            coverUrl?: string | null;
            acceptsCats: boolean;
            acceptsDogs: boolean;
            /** @description Prix par jour chat en EUR. */
            pricePerDayCat?: number | null;
            /** @description Prix par jour chien en EUR. */
            pricePerDayDog?: number | null;
            rating?: components["schemas"]["PensionRating"] | null;
        };
        /** @description Profil complet de l'utilisateur courant. */
        Me: {
            /** Format: uuid */
            id: string;
            /** Format: email */
            email: string;
            emailVerified: boolean;
            name: string;
            /** Format: uri */
            image?: string | null;
            /** @enum {string} */
            role: "user" | "shelter_admin" | "pension_admin" | "platform_admin";
            /**
             * Format: uuid
             * @description Si l'user est admin d'un refuge — utilisé pour afficher les onglets backoffice.
             */
            shelterId?: string | null;
            /** Format: uuid */
            pensionId?: string | null;
            phone?: string | null;
            location?: {
                latitude: number;
                longitude: number;
            } | null;
            /** @description Rayon (km) pour les alertes perdus/trouvés proches. */
            notificationRadiusKm?: number | null;
            /** @description Nombre de retrouvailles confirmées (badge profil). */
            resolvedCount: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        /** @enum {string} */
        NotificationType: "match_found" | "application_update" | "new_cat_nearby" | "report_nearby" | "new_message";
        Notification: {
            /** Format: uuid */
            id: string;
            type: components["schemas"]["NotificationType"];
            title: string;
            body?: string | null;
            /** @description Payload contextuel — structure dépend du `type` (ex. `reportId`, `petId`, `applicationId`). */
            data?: {
                [key: string]: unknown;
            } | null;
            isRead: boolean;
            /** Format: date-time */
            createdAt: string;
        };
        RevealedContact: {
            phone: string | null;
            /** Format: email */
            email: string | null;
        };
        DeviceRegistration: {
            /** @description Token retourné par `Notifications.getExpoPushTokenAsync()` côté Expo. Format `ExponentPushToken[xxx]` ou `ExpoPushToken[xxx]`. */
            expoPushToken: string;
            /** @enum {string} */
            platform: "ios" | "android";
            /** @description Nom lisible du device (ex. `iPhone de Marc`). Utile pour la gestion future des devices côté profil. */
            deviceName?: string | null;
        };
        DeviceToken: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            platform: "ios" | "android";
            deviceName?: string | null;
            /** Format: date-time */
            lastSeenAt: string;
            /** Format: date-time */
            createdAt: string;
        };
        ApplicationCreate: {
            /** Format: uuid */
            petId: string;
            /** @enum {string} */
            housingType?: "appartement" | "maison" | "autre";
            /** @default false */
            hasOutdoorAccess: boolean;
            hasOtherPets?: string;
            /** @default false */
            hasChildren: boolean;
            childrenAges?: string;
            experience?: string;
            /** @description Pourquoi cet animal — au moins 20 caractères. */
            motivation: string;
            availability?: string;
        };
        ApplicationCreated: {
            /** Format: uuid */
            id: string;
        };
        FavoriteToggleResult: {
            /** @description Nouvelle vérité après toggle. */
            isFavorite: boolean;
            petName: string | null;
            /** @description Candidatures actives sur ce pet — null si on vient de retirer le favori. */
            applicationsCount: number | null;
        };
        ReportPhotoInput: {
            /**
             * Format: uri
             * @description URL S3 obtenue après upload via `/api/upload`.
             */
            url: string;
            /** @description LQIP base64 facultatif. */
            blurDataUrl?: string | null;
        };
        ReportCreate: {
            /** @enum {string} */
            type: "perdu" | "trouve";
            /** @enum {string} */
            species: "chat" | "chien";
            petName?: string;
            description: string;
            breed?: string;
            color?: string;
            /**
             * @default inconnu
             * @enum {string}
             */
            sex: "male" | "femelle" | "inconnu";
            /** @default false */
            isChipped: boolean;
            chipNumber?: string;
            distinctiveSigns?: string;
            latitude: number;
            longitude: number;
            address?: string;
            /**
             * Format: date
             * @description Date de perte ou de découverte (ISO YYYY-MM-DD).
             */
            dateEvent: string;
            contactPhone?: string;
            /** Format: email */
            contactEmail?: string;
            notes?: string;
            photos?: components["schemas"]["ReportPhotoInput"][];
        };
        ReportCreated: {
            /** Format: uuid */
            id: string;
            /** @description Nombre de correspondances détectées à la création. */
            matchCount: number;
        };
        Pension: components["schemas"]["PensionSummary"] & {
            /** @description Numéro SIRET — public légalement (registre INSEE). Permet d'afficher la mention 'agrément vérifié'. */
            siret: string;
            /** @description Certificat de capacité ou ICPE (si renseigné). */
            agrementNumber?: string | null;
            phone?: string | null;
            /** Format: email */
            email?: string | null;
            /** Format: uri */
            website?: string | null;
            location?: {
                latitude: number;
                longitude: number;
            } | null;
            capacityCats?: number | null;
            capacityDogs?: number | null;
            /** @description Services offerts — toutes les clés sont retournées avec un booléen explicite (pas d'omission). */
            services: {
                medication: boolean;
                grooming: boolean;
                outdoorAccess: boolean;
                nightStaff: boolean;
                transport: boolean;
                senior: boolean;
            };
            openingHours?: string | null;
            photos: components["schemas"]["PensionPhoto"][];
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
    };
    responses: {
        /** @description Authentification requise. */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ApiError"];
            };
        };
        /** @description Action non autorisée pour cet utilisateur. */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ApiError"];
            };
        };
        /** @description Ressource introuvable. */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ApiError"];
            };
        };
        /** @description Données invalides — voir `error.details.issues`. */
        ValidationError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ApiError"];
            };
        };
        /** @description Trop de requêtes. Header `Retry-After` indique le délai en secondes. */
        RateLimited: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ApiError"];
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
