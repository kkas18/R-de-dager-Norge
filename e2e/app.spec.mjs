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
          await expect(page.locator("#openSettings")).toBeInViewport();
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

test("the leaf shows første juledag in 89 days on 27 September 2026", async ({ page }) => {
  await open(page);
  await expect(page.locator(".leaf-day")).toHaveText("25");
  await expect(page.locator(".leaf-name")).toHaveText("Første juledag");
  await expect(page.locator(".leaf-count")).toHaveText("Om 89 dager.");
});

test("add a person, see it everywhere, delete it and undo", async ({ page }) => {
  await open(page, "personer");
  await page.locator("#pAdd").click();
  await page.locator("#fName").fill("Per Test");
  await page.locator("#fDate").fill("1990-10-01");
  await page.getByRole("button", { name: "Lagre" }).click();
  await expect(page.locator("#pList")).toContainText("Per Test");

  await page.locator("#tab-idag").click();
  await expect(page.locator("#peopleSoonList")).toContainText("Per Test");

  await page.locator("#tab-personer").click();
  await page.locator("#pList .alm-row", { hasText: "Per Test" }).click();
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
  const trigger = page.locator("#comingList .alm-row").first();
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
  await expect(page.locator(".leaf-name")).toHaveText("Første juledag");
  await context.setOffline(false);
});

test("Back closes an open sheet instead of leaving the page", async ({ page }) => {
  await open(page, "kalender");
  await page.locator(".cell", { hasText: /^24$/ }).first().click();
  await expect(page.locator("#sheet")).toHaveClass(/is-open/);
  await page.goBack();
  await expect(page.locator("#sheet")).not.toHaveClass(/is-open/);
  await expect(page).toHaveURL(/#kalender$/);
  await expect(page.locator("#v-kalender")).toBeVisible();
});

test("the year view is a printed calendar with real numerals", async ({ page }) => {
  await open(page, "kalender");
  await page.locator("#calMode [data-mode=year]").click();
  await expect(page.locator(".mini")).toHaveCount(12);
  await expect(page.locator(".mini").nth(11).locator(".red", { hasText: /^25$/ })).toHaveCount(1);
});

test("closing and quickly reopening a sheet keeps Back working", async ({ page }) => {
  await open(page, "kalender");
  await page.locator(".cell", { hasText: /^24$/ }).first().click();
  await page.locator("#sheetClose").click();
  await page.locator(".cell", { hasText: /^25$/ }).first().click();
  await page.waitForTimeout(300); // let the first Back land
  await expect(page.locator("#sheet")).toHaveClass(/is-open/);
  await page.goBack();
  await expect(page.locator("#sheet")).not.toHaveClass(/is-open/);
  await expect(page.locator("#v-kalender")).toBeVisible();
});

test("a reload with a sheet open leaves no dead Back step", async ({ page }) => {
  await open(page, "kalender");
  await page.locator(".cell", { hasText: /^24$/ }).first().click();
  await page.reload();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => history.state && history.state.sheet)).toBeFalsy();
});

test("rows tell screen readers the date and when it is", async ({ page }) => {
  await open(page);
  await expect(page.locator("#peopleSoonList .alm-row").first()).toHaveAttribute("aria-label", /Kari Nordmann, bursdag 3\. oktober · fyller 38, lørdag, om 6 dager/);
  await expect(page.locator("#comingList .alm-row").first()).toHaveAttribute("aria-label", /Julaften, torsdag 24\. desember, ikke rød dag, om 88 dager/);
});

test("today has a labelled holiday, day details and a compact expandable agenda", async ({ page }) => {
  await open(page);
  await expect(page.locator(".leaf-caption")).toContainText("Neste helligdag");
  await page.locator(".leaf-action").click();
  await expect(page.locator("#sheetTitle")).toContainText("25. desember 2026");
  await page.locator("#sheetClose").click();
  await expect(page.locator("#comingList .alm-row")).toHaveCount(4);
  await page.locator("#comingMore button").click();
  await expect(page.locator("#comingList .alm-row")).toHaveCount(8);
  await page.locator("#comingMore button").click();
  await expect(page.locator("#comingList .alm-row")).toHaveCount(4);
  await expect(page.locator("#comingMore button")).toBeFocused();
});

test("the vacation opportunity opens the right year and works when all of this year is over", async ({ page }) => {
  await open(page);
  await page.clock.setFixedTime(new Date("2027-12-31T10:00:00+01:00"));
  await page.reload();
  await page.locator(".opportunity a").click();
  await expect(page.locator("#v-planlegg")).toBeVisible();
  await expect(page.locator("#bYear")).toHaveValue("2028");
  await expect(page.locator("#bMax")).toHaveValue("1");
  await expect(page.locator(".plan").first()).toBeVisible();
});

test("vacation plans persist in calendar and cannot exceed the budget", async ({ page }) => {
  await open(page, "planlegg");
  await page.locator("#bTotal").fill("0");
  await page.locator("#bTotal").blur();
  await expect(page.locator(".plan-save").first()).toBeDisabled();
  await expect(page.locator(".plan-warning").first()).toContainText("flere feriedager");
  await page.locator("#bTotal").fill("1");
  await page.locator("#bTotal").blur();
  await page.locator(".plan-save").first().click();
  await expect(page.locator("#budgetMeter")).toHaveAttribute("value", "1");
  await page.locator("#tab-kalender").click();
  await page.locator("#calNext").click({ clickCount: 3, delay: 250 });
  await expect(page.locator("#calTitle")).toContainText("Desember");
  const day = page.locator(".cell.is-vacation").first();
  await expect(day).toHaveAttribute("aria-label", /24\. desember 2026, Julaften, planlagt ferie/);
  await day.click();
  await expect(page.locator("#sheetBody")).toContainText("Du har planlagt ferie denne dagen.");
  await page.locator("#sheetClose").click();
  await page.reload();
  // The month cursor resets on reload. The annual plan remains saved.
  await page.locator("#calMode [data-mode=year]").click();
  await expect(page.locator(".mini-grid .vacation", { hasText: /^24$/ })).toHaveCount(1);
  await page.locator("#tab-planlegg").click();
  await page.locator(".plan-save.is-saved").first().click();
  await page.locator("#tab-kalender").click();
  await expect(page.locator(".mini-grid .vacation")).toHaveCount(0);
});

test("reduced motion disables page and sheet movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.locator("#tab-kalender").click();
  await page.locator(".cell").first().click();
  const motion = await page.evaluate(() => ({
    page: getComputedStyle(document.querySelector(".view.active")).animationName,
    sheet: getComputedStyle(document.querySelector("#sheet")).transitionDuration
  }));
  expect(motion.page).toBe("none");
  expect(motion.sheet).toBe("0s");
});

test.describe("installation screenshots", () => {
  test.use({ deviceScaleFactor: 2 });
  test("capture current installation screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await open(page);
  for (const view of ["idag", "kalender", "planlegg"]) {
    await page.goto("/#" + view);
    await page.reload();
    await expect(page.locator("#v-" + view)).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; scrollTo(0, 0); });
    await page.screenshot({ path: "screenshots/" + view + ".png" });
  }
  });
});
