/**
 * Couche d'accès API Dorloter · point d'entrée unique `@dorloter/client`.
 * Consommé par apps/web et apps/pro.
 */

// Contrat & transport
export * from "./api/types";
export * from "./api/client";
export * from "./api/tokenStore";
export * from "./api/qs";

// Modules domaine
export * from "./api/auth";
export * from "./api/pets";
export * from "./api/pensions";
export * from "./api/reports";
export * from "./api/shelters";
export * from "./api/shelter";
export * from "./api/vets";
export * from "./api/applications";
export * from "./api/favorites";
export * from "./api/foster";
export * from "./api/messaging";
export * from "./api/moderation";
export * from "./api/notifications";
export * from "./api/contracts";
export * from "./api/health";

// Auth & data layer
export * from "./auth/AuthContext";
export * from "./queryClient";
