import { describe, expect, test } from 'bun:test';

import {
  scoreBreed,
  scoreColor,
  scoreDateWindow,
  scoreDistance,
  scoreSex,
  totalScore,
} from './match-score';

describe('scoreDistance', () => {
  test('applique les paliers de distance', () => {
    expect(scoreDistance(500)).toBe(40);
    expect(scoreDistance(3_000)).toBe(30);
    expect(scoreDistance(10_000)).toBe(20);
    expect(scoreDistance(25_000)).toBe(10);
    expect(scoreDistance(40_000)).toBe(0);
  });
});

describe('scoreColor', () => {
  test('distingue exact, partiel et absent', () => {
    expect(scoreColor('Noir et blanc', 'noir et blanc')).toBe(25);
    expect(scoreColor('noir et blanc', 'noir')).toBe(15);
    expect(scoreColor('roux', 'gris')).toBe(0);
    expect(scoreColor(null, 'noir')).toBe(0);
  });
});

describe('scoreBreed', () => {
  test('est neutre quand les deux races sont inconnues', () => {
    expect(scoreBreed(null, null)).toBe(5);
    expect(scoreBreed('inconnu', '')).toBe(5);
    expect(scoreBreed('Européen', 'Européen')).toBe(15);
    expect(scoreBreed('Européen', 'Siamois')).toBe(0);
    expect(scoreBreed('Européen', null)).toBe(0);
  });
});

describe('scoreSex et scoreDateWindow', () => {
  test('note le sexe', () => {
    expect(scoreSex('male', 'male')).toBe(10);
    expect(scoreSex('male', 'femelle')).toBe(0);
    expect(scoreSex('male', 'inconnu')).toBe(5);
  });

  test('note la fenêtre temporelle', () => {
    const lost = '2026-01-10';
    expect(scoreDateWindow(lost, '2026-01-12')).toBe(10);
    expect(scoreDateWindow(lost, '2026-01-22')).toBe(7);
    expect(scoreDateWindow(lost, '2026-02-05')).toBe(3);
    expect(scoreDateWindow(lost, '2026-03-20')).toBe(0);
    // Trouvé antérieur au perdu : incohérent -> 0.
    expect(scoreDateWindow(lost, '2026-01-05')).toBe(0);
  });
});

describe('totalScore', () => {
  test('additionne les cinq critères', () => {
    const lost = { color: 'noir et blanc', breed: 'Européen', sex: 'male', date_event: '2026-01-10' };
    const found = { color: 'noir et blanc', breed: 'Européen', sex: 'male', date_event: '2026-01-12' };
    // 40 (< 1 km) + 25 (couleur exacte) + 15 (race exacte) + 10 (sexe) + 10 (< 7 j)
    expect(totalScore(lost, found, 500)).toBe(100);
  });

  test('tombe sous le seuil quand tout diverge', () => {
    const lost = { color: 'roux', breed: 'Siamois', sex: 'male', date_event: '2026-01-10' };
    const found = { color: 'gris', breed: 'Européen', sex: 'femelle', date_event: '2026-04-10' };
    expect(totalScore(lost, found, 25_000)).toBe(10);
  });
});
