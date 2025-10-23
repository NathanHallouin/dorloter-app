/**
 * Garde d'authentification + décorateurs liés à l'identité de la requête.
 *
 * La protection est appliquée PAR HANDLER : un endpoint sans `@Auth()` est
 * public. `@CurrentUser()` expose l'id et le rôle extraits de l'access token ;
 * `@ReqContext()` fournit user-agent et IP pour tracer les refresh tokens.
 */

import {
  applyDecorators,
  CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AppError } from '../../shared/app-error';
import { JwtService } from './jwt.service';

/** Utilisateur authentifié (id + rôle), extrait de l'access token. */
export class CurrentUserInfo {
  constructor(
    readonly userId: string,
    readonly role: string,
  ) {}

  /** Exige un rôle applicatif précis (ex. `platform_admin`). 403 sinon. */
  requireRole(role: string): void {
    if (this.role !== role) throw AppError.forbidden('Action non autorisée.');
  }
}

/** Contexte de requête (origine des refresh tokens) : user-agent + IP. */
export interface RequestContext {
  userAgent: string | null;
  ipAddress: string | null;
}

interface AuthenticatedRequest extends Request {
  currentUser?: CurrentUserInfo;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request);
    if (token === null) throw AppError.unauthorized('Authentification requise.');
    const claims = this.jwt.verify(token);
    if (!isUuid(claims.sub)) throw AppError.unauthorized('Jeton invalide.');
    request.currentUser = new CurrentUserInfo(claims.sub, claims.role);
    return true;
  }
}

/** Marque un handler comme protégé (401 si anonyme). */
export function Auth(): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(JwtAuthGuard));
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserInfo => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.currentUser) throw AppError.unauthorized('Authentification requise.');
    return request.currentUser;
  },
);

export const ReqContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestContext => {
    const request = context.switchToHttp().getRequest<Request>();
    const userAgent = request.headers['user-agent'];
    return {
      userAgent: typeof userAgent === 'string' ? userAgent : null,
      ipAddress: request.ip ?? null,
    };
  },
);

function bearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token === '' ? null : token;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
