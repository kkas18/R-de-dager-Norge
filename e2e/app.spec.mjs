import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const NOW = new Date("2026-09-27T10:00:00+02:00");
const VIEWS = ["idag", "kalender", "personer", "planlegg", "om"];
const SEED = [
  { id: "e1", name: "Kari Nordmann", type: "bursdag", day: 3, month: 10, year: 1988, arlig: true, remind: 1, tel: "+47 912 34 567", kilde: "kontakter" },
  { id: "e2", name: "Ola Hansen", type: "bursdag", day: null, month: null, year: null, arlig: true, remind: 1, tel: "+47 400 00 000", kilde: "kontakter" },
  { id: "e3", name: "Bryllupsdag", type: "jubileum", day: 14, month: 11, year: 2015, arlig: true, remind: 3, tel: "" }
];

async function open(page, view = "idag", { seed = true } = {}) {
  await page.clock.setFixedTime(NOW);
  if (seed) {
    await page.addInitScript(s => { if (!localStorage.getItem("rd:events")) localStorage.setItem("rd:events", s); }, JSON.stringify(SEED));
  }
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/#" + view);
  await expect(page.locator("#v-" + view)).toBeVisible();
  return errors;
}

test.describe("every view, both themes, two widths", () => {
  for (const scheme of ["light", "dark"]) {
    for (const width of [390, 320]) {
      test(`${scheme} ${width}px`, async ({ page }, info) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize({ width, height: 800 });
        const errors = await open(page);
        for (const view of VIEWS) {
          await page.goto("/#" + view);
          await expect(page.locator("#v-" + view)).toBeVisible();
          await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== "running"));
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          expect(overflow, `horizontal overflow on ${view}`).toBeLessThanOrEqual(0);

          const small = await page.evaluate(() => [...document.querySelectorAll(".view.active button, .tabbar button, .topbar button")]
            .filter(el => el.offsetParent && !el.closest(".mini, .grid, .week"))
            .map(el => ({ id: el.id || el.textContent.trim().slice(0, 20), r: el.getBoundingClientRect() }))
            .filter(x => x.r.height < 40 || x.r.width < 40)
            .map(x => `${x.id} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`));
          expect(small, `small tap targets on ${view}`).toEqual([]);

          const axe = await new AxeBuilder({ page }).include("#v-" + view).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
          const serious = axe.violations.filter(v => ["serious", "critical"].includes(v.impact));
          expect(serious.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(", ")}`), `axe on ${view}`).toEqual([]);

          if (width === 390) await page.screenshot({ path: info.outputPath(`${scheme}-${view}.png`) });
        }
        expect(errors).toEqual([]);
      });
    }
  }
});

test("calendar cells are at least 40px wide on a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await open(page, "kalender");
  const box = await page.locator(".cell").first().boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(40);
});

test("countdown shows first juledag on 27 September 2026", async ({ page }) => {
  await open(page);
  await expect(page.locator(".hero-count .num")).toHaveText("89");
  await expect(page.locator("#v-idag .hero-title")).toHaveText("til første juledag");
});

test("add a person, see it everywhere, delete it and undo", async ({ page }) => {
  await open(page, "personer");
  await page.getByRole("button", { name: "Legg til" }).click();
  await page.locator("#fName").fill("Per Test");
  await page.locator("#fDate").fill("1990-10-01");
  await page.getByRole("button", { name: "Lagre" }).click();
  await expect(page.locator("#pList")).toContainText("Per Test");

  await page.locator("#tab-idag").click();
  await expect(page.locator("#peopleSoonList")).toContainText("Per Test");

  await page.locator("#tab-personer").click();
  await page.locator("#pList .row", { hasText: "Per Test" }).click();
  await page.getByRole("button", { name: "Slett" }).click();
  await expect(page.locator("#pList")).not.toContainText("Per Test");
  await page.getByRole("button", { name: "Angre" }).click();
  await expect(page.locator("#pList")).toContainText("Per Test");
});

test("restore keeps undated contacts and never runs injected markup", async ({ page }) => {
  await open(page, "om", { seed: false });
  const backup = JSON.stringify({ app: "rode-dager", dager: [
    { id: "x\"><img src=x onerror=window.__pwned=1>", name: "<img src=x onerror=window.__pwned=1>", day: 1, month: 2, tel: "1" },
    { id: "k1", name: "Uten dato", tel: "+47 1", kilde: "kontakter" }
  ] });
  await page.locator("#sRestoreFile").setInputFiles({ name: "kopi.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await expect(page.locator("#toast")).toContainText("Hentet inn 2");
  await page.locator("#tab-personer").click();
  await expect(page.locator("#pList")).toContainText("Uten dato");
  await expect(page.locator("#pList")).toContainText("<img src=x");
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test("sheet traps focus, closes on Escape and returns focus", async ({ page }) => {
  await open(page);
  const trigger = page.locator("#comingList .row").first();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#sheet")).toHaveClass(/is-open/);
  expect(await page.evaluate(() => document.querySelector("#main").inert)).toBe(true);
  expect(await page.evaluate(() => document.getElementById("sheet").contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#sheet")).not.toHaveClass(/is-open/);
  await expect(trigger).toBeFocused();
});

test("tabs follow the arrow keys", async ({ page }) => {
  await open(page);
  await page.locator("#tab-idag").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-kalender")).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/#kalender$/);
  await page.keyboard.press("End");
  await expect(page.locator("#tab-planlegg")).toHaveAttribute("aria-selected", "true");
});

test("bridge planner hides past periods and tracks the budget", async ({ page }) => {
  await open(page, "planlegg");
  const first = page.locator(".plan").first();
  await expect(first).toContainText("desember");
  await first.getByRole("button", { name: "Planlegg" }).click();
  await expect(page.locator("#budget")).toContainText("24");
  // Changing the per-period limit keeps the planned days visible and counted once.
  await page.locator("#bMax").selectOption("5");
  await expect(page.locator("#plannedDays")).toContainText("to 24.12.");
  await expect(page.locator("#budget")).toContainText("24");
});

test("theme choice applies before the app script runs", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page, "om");
  await page.locator("#sTheme").selectOption("dark");
  await page.route("**/js/app.js", route => route.abort());
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
});

test("works offline after the first visit", async ({ page, context }) => {
  await open(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#v-idag .hero-title")).toHaveText("til første juledag");
  await context.setOffline(false);
});
