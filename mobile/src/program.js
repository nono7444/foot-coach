// ============================================================
//  Foot Coach — 3 séances par semaine (+ match le lundi)
//   • VMA & sprints  (mercredi, terrain, guidée par la montre Coros)
//   • Renfo          (jeudi, maison : kettlebell 12 kg + barre)
//   • Technique      (samedi, terrain : cônes + ballon)
// ============================================================

export const WEEK_LABEL = { 1: "Découverte", 2: "Découverte", 3: "Progression", 4: "Progression", 5: "Intensité", 6: "Intensité", 7: "Récup", 8: "Bilan" };

/* ---------- Progression semaine par semaine ---------- */
export function params(w) {
  return {
    sprint: ({ 1: [2, 5], 2: [2, 5], 3: [2, 6], 4: [2, 6], 5: [2, 6], 6: [2, 6], 7: [1, 6], 8: [2, 6] })[w], // [séries, sprints]
    vma: ({ 1: [2, 8, 15], 2: [2, 8, 15], 3: [2, 10, 15], 4: [2, 10, 15], 5: [2, 6, 30], 6: [2, 6, 30], 7: [1, 8, 15], 8: [2, 10, 15] })[w], // [séries, reps, secondes]
    rounds: w <= 2 || w === 7 ? 2 : 3,
    nordic: w <= 4 ? 4 : 5,
    cop: w <= 4 ? "genou" : "cheville",
    slalomPlus: w >= 3,
  };
}

const fmtS = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`);

/* ============================================================
   SÉANCE VMA & SPRINTS
   ============================================================ */
function vma(w, adapted) {
  const p = params(w);
  let [ss, sr] = p.sprint;
  let [vs, vr, vt] = p.vma;
  if (adapted) { ss = 0; vs = 1; }
  const blocks = [
    { min: 15, title: "Échauffement", dose: "10' footing + 5' gammes", line: "Tranquille, puis gammes et 3 accélérations.",
      details: [
        "10 min de footing très tranquille (tu peux parler).",
        "Gammes sur 20 m, retour en marchant : montées de genoux, talons-fesses, pas chassés, skipping bas.",
        "3 accélérations de 30 m : 60 %, 75 %, 90 % de ta vitesse.",
      ] },
  ];
  if (ss > 0) blocks.push({ min: Math.round((ss * sr * 30 + (ss - 1) * 120) / 60), title: "Sprints", dose: `${ss} × ${sr} sprints de 5 s`, line: "5 s à fond / 25 s marche. 2' entre les séries.",
    details: [
      "La montre vibre : sprint 5 s à 100 % (environ 30 m).",
      "Elle revibre : 25 s de marche, tu reviens au point de départ.",
      "Varie les départs : debout, dos tourné, après un pas chassé.",
      "Corps penché en avant, petits pas puissants au départ, les bras poussent.",
    ] });
  blocks.push({ min: 3, title: "Récup", dose: "3' trot", line: "Trot très lent, respire." });
  blocks.push({ min: Math.round((vs * vr * vt * 2 + (vs - 1) * 180) / 60), title: "VMA", dose: `${vs} × ${vr} × ${vt}/${vt}`, line: `${vt} s vite / ${vt} s trot. 3' trot entre les séries.`,
    details: [
      `${vt} s vite : environ 90 % de ta vitesse max, pas un sprint. Tu dois tenir la même vitesse jusqu'à la dernière.`,
      `${vt} s trot lent, sans t'arrêter.`,
      vt === 15 ? "Repère : en 15 s vite tu fais environ 60-70 m. Pose 2 cônes et fais des allers-retours." : "Repère : en 30 s vite tu fais environ 120-140 m (un peu plus d'une longueur de terrain).",
      "Sur l'herbe, jamais sur le bitume (tibia).",
    ] });
  blocks.push({ min: 5, title: "Retour au calme", dose: "5' trot + étirements", line: "Trot lent, puis mollets, ischios, adducteurs." });

  const steps = [
    { kind: "warm", label: "Échauffement", value: "10:00" },
    { kind: "train", label: "Gammes + accélérations", value: "5:00" },
  ];
  if (ss > 0) {
    for (let s = 0; s < ss; s++) {
      steps.push({ kind: "repeat", times: sr, items: [{ kind: "train", label: "Sprint", value: "0:05" }, { kind: "rest", label: "Marche", value: "0:25" }] });
      if (s < ss - 1) steps.push({ kind: "rest", label: "Récup", value: "2:00" });
    }
  }
  steps.push({ kind: "rest", label: "Trot", value: "3:00" });
  for (let s = 0; s < vs; s++) {
    steps.push({ kind: "repeat", times: vr, items: [{ kind: "train", label: "Vite", value: fmtS(vt) }, { kind: "rest", label: "Trot", value: fmtS(vt) }] });
    if (s < vs - 1) steps.push({ kind: "rest", label: "Trot", value: "3:00" });
  }
  steps.push({ kind: "cool", label: "Retour au calme", value: "5:00" });

  const key = w <= 2 ? "S1-2" : w <= 4 ? "S3-4" : w <= 6 ? "S5-6" : w === 7 ? "S7" : "S8";
  return {
    id: "vma", title: "VMA & sprints", day: "Mercredi", where: "Terrain",
    gear: ["Montre Coros", "2 cônes", "Eau"],
    blocks,
    coros: { name: `Foot VMA ${key}${adapted ? " adaptée" : ""}`, steps },
    adaptedNote: adapted ? "Tibia sensible : pas de sprints, une seule série de VMA." : null,
  };
}

