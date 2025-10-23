/**
 * Encodeur de mot de passe compatible bit à bit avec Better Auth
 * (`@better-auth/utils`), pour l'import des comptes existants sans reset.
 *
 * Format : scrypt `N=16384, r=16, p=1, dkLen=64`, mot de passe normalisé NFKC,
 * stockage `"<saltHex>:<keyHex>"`. Subtilité reproduite : le sel passé à scrypt
 * est la *chaîne hexadécimale* du sel (32 caractères), pas les 16 octets décodés.
 * On dérive donc la clé à partir de `UTF8(saltHex)`.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

const N = 16384;
const R = 16;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
/** scrypt consomme 128 * N * r octets ; on laisse une marge au-dessus des 32 Mio. */
const MAX_MEMORY = 128 * N * R * 2;

@Injectable()
export class ScryptService {
  /** Produit un hash `"<saltHex>:<keyHex>"` pour un nouveau mot de passe. */
  encode(rawPassword: string): string {
    const saltHex = randomBytes(SALT_BYTES).toString('hex');
    return `${saltHex}:${deriveKey(rawPassword, saltHex).toString('hex')}`;
  }

  /** Vérifie un mot de passe contre un hash stocké (comparaison à temps constant). */
  matches(rawPassword: string, encoded: string): boolean {
    const separator = encoded.indexOf(':');
    if (separator <= 0) return false;
    const saltHex = encoded.slice(0, separator);
    const keyHex = encoded.slice(separator + 1);
    if (saltHex === '' || keyHex === '') return false;

    let expected: Buffer;
    try {
      expected = Buffer.from(keyHex, 'hex');
    } catch {
      return false;
    }
    if (expected.length !== KEY_LENGTH) return false;

    const actual = deriveKey(rawPassword, saltHex);
    return timingSafeEqual(actual, expected);
  }
}

function deriveKey(rawPassword: string, saltHex: string): Buffer {
  const password = rawPassword.normalize('NFKC');
  return scryptSync(password, saltHex, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEMORY,
  });
}
