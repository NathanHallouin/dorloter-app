/**
 * Présignature d'upload S3 : `POST /api/v1/uploads/presign`.
 *
 * Le client demande une URL signée, dépose son fichier dessus en `PUT`, puis
 * transmet `publicUrl` dans le payload de création de la ressource (photo
 * d'animal, de signalement, de refuge…). Le binaire ne transite jamais par
 * l'API.
 *
 * Le contrat reproduit exactement celui décrit dans l'OpenAPI historique et
 * déjà consommé par `packages/api-client` (donc par le mobile) : mêmes champs
 * en entrée comme en sortie, aucune régénération du client n'est nécessaire.
 *
 * Deux limites sont opposables plutôt qu'indicatives : la taille (signée dans
 * l'URL, donc un dépôt plus gros est refusé par le stockage) et le type MIME
 * (validé ici et signé également).
 */

import { Body, Controller, Post } from '@nestjs/common';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { randomUUID } from 'node:crypto';

import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { S3Service } from '../../infra/storage/s3.service';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const AUDIO_TYPES = ['audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/webm'] as const;
const CONTENT_TYPES = [...IMAGE_TYPES, ...AUDIO_TYPES] as const;

const KINDS = ['report', 'pet', 'shelter', 'pension', 'voice'] as const;
type Kind = (typeof KINDS)[number];

/** Préfixe S3 par usage. Les uploads d'un utilisateur restent groupés. */
const PREFIX_BY_KIND: Record<Kind, string> = {
  report: 'reports',
  pet: 'pets',
  shelter: 'shelters',
  pension: 'pensions',
  voice: 'messages/voice',
};

/** Plafond par usage, en octets. */
const MAX_BYTES_BY_KIND: Record<Kind, number> = {
  report: 5 * 1024 * 1024,
  pet: 5 * 1024 * 1024,
  shelter: 5 * 1024 * 1024,
  pension: 5 * 1024 * 1024,
  voice: 5 * 1024 * 1024,
};

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/aac': 'aac',
  'audio/webm': 'weba',
};

class PresignDto {
  @IsIn(CONTENT_TYPES, { message: 'Type de fichier non accepté.' })
  contentType!: (typeof CONTENT_TYPES)[number];

  @IsIn(KINDS, { message: "Type d'upload inconnu." })
  kind!: Kind;

  @IsInt({ message: 'La taille du fichier est requise.' })
  @Min(1, { message: 'Fichier vide.' })
  @Max(5 * 1024 * 1024, { message: 'Fichier trop volumineux (5 Mo maximum).' })
  contentLength!: number;
}

interface PresignResponseDto {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSec: number;
  maxBytes: number;
}

@Controller('api/v1')
export class UploadsController {
  constructor(private readonly s3: S3Service) {}

  @Post('uploads/presign')
  @Auth()
  async presign(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: PresignDto,
  ): Promise<ApiResponse<PresignResponseDto>> {
    if (!this.s3.isConfigured) {
      throw AppError.unprocessable("Le stockage des fichiers n'est pas configuré.");
    }

    const maxBytes = MAX_BYTES_BY_KIND[dto.kind];
    if (dto.contentLength > maxBytes) {
      throw AppError.unprocessable(
        `Fichier trop volumineux (${Math.round(maxBytes / (1024 * 1024))} Mo maximum).`,
      );
    }

    // Un fichier audio n'a de sens que pour un message vocal, et inversement.
    const isAudio = (AUDIO_TYPES as readonly string[]).includes(dto.contentType);
    if (isAudio !== (dto.kind === 'voice')) {
      throw AppError.unprocessable("Le type de fichier ne correspond pas à l'usage demandé.");
    }

    const extension = EXTENSION_BY_TYPE[dto.contentType] ?? 'bin';
    // Nom aléatoire : les URL sont donc immuables et non devinables, ce qui
    // autorise le cache agressif posé par Caddy sur le sous-domaine cdn.
    const key = `${PREFIX_BY_KIND[dto.kind]}/${current.userId}/${randomUUID()}.${extension}`;

    const presigned = this.s3.presignPut(key, dto.contentType, dto.contentLength);
    return ok({ ...presigned, maxBytes });
  }
}
