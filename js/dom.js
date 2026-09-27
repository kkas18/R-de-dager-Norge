// DOM building without innerHTML: every piece of data becomes a text node.

function append(el, child) {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) child.forEach(c => append(el, c));
  else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
}

/**
 * h("button", { class: "row", onclick: fn, "aria-label": "…" }, "text", otherNode)
 * Props starting with "on" become listeners, `dataset` is merged, `hidden`/`disabled`
 * are properties, everything else is an attribute.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k === "hidden" || k === "disabled" || k === "value" || k === "checked") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  append(el, children);
  return el;
}

export function mount(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Short haptic tick, used only for state changes (save, delete, month change). */
export function haptic(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

export function downloadFile(text, filename, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = h("a", { href: url, download: filename, hidden: true });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}

export const slug = s => s.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-").replace(/^-|-$/g, "") || "dager";
