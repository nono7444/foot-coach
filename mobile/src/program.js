// ============================================================
//  Programme Foot Coach : 2 séances de 50 min max par semaine
//  Séance A : vitesse, sprints répétés, renfo force
//  Séance B : technique (parcours), appuis, renfo prévention
// ============================================================

export const WEEK_LABEL = { 1: "Test", 2: "Installer", 3: "Installer", 4: "Charger", 5: "Charger", 6: "Charger", 7: "Décharge", 8: "Re-test" };
export const isTestWeek = (w) => w === 1 || w === 8;

export function params(w) {
  return {
    plyoRounds: w <= 2 ? 2 : w === 7 ? 2 : 3,
    rsa: ({ 1: [1, 6], 2: [1, 6], 3: [2, 5], 4: [2, 5], 5: [2, 6], 6: [2, 6], 7: [1, 5], 8: [1, 6] })[w], // [séries, sprints]
    forceRounds: w <= 2 || w === 7 ? 2 : 3,
    nordicReps: w <= 4 ? 4 : 5,
    copLevel: w <= 4 ? "court" : "long",
    copReps: w <= 2 ? 5 : w <= 4 ? 6 : w === 7 ? 5 : 6,
    prevRounds: w <= 2 || w === 7 ? 2 : 3,
    slalomTech: w <= 2 ? 2 : 4,
  };
}

/* ---------------- Matériel ---------------- */
export const MATERIEL = {
  A: [
    "3 cônes",
    "Kettlebell 12 kg",
    "Un sweat ou une serviette (sous les genoux pour le Nordic)",
    "Ton téléphone avec l'appli (chrono, bips)",
    "Eau",
  ],
  B: [
    "Échelle de rythme",
    "6 cônes minimum (8, c'est mieux)",
    "1 ballon minimum (3 à 6, c'est mieux : moins d'allers-retours)",
    "Un sac ou une gourde (sert de « défenseur »)",
    "Ton téléphone avec l'appli",
    "Eau",
  ],
};

export const MISE_EN_PLACE = {
  A: {
    diagram: "setupA",
    lines: [
      "Trouve une ligne droite de 25 m sur l'herbe ou le synthé (pas de bitume : tibia).",
      "Cône 1 = départ. Cône 2 à 15 grands pas. Cône 3 à 10 grands pas plus loin (25 m du départ).",
      "Pose la kettlebell et le sweat près d'une cage : le renfo se fait là (on utilise la barre basse et la transversale).",
      "Rien d'autre à installer : tout le reste de la séance se fait sur ces 3 cônes.",
    ],
  },
  B: {
    diagram: null,
    lines: [
      "Pose l'échelle sur l'herbe, à environ 25 m d'une cage (elle sert à l'échauffement puis au parcours 3).",
      "Garde les cônes et les ballons en tas près de l'échelle : avant chaque parcours, l'appli te dit exactement où les poser.",
      "Les parcours réutilisent les mêmes cônes : tu ranges ceux du parcours précédent et tu installes le suivant.",
    ],
  },
};

/* ---------------- Échauffements ---------------- */
const WU_BASE = [
  { kind: "timer", block: "Échauffement", title: "Footing + pas chassés", dur: 180,
    how: [
      "Trottine tranquillement sur la largeur du terrain.",
      "Toutes les 30 s, change : 20 m en pas chassés (de côté, sans croiser les pieds), 20 m en montant les genoux, 20 m en ramenant les talons aux fesses.",
    ] },
  { kind: "timer", block: "Échauffement", title: "Mobilité des hanches", dur: 120,
    how: [
      "Ouverture de hanche : en marchant, monte un genou devant toi puis fais-le tourner vers l'extérieur, comme pour enjamber une barrière. 8 par jambe.",
      "Fermeture : même chose dans l'autre sens (de l'extérieur vers l'intérieur). 8 par jambe.",
      "Fente avant avec rotation : grand pas en avant, genou arrière près du sol, tourne le buste du côté de la jambe avant. 8 par côté.",
    ] },
  { kind: "timer", block: "Échauffement", title: "Activation", dur: 120,
    how: [
      "10 squats : pieds largeur d'épaules, descends comme pour t'asseoir, talons au sol.",
      "10 relevés de mollets : monte sur la pointe des pieds, redescends lentement.",
      "Gainage 20 s sur les avant-bras face au sol (corps droit), puis 20 s sur chaque côté.",
    ] },
];

