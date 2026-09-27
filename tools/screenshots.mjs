// Renders the install-dialog screenshots referenced in manifest.json.
// Usage: npm run serve (in another shell), then: node tools/screenshots.mjs [baseUrl]
import { chromium } from "@playwright/test";

const base = process.argv[2] || "http://localhost:8080/";
const seed = JSON.stringify([
  { id: "s1", name: "Kari Nordmann", type: "bursdag", day: 3, month: 10, year: 1988, arlig: true, remind: 1, tel: "" },
  { id: "s2", name: "Bryllupsdag", type: "jubileum", day: 14, month: 11, year: 2015, arlig: true, remind: 3, tel: "" }
]);

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "nb-NO", colorScheme: "light" });
await page.clock.setFixedTime(new Date("2026-09-27T10:00:00+02:00"));
await page.addInitScript(s => localStorage.setItem("rd:events", s), seed);
for (const view of ["idag", "kalender", "planlegg"]) {
  await page.goto(base + "#" + view);
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== "running"));
  await page.screenshot({ path: "screenshots/" + view + ".png" });
  console.log("wrote screenshots/" + view + ".png");
}
await browser.close();
