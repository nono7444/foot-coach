// Génère la source AltStore / FlareStore (altstore.json) pour la dernière build.
// Usage : node scripts/make-source.mjs <version> <tag> <ipa>
import { statSync, writeFileSync } from "node:fs";

const [version, tag, ipa = "foot-coach-unsigned.ipa"] = process.argv.slice(2);
const repo = process.env.GITHUB_REPOSITORY || "nono7444/foot-coach";
const size = statSync(ipa).size;
const date = new Date().toISOString();
const notes = (process.env.RELEASE_NOTES || "")
  .split("\n").map((l) => l.trim())
  .filter((l) => l && !/^(Co-Authored-By|Claude-Session|Merge branch)/i.test(l))
  .slice(0, 15).join("\n");
const downloadURL = `https://github.com/${repo}/releases/download/${tag}/${ipa}`;
const iconURL = `https://raw.githubusercontent.com/${repo}/main/mobile/assets/icon.png`;

const source = {
  name: "Foot Coach",
  identifier: "lol.wawanono.footcoach.source",
  sourceURL: `https://github.com/${repo}/releases/latest/download/altstore.json`,
  subtitle: "Ton coach foot perso",
  iconURL,
  tintColor: "#C6FF3D",
  apps: [
    {
      name: "Foot Coach",
      bundleIdentifier: "lol.wawanono.footcoach",
      developerName: "Norman",
      subtitle: "Vitesse, technique et renfo",
      localizedDescription: "2 séances guidées de 50 min par semaine : sprints répétés, parcours techniques, renfo chronométré, suivi du tibia et tests.",
      iconURL,
      tintColor: "#C6FF3D",
      category: "health",
      version,
      versionDate: date,
      downloadURL,
      size,
      versions: [{ version, buildVersion: version.split(".").pop(), date, size, downloadURL, minOSVersion: "16.4", localizedDescription: notes || `Build ${tag}` }],
      appPermissions: { entitlements: [], privacy: {} },
    },
  ],
  news: [],
};

writeFileSync("altstore.json", JSON.stringify(source, null, 2));
console.log(`altstore.json : Foot Coach ${version} → ${downloadURL} (${size} octets)`);
