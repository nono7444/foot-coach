import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, Switch, ScrollView } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { C, S } from "./theme";
import { say } from "./sound";
import { Btn, Card, Tag, Section, Diagram, Scale, Alert } from "./ui";
import { CircuitStep, PartsTimer } from "./steps";
import { WEEK_LABEL, SESSIONS, RECORDS, buildSession, totalMin } from "./program";

const ICON = { vma: "⚡", renfo: "💪", tech: "⚽" };

/* ================= Accueil ================= */
export function Home({ data, setData, onPick }) {
  const week = data.week || 1;
  const hist = data.history || [];
  const done = (s) => hist.some((h) => h.week === week && h.session === s);
  const allDone = SESSIONS.every(done);
  return (
    <View>
      <View style={[S.row, S.between]}>
        <View>
          <Text style={[S.small, { fontWeight: "800", letterSpacing: 1 }]}>FOOT COACH</Text>
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
      {allDone && week < 8 && (
        <Card style={{ borderColor: C.acc }}>
          <View style={[S.row, S.between]}>
            <Text style={S.txt}>Semaine {week} bouclée 💪</Text>
            <Btn small title={`Passer en S${week + 1}`} onPress={() => setData({ ...data, week: week + 1 })} />
          </View>
        </Card>
      )}
      <Card style={{ paddingVertical: 10 }}>
        <View style={[S.row, S.between]}><Text style={S.mut}>Lundi</Text><Text style={[S.txt, { fontWeight: "800" }]}>Match</Text></View>
      </Card>
      {SESSIONS.map((id) => {
        const s = buildSession(id, week);
        return (
          <Pressable key={id} onPress={() => onPick(id)}>
            <Card style={done(id) ? { borderColor: C.acc } : null}>
              <View style={[S.row, S.between]}>
                <Text style={S.mut}>{s.day} · {s.where}</Text>
                {done(id) ? <Tag tone="acc">✓ FAITE</Tag> : <Text style={S.mut}>{totalMin(s)} min</Text>}
              </View>
              <Text style={[S.h2, { marginTop: 6 }]}>{ICON[id]} {s.title}</Text>
              <Text style={[S.small, { marginTop: 4 }]}>{s.blocks.map((b) => b.title).join(" · ")}</Text>
            </Card>
          </Pressable>
        );
      })}
      <Card>
        <View style={[S.row, S.between]}>
          <View style={{ flex: 1 }}>
            <Text style={[S.txt, { fontWeight: "800" }]}>Voix</Text>
            <Text style={S.small}>Annonces en français pendant les chronos</Text>
          </View>
          <Switch value={data.voice !== false} onValueChange={(v) => setData({ ...data, voice: v })} trackColor={{ true: C.acc, false: C.card2 }} thumbColor="#fff" />
        </View>
      </Card>
    </View>
  );
}

/* ================= Une étape Coros ================= */
function CorosLine({ st, indent }) {
  const col = st.kind === "train" ? C.acc : st.kind === "rest" ? C.acc2 : C.mut;
  return (
    <View style={[S.row, S.between, { paddingVertical: 5, paddingLeft: indent ? 14 : 0 }]}>
      <Text style={[S.txt, { color: col, fontWeight: st.kind === "train" ? "800" : "500" }]}>{st.label}</Text>
      <Text style={[S.txt, { fontVariant: ["tabular-nums"], fontWeight: "700" }]}>{st.value}</Text>
    </View>
  );
}

function CorosCard({ coros }) {
  const [help, setHelp] = useState(false);
  return (
    <Card style={{ borderColor: C.acc2 }}>
      <Text style={[S.secT, { color: C.acc2 }]}>⌚ À programmer sur ta Coros</Text>
      <Text style={[S.h3, { marginBottom: 6 }]}>« {coros.name} »</Text>
      {coros.steps.map((st, j) =>
        st.kind === "repeat" ? (
          <View key={j} style={{ borderLeftWidth: 3, borderColor: C.acc, marginVertical: 4, paddingLeft: 6 }}>
            <Text style={[S.txt, { fontWeight: "900" }]}>Répéter {st.times} fois</Text>
            {st.items.map((it, k) => <CorosLine key={k} st={it} indent />)}
          </View>
        ) : <CorosLine key={j} st={st} />
      )}
      <Pressable onPress={() => setHelp(!help)} style={{ marginTop: 8 }}>
        <Text style={{ color: C.acc2, fontWeight: "800" }}>{help ? "▾" : "▸"} Comment la créer (une seule fois)</Text>
      </Pressable>
      {help && (
        <Section items={[
          "App COROS → Profil → Bibliothèque d'entraînements (Workout Library) → Créer.",
          "Choisis Course. Donne le nom ci-dessus.",
          "Ajoute les étapes dans l'ordre. Objectif : Temps. Intensité : non définie.",
          "Pour « Répéter » : ajoute l'effort et la récup, regroupe-les en série, mets le nombre de répétitions.",
          "Enregistre, puis « Envoyer à la montre ».",
          "Sur le terrain : Course → Entraînements → choisis la séance. La montre vibre à chaque changement.",
          "La même séance sert 2 semaines : tu n'en crées une nouvelle que quand le nom change.",
        ]} ordered />
      )}
    </Card>
  );
}