/* ============================================================
   SÉANCE TECHNIQUE
   ============================================================ */
function technique(w) {
  const p = params(w);
  const slalom = [
    { t: 75, say: "Intérieur du pied droit seulement" },
    { t: 75, say: "Intérieur du pied gauche seulement" },
    { t: 75, say: "Extérieur du pied droit" },
    { t: 75, say: "Extérieur du pied gauche" },
    { t: 75, say: "Intérieur droit, intérieur gauche, en alternant" },
    { t: 75, say: p.slalomPlus ? "Semelle à chaque cône" : "Alterné, plus vite" },
    { t: 75, say: p.slalomPlus ? "Crochet à chaque cône, puis accélère" : "Pied droit seul, plus vite" },
    { t: 75, say: p.slalomPlus ? "Libre, tête levée, le plus vite possible" : "Pied gauche seul, plus vite" },
  ];
  return {
    id: "tech", title: "Technique", day: "Samedi", where: "Terrain + cage",
    gear: ["6 cônes", "Ballon (3-5 c'est mieux)", "Un mur si possible"],
    blocks: [
      { min: 10, title: "Échauffement ballon", dose: "10'", line: "Conduite libre, toucher sur place, accélérations.",
        parts: [
          { t: 180, say: "Conduite libre. Pied droit, pied gauche, toutes les surfaces." },
          { t: 180, say: "Toucher sur place. Tic-tac intérieurs, puis semelles." },
          { t: 120, say: "Mobilité. Hanches et chevilles." },
          { t: 120, say: "Accélérations avec ballon. 20 mètres, retour en marchant." },
        ],
        details: [
          "Tic-tac : le ballon passe d'un pied à l'autre avec l'intérieur, très vite, sur place.",
          "Semelles : la semelle tire le ballon vers l'arrière, pied droit puis pied gauche.",
        ] },
      { min: 8, title: "Jongles", dose: "4 × 2'", line: "Droit seul, gauche seul, alterné, toutes surfaces.",
        parts: [
          { t: 120, say: "Jongles pied droit seulement." },
          { t: 120, say: "Jongles pied gauche seulement." },
          { t: 120, say: "Jongles en alternant droit, gauche." },
          { t: 120, say: "Jongles toutes surfaces. Pied, cuisse, tête. Bats ton record." },
        ],
        details: [
          "Cheville verrouillée, pointe légèrement relevée, tu frappes avec le haut du pied (les lacets).",
          "Le ballon monte à hauteur de hanche, pas plus.",
          "Débutant : 1 rebond au sol autorisé entre chaque touche.",
          "Note ton record dans l'onglet Records.",
        ] },
      { min: 10, title: "Slalom cônes", dose: "8 variantes", line: "6 cônes à 1,5 m. Une variante toutes les 1'15.", diagram: "p1",
        setup: "6 cônes en ligne, espacés de 1,5 m (un grand pas et demi).",
        parts: slalom,
        details: [
          "Aller en slalom, retour en conduite rapide le long des cônes.",
          "Le ballon reste à moins d'1 m de toi. Genoux fléchis.",
          "Lève la tête entre deux touches.",
        ] },
      { min: 8, title: "Contrôle + passe", dose: "4 × 2'", line: "Contre un mur (ou lancer à la main).", diagram: "p2",
        parts: [
          { t: 120, say: "Contrôle orienté pied droit, passe pied gauche." },
          { t: 120, say: "Contrôle orienté pied gauche, passe pied droit." },
          { t: 120, say: "En une touche, droit et gauche." },
          { t: 120, say: "Ballon aérien. Lance-le, amorti cuisse ou poitrine, puis passe." },
        ],
        details: [
          "Contrôle orienté : ta 1re touche envoie déjà le ballon sur le côté, là où tu veux aller.",
          "Pas de mur : lance le ballon à la main devant toi et contrôle-le, puis passe dans un mini-but de 2 cônes.",
          "Passe : intérieur du pied, cheville verrouillée, pied d'appui à côté du ballon.",
        ] },
      { min: 12, title: "Frappes", dose: "3 exercices", line: "Placées, après conduite, en volée.",
        parts: [
          { t: 240, say: "Frappes placées à 16 mètres. 5 pied droit, 5 pied gauche. Vise les coins." },
          { t: 240, say: "Conduite puis frappe. 3 pied droit, 3 pied gauche." },
          { t: 240, say: "Volées. Lance le ballon et reprends-le. Droit et gauche." },
        ],
        details: [
          "Placée : intérieur du pied, pointe du pied d'appui vers la cible.",
          "Puissante (cou-de-pied) : cheville verrouillée, buste au-dessus du ballon pour qu'il ne monte pas.",
          "Volée : regarde le ballon jusqu'au contact, frappe au centre du ballon.",
          "Compte tes buts sur les 10 frappes placées → onglet Records.",
        ] },
      { min: 2, title: "Retour au calme", dose: "2'", line: "Marche + étirements légers." },
    ],
  };
}

