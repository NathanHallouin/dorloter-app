/// <reference types="bun-types" />
/**
 * Tests unitaires de `notificationDataToRoute`.
 *
 * Pure function → testable directement avec `bun test`, sans mocking
 * de natives (RN bridge, expo-notifications, etc.).
 *
 * Run : `bun run test` depuis apps/mobile.
 */

import { describe, expect, test } from "bun:test";
import { notificationDataToRoute } from "../deep-link";

describe("notificationDataToRoute", () => {
  test("null/undefined data → null", () => {
    expect(notificationDataToRoute(null)).toBeNull();
    expect(notificationDataToRoute(undefined)).toBeNull();
  });

  test("data sans id mappable → null (ex. new_message)", () => {
    expect(notificationDataToRoute({ url: "/messages/abc" })).toBeNull();
    expect(notificationDataToRoute({ type: "new_message" })).toBeNull();
  });

  test("reportId → /report/[id]", () => {
    expect(
      notificationDataToRoute({ reportId: "abc-123", type: "match_found" })
    ).toEqual({
      pathname: "/report/[id]",
      params: { id: "abc-123" },
    });
  });

  test("petId → /pet/[id]", () => {
    expect(
      notificationDataToRoute({ petId: "xyz-456", type: "new_cat_nearby" })
    ).toEqual({
      pathname: "/pet/[id]",
      params: { id: "xyz-456" },
    });
  });

  test("reportId prioritaire sur petId si les deux sont présents", () => {
    // Cas peu probable en pratique mais défensif — un payload futur
    // pourrait inclure les deux et on veut un comportement déterministe.
    expect(
      notificationDataToRoute({
        reportId: "abc",
        petId: "xyz",
      })
    ).toEqual({
      pathname: "/report/[id]",
      params: { id: "abc" },
    });
  });

  test("ids non-string sont ignorés (ex. number, null)", () => {
    expect(notificationDataToRoute({ reportId: 42 })).toBeNull();
    expect(notificationDataToRoute({ petId: null })).toBeNull();
    expect(
      notificationDataToRoute({ reportId: undefined, petId: ["x"] })
    ).toBeNull();
  });

  test("autres clés du payload n'interfèrent pas", () => {
    expect(
      notificationDataToRoute({
        reportId: "r1",
        petName: "Mimi",
        bestScore: 87.5,
        url: "/perdus-trouves/r1",
      })
    ).toEqual({
      pathname: "/report/[id]",
      params: { id: "r1" },
    });
  });
});