const WU_A = [
  ...WU_BASE,
  { kind: "timer", block: "Échauffement", title: "Gammes", dur: 90,
    setup: ["Sur ta ligne de cônes, du départ au cône 25 m."],
    how: [
      "2 × skipping bas : petites foulées très rapides, genoux à peine levés, sur l'avant du pied.",
      "2 × foulées bondissantes légères : grandes foulées avec un petit temps de vol, atterrissage en douceur.",
      "Retour en marchant à chaque fois.",
    ] },
  { kind: "interval", block: "Échauffement", title: "3 accélérations progressives", series: 1, reps: 3, every: 40, seriesRest: 0,
    setup: ["Départ au cône 1, arrivée au cône 25 m."],
    how: [
      "1re à 60 % de ta vitesse max (facile), 2e à 75 % (rapide mais relâché), 3e à 90 % (presque à fond).",
      "Retour en marchant. Le bip te dit quand repartir.",
    ] },
];

const WU_B = [
  ...WU_BASE,
  { kind: "timer", block: "Échauffement", title: "Échelle de rythme", dur: 240,
    setup: ["L'échelle à plat sur l'herbe, un cône 10 m après la sortie."],
    how: [
      "1 pied par case : tu cours dans l'échelle, un appui par case, le plus vite possible.",
      "2 pieds par case : gauche-droite dans chaque case, très rapide.",
      "Latéral : de profil, tu avances sur le côté avec les 2 pieds dans chaque case. Une fois à gauche, une fois à droite.",
      "In-in-out-out : face à l'échelle, droit dedans, gauche dedans, droit dehors à droite, gauche dehors à gauche, et tu avances d'une case.",
      "2 passages de chaque. Au dernier passage : sprint de 10 m en sortant.",
    ],
    tips: ["Avant du pied, regard devant, bras qui accompagnent.", "Précision d'abord, vitesse ensuite."] },
];