/* ================= Fiche de séance ================= */
function BlockCard({ b, done, onToggle, onRun }) {
  const [open, setOpen] = useState(false);
  const hasMore = (b.details && b.details.length) || b.diagram || b.setup;
  return (
    <Card style={[{ padding: 0, overflow: "hidden" }, done && { borderColor: C.acc, opacity: 0.6 }]}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 62, backgroundColor: C.card2, alignItems: "center", justifyContent: "center", paddingVertical: 14 }}>
          <Text style={{ color: C.acc, fontSize: 24, fontWeight: "900" }}>{b.min}'</Text>
        </View>
        <Pressable style={{ flex: 1, padding: 12 }} onPress={() => hasMore && setOpen(!open)}>
          <Text style={[S.h3, { fontSize: 20 }]}>{b.title}</Text>
          {b.dose && b.dose !== `${b.min}'` ? <Text style={{ color: C.acc, fontWeight: "800", fontSize: 16, marginTop: 2 }}>{b.dose}</Text> : null}
          <Text style={[S.mut, { marginTop: 2 }]}>{b.line}</Text>
          {hasMore ? <Text style={[S.small, { marginTop: 4, color: C.acc2 }]}>{open ? "▾ Masquer" : "▸ Détails"}</Text> : null}
        </Pressable>
        <Pressable onPress={onToggle} style={{ width: 54, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: done ? C.acc : C.line, backgroundColor: done ? C.acc : "transparent", alignItems: "center", justifyContent: "center" }}>
            {done && <Text style={{ color: "#0b0c0e", fontWeight: "900", fontSize: 16 }}>✓</Text>}
          </View>
        </Pressable>
      </View>
      {open && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
          {b.setup ? <Text style={[S.txt, { color: C.acc2, marginTop: 4 }]}>📍 {b.setup}</Text> : null}
          <Diagram k={b.diagram} />
          <Section items={b.details} />
        </View>
      )}
      {(b.parts || b.circuit) && !done && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <Btn title={b.circuit ? "▶ Lancer le circuit (chrono)" : "▶ Chrono vocal du bloc"} onPress={onRun} />
        </View>
      )}
    </Card>
  );
}

export function SessionSheet({ id, week, lastPain, onBack, onRunBlock, doneBlocks, setDoneBlocks, onFinish }) {
  const [pain, setPain] = useState(lastPain > 3 ? lastPain : 0);
  const adapted = id === "vma" && pain >= 4;
  const s = useMemo(() => buildSession(id, week, adapted), [id, week, adapted]);
  const toggle = (j) => setDoneBlocks({ ...doneBlocks, [j]: !doneBlocks[j] });
  return (
    <View>
      <Btn kind="ghost" small title="← Retour" onPress={onBack} style={{ alignSelf: "flex-start" }} />
      <Text style={[S.mut, { marginTop: 12 }]}>{s.day} · {s.where} · {totalMin(s)} min · S{week}</Text>
      <Text style={S.h1}>{ICON[id]} {s.title}</Text>
      <Text style={[S.txt, { marginTop: 6 }]}>🎒 {s.gear.join(" · ")}</Text>

      {id === "vma" && (
        <Card>
          <Text style={S.secT}>🦴 Tibia ce matin</Text>
          <Scale value={pain} onChange={setPain} danger />
          {pain >= 6 ? <Alert tone="bad">Pas de course aujourd'hui. Fais la séance renfo à la place. Douleur sur un point précis de l'os ou au repos → médecin ou kiné.</Alert>
            : pain >= 4 ? <Alert tone="warn">{s.adaptedNote}</Alert> : null}
        </Card>
      )}

      {s.coros && pain < 6 && <CorosCard coros={s.coros} />}

      {(id !== "vma" || pain < 6) && s.blocks.map((b, j) => (
        <BlockCard key={id + j + (adapted ? "a" : "")} b={b} done={!!doneBlocks[j]} onToggle={() => toggle(j)} onRun={() => onRunBlock(b, j)} />
      ))}

      <Btn big title="✓ Terminer la séance" style={{ marginTop: 12 }} onPress={() => onFinish(adapted)} />
    </View>
  );
}

