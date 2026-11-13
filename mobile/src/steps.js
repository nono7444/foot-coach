// Les 3 types d'étapes guidées : minuteur, départs à intervalles, circuit de renfo
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput } from "react-native";
import { C, S } from "./theme";
import { beep, say } from "./sound";
import { Btn, Card, Countdown, Elapsed, fmt, useNow } from "./ui";
import { departures } from "./program";

function StartBtn({ title = "▶ Démarrer", onPress }) {
  return <Btn big title={title} onPress={onPress} style={{ marginTop: 12 }} />;
}

/* ---------- Minuteur simple (échauffement, parcours) ---------- */
export function TimerStep({ step, onDone }) {
  const [go, setGo] = useState(false);
  if (!go) return <StartBtn title={"▶ Démarrer · " + fmt(step.dur)} onPress={() => { setGo(true); say(step.title); }} />;
  return <Countdown seconds={step.dur} label={step.block} onEnd={() => { say("Terminé"); setTimeout(onDone, 700); }} />;
}

/* ---------- Départs à intervalles (sprints, navettes) ---------- */
export function IntervalStep({ step, onDone, onTestTimes }) {
  const phases = useMemo(() => {
    const ph = [{ kind: "prep", dur: 10 }];
    for (let s = 1; s <= step.series; s++) {
      for (let r = 1; r <= step.reps; r++) ph.push({ kind: "rep", dur: step.every, s, r });
      if (s < step.series) ph.push({ kind: "rest", dur: step.seriesRest, s });
    }
    return ph;
  }, [step]);
  const [i, setI] = useState(-1);
  const [phaseStart, setPhaseStart] = useState(0);
  const [times, setTimes] = useState(null);
  const now = useNow(80);

  const next = () => {
    const n = i + 1;
    if (n >= phases.length) {
      if (step.test) { say("Test terminé. Entre tes temps."); setTimes(Array(step.reps).fill("")); return; }
      say("Bloc terminé"); setTimeout(onDone, 800); return;
    }
    const p = phases[n];
    if (p.kind === "rep" && p.r === 1) say(step.series > 1 ? "Série " + p.s + ", go !" : "Go !");
    if (p.kind === "rest") say("Récupération, " + Math.round(p.dur / 60) + " minutes. Marche.");
    setPhaseStart(Date.now()); setI(n);
  };

  if (times) {
    return (
      <Card>
        <Text style={S.h3}>Tes {step.reps} temps (en secondes)</Text>
        <Text style={[S.small, { marginTop: 4 }]}>Ceux que tu as lus à l'écran en passant la ligne. Laisse vide si tu ne l'as pas vu.</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {times.map((v, j) => (
            <View key={j} style={{ width: "30%" }}>
              <Text style={S.small}>N°{j + 1}</Text>
              <TextInput value={v} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={C.mut}
                onChangeText={(t) => { const n = [...times]; n[j] = t.replace(",", "."); setTimes(n); }}
                style={{ backgroundColor: C.card2, color: C.txt, borderRadius: 10, padding: 10, fontSize: 18, borderWidth: 1, borderColor: C.line }} />
            </View>
          ))}
        </View>
        <Btn big title="Enregistrer et continuer" style={{ marginTop: 12 }} onPress={() => { onTestTimes && onTestTimes(times); onDone(); }} />
      </Card>
    );
  }

  if (i < 0) {
    return (
      <View>
        <Card>
          <Text style={S.secT}>⏱ Heures de départ</Text>
          {Array.from({ length: step.series }).map((_, s) => (
            <View key={s} style={{ marginTop: 4 }}>
              {step.series > 1 && <Text style={S.small}>Série {s + 1}{s > 0 ? ` (après ${fmt(step.seriesRest)} min de récup)` : ""}</Text>}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {departures(step.every, step.reps).map((d, j) => (
                  <Text key={j} style={{ backgroundColor: C.card2, color: C.txt, fontWeight: "800", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, overflow: "hidden", fontVariant: ["tabular-nums"] }}>{d}</Text>
                ))}
              </View>
            </View>
          ))}
          <Text style={[S.small, { marginTop: 8 }]}>Pas besoin de regarder l'heure : 3 bips courts puis 1 bip long = DÉPART, et la voix t'annonce. Téléphone posé au départ, écran vers toi.</Text>
        </Card>
        <StartBtn onPress={() => { say("Prépare-toi. Départ dans 10 secondes."); setPhaseStart(Date.now()); setI(0); }} />
      </View>
    );
  }

  const p = phases[i];
  const color = p.kind === "rep" ? C.acc : p.kind === "rest" ? C.acc2 : C.warn;
  const label = p.kind === "prep" ? "Prépare-toi" : p.kind === "rest" ? "Récup entre séries" : "Prochain départ";
  const sub = p.kind === "rep" ? `${step.test ? "Navette" : "Sprint"} ${p.r}/${step.reps}${step.series > 1 ? ` · série ${p.s}/${step.series}` : ""}` : p.kind === "rest" ? `Série ${p.s + 1} ensuite` : "Départ au bip long";
  return (
    <View>
      {p.kind === "rep" && step.test && (
        <View style={{ alignItems: "center", marginTop: 6 }}>
          <Text style={S.small}>TEMPS DEPUIS LE DÉPART</Text>
          <Text style={{ color: C.acc, fontSize: 96, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{((now - phaseStart) / 1000).toFixed(1)}<Text style={{ fontSize: 32, color: C.mut }}> s</Text></Text>
        </View>
      )}
      {p.kind === "rep" && !step.test && <Text style={{ color: C.acc, fontSize: 44, fontWeight: "900", textAlign: "center" }}>SPRINT {p.r}</Text>}
      <Text style={[S.mut, { textAlign: "center", marginTop: 4 }]}>{sub}</Text>
      <Countdown key={i} seconds={p.dur} label={label} color={color} onEnd={next} />
    </View>
  );
}

/* ---------- Circuit de renfo : séries + récup chronométrées ---------- */
export function CircuitStep({ step, onDone, onExercise }) {
  const phases = useMemo(() => {
    const ph = [];
    for (let r = 1; r <= step.rounds; r++) {
      step.exercises.forEach((ex, i) => {
        if (ex.timed && ex.sides) {
          ph.push({ kind: "timed", ex, i, r, side: "Côté droit", dur: ex.timed });
          ph.push({ kind: "switch", ex, i, r, dur: 5 });
          ph.push({ kind: "timed", ex, i, r, side: "Côté gauche", dur: ex.timed });
        } else if (ex.timed) ph.push({ kind: "timed", ex, i, r, dur: ex.timed });
        else ph.push({ kind: "work", ex, i, r });
        const last = r === step.rounds && i === step.exercises.length - 1;
        if (!last) {
          const endRound = i === step.exercises.length - 1;
          const nextEx = step.exercises[(i + 1) % step.exercises.length];
          ph.push({ kind: "rest", dur: endRound ? step.restRound || step.restEach : step.restEach, nextEx, nextR: endRound ? r + 1 : r });
        }
      });
    }
    return ph;
  }, [step]);
  const [i, setI] = useState(-1);
  const cur = phases[Math.max(0, i)];
  useEffect(() => { onExercise && onExercise(i < 0 ? null : cur.kind === "rest" ? cur.nextEx : cur.ex); }, [i]);

  const go = (n) => {
    if (n >= phases.length) { say("Bloc terminé, bravo"); setTimeout(onDone, 700); return; }
    const p = phases[n];
    if (p.kind === "work" || (p.kind === "timed" && !p.side)) say(p.ex.name + ". " + p.ex.reps);
    if (p.kind === "timed" && p.side) say(p.side);
    if (p.kind === "switch") say("Change de côté");
    if (p.kind === "rest") say("Récup");
    setI(n);
  };

  if (i < 0) {
    return (
      <View>
        <Card>
          <Text style={S.secT}>📋 Le circuit</Text>
          {step.exercises.map((e, j) => (
            <View key={j} style={{ flexDirection: "row", marginVertical: 5 }}>
              <Text style={[S.txt, { width: 24, color: C.acc, fontWeight: "800" }]}>{j + 1}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={[S.txt, { fontWeight: "800" }]}>{e.name}</Text>
                <Text style={S.mut}>{e.reps}</Text>
              </View>
            </View>
          ))}
          <Text style={[S.small, { marginTop: 6 }]}>
            {step.rounds} tour{step.rounds > 1 ? "s" : ""}. Récup {step.restEach} s entre chaque exercice{step.restRound && step.restRound !== step.restEach ? `, ${step.restRound} s entre les tours` : ""}. L'appli chronomètre tout.
          </Text>
        </Card>
        {step.intro ? <Text style={[S.mut, { marginVertical: 6 }]}>{step.intro}</Text> : null}
        <StartBtn onPress={() => go(0)} />
      </View>
    );
  }

  const p = cur;
  const total = step.exercises.length * step.rounds;
  const doneCount = phases.slice(0, i).filter((x) => x.kind === "work" || (x.kind === "timed" && x.side !== "Côté droit")).length;
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 8, flexWrap: "wrap" }}>
        {Array.from({ length: total }).map((_, j) => (
          <View key={j} style={{ width: 28, height: 8, borderRadius: 5, backgroundColor: j < doneCount ? C.acc : j === doneCount ? C.acc2 : C.card2 }} />
        ))}
      </View>
      <Text style={[S.small, { textAlign: "center" }]}>Tour {p.kind === "rest" ? p.nextR : p.r}/{step.rounds}</Text>

      {p.kind === "work" && (
        <View>
          <Text style={[S.h2, { textAlign: "center", marginTop: 6 }]}>{p.ex.name}</Text>
          <Text style={[S.bigNum, { color: C.acc, marginTop: 6 }]}>{p.ex.reps}</Text>
          <Elapsed />
          <Btn big title="✓ Série terminée" onPress={() => { beep(false); go(i + 1); }} style={{ marginTop: 6 }} />
        </View>
      )}
      {p.kind === "timed" && (
        <View>
          <Text style={[S.h2, { textAlign: "center", marginTop: 6 }]}>{p.ex.name}{p.side ? " · " + p.side : ""}</Text>
          <Countdown key={i} seconds={p.dur} label="Tiens !" onEnd={() => go(i + 1)} />
        </View>
      )}
      {p.kind === "switch" && (
        <View>
          <Text style={[S.h2, { textAlign: "center", marginTop: 6 }]}>Change de côté</Text>
          <Countdown key={i} seconds={p.dur} label="Installe-toi" color={C.warn} controls={false} onEnd={() => go(i + 1)} />
        </View>
      )}
      {p.kind === "rest" && (
        <View>
          <Text style={[S.txt, { textAlign: "center", marginTop: 8 }]}>Ensuite : <Text style={{ fontWeight: "800" }}>{p.nextEx.name}</Text> · {p.nextEx.reps}</Text>
          <Countdown key={i} seconds={p.dur} label="Récupération" color={C.acc2} onEnd={() => go(i + 1)} />
        </View>
      )}
    </View>
  );
}