/* ============================================================
   SÉANCE RENFO (maison)
   ============================================================ */
function renfo(w) {
  const p = params(w);
  return {
    id: "renfo", title: "Renfo", day: "Jeudi", where: "Maison",
    gear: ["Kettlebell 12 kg", "Barre de tractions", "Une chaise ou le canapé", "Un tapis"],
    blocks: [
      { min: 5, title: "Échauffement", dose: "5'", line: "Jumping jacks, squats, rotations, 5 pompes." },
      { min: p.rounds === 2 ? 14 : 20, title: "Circuit force", dose: `${p.rounds} tours`, line: "5 exercices, 45 s de récup entre chaque.",
        circuit: { rounds: p.rounds, restEach: 45, restRound: 60, exercises: [
          { name: "Goblet squat", reps: "12", est: 35, how: ["Kettlebell contre la poitrine, pieds largeur d'épaules.", "Descends en gardant le dos droit, cuisses au moins parallèles au sol.", "Remonte en poussant dans les talons."] },
          { name: "Fente bulgare", reps: "8 / jambe", est: 70, how: ["Pied arrière sur la chaise ou le canapé, kettlebell contre la poitrine.", "Descends en 3 s jusqu'à ce que le genou arrière frôle le sol.", "Remonte en poussant dans le talon avant."] },
          { name: "Tractions", reps: "max − 1", est: 30, how: ["Paumes vers l'avant, bras tendus en bas, menton au-dessus de la barre.", "Sans élan. Fais ton max moins 1.", "Pas encore de traction ? Saute pour monter, redescends en 5 s, 5 fois."] },
          { name: "Swing kettlebell", reps: "15", est: 30, how: ["Fesses en arrière, dos droit, la kettlebell passe entre les jambes.", "Hanches vers l'avant d'un coup sec : elle monte à hauteur de poitrine.", "Ce sont les hanches qui travaillent, pas les bras."] },
          { name: "Pompes", reps: "10 à 15", est: 30, how: ["Mains un peu plus larges que les épaules, corps droit.", "Poitrine près du sol, puis pousse.", "Trop dur : genoux au sol."] },
        ] } },
      { min: p.rounds === 2 ? 12 : 17, title: "Circuit prévention", dose: `${p.rounds} tours`, line: "Ischios, adducteurs, tibia, gainage.",
        circuit: { rounds: p.rounds, restEach: 30, restRound: 60, exercises: [
          { name: "Nordic ischios", reps: `${p.nordic}`, est: 35, how: ["À genoux sur le tapis, talons bloqués sous le canapé (ou le lit).", "Corps droit, laisse-toi tomber vers l'avant LE PLUS LENTEMENT possible.", "Amortis avec les mains, repousse pour remonter."] },
          { name: `Copenhagen (${p.cop})`, reps: "6 / côté", est: 50, how: ["Sur le côté, appui sur l'avant-bras.", `Le ${p.cop} de la jambe du dessus sur la chaise.`, "Monte le bassin (corps droit), redescends lentement. Puis l'autre côté."] },
          { name: "Mollet genou plié", reps: "12 / jambe", est: 60, how: ["Avant du pied sur une marche, talon dans le vide, kettlebell en main.", "Genou légèrement plié tout le long.", "Monte vite, descends en 3 s. Protège ton tibia."] },
          { name: "Relevés de pointes", reps: "20", est: 40, how: ["Dos au mur, talons à 30 cm du mur, jambes tendues.", "Relève la pointe des pieds le plus haut possible, redescends lentement.", "Ça brûle devant le tibia : normal."] },
          { name: "Planche latérale", reps: "30 s / côté", timed: 30, sides: true, how: ["Appui sur l'avant-bras et le côté du pied.", "Bassin monté, corps droit.", "L'appli compte et te dit de changer de côté."] },
        ] } },
      { min: 3, title: "Étirements", dose: "3'", line: "Ischios, adducteurs, mollets, pectoraux." },
    ],
  };
}

export function buildSession(id, w, adapted = false) {
  if (id === "vma") return vma(w, adapted);
  if (id === "tech") return technique(w);
  return renfo(w);
}
export const SESSIONS = ["vma", "renfo", "tech"];
export const totalMin = (s) => s.blocks.reduce((t, b) => t + b.min, 0);

/* ---------- Records ---------- */
export const RECORDS = [
  { key: "jD", label: "Jongles pied droit" },
  { key: "jG", label: "Jongles pied gauche" },
  { key: "jA", label: "Jongles alterné" },
  { key: "jT", label: "Jongles toutes surfaces" },
  { key: "buts", label: "Buts sur 10 frappes placées" },
  { key: "pull", label: "Tractions max" },
];
