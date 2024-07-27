import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Audits d'accessibilité automatisés (axe-core, règles WCAG 2.1 AA).
 *
 * - On teste les pages publiques principales — pas besoin d'auth.
 * - On filtre les règles par tags WCAG : `wcag2a`, `wcag2aa`, `wcag21a`,
 *   `wcag21aa`. Les recommandations Best Practices ne bloquent pas
 *   (souvent du bruit type "label-content-name-mismatch" sur les boutons
 *   icônes décoratifs).
 * - Si une violation est trouvée, le test échoue et on imprime le détail
 *   pour qu'un humain puisse corriger.
 */

const PUBLIC_PAGES = [
  { name: "Accueil", path: "/" },
  { name: "Adopter (swipe)", path: "/adopter" },
  { name: "Adopter (liste)", path: "/adopter/liste" },
  { name: "Perdus & trouvés", path: "/perdus-trouves" },
  { name: "Refuges", path: "/refuges" },
  { name: "Pensions", path: "/pensions" },
  { name: "Connexion", path: "/login" },
  { name: "Inscription", path: "/register" },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const page of PUBLIC_PAGES) {
  test(`a11y: ${page.name} (${page.path})`, async ({ page: browser }) => {
    await browser.goto(page.path, { waitUntil: "domcontentloaded" });

    const results = await new AxeBuilder({ page: browser })
      .withTags(WCAG_TAGS)
      // La carte MapLibre injecte un canvas et des éléments WebGL qui font
      // remonter de faux positifs (region, color-contrast). On exclut le
      // conteneur — la carte est complétée par une description textuelle.
      .exclude(".maplibregl-canvas-container")
      .exclude("canvas")
      .analyze();

    if (results.violations.length > 0) {
      console.error(
        `${results.violations.length} violation(s) sur ${page.path} :`,
        JSON.stringify(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
          })),
          null,
          2
        )
      );
    }

    expect(results.violations).toEqual([]);
  });
}
