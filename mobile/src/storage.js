// Sauvegarde : sur le téléphone (AsyncStorage) + synchro optionnelle avec le serveur Foot Coach
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "footcoach_data_v1";
const CFG = "footcoach_server_v1";

export async function loadLocal() {
  try { const r = await AsyncStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
}
export async function saveLocal(d) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
}
export async function loadServer() {
  try { const r = await AsyncStorage.getItem(CFG); return r ? JSON.parse(r) : { url: "", pin: "" }; } catch (e) { return { url: "", pin: "" }; }
}
export async function saveServer(c) {
  try { await AsyncStorage.setItem(CFG, JSON.stringify(c)); } catch (e) {}
}

const clean = (u) => (u || "").trim().replace(/\/+$/, "");

async function call(cfg, method, body) {
  if (!clean(cfg.url)) return { ok: false, off: true };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(clean(cfg.url) + "/api/data", {
      method,
      headers: { "Content-Type": "application/json", "x-pin": cfg.pin || "" },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (r.status === 401) return { ok: false, pin: true };
    if (!r.ok) return { ok: false };
    return { ok: true, data: method === "GET" ? await r.json() : null };
  } catch (e) {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

export const pullServer = (cfg) => call(cfg, "GET");
export const pushServer = (cfg, d) => call(cfg, "PUT", d);
