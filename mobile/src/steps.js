// Les 3 types d'étapes guidées : minuteur, départs à intervalles, circuit de renfo
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput } from "react-native";
import { C, S } from "./theme";
import { beep, say } from "./sound";
import { Btn, Card, Countdown, Elapsed, fmt } from "./ui";

function StartBtn({ title = "▶ Démarrer", onPress }) {
  return <Btn big title={title} onPress={onPress} style={{ marginTop: 12 }} />;
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

/* ---------- Chrono vocal d'un bloc technique : la voix annonce chaque partie ---------- */
export function PartsTimer({ parts, onDone }) {
  const [i, setI] = useState(-1);
  const go = (n) => {
    if (n >= parts.length) { say("Bloc terminé"); setTimeout(onDone, 700); return; }
    say(parts[n].say); setI(n);
  };
  if (i < 0) {
    return (
      <View>
        <Card>
          <Text style={S.secT}>🔊 La voix t'annonce chaque partie</Text>
          {parts.map((p, j) => (
            <View key={j} style={{ flexDirection: "row", marginVertical: 4 }}>
              <Text style={[S.txt, { width: 52, color: C.acc, fontWeight: "800" }]}>{fmt(p.t)}</Text>
              <Text style={[S.txt, { flex: 1 }]}>{p.say}</Text>
            </View>
          ))}
          <Text style={[S.small, { marginTop: 6 }]}>Pose le téléphone, volume à fond : tu n'as pas besoin de le regarder.</Text>
        </Card>
        <StartBtn onPress={() => go(0)} />
      </View>
    );
  }
  const p = parts[i];
  return (
    <View>
      <Text style={[S.small, { textAlign: "center" }]}>Partie {i + 1}/{parts.length}</Text>
      <Text style={[S.h2, { textAlign: "center", marginTop: 6 }]}>{p.say}</Text>
      <Countdown key={i} seconds={p.t} label="Temps restant" onEnd={() => go(i + 1)} />
      {parts[i + 1] && <Text style={[S.mut, { textAlign: "center" }]}>Ensuite : {parts[i + 1].say}</Text>}
    </View>
  );
}
