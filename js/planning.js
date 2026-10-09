// Pure vacation-plan helpers. Keep the existing rd:plan:<year> storage format.
import { parseIsoDate, isoDate } from "./dates.js";
import { bridges } from "./holidays.js";

/** Next useful suggestion; all vacation dates remain in a single budget year. */
export function featuredPause(from) {
  for (let year = from.getFullYear(); year <= from.getFullYear() + 2; year++) {
    const period = bridges(year, 4, from).find(p => p.from >= from);
    if (period) return period;
  }
  return null;
}

export const planKey = year => "rd:plan:" + year;

export function normalizePlan(value) {
  const raw = value && typeof value === "object" ? value : {};
  const total = Number.isInteger(raw.total) ? Math.max(0, Math.min(99, raw.total)) : 25;
  const days = (Array.isArray(raw.days) ? raw.days : [])
    .filter(d => typeof d === "string" && parseIsoDate(d));
  return { total, days: [...new Set(days)].sort() };
}

export function planBudget(plan, take = []) {
  const added = [...new Set(take.map(isoDate))].filter(d => !plan.days.includes(d)).length;
  return { used: plan.days.length, left: plan.total - plan.days.length, added };
}

export function togglePeriod(plan, take) {
  const keys = [...new Set(take.map(isoDate))];
  const planned = keys.every(key => plan.days.includes(key));
  return { ...plan, days: planned ? plan.days.filter(key => !keys.includes(key))
    : [...new Set([...plan.days, ...keys])].sort() };
}
