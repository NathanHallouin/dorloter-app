/**
 * Erreur métier transverse + format d'erreur unifié.
 *
 * Toute erreur métier (introuvable, permission refusée, conflit, validation) est
 * une [[AppError]] convertie en réponse JSON `{ error: { code, message, details? } }`
 * avec le bon statut HTTP. Les erreurs techniques deviennent `INTERNAL_ERROR`
 * (500), sans fuite de détail.
 */

/**
 * Codes d'erreur stables exposés au client. NE JAMAIS renommer une valeur : ces
 * codes font partie du contrat d'API (identiques côté web et mobile).
 */
export const ErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  BadRequest: 'BAD_REQUEST',
  InvalidParam: 'INVALID_PARAM',
  Unauthorized: 'UNAUTHORIZED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  Duplicate: 'DUPLICATE',
  Gone: 'GONE',
  Unprocessable: 'UNPROCESSABLE',
  RateLimited: 'RATE_LIMITED',
  InternalError: 'INTERNAL_ERROR',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Statut HTTP canonique de chaque code d'erreur. */
const STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  BAD_REQUEST: 400,
  INVALID_PARAM: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  DUPLICATE: 409,
  GONE: 410,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export type ErrorDetails = Record<string, unknown>;

/** Erreur métier : un code, un message (toujours sûr), et des détails optionnels. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetails;

  constructor(code: ErrorCode, message: string, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return STATUS[this.code];
  }

  // --- Fabriques courantes (messages français) --------------------------------

  static notFound(entity: string): AppError {
    return new AppError(ErrorCode.NotFound, `${entity} introuvable.`, { entity });
  }

  static notFoundId(entity: string, id: string): AppError {
    return new AppError(ErrorCode.NotFound, `${entity} ${id} introuvable.`, { entity, id });
  }

  static unauthorized(message: string): AppError {
    return new AppError(ErrorCode.Unauthorized, message);
  }

  static forbidden(message: string): AppError {
    return new AppError(ErrorCode.Forbidden, message);
  }

  static conflict(message: string): AppError {
    return new AppError(ErrorCode.Conflict, message);
  }

  static invalidParam(message: string): AppError {
    return new AppError(ErrorCode.InvalidParam, message);
  }

  static badRequest(message: string): AppError {
    return new AppError(ErrorCode.BadRequest, message);
  }

  static unprocessable(message: string): AppError {
    return new AppError(ErrorCode.Unprocessable, message);
  }

  static validationFailed(message: string, fields: Record<string, string>): AppError {
    return new AppError(ErrorCode.ValidationFailed, message, { fields });
  }

  static internal(message: string): AppError {
    return new AppError(ErrorCode.InternalError, message);
  }
}
