import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, Switch, ScrollView } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { C, S } from "./theme";
import { say } from "./sound";
import { Btn, Card, Tag, Section, Diagram, Scale, Alert, fmtMin } from "./ui";
import { TimerStep, IntervalStep, CircuitStep } from "./steps";
import { WEEK_LABEL, isTestWeek, params, MATERIEL, MISE_EN_PLACE, buildSession, sessionMinutes, blocksOf } from "./program";

export function doseOf(st) {
  if (st.kind === "timer") return fmtMin(st.dur);
  if (st.kind === "interval") return `${st.series > 1 ? st.series + " × " : ""}${st.reps} · départ toutes les ${st.every} s`;
  if (st.kind === "circuit") return `${st.rounds} tour${st.rounds > 1 ? "s" : ""} · ${st.exercises.length} exercice${st.exercises.length > 1 ? "s" : ""}`;
  return "";
}

/* ================= Accueil ================= */
export function Home({ data, setData, onPick }) {
  const week = data.week || 1, p = params(week);
  const hist = data.history || [];
  const done = (s) => hist.some((h) => h.week === week && h.session === s);
  const minsA = sessionMinutes(buildSession("A", week)), minsB = sessionMinutes(buildSession("B", week));

  const SessCard = ({ id, title, when, info, gear }) => (
    <Pressable onPress={() => onPick(id)}>
      <Card style={{ overflow: "hidden" }}>
        <Text style={{ position: "absolute", right: -4, top: -36, fontSize: 160, fontWeight: "900", color: "rgba(255,255,255,0.04)" }}>{id}</Text>
        <View style={[S.row, S.between]}><Tag>{when}</Tag>{done(id) && <Tag tone="acc">✓ FAITE</Tag>}</View>
        <Text style={[S.h2, { marginTop: 10 }]}>{title}</Text>
        <Text style={[S.mut, { marginTop: 6 }]}>{info}</Text>
        <Text style={[S.txt, { marginVertical: 8, fontSize: 15 }]}>🎒 {gear}</Text>
        <Btn title="Voir la séance →" onPress={() => onPick(id)} style={{ alignSelf: "flex-start" }} />
      </Card>
    </Pressable>
  );

  return (
    <View>
      <View style={[S.row, S.between]}>
        <View>
          <Text style={[S.small, { fontWeight: "800", letterSpacing: 1 }]}>WAWA FOOT COACH</Text>
          <Text style={S.h1}>Semaine {week}</Text>
        </View>
        <Tag tone={week === 7 ? "warn" : "acc"}>{WEEK_LABEL[week]}</Tag>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }} contentContainerStyle={{ gap: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
          <Pressable key={w} onPress={() => setData({ ...data, week: w })}
            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: w === week ? C.acc : C.card2, borderWidth: 1, borderColor: w === week ? C.acc : C.line }}>
            <Text style={{ color: w === week ? "#0b0c0e" : C.txt, fontWeight: "800", fontSize: 16 }}>S{w}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {done("A") && done("B") && week < 8 && (
        <Card style={{ borderColor: C.acc }}>
          <View style={[S.row, S.between]}>
            <Text style={S.txt}>Semaine {week} bouclée 💪</Text>
            <Btn small title={`Passer en S${week + 1}`} onPress={() => setData({ ...data, week: week + 1 })} />
          </View>
        </Card>
      )}
      <SessCard id="A" title="Vitesse & sprints répétés" when="1re séance de la semaine"
        info={`≈ ${minsA} min · ${isTestWeek(week) ? "test des navettes" : `sprints ${p.rsa[0] > 1 ? p.rsa[0] + " × " : ""}${p.rsa[1]}`} · renfo jambes, ischios, mollets`}
        gear="3 cônes · kettlebell · sweat" />
      <SessCard id="B" title="Technique & appuis" when="2 jours avant le match max"
        info={`≈ ${minsB} min · échelle · 4 parcours techniques · renfo prévention`}
        gear="échelle · 6-8 cônes · ballon(s) · sac" />
      <Card>
        <View style={[S.row, S.between]}>
          <View style={{ flex: 1 }}>
            <Text style={[S.txt, { fontWeight: "800" }]}>Coach vocal</Text>
            <Text style={S.small}>Annonces en français + bips</Text>
          </View>
          <Switch value={data.voice !== false} onValueChange={(v) => setData({ ...data, voice: v })} trackColor={{ true: C.acc, false: C.card2 }} thumbColor="#fff" />
        </View>
      </Card>
    </View>
  );
}

