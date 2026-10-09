// Explicit single-contact selection: native Android picker or supported browsers.
export const canPickPhone = () => typeof window.RodeDagerAndroid?.pickPhoneNumber === "function" ||
  typeof navigator.contacts?.select === "function";

export async function pickPhone({ signal } = {}) {
  if (signal?.aborted) return null;
  if (typeof window.RodeDagerAndroid?.pickPhoneNumber === "function") {
    const requestId = "phone-" + crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        window.removeEventListener("rd:contact-picked", receive);
        signal?.removeEventListener("abort", cancel);
      };
      const cancel = () => { cleanup(); resolve(null); };
      const receive = e => {
        const result = e.detail;
        if (result?.requestId !== requestId) return;
        cleanup();
        if (result.error) reject(new Error("Kontaktvelgeren kunne ikke åpnes."));
        else resolve(result.tel ? { name: result.name || "", numbers: [result.tel] } : null);
      };
      window.addEventListener("rd:contact-picked", receive);
      signal?.addEventListener("abort", cancel, { once: true });
      try { window.RodeDagerAndroid.pickPhoneNumber(requestId); }
      catch (error) { cleanup(); reject(error); }
    });
  }
  const available = await navigator.contacts.getProperties();
  if (!available.includes("tel")) throw new Error("Ingen telefonnumre tilgjengelig.");
  try {
    const [contact] = await navigator.contacts.select(available.includes("name") ? ["name", "tel"] : ["tel"], { multiple: false });
    if (signal?.aborted || !contact) return null;
    const numbers = [...new Set((contact.tel || []).filter(n => typeof n === "string").map(n => n.trim()).filter(Boolean))];
    return numbers.length ? { name: (contact.name || []).find(n => typeof n === "string" && n.trim()) || "", numbers } : null;
  } catch (error) {
    if (error.name === "AbortError") return null;
    throw error;
  }
}