/* ================= Bloc chronométré (plein écran) ================= */
export function BlockRunner({ block, onDone, onBack }) {
  const [ex, setEx] = useState(null);
  useEffect(() => { activateKeepAwakeAsync("bloc").catch(() => {}); return () => { try { deactivateKeepAwake("bloc"); } catch (e) {} }; }, []);
  return (
    <View>
      <View style={[S.row, S.between]}>
        <Btn kind="ghost" small title="← Fiche" onPress={onBack} />
        <Text style={[S.small, { fontWeight: "800" }]}>{block.title.toUpperCase()}</Text>
        <View style={{ width: 60 }} />
      </View>
      {block.setup ? <Text style={[S.txt, { color: C.acc2, marginTop: 12 }]}>📍 {block.setup}</Text> : null}
      {block.parts && <PartsTimer parts={block.parts} onDone={onDone} />}
      {block.circuit && (
        <View>
          <CircuitStep step={{ ...block.circuit }} onDone={onDone} onExercise={setEx} />
          {ex && (
            <Card>
              <Text style={S.secT}>Comment faire</Text>
              <Section items={ex.how} ordered />
            </Card>
          )}
        </View>
      )}
    </View>
  );
}

/* ================= Fin de séance ================= */
export function Finish({ id, week, adapted, records, onSave }) {
  const [rpe, setRpe] = useState(7), [pain, setPain] = useState(0), [note, setNote] = useState("");
  const [rec, setRec] = useState({});
  const recKeys = id === "tech" ? ["jD", "jG", "jA", "jT", "buts"] : id === "renfo" ? ["pull"] : [];
  return (
    <View>
      <View style={{ alignItems: "center", marginTop: 20 }}>
        <Text style={{ fontSize: 56 }}>🔥</Text>
        <Text style={[S.h1, { textAlign: "center" }]}>Bien joué</Text>
        <Text style={S.mut}>{buildSession(id, week).title} · semaine {week}</Text>
      </View>
      <Card>
        <Text style={S.secT}>Difficulté</Text>
        <Scale value={rpe} onChange={setRpe} min={1} />
      </Card>
      <Card>
        <Text style={S.secT}>Douleur tibia pendant</Text>
        <Scale value={pain} onChange={setPain} danger />
        {pain > 3 && <Alert tone="warn">Au-dessus de 3/10 : prochaine séance VMA adaptée. Si ça fait encore mal demain matin, repos.</Alert>}
      </Card>
      {recKeys.length > 0 && (
        <Card>
          <Text style={S.secT}>🏆 Tes chiffres du jour (facultatif)</Text>
          {recKeys.map((k) => {
            const r = RECORDS.find((x) => x.key === k);
            return (
              <View key={k} style={[S.row, S.between, { marginVertical: 4 }]}>
                <Text style={[S.txt, { flex: 1 }]}>{r.label}{records[k] ? <Text style={S.small}>  (record {records[k].v})</Text> : null}</Text>
                <TextInput value={rec[k] || ""} onChangeText={(v) => setRec({ ...rec, [k]: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" placeholder="—" placeholderTextColor={C.mut}
                  style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 10, width: 80, fontSize: 18, textAlign: "center", borderWidth: 1, borderColor: C.line }} />
              </View>
            );
          })}
        </Card>
      )}
      <TextInput value={note} onChangeText={setNote} multiline placeholder="Notes" placeholderTextColor={C.mut}
        style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 12, padding: 12, minHeight: 70, fontSize: 16, borderWidth: 1, borderColor: C.line, marginTop: 6 }} />
      <Btn big title="Enregistrer" style={{ marginTop: 12 }}
        onPress={() => onSave({ date: new Date().toISOString(), session: id, week, adapted, rpe, pain, note }, rec)} />
    </View>
  );
}