/* ================= Présentation de la séance ================= */
export function Overview({ session, week, onBack, onGo }) {
  const steps = useMemo(() => buildSession(session, week, false), [session, week]);
  const [got, setGot] = useState({});
  const [pain, setPain] = useState(0);
  const lvl = pain >= 6 ? "bad" : pain >= 4 ? "warn" : "ok";
  const mise = MISE_EN_PLACE[session];
  return (
    <View>
      <Btn kind="ghost" small title="← Retour" onPress={onBack} style={{ alignSelf: "flex-start" }} />
      <View style={[S.row, { marginTop: 14 }]}><Tag tone="acc">SÉANCE {session} · S{week}</Tag><Tag>≈ {sessionMinutes(steps)} min</Tag></View>
      <Text style={[S.h1, { marginTop: 8 }]}>{session === "A" ? "Vitesse & sprints répétés" : "Technique & appuis"}</Text>

      <Card>
        <Text style={S.secT}>🗓 Déroulé</Text>
        {blocksOf(steps).map((b, j) => (
          <View key={j} style={[S.row, S.between, { paddingVertical: 8, borderBottomWidth: j < blocksOf(steps).length - 1 ? 1 : 0, borderColor: C.line }]}>
            <Text style={S.txt}>{b.block}</Text><Text style={S.mut}>{fmtMin(b.sec)}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={S.secT}>🎒 Matériel à prendre</Text>
        {MATERIEL[session].map((m, j) => (
          <Pressable key={j} onPress={() => setGot({ ...got, [j]: !got[j] })} style={[S.row, { paddingVertical: 9 }]}>
            <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: got[j] ? C.acc : C.line, backgroundColor: got[j] ? C.acc : "transparent", alignItems: "center", justifyContent: "center" }}>
              {got[j] && <Text style={{ fontWeight: "900", color: "#0b0c0e" }}>✓</Text>}
            </View>
            <Text style={[S.txt, { flex: 1 }, got[j] && { color: C.mut, textDecorationLine: "line-through" }]}>{m}</Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <Text style={S.secT}>📍 Mise en place sur le terrain</Text>
        <Diagram k={mise.diagram} />
        <Section icon="" title="" items={mise.lines} ordered />
      </Card>

      <Card>
        <Text style={S.secT}>🦴 Check tibia</Text>
        <Text style={S.mut}>Douleur au tibia ce matin (ou le lendemain de ta dernière séance / du match) ?</Text>
        <Scale value={pain} onChange={setPain} danger />
        {lvl === "ok" && <Alert>Feu vert : séance normale. Pendant l'effort, 3/10 maximum.</Alert>}
        {lvl === "warn" && <Alert tone="warn">Séance adaptée : {session === "A" ? "pas de sauts, moitié moins de sprints" : "parcours à vitesse réduite, moins de sprints"}. Le renfo reste.</Alert>}
        {lvl === "bad" && <Alert tone="bad">Pas de course aujourd'hui : fais seulement le renfo à la maison. Douleur sur un point précis de l'os ou au repos → médecin ou kiné (risque de fracture de fatigue).</Alert>}
      </Card>

      <Btn big disabled={lvl === "bad"} title={`▶ Commencer la séance ${session}${lvl === "warn" ? " (adaptée)" : ""}`}
        onPress={() => { say("C'est parti. Séance " + session); onGo(lvl === "warn", pain); }} style={{ marginTop: 8 }} />
    </View>
  );
}

/* ================= Séance en cours ================= */
export function Runner({ session, week, adapted, onExit, onFinish, onTestTimes, scrollTop }) {
  const steps = useMemo(() => buildSession(session, week, adapted), [session, week, adapted]);
  const [i, setI] = useState(0);
  const [quit, setQuit] = useState(false);
  const [curEx, setCurEx] = useState(null);
  const startedAt = useRef(Date.now());
  useEffect(() => { activateKeepAwakeAsync("seance").catch(() => {}); return () => { try { deactivateKeepAwake("seance"); } catch (e) {} }; }, []);
  useEffect(() => { scrollTop && scrollTop(); }, [i]);
  const st = steps[i];
  const next = () => { if (i + 1 >= steps.length) onFinish(Math.round((Date.now() - startedAt.current) / 60000)); else { setCurEx(null); setI(i + 1); } };
  const prev = () => { setCurEx(null); setI(Math.max(0, i - 1)); };
  const nextUp = steps[i + 1];
  const ex = st.kind === "circuit" ? curEx : null;

  return (
    <View>
      <View style={[S.row, S.between]}>
        <Btn kind="ghost" small title="✕" onPress={() => setQuit(true)} />
        <Text style={[S.small, { fontWeight: "800" }]}>SÉANCE {session} · S{week}{adapted ? " · ADAPTÉE" : ""}</Text>
        <Text style={S.small}>{i + 1}/{steps.length}</Text>
      </View>
      <View style={{ height: 5, backgroundColor: C.card2, borderRadius: 5, marginTop: 10, overflow: "hidden" }}>
        <View style={{ height: 5, width: `${(i / steps.length) * 100}%`, backgroundColor: C.acc }} />
      </View>

      {quit && (
        <Card style={{ borderColor: C.bad, marginTop: 12 }}>
          <Text style={S.h3}>Arrêter la séance ?</Text>
          <Text style={[S.mut, { marginVertical: 6 }]}>Elle ne sera pas enregistrée.</Text>
          <View style={[S.row]}>
            <Btn kind="ghost" title="Continuer" onPress={() => setQuit(false)} style={{ flex: 1 }} />
            <Btn kind="bad" title="Arrêter" onPress={onExit} style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      <View style={[S.row, { marginTop: 14, flexWrap: "wrap" }]}><Tag tone="acc">{st.block}</Tag><Tag>{doseOf(st)}</Tag></View>
      <Text style={[S.h2, { marginTop: 8 }]}>{st.title}</Text>

      {st.setup && (
        <View style={{ backgroundColor: "rgba(61,214,255,0.08)", borderColor: "rgba(61,214,255,0.35)", borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 }}>
          <Section icon="📍" title="À installer" items={st.setup} tone="info" />
        </View>
      )}
      <Diagram k={st.diagram} />

      <View key={i} style={{ marginTop: 6 }}>
        {st.kind === "timer" && <TimerStep step={st} onDone={next} />}
        {st.kind === "interval" && <IntervalStep step={st} onDone={next} onTestTimes={onTestTimes} />}
        {st.kind === "circuit" && <CircuitStep step={st} onDone={next} onExercise={setCurEx} />}
      </View>

      {ex ? (
        <Card>
          <Text style={S.h3}>{ex.name}</Text>
          <Section icon="👟" title="Comment faire" items={ex.how} ordered />
          <Section icon="💡" title="À savoir" items={ex.tips} />
          <Section icon="⚠️" title="Erreurs à éviter" items={ex.errors} tone="bad" />
        </Card>
      ) : st.kind === "circuit" ? (
        st.exercises.map((e, j) => (
          <Card key={j}>
            <Text style={S.h3}>{j + 1}. {e.name} <Text style={S.mut}>· {e.reps}</Text></Text>
            <Section icon="👟" title="Comment faire" items={e.how} ordered />
            <Section icon="💡" title="À savoir" items={e.tips} />
            <Section icon="⚠️" title="Erreurs à éviter" items={e.errors} tone="bad" />
          </Card>
        ))
      ) : (
        <Card>
          <Section icon="👟" title="Comment faire" items={st.how} ordered />
          <Section icon="💡" title="À savoir" items={st.tips} />
          <Section icon="⚠️" title="Erreurs à éviter" items={st.errors} tone="bad" />
        </Card>
      )}

      <View style={[S.row, S.between, { marginTop: 10 }]}>
        <Btn kind="ghost" title="◀ Précédent" disabled={i === 0} onPress={prev} />
        <Btn kind="ghost" title="Suivant ▶" onPress={next} />
      </View>
      {nextUp && (
        <Card>
          <Text style={S.small}>À SUIVRE</Text>
          <Text style={[S.txt, { fontWeight: "800", marginTop: 2 }]}>{nextUp.title}</Text>
          <Text style={S.small}>{doseOf(nextUp)}</Text>
        </Card>
      )}
    </View>
  );
}

/* ================= Fin de séance ================= */
export function Finish({ session, week, minutes, adapted, painBefore, onSave }) {
  const [rpe, setRpe] = useState(7), [pain, setPain] = useState(0), [note, setNote] = useState("");
  return (
    <View>
      <View style={{ alignItems: "center", marginTop: 20 }}>
        <Text style={{ fontSize: 56 }}>🔥</Text>
        <Text style={[S.h1, { textAlign: "center" }]}>Séance {session} terminée</Text>
        <Text style={S.mut}>Semaine {week} · {minutes} min{adapted ? " · version adaptée" : ""}</Text>
      </View>
      <Card>
        <Text style={S.secT}>Difficulté ressentie</Text>
        <Scale value={rpe} onChange={setRpe} min={1} />
      </Card>
      <Card>
        <Text style={S.secT}>Douleur tibia pendant la séance</Text>
        <Scale value={pain} onChange={setPain} danger />
        {pain > 3 && <Alert tone="warn">Au-dessus de 3/10 : ta prochaine séance sera automatiquement adaptée. Si ça fait encore mal demain matin, repos.</Alert>}
      </Card>
      <TextInput value={note} onChangeText={setNote} multiline placeholder="Notes (sensations, buts marqués, tractions…)" placeholderTextColor={C.mut}
        style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 12, padding: 12, minHeight: 80, fontSize: 16, borderWidth: 1, borderColor: C.line, marginTop: 6 }} />
      <Btn big title="Enregistrer" style={{ marginTop: 12 }}
        onPress={() => onSave({ date: new Date().toISOString(), session, week, minutes, adapted, rpe, pain, painBefore, note })} />
    </View>
  );
}

/* ================= Tests ================= */
export const navStats = (arr) => {
  const v = (arr || []).map(Number).filter((x) => x > 0);
  if (!v.length) return null;
  const best = Math.min(...v), worst = Math.max(...v);
  return { best, worst, gap: worst - best };
};

function TestCard({ title, t, onChange }) {
  const nav = t?.nav || Array(6).fill("");
  const st = navStats(nav);
  return (
    <Card>
      <Text style={S.h3}>{title}</Text>
      <Text style={[S.secT, { marginTop: 10 }]}>Navettes 15 m aller-retour (s)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {nav.map((v, j) => (
          <View key={j} style={{ width: "30%" }}>
            <Text style={S.small}>N°{j + 1}</Text>
            <TextInput value={v || ""} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={C.mut}
              onChangeText={(x) => { const n = [...nav]; n[j] = x.replace(",", "."); onChange({ ...t, nav: n }); }}
              style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 10, fontSize: 17, borderWidth: 1, borderColor: C.line }} />
          </View>
        ))}
      </View>
      {st && (
        <View style={[S.row, { marginTop: 10 }]}>
          {[["meilleur", st.best], ["pire", st.worst], ["écart", st.gap]].map(([l, v]) => (
            <View key={l} style={{ flex: 1, backgroundColor: C.card2, borderRadius: 12, padding: 8, alignItems: "center" }}>
              <Text style={{ color: C.txt, fontSize: 26, fontWeight: "900" }}>{v.toFixed(1)}</Text>
              <Text style={S.small}>{l}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={[S.secT, { marginTop: 12 }]}>Tractions max</Text>
      <TextInput value={t?.pull || ""} keyboardType="number-pad" placeholder="—" placeholderTextColor={C.mut}
        onChangeText={(x) => onChange({ ...t, pull: x })}
        style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 10, fontSize: 17, borderWidth: 1, borderColor: C.line, width: 110 }} />
    </Card>
  );
}

export function Tests({ data, setData }) {
  const t = data.tests || {};
  const set = (k, v) => setData({ ...data, tests: { ...t, [k]: v } });
  const a = navStats(t.s1?.nav), b = navStats(t.s8?.nav);
  return (
    <View>
      <Text style={S.h1}>Tests</Text>
      <Text style={[S.mut, { marginVertical: 6 }]}>2 tests seulement, pendant la séance A des semaines 1 et 8. L'appli te guide et remplit cette page.</Text>
      <Card>
        <Text style={S.secT}>Comment les lire</Text>
        <Section icon="" title="" items={[
          "Navettes : regarde l'écart entre ton meilleur et ton pire temps. Plus il est petit, mieux tu enchaînes les sprints. Le meilleur temps montre ta vitesse pure.",
          "Tractions : ta 1re série de tractions, au maximum.",
        ]} />
      </Card>
      <TestCard title="Semaine 1" t={t.s1} onChange={(v) => set("s1", v)} />
      <TestCard title="Semaine 8" t={t.s8} onChange={(v) => set("s8", v)} />
      {a && b && <Alert>Écart : {a.gap.toFixed(1)} s → {b.gap.toFixed(1)} s · Meilleur : {a.best.toFixed(1)} s → {b.best.toFixed(1)} s</Alert>}
    </View>
  );
}

/* ================= Historique ================= */
export function History({ data }) {
  const h = [...(data.history || [])].reverse();
  return (
    <View>
      <Text style={S.h1}>Historique</Text>
      <Text style={[S.mut, { marginVertical: 6 }]}>{h.length} séance{h.length > 1 ? "s" : ""} enregistrée{h.length > 1 ? "s" : ""}.</Text>
      {h.length === 0 && <Card><Text style={S.mut}>Aucune séance pour l'instant. Lance ta première séance A !</Text></Card>}
      {h.map((x, j) => (
        <Card key={j}>
          <View style={[S.row, S.between]}>
            <Text style={S.h3}>Séance {x.session} · S{x.week}</Text>
            <Text style={S.small}>{new Date(x.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</Text>
          </View>
          <View style={[S.row, { marginTop: 8, flexWrap: "wrap" }]}>
            <Tag>{x.minutes} min</Tag><Tag>Difficulté {x.rpe}/10</Tag>
            <Tag tone={x.pain > 3 ? "warn" : "acc"}>Tibia {x.pain}/10</Tag>{x.adapted && <Tag tone="warn">adaptée</Tag>}
          </View>
          {x.note ? <Text style={[S.small, { marginTop: 6 }]}>{x.note}</Text> : null}
        </Card>
      ))}
    </View>
  );
}

/* ================= Guide + réglages ================= */
export function Guide({ server, setServer, syncText, onSyncNow }) {
  const [url, setUrl] = useState(server.url || "");
  const [pin, setPin] = useState(server.pin || "");
  useEffect(() => { setUrl(server.url || ""); setPin(server.pin || ""); }, [server.url, server.pin]);
  return (
    <View>
      <Text style={S.h1}>Guide</Text>
      <Card>
        <Text style={S.secT}>📏 Mesurer sans mètre</Text>
        <Text style={S.txt}>1 grand pas d'adulte ≈ 1 m. Pour 25 m : 25 grands pas. Garde les mêmes repères chaque semaine. La surface de réparation fait 16,5 m de profondeur.</Text>
      </Card>
      <Card>
        <Text style={S.secT}>⏱ Les bips</Text>
        <Section icon="" title="" items={[
          "3 bips courts = « 3, 2, 1 ».",
          "1 bip long = DÉPART (ou fin du chrono).",
          "Téléphone posé au cône de départ, écran vers toi, volume à fond. Les bips passent même en mode silencieux, et l'écran reste allumé pendant la séance.",
        ]} />
      </Card>
      <Card>
        <Text style={S.secT}>🦴 Règle du tibia (périostite)</Text>
        <Section icon="" title="" items={[
          "Ce matin 0-3/10 → séance normale.",
          "4-5/10 → séance adaptée automatiquement (pas de sauts, moins de sprints).",
          "6/10 et plus → pas de course, renfo seulement.",
          "Pendant l'effort : jamais plus de 3/10.",
          "Sauts et sprints sur herbe ou synthé, jamais sur bitume.",
          "Douleur sur un point précis de l'os, au repos ou la nuit → médecin ou kiné.",
        ]} />
      </Card>
      <Card>
        <Text style={S.secT}>🗺 Lire les schémas</Text>
        <Diagram k="legend" />
      </Card>
      <Card>
        <Text style={S.secT}>📅 Ta semaine</Text>
        <Section icon="" title="" items={[
          "Lundi : match.",
          "Séance A : mercredi (ou 2 jours après le match).",
          "Séance B : samedi au plus tard (2 jours avant le match).",
          "Semaine 7 = décharge (moins de séries), semaine 8 = re-test.",
        ]} />
      </Card>
      <Card>
        <Text style={S.secT}>☁️ Sauvegarde sur ton serveur (optionnel)</Text>
        <Text style={S.mut}>Tes séances sont toujours gardées sur l'iPhone. Si tu as installé le serveur Foot Coach, elles y sont aussi copiées.</Text>
        <Text style={[S.small, { marginTop: 10 }]}>Adresse du serveur</Text>
        <TextInput value={url} onChangeText={setUrl} placeholder="https://foot.wawanono.lol" placeholderTextColor={C.mut} autoCapitalize="none" autoCorrect={false} keyboardType="url"
          style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: C.line, marginTop: 4 }} />
        <Text style={[S.small, { marginTop: 10 }]}>Code d'accès</Text>
        <TextInput value={pin} onChangeText={setPin} placeholder="Code" placeholderTextColor={C.mut} secureTextEntry keyboardType="number-pad"
          style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: C.line, marginTop: 4, width: 160 }} />
        <Btn title="Enregistrer et synchroniser" style={{ marginTop: 12 }} onPress={() => { setServer({ url, pin }); onSyncNow({ url, pin }); }} />
        <Text style={[S.small, { marginTop: 8 }]}>{syncText}</Text>
      </Card>
    </View>
  );
}
