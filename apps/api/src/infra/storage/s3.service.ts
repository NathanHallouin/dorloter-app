/**
 * Stockage objet S3-compatible (MinIO en dev, OVH/Scaleway en prod).
 *
 * Deux usages :
 *   - **présignature** d'un PUT, pour que le client envoie son fichier
 *     directement au bucket sans transiter par l'API (bande passante et
 *     latence économisées) ;
 *   - **suppression** d'un objet, appelée par la purge de rétention quand la
 *     ligne qui le référençait disparaît.
 *
 * Signature AWS SigV4 écrite ici plutôt qu'importée : le SDK AWS pèse plusieurs
 * mégaoctets pour deux opérations, et SigV4 est un format figé depuis 2012. Le
 * calcul est vérifié end-to-end contre MinIO.
 *
 * Les en-têtes `host`, `content-type` et `content-length` sont signés : un
 * client ne peut donc pas déposer un fichier plus gros que celui qu'il a
 * déclaré, ce qui rend la limite de taille réellement opposable.
 */

import { createHash, createHmac } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { CONFIG, type Config } from '../../config';

const ALGORITHM = 'AWS4-HMAC-SHA256';
const SERVICE = 's3';
/** Corps non signé : la signature porte sur les en-têtes, pas sur le contenu. */
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSec: number;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);

  constructor(@Inject(CONFIG) private readonly config: Config) {}

  /** `true` si un bucket est configuré ; sinon l'upload est indisponible. */
  get isConfigured(): boolean {
    const { endpoint, bucket, accessKey, secretKey } = this.config.s3;
    return Boolean(endpoint && bucket && accessKey && secretKey);
  }

  /** URL publique d'un objet déjà déposé. */
  publicUrl(key: string): string {
    return `${this.config.s3.publicBaseUrl}/${key}`;
  }

  /**
   * URL signée pour un `PUT`. Le client doit envoyer exactement les
   * `Content-Type` et `Content-Length` annoncés, sinon le dépôt est refusé.
   */
  presignPut(key: string, contentType: string, contentLength: number): PresignedUpload {
    const { endpoint, region, bucket, accessKey, secretKey, presignTtlSeconds } = this.config.s3;

    const url = new URL(`${endpoint}/${bucket}/${key}`);
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;

    // En-têtes signés : triés par nom, valeurs normalisées.
    const signedHeaders = 'content-length;content-type;host';
    const canonicalHeaders =
      `content-length:${contentLength}\n` +
      `content-type:${contentType}\n` +
      `host:${url.host}\n`;

    const query = new URLSearchParams({
      'X-Amz-Algorithm': ALGORITHM,
      'X-Amz-Credential': `${accessKey}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(presignTtlSeconds),
      'X-Amz-SignedHeaders': signedHeaders,
    });
    // S3 exige un tri lexicographique des paramètres et un encodage RFC 3986.
    const canonicalQuery = [...query.entries()]
      .map(([k, v]) => [encodeRfc3986(k), encodeRfc3986(v)] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    const canonicalRequest = [
      'PUT',
      encodeS3Path(`/${bucket}/${key}`),
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      UNSIGNED_PAYLOAD,
    ].join('\n');

    const stringToSign = [
      ALGORITHM,
      amzDate,
      scope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const signature = hmac(signingKey(secretKey, dateStamp, region), stringToSign).toString('hex');

    return {
      uploadUrl: `${url.origin}${encodeS3Path(`/${bucket}/${key}`)}?${canonicalQuery}&X-Amz-Signature=${signature}`,
      publicUrl: this.publicUrl(key),
      key,
      expiresInSec: presignTtlSeconds,
    };
  }

  /**
   * Supprime un objet. Ne lève jamais : un objet orphelin est un défaut
   * d'hygiène, pas une raison d'interrompre une purge de rétention.
   */
  async deleteObject(key: string): Promise<boolean> {
    if (!this.isConfigured) return false;
    const { endpoint, region, bucket, accessKey, secretKey } = this.config.s3;

    const url = new URL(`${endpoint}/${bucket}/${key}`);
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
    const payloadHash = sha256Hex('');

    const canonicalHeaders =
      `host:${url.host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'DELETE',
      encodeS3Path(`/${bucket}/${key}`),
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
    const signature = hmac(signingKey(secretKey, dateStamp, region), stringToSign).toString('hex');

    try {
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          Authorization:
            `${ALGORITHM} Credential=${accessKey}/${scope}, ` +
            `SignedHeaders=${signedHeaders}, Signature=${signature}`,
          'x-amz-content-sha256': payloadHash,
          'x-amz-date': amzDate,
        },
      });
      // S3 renvoie 204 même si l'objet n'existait pas : c'est idempotent.
      if (!response.ok && response.status !== 404) {
        this.logger.warn(`suppression S3 refusée (${response.status}) pour ${key}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(`suppression S3 injoignable pour ${key}`, error as Error);
      return false;
    }
  }

  /**
   * Extrait la clé S3 d'une URL publique. Renvoie `null` si l'URL ne provient
   * pas de notre bucket (photo pointant vers un site externe, par exemple).
   */
  keyFromPublicUrl(url: string): string | null {
    const base = `${this.config.s3.publicBaseUrl}/`;
    if (!url.startsWith(base)) return null;
    const key = url.slice(base.length);
    return key.length > 0 ? key : null;
  }
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function signingKey(secret: string, dateStamp: string, region: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

/** `20260803T142530Z` */
function toAmzDate(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/** Encodage RFC 3986 : `encodeURIComponent` laisse passer `!'()*`. */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Chemin canonique : chaque segment encodé, les `/` conservés. */
function encodeS3Path(path: string): string {
  return path.split('/').map(encodeRfc3986).join('/');
}
