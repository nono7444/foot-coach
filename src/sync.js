// Sauvegarde : téléphone (localStorage) + serveur (/api/data)
const KEY = "wawafoot_v1";
const PIN_KEY = "wawafoot_pin";

export function loadLocal() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
}
export function saveLocal(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
}
export function getPin() {
  try { return localStorage.getItem(PIN_KEY) || ""; } catch (e) { return ""; }
}
export function setPin(p) {
  try { localStorage.setItem(PIN_KEY, p); } catch (e) {}
}

const headers = () => ({ "Content-Type": "application/json", "x-pin": getPin() });

export async function pullServer() {
  try {
    const r = await fetch("/api/data", { headers: headers() });
    if (r.status === 401) return { ok: false, pin: true };
    if (!r.ok) return { ok: false };
    return { ok: true, data: await r.json() };
  } catch (e) { return { ok: false }; }
}

export async function pushServer(data) {
  try {
    const r = await fetch("/api/data", { method: "PUT", headers: headers(), body: JSON.stringify(data) });
    if (r.status === 401) return { ok: false, pin: true };
    return { ok: r.ok };
  } catch (e) { return { ok: false }; }
}
