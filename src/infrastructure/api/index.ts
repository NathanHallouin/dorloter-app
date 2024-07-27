/**
 * Surface publique de la couche API REST publique.
 *
 * Importer depuis :
 *   - les services de domaine : `@infra/api/errors` (juste DomainError + codes)
 *   - les routes `app/api/v1/*` : `@infra/api` (handler + responses + errors)
 */

export {
  DomainError,
  ERROR_CODES,
  type ErrorCode,
  notFound,
  unauthorized,
  forbidden,
  validationFailed,
  conflict,
  gone,
  unprocessable,
  rateLimited,
} from "./errors";

export {
  apiOk,
  apiCreated,
  apiNoContent,
  apiPaginated,
  apiError,
  apiInternalError,
  type PaginationMeta,
} from "./responses";

export {
  withApi,
  type ApiContext,
  type ApiHandlerOptions,
} from "./handler";

export { encodeCursor, decodeCursor } from "./cursor";
