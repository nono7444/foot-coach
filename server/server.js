// Serveur Foot Coach : sert l'appli et garde tes séances dans data/data.json
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "data.json");
const PIN = process.env.APP_PIN || ""; // code d'accès (vide = pas de code)
const PORT = process.env.PORT || 3000;

fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: "2mb" }));

// Vérifie le code PIN pour toutes les routes /api
app.use("/api", (req, res, next) => {
  if (!PIN) return next();
  if (req.get("x-pin") === PIN) return next();
  res.status(401).json({ error: "pin" });
});

app.get("/api/ping", (req, res) => res.json({ ok: true }));

app.get("/api/data", (req, res) => {
  try {
    const raw = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, "utf8") : "{}";
    res.json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: "lecture impossible" });
  }
});

app.put("/api/data", (req, res) => {
  try {
    const body = req.body || {};
    body.savedAt = new Date().toISOString();
    // écriture "atomique" : fichier temporaire puis renommage
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(body, null, 2));
    fs.renameSync(tmp, DATA_FILE);
    // petite sauvegarde du jour, au cas où
    const day = new Date().toISOString().slice(0, 10);
    fs.copyFileSync(DATA_FILE, path.join(DATA_DIR, `backup-${day}.json`));
    res.json({ ok: true, savedAt: body.savedAt });
  } catch (e) {
    res.status(500).json({ error: "écriture impossible" });
  }
});

// L'appli React compilée
const DIST = path.join(ROOT, "dist");
app.use(express.static(DIST));
app.get("*", (req, res) => res.sendFile(path.join(DIST, "index.html")));

app.listen(PORT, () => console.log(`Foot Coach sur le port ${PORT}`));
