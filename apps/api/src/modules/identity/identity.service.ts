/**
 * Orchestration de l'authentification : inscription, connexion, rotation des
 * refresh tokens, déconnexion, et profil de l'utilisateur connecté.
 *
 * Sécurité : messages génériques à la connexion (ne pas révéler si c'est l'email
 * ou le mot de passe) ; refresh tokens opaques (256 bits) stockés seulement
 * hachés (SHA-256) ; rotation systématique à chaque refresh.
 */

import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';

import { CONFIG, type Config } from '../../config';
import { DB, type Db } from '../../infra/database/database.module';
import type { RequestContext } from '../../infra/security/auth.guard';
import { JwtService } from '../../infra/security/jwt.service';
import { ScryptService } from '../../infra/security/scrypt.service';
import { AppError } from '../../shared/app-error';
import type { UpdateProfileDto } from './dto/update-profile.dto';

/** Provider des comptes email/mot de passe (Better Auth). */
const CREDENTIAL_PROVIDER = 'credential';

/** Utilisateur tel que lu en base (géo décomposée en lat/lng). */
export interface UserRecord {
  id: string;
  email: string;
  email_verified: boolean;
  name: string;
  image: string | null;
  role: string;
  phone: string | null;
  bio: string | null;
  city: string | null;
  is_public: boolean;
  location_lat: number | null;
  location_lng: number | null;
  notification_radius_km: number;
  digest_optin: boolean;
  shelter_id: string | null;
  pension_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Résultat d'une authentification réussie. */
export interface AuthResult {
  user: UserRecord;
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
}

@Injectable()
export class IdentityService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CONFIG) private readonly config: Config,
    private readonly jwt: JwtService,
    private readonly scrypt: ScryptService,
  ) {}

  async register(
    email: string,
    name: string,
    rawPassword: string,
    ctx: RequestContext,
  ): Promise<AuthResult> {
    const existing = await this.db
      .selectFrom('users')
      .select('id')
      .where((eb) => eb(eb.fn('lower', ['email']), '=', email.toLowerCase()))
      .executeTakeFirst();
    if (existing) throw AppError.conflict('Un compte existe déjà avec cet email.');

    const user = await this.db
      .insertInto('users')
      .values({ email, name, role: 'user' })
      .returning(userColumns())
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto('accounts')
      .values({
        user_id: user.id,
        account_id: user.id,
        provider_id: CREDENTIAL_PROVIDER,
        password: this.scrypt.encode(rawPassword),
      })
      .execute();

    return this.issueTokens(user, ctx);
  }

  async login(email: string, rawPassword: string, ctx: RequestContext): Promise<AuthResult> {
    const user = await this.db
      .selectFrom('users')
      .select(userColumns())
      .where((eb) => eb(eb.fn('lower', ['email']), '=', email.toLowerCase()))
      .executeTakeFirst();
    if (!user) throw invalidCredentials();

    const account = await this.db
      .selectFrom('accounts')
      .select('password')
      .where('user_id', '=', user.id)
      .where('provider_id', '=', CREDENTIAL_PROVIDER)
      .executeTakeFirst();

    const hash = account?.password ?? null;
    if (hash === null || !this.scrypt.matches(rawPassword, hash)) throw invalidCredentials();

    return this.issueTokens(user, ctx);
  }

  async refresh(refreshToken: string, ctx: RequestContext): Promise<AuthResult> {
    const stored = await this.db
      .selectFrom('auth_refresh_tokens')
      .select(['id', 'user_id', 'expires_at', 'revoked_at'])
      .where('token_hash', '=', sha256Hex(refreshToken))
      .executeTakeFirst();
    if (!stored) throw AppError.unauthorized('Refresh token invalide.');

    const active = stored.revoked_at === null && stored.expires_at > new Date();
    if (!active) throw AppError.unauthorized('Session expirée, reconnectez-vous.');

    // Rotation : révocation de l'ancien token avant émission du nouveau.
    await this.db
      .updateTable('auth_refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('id', '=', stored.id)
      .execute();

    const user = await this.db
      .selectFrom('users')
      .select(userColumns())
      .where('id', '=', stored.user_id)
      .executeTakeFirst();
    if (!user) throw AppError.unauthorized('Refresh token invalide.');

    return this.issueTokens(user, ctx);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.db
      .updateTable('auth_refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('token_hash', '=', sha256Hex(refreshToken))
      .where('revoked_at', 'is', null)
      .execute();
  }

  // --- Profil -------------------------------------------------------------------

  async loadUser(userId: string): Promise<UserRecord> {
    const user = await this.db
      .selectFrom('users')
      .select(userColumns())
      .where('id', '=', userId)
      .executeTakeFirst();
    if (!user) throw AppError.unauthorized('Authentification requise.');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserRecord> {
    const current = await this.loadUser(userId);

    // Géoloc : n'est mise à jour que si le couple lat/lng est fourni (sinon inchangée).
    const hasPoint = dto.latitude !== undefined && dto.longitude !== undefined;

    return this.db
      .updateTable('users')
      .set({
        name: dto.name ?? current.name,
        phone: dto.phone ?? current.phone,
        city: dto.city ?? current.city,
        bio: dto.bio ?? current.bio,
        is_public: dto.isPublic ?? current.is_public,
        ...(hasPoint
          ? {
              location: sql`ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)`,
            }
          : {}),
        notification_radius_km:
          dto.notificationRadiusKm ?? current.notification_radius_km,
        digest_optin: dto.digestOptin ?? current.digest_optin,
        updated_at: new Date(),
      })
      .where('id', '=', userId)
      .returning(userColumns())
      .executeTakeFirstOrThrow();
  }

  // --- Interne ------------------------------------------------------------------

  private async issueTokens(user: UserRecord, ctx: RequestContext): Promise<AuthResult> {
    const accessToken = this.jwt.generateAccessToken(user.id, user.role);
    const rawRefresh = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.jwt.refreshTtlSeconds * 1000);

    await this.db
      .insertInto('auth_refresh_tokens')
      .values({
        user_id: user.id,
        token_hash: sha256Hex(rawRefresh),
        expires_at: expiresAt,
        user_agent: ctx.userAgent,
        ip_address: ctx.ipAddress,
      })
      .execute();

    return {
      user,
      accessToken,
      refreshToken: rawRefresh,
      accessExpiresInSeconds: this.config.jwt.accessTtlSeconds,
    };
  }
}

/** Colonnes de `users` sélectionnées (géo décomposée en lat/lng). */
function userColumns() {
  return [
    'id',
    'email',
    'email_verified',
    'name',
    'image',
    'role',
    'phone',
    'bio',
    'city',
    'is_public',
    sql<number | null>`ST_Y(location)`.as('location_lat'),
    sql<number | null>`ST_X(location)`.as('location_lng'),
    'notification_radius_km',
    'digest_optin',
    'shelter_id',
    'pension_id',
    'created_at',
    'updated_at',
  ] as const;
}

function invalidCredentials(): AppError {
  return AppError.unauthorized('Email ou mot de passe incorrect.');
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
