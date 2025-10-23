import { describe, expect, test } from 'bun:test';

import { ScryptService } from './scrypt.service';

/**
 * Vecteurs de référence produits par `hashlib.scrypt` (RFC 7914, mêmes paramètres
 * et pré-traitement que Better Auth). Prouve l'interop : un hash issu de
 * l'écosystème JS/Python doit matcher ici, sans reset des comptes importés.
 */
describe('ScryptService', () => {
  const encoder = new ScryptService();

  test('accepte les vecteurs de référence Better Auth', () => {
    // password "correcthorse", sel hex fixe
    const v1 =
      '0123456789abcdef0123456789abcdef:b8cde2306239730fbecbccb34849e5d93edb0b503d47e645fb47cdd3e76dcc62a805d3b5a5f5d2f10f7d53461258abb73f06041ea13c913088edd1ca580e4749';
    expect(encoder.matches('correcthorse', v1)).toBe(true);
    expect(encoder.matches('wrong', v1)).toBe(false);
  });

  test('normalise le mot de passe en NFKC', () => {
    // password "paﬁx" (ligature fi, normalisée NFKC en "pafix")
    const v2 =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:6188f311ae409c71607aa9e7c038addeb1fda834d9d9f740003b2eaaed27912df9d58dbdbc64e5536c8bf859557c6a4d3d78ecb583baf4a1d6480817c3388863';
    expect(encoder.matches('paﬁx', v2)).toBe(true);
    // La forme déjà normalisée "pafix" donne le même hash (preuve du NFKC).
    expect(encoder.matches('pafix', v2)).toBe(true);
  });

  test('encode puis vérifie (aller-retour)', () => {
    const hash = encoder.encode('s3cret-pâté');
    expect(hash).toContain(':');
    expect(encoder.matches('s3cret-pâté', hash)).toBe(true);
    expect(encoder.matches('s3cret-pate', hash)).toBe(false);
  });

  test('rejette un hash malformé sans lever', () => {
    expect(encoder.matches('x', '')).toBe(false);
    expect(encoder.matches('x', 'pasdeseparateur')).toBe(false);
    expect(encoder.matches('x', ':abcdef')).toBe(false);
    expect(encoder.matches('x', 'abcdef:')).toBe(false);
  });
});