/* ---------------- Séance A ---------------- */
function sessionA(w, adapted) {
  const p = params(w);
  const s = [...WU_A];

  if (!adapted) {
    s.push({ kind: "circuit", block: "Pliométrie", title: "Sauts", rounds: p.plyoRounds, restEach: 30, restRound: 0,
      intro: "Rendre tes jambes explosives pour les démarrages. Chaque saut à fond et propre : ce n'est pas du cardio.",
      setup: ["Sur l'herbe, à côté du cône de départ."],
      exercises: [
        { name: "Saut en longueur pieds joints", reps: "3 sauts", est: 20,
          how: ["Pieds largeur de hanches, genoux fléchis, bras en arrière.", "Lance les bras vers l'avant et saute le plus loin possible.", "Atterris sur les 2 pieds, genoux fléchis, sans bruit. Tiens 1 s.", "Reviens en marchant, refais. 3 sauts."],
          errors: ["Genoux qui rentrent vers l'intérieur à l'atterrissage.", "Atterrissage bruyant sur les talons (mauvais pour le tibia)."] },
        { name: "Bond latéral « patineur »", reps: "3 par côté", est: 25,
          how: ["Debout sur la jambe droite, pousse fort pour bondir sur le côté gauche.", "Atterris sur la jambe gauche seule, genou fléchi. Tiens 1 s en équilibre.", "Repars vers la droite. Gauche + droite = 1. Fais-en 3."],
          tips: ["C'est le mouvement des appuis et des changements de direction au foot."] },
      ] });
  }

  s.push({ kind: "interval", block: "Vitesse", title: "Accélérations 15 m", series: 1, reps: adapted ? 4 : 6, every: 50, seriesRest: 0,
    setup: ["Départ au cône 1, arrivée au cône 15 m."],
    how: [
      "Sprint à 100 % sur 15 m, puis tu ralentis doucement et reviens en marchant.",
      "Sprints 1-2 : départ debout (un pied devant, buste penché).",
      "Sprints 3-4 : départ dos au cône d'arrivée, tu te retournes et tu sprintes.",
      "Sprints 5-6 : 3 pas chassés sur le côté, puis tu pivotes et sprintes.",
    ],
    tips: ["Les 3 premiers pas sont courts et puissants, corps penché en avant, les bras bougent fort."] });

  if (isTestWeek(w)) {
    s.push({ kind: "interval", block: "Test", title: "Test des navettes", series: 1, reps: 6, every: 30, seriesRest: 0, test: true, diagram: "navette",
      setup: ["Départ au cône 1, demi-tour au cône 15 m.", "Pose le téléphone au départ, écran vers toi."],
      how: [
        "Au bip : sprint jusqu'au cône 15 m, touche-le avec la main, reviens en sprint au départ.",
        "En passant la ligne, regarde l'écran : l'appli affiche ton temps en grand. Retiens-le.",
        "Marche, et repars au bip suivant (toutes les 30 s). 6 navettes.",
        "À la fin, l'appli te demande tes 6 temps (ou note-les dans l'onglet Tests).",
      ],
      tips: ["Ce qui compte : l'écart entre ton meilleur et ton pire temps. Plus il est petit, mieux tu enchaînes les sprints."] });
  } else {
    let [se, re] = p.rsa;
    if (adapted) { re = Math.max(3, Math.ceil((se * re) / 2)); se = 1; }
    s.push({ kind: "interval", block: "Sprints répétés", title: "Sprints répétés 25 m", series: se, reps: re, every: 25, seriesRest: 120,
      setup: ["Départ au cône 1, arrivée au cône 25 m."],
      how: [
        "Au bip : sprint 25 m à fond.",
        "Retour en marchant vite au départ. Le bip suivant arrive 25 s après le précédent.",
        se > 1 ? `Entre les ${se} séries : 2 min de marche.` : "",
      ].filter(Boolean),
      tips: ["C'est dur à la fin, c'est normal : tu entraînes ta capacité à sprinter encore vite en fin de match.", "100 % d'effort sur chaque sprint."] });
  }

  s.push({ kind: "circuit", block: "Renfo force", title: "Duo 1 : fente bulgare + tractions", rounds: p.forceRounds, restEach: 45, restRound: 0,
    intro: "Tu alternes les 2 exercices : pendant que les jambes récupèrent, tu fais le haut du corps.",
    setup: ["À la cage. Kettlebell à côté de toi."],
    exercises: [
      { name: "Fente bulgare avec kettlebell", reps: "8 par jambe", est: 70,
        how: ["Dos à la cage, à 1 grand pas. Pose le dessus du pied arrière sur la barre basse de la cage.", "Kettlebell contre la poitrine, à 2 mains (par les cornes).", "Descends en 3 s en pliant la jambe avant, jusqu'à ce que le genou arrière frôle le sol.", "Remonte en poussant dans le talon avant. 8 fois, puis change de jambe."],
        errors: ["Genou avant qui part vers l'intérieur.", "Pied avant trop près de la cage (le talon décolle)."] },
      { name: "Tractions", reps: isTestWeek(w) ? "Série 1 : MAX (test), puis max − 1" : "max − 1", est: 30,
        how: ["À la barre transversale de la cage si tu l'atteins (sinon : pompes, 12 répétitions).", "Paumes vers l'avant, bras tendus en bas, menton au-dessus de la barre en haut, sans balancer les jambes.", "Fais ton maximum moins 1 (ex. tu peux en faire 8 → fais-en 7).", "Tu n'y arrives pas encore ? Saute pour monter et redescends en 5 s. 5 fois."],
        tips: isTestWeek(w) ? ["Test : ta 1re série = le maximum de tractions propres. Note-le dans l'onglet Tests."] : [] },
    ] });

  s.push({ kind: "circuit", block: "Renfo force", title: "Duo 2 : Nordic + mollets", rounds: p.forceRounds, restEach: 45, restRound: 0,
    intro: "Le Nordic protège les ischios (claquages), le mollet genou plié protège ton tibia.",
    setup: ["À la cage. Sweat plié sous les genoux."],
    exercises: [
      { name: "Nordic ischios", reps: `${p.nordicReps} répétitions`, est: 35,
        how: ["À genoux sur le sweat, corps droit des genoux à la tête.", "Bloque tes talons sous la barre basse de la cage.", "Bras devant toi, laisse-toi tomber vers l'avant le PLUS LENTEMENT possible, corps bien droit.", "Quand tu ne peux plus retenir, amortis avec les mains comme une pompe et repousse pour remonter."],
        tips: ["Au début tu tombes vite : normal. L'important est de freiner le plus longtemps possible.", "Courbatures les 2-3 premières semaines : normal."],
        errors: ["Plier les hanches (fesses en arrière) pour tricher."] },
      { name: "Mollet 1 jambe, genou plié", reps: "12 par jambe", est: 60,
        how: ["Avant du pied sur la barre basse de la cage, talon dans le vide. Kettlebell dans la main du même côté, l'autre main tient la cage.", "Plie le genou d'environ 20-30° et garde-le plié tout le long.", "Monte sur la pointe vite, redescends en 3 s, talon un peu plus bas que le pied.", "12 fois, puis l'autre jambe."],
        tips: ["Genou plié = tu travailles le soléaire, le muscle profond du mollet qui protège le tibia. C'est ton exercice anti-périostite."] },
    ] });

  s.push({ kind: "timer", block: "Retour au calme", title: "Marche + étirements", dur: 120,
    how: ["1 min de marche.", "20 s d'étirement léger : mollets (contre la cage), arrière des cuisses, intérieur des cuisses, avant des cuisses.", "Pas d'étirement forcé."] });
  return s;
}

