/**
 * Émission et vérification des access tokens JWT (HMAC-SHA256).
 *
 * Le `sub` porte l'id utilisateur, le claim `role` porte le rôle applicatif. Les
 * refresh tokens (opaques, en base) sont gérés par le module Identity. Issuer
 * validé, tolérance d'horloge de 30 s.
 */

import { Inject, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

import { CONFIG, type Config } from '../../config';
import { AppError } from '../../shared/app-error';

export interface AccessTokenClaims {
  sub: string;
  role: string;
  iss: string;
  iat: number;
  nbf: number;
  exp: number;
}

const CLOCK_TOLERANCE_SECONDS = 30;

@Injectable()
export class JwtService {
  constructor(@Inject(CONFIG) private readonly config: Config) {}

  /** Génère un access token pour un utilisateur et son rôle. */
  generateAccessToken(userId: string, role: string): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: AccessTokenClaims = {
      sub: userId,
      role,
      iss: this.config.jwt.issuer,
      iat: now,
      nbf: now,
      exp: now + this.config.jwt.accessTtlSeconds,
    };
    return jwt.sign(claims, this.config.jwt.secret, { algorithm: 'HS256' });
  }

  /** Valide un access token et renvoie ses claims. 401 si invalide ou expiré. */
  verify(token: string): AccessTokenClaims {
    try {
      const claims = jwt.verify(token, this.config.jwt.secret, {
        algorithms: ['HS256'],
        issuer: this.config.jwt.issuer,
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
      if (typeof claims === 'string' || typeof claims.sub !== 'string') {
        throw AppError.unauthorized('Authentification requise.');
      }
      return claims as AccessTokenClaims;
    } catch {
      throw AppError.unauthorized('Authentification requise.');
    }
  }
}