/* ================= Records ================= */
export function Records({ data, setData }) {
  const r = data.records || {};
  const [edit, setEdit] = useState(null), [val, setVal] = useState("");
  return (
    <View>
      <Text style={S.h1}>Records</Text>
      <Text style={[S.mut, { marginVertical: 6 }]}>Ils se remplissent quand tu termines une séance. Touche un record pour le corriger.</Text>
      {RECORDS.map((x) => (
        <Pressable key={x.key} onPress={() => { setEdit(x.key); setVal(r[x.key]?.v ? String(r[x.key].v) : ""); }}>
          <Card>
            <View style={[S.row, S.between]}>
              <View style={{ flex: 1 }}>
                <Text style={[S.txt, { fontWeight: "800" }]}>{x.label}</Text>
                {r[x.key] ? <Text style={S.small}>{new Date(r[x.key].d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</Text> : <Text style={S.small}>Pas encore de record</Text>}
              </View>
              <Text style={{ color: C.acc, fontSize: 34, fontWeight: "900" }}>{r[x.key]?.v ?? "—"}</Text>
            </View>
            {edit === x.key && (
              <View style={[S.row, { marginTop: 10 }]}>
                <TextInput value={val} onChangeText={(v) => setVal(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" autoFocus
                  style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 10, width: 90, fontSize: 18, textAlign: "center", borderWidth: 1, borderColor: C.line }} />
                <Btn small title="OK" onPress={() => { setData({ ...data, records: { ...r, [x.key]: { v: Number(val) || 0, d: new Date().toISOString() } } }); setEdit(null); }} />
              </View>
            )}
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

/* ================= Historique ================= */
export function History({ data }) {
  const h = [...(data.history || [])].reverse();
  const name = { vma: "⚡ VMA & sprints", renfo: "💪 Renfo", tech: "⚽ Technique" };
  return (
    <View>
      <Text style={S.h1}>Historique</Text>
      <Text style={[S.mut, { marginVertical: 6 }]}>{h.length} séance{h.length > 1 ? "s" : ""}.</Text>
      {h.length === 0 && <Card><Text style={S.mut}>Aucune séance pour l'instant.</Text></Card>}
      {h.map((x, j) => (
        <Card key={j}>
          <View style={[S.row, S.between]}>
            <Text style={S.h3}>{name[x.session] || x.session}</Text>
            <Text style={S.small}>{new Date(x.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</Text>
          </View>
          <View style={[S.row, { marginTop: 8, flexWrap: "wrap" }]}>
            <Tag>S{x.week}</Tag><Tag>Difficulté {x.rpe}/10</Tag>
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
        <Text style={S.secT}>📅 Ta semaine</Text>
        <Section items={["Lundi : match", "Mercredi : VMA & sprints (terrain, montre)", "Jeudi : renfo (maison)", "Samedi : technique (terrain)", "Semaine 7 = récup, semaine 8 = bilan."]} />
      </Card>
      <Card>
        <Text style={S.secT}>🦴 Tibia (périostite)</Text>
        <Section items={[
          "0-3/10 → séance normale.",
          "4-5/10 → VMA adaptée (pas de sprints).",
          "6/10 et plus → pas de course, renfo seulement.",
          "Toujours sur l'herbe ou le synthé.",
          "Point précis sur l'os, douleur au repos ou la nuit → médecin ou kiné.",
        ]} />
      </Card>
      <Card>
        <Text style={S.secT}>⌚ Ta Coros pour la VMA</Text>
        <Text style={S.txt}>La séance VMA se fait avec la montre : elle vibre à chaque sprint et à chaque récup. Le téléphone reste dans le sac. La fiche de la séance te donne les étapes à créer dans l'app COROS.</Text>
      </Card>
      <Card>
        <Text style={S.secT}>🗺 Lire les schémas</Text>
        <Diagram k="legend" />
      </Card>
      <Card>
        <Text style={S.secT}>☁️ Sauvegarde sur ton serveur (optionnel)</Text>
        <Text style={S.mut}>Tout est gardé sur l'iPhone. Si tu installes le serveur Foot Coach, tes séances y sont aussi copiées.</Text>
        <TextInput value={url} onChangeText={setUrl} placeholder="https://foot.wawanono.lol" placeholderTextColor={C.mut} autoCapitalize="none" autoCorrect={false} keyboardType="url"
          style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: C.line, marginTop: 8 }} />
        <TextInput value={pin} onChangeText={setPin} placeholder="Code" placeholderTextColor={C.mut} secureTextEntry keyboardType="number-pad"
          style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: C.line, marginTop: 8, width: 160 }} />
        <Btn title="Enregistrer et synchroniser" style={{ marginTop: 10 }} onPress={() => { setServer({ url, pin }); onSyncNow({ url, pin }); }} />
        <Text style={[S.small, { marginTop: 8 }]}>{syncText}</Text>
      </Card>
    </View>
  );
}