/* ---------------- Séance B ---------------- */
function sessionB(w, adapted) {
  const p = params(w);
  const slow = adapted ? ["Tibia sensible : fais ce parcours en marchant ou à petite vitesse, technique seulement."] : [];
  const s = [...WU_B];

  s.push({ kind: "timer", block: "Technique", title: "Parcours 1 · Slalom technique", dur: 300, diagram: "p1",
    setup: ["6 cônes en ligne droite, espacés de 1,5 m (un grand pas et demi).", "Ballon 2 m avant le premier cône."],
    how: [
      "Slalom entre les cônes avec le ballon, tour du dernier cône, retour en conduite rapide le long de la ligne.",
      "2 passages par technique, puis tu changes :",
      "① Intérieur-intérieur : intérieur du pied droit, puis du gauche, en alternant à chaque cône.",
      "② Un seul pied : intérieur pour aller à gauche, extérieur (côté petit orteil) pour revenir. Pied droit, puis pied gauche.",
      ...(p.slalomTech >= 4 ? [
        "③ Semelle : à chaque cône, semelle sur le ballon, tu le fais rouler sur le côté et tu repars.",
        "④ Crochet : tu dépasses le cône, tu ramènes le ballon derrière toi avec l'intérieur du pied, et tu repars.",
      ] : []),
    ],
    tips: ["Le ballon reste à moins d'1 m de toi.", "Lève la tête entre deux touches.", ...slow],
    errors: ["Touches trop longues.", "Jambes raides : garde les genoux fléchis."] });

  s.push({ kind: "timer", block: "Technique", title: "Parcours 2 · Contrôle orienté + passe", dur: 300, diagram: "p2",
    setup: ["Range 2 cônes du slalom.", "2 cônes « G » et « D » à 5 m devant toi, écartés de 6 m.", "Mini-but : 2 cônes à 1 m l'un de l'autre, 8-10 m plus loin."],
    how: [
      "Lance le ballon à la main devant toi, en l'air, à 3-5 m.",
      "Contrôle orienté : ta 1re touche envoie déjà le ballon vers le cône G (ou D). Il ne s'arrête pas sous ton pied.",
      "2-3 touches jusqu'au cône, puis passe à ras du sol dans le mini-but.",
      "Alterne gauche / droite. Environ 10 de chaque côté.",
    ],
    tips: ["Vers la gauche : intérieur du pied droit. Vers la droite : intérieur du pied gauche.", "Le pied accompagne le ballon en douceur au lieu de le bloquer.", "Version milieu : avant de lancer, regarde par-dessus ton épaule, puis contrôle du côté opposé.", ...slow] });

  s.push({ kind: "timer", block: "Technique", title: "Parcours 3 · Échelle + slalom + frappe", dur: 360, diagram: "p3",
    setup: ["L'échelle à environ 25 m de la cage.", "1 ballon 3 m après la sortie de l'échelle.", "4 cônes en slalom, espacés de 2 m, vers le but.", "Ballons de réserve près du départ."],
    how: [
      "Passe l'échelle SANS ballon, à fond (change d'appui à chaque passage).",
      "À la sortie, prends le ballon en course, sans t'arrêter.",
      "Slalom rapide, tête levée à la sortie pour regarder le but.",
      "Frappe tout de suite, en 1 ou 2 touches. Vise un coin.",
      "Va chercher le ballon, repose-le, reviens en marchant. 6 passages : 3 pied fort, 3 pied faible.",
    ],
    tips: ["Frappe placée : pied d'appui à côté du ballon, pointe vers la cible, cheville verrouillée, buste au-dessus du ballon.", ...slow] });

  s.push({ kind: "interval", block: "Technique", title: "Parcours 4 · Parcours de l'attaquant", series: 1, reps: adapted ? 3 : 6, every: 45, seriesRest: 0, diagram: "p4",
    setup: ["3 cônes alignés à 1 m d'écart, à environ 30 m du but.", "1 ballon 10 m devant.", "Le « défenseur » (sac ou gourde) 8 m plus loin, vers l'entrée de la surface."],
    how: [
      "Départ dos au but : pas chassés le long des 3 cônes.",
      "Pivot et sprint 10 m jusqu'au ballon.",
      "Conduite vers le défenseur. À 2 m de lui : une feinte, et tu le dépasses.",
      "Frappe en 2 touches maximum. Retour en marchant, départ suivant au bip.",
      "Feintes (une par passage) : feinte de corps → passement de jambe → crochet, et tu recommences.",
    ],
    tips: [
      "Feinte de corps : épaules qui partent à droite, tu pars à gauche avec l'extérieur du pied gauche.",
      "Passement de jambe : le pied droit passe par-dessus le ballon de l'intérieur vers l'extérieur, puis tu pousses le ballon à gauche avec l'extérieur du pied gauche.",
      "Crochet : tu fais semblant de frapper et tu ramènes le ballon derrière ta jambe d'appui.",
      "Version milieu : passe dans un mini-but placé 12 m sur le côté au lieu de frapper.",
    ] });

  s.push({ kind: "circuit", block: "Renfo prévention", title: "Circuit prévention", rounds: p.prevRounds, restEach: 20, restRound: 30,
    intro: "4 exercices à la suite, 20 s de récup entre chaque. Ils protègent l'aine, le tibia et les chevilles.",
    setup: ["À la cage (on utilise la barre basse et un poteau)."],
    exercises: [
      { name: `Copenhagen, version ${p.copLevel === "court" ? "facile (genou)" : "difficile (cheville)"}`, reps: `${p.copReps} par côté`, est: 50,
        how: [
          "Allongé sur le côté, appui sur l'avant-bras.",
          p.copLevel === "court" ? "Le GENOU de la jambe du dessus est posé sur la barre basse de la cage." : "La CHEVILLE de la jambe du dessus est posée sur la barre basse de la cage.",
          "Monte le bassin en poussant avec l'intérieur de la cuisse du dessus : corps droit. La jambe du dessous monte rejoindre la barre.",
          "Redescends lentement presque jusqu'au sol, remonte. Puis l'autre côté.",
        ],
        tips: ["Muscle les adducteurs : le meilleur exercice contre les douleurs à l'aine."] },
      { name: "Relevés de pointes (tibial)", reps: "20 répétitions", est: 40,
        how: ["Dos contre le poteau de la cage, talons à 30 cm du poteau.", "Jambes tendues, relève la pointe des pieds le plus haut possible (talons au sol).", "Redescends lentement."],
        tips: ["Ça brûle devant le tibia : normal, c'est le muscle qui protège de la périostite."] },
      { name: "Mollet 1 jambe, jambe tendue", reps: "15 par jambe", est: 60,
        how: ["Avant du pied sur la barre basse, talon dans le vide, une main sur la cage.", "Jambe TENDUE. Monte sur la pointe, redescends en 3 s.", "15 fois, puis l'autre jambe."] },
      { name: "Planche latérale", timed: 30, sides: true, reps: "30 s par côté",
        how: ["Sur le côté, appui sur l'avant-bras (coude sous l'épaule) et sur le côté du pied.", "Bassin monté, corps droit de la tête aux pieds.", "L'appli compte 30 s, te dit de changer de côté, puis 30 s."] },
    ] });

  s.push({ kind: "timer", block: "Retour au calme", title: "Marche + étirements", dur: 120,
    how: ["1 min de marche.", "20 s d'étirement léger : mollets, arrière des cuisses, intérieur des cuisses, avant des cuisses."] });
  return s;
}

export function buildSession(id, w, adapted = false) {
  return (id === "A" ? sessionA : sessionB)(w, adapted).map((st, i) => ({ ...st, id: i }));
}

/* ---------------- Durées ---------------- */
export function stepSeconds(st) {
  if (st.kind === "timer") return st.dur;
  if (st.kind === "interval") return 10 + st.series * st.reps * st.every + (st.series - 1) * st.seriesRest;
  if (st.kind === "circuit") {
    const ex = st.exercises.reduce((t, e) => t + (e.timed ? e.timed * (e.sides ? 2 : 1) + (e.sides ? 5 : 0) : e.est) + st.restEach, 0);
    return st.rounds * ex + (st.rounds - 1) * st.restRound;
  }
  return 60;
}
export const sessionMinutes = (steps) => Math.round(steps.reduce((t, s) => t + stepSeconds(s), 0) / 60);

export function blocksOf(steps) {
  const out = [];
  steps.forEach((s) => {
    const last = out[out.length - 1];
    if (last && last.block === s.block) last.sec += stepSeconds(s);
    else out.push({ block: s.block, sec: stepSeconds(s) });
  });
  return out;
}

export function departures(every, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = i * every;
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  });
}
