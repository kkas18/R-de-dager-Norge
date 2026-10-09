import { test } from "node:test";
import assert from "node:assert/strict";
import { date } from "../js/dates.js";
import { normalizePlan, planBudget, togglePeriod } from "../js/planning.js";

test("old plans retain valid dates, remove duplicates and tolerate damaged data", () => {
  assert.deepEqual(normalizePlan(null), { total: 25, days: [] });
  assert.deepEqual(normalizePlan({ total: -1, days: ["2026-12-24", "2026-12-24", "2026-02-30", null] }),
    { total: 0, days: ["2026-12-24"] });
  assert.equal(normalizePlan({ total: 1000 }).total, 99);
});

test("overlapping periods consume each vacation day once and can be removed", () => {
  const original = { total: 2, days: ["2026-12-24"] };
  const take = [date(2026, 11, 24), date(2026, 11, 28)];
  assert.deepEqual(planBudget(original, take), { used: 1, left: 1, added: 1 });
  const saved = togglePeriod(original, take);
  assert.deepEqual(saved.days, ["2026-12-24", "2026-12-28"]);
  assert.equal(planBudget(saved).left, 0);
  assert.deepEqual(togglePeriod(saved, take).days, []);
  assert.deepEqual(original.days, ["2026-12-24"]);
});

test("lowering an existing budget exposes overspending without removing dates", () => {
  const plan = normalizePlan({ total: 0, days: ["2026-12-24"] });
  assert.equal(planBudget(plan).left, -1);
  assert.deepEqual(plan.days, ["2026-12-24"]);
});
