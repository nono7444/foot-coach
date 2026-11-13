import React, { useState, useEffect, useRef, useMemo } from "react";
import { loadLocal, saveLocal, pullServer, pushServer, setPin } from "./sync.js";
import { WEEK_LABEL, isTestWeek, params, MATERIEL, MISE_EN_PLACE, buildSession, sessionMinutes, stepSeconds, blocksOf, departures } from "./legacy/program.js";
import { DIAGRAMS } from "./legacy/diagrams.js";

/* ============ audio / voix / écran allumé ============ */
const audio = {
  ctx: null, voice: true,
  unlock() { try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === "suspended") this.ctx.resume(); } catch (e) {} },
  beep(freq = 660, dur = 0.15, vol = 0.35) {
    try {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "square"; o.frequency.value = freq; o.connect(g); g.connect(this.ctx.destination);
      const t = this.ctx.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
    try { navigator.vibrate && navigator.vibrate(dur > 0.3 ? 400 : 60); } catch (e) {}
  },
  say(txt) {
    if (!this.voice) return;
    try { const s = window.speechSynthesis; s.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = "fr-FR"; u.rate = 1.05; s.speak(u); } catch (e) {}
  },
};
let wakeLock = null;
async function keepAwake(on) { try { if (on && navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen"); else if (!on && wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} }

const fmt = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60), r = s % 60; return m > 0 ? m + ":" + String(r).padStart(2, "0") : String(r); };
const fmtMin = (sec) => Math.max(1, Math.round(sec / 60)) + " min";

function doseOf(st) {
  if (st.kind === "timer") return fmtMin(st.dur);
  if (st.kind === "interval") return `${st.series > 1 ? st.series + " × " : ""}${st.reps} · départ toutes les ${st.every} s`;
  if (st.kind === "circuit") return `${st.rounds} tour${st.rounds > 1 ? "s" : ""} · ${st.exercises.length} exercice${st.exercises.length > 1 ? "s" : ""}`;
  return "";
}

/* ============ petits composants ============ */
function Diagram({ k }) {
  if (!k || !DIAGRAMS[k]) return null;
  return <div className="diagram" dangerouslySetInnerHTML={{ __html: DIAGRAMS[k] }} />;
}

function Section({ icon, title, items, ordered, tone }) {
  if (!items || !items.length) return null;
  const L = ordered ? "ol" : "ul";
  return (
    <div className={"sec " + (tone || "")}>
      <div className="sec-t">{icon} {title}</div>
      <L>{items.map((x, i) => <li key={i}>{x}</li>)}</L>
    </div>
  );
}

function Ring({ frac, color, children }) {
  const R = 100, C = 2 * Math.PI * R;
  return (
    <div className="ringwrap">
      <svg width="224" height="224" viewBox="0 0 224 224">
        <circle cx="112" cy="112" r={R} stroke="#1e2126" strokeWidth="13" fill="none" />
        <circle cx="112" cy="112" r={R} stroke={color} strokeWidth="13" fill="none" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, Math.min(1, frac)))} transform="rotate(-90 112 112)" style={{ transition: "stroke-dashoffset .2s linear" }} />
      </svg>
      <div className="center">{children}</div>
    </div>
  );
}

function useNow(ms = 150) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

/* Compte à rebours générique */
function Countdown({ seconds, onEnd, label, color = "var(--acc)", sub, big, controls = true }) {
  const [paused, setPaused] = useState(false);
  const endAt = useRef(Date.now() + seconds * 1000), left = useRef(seconds * 1000), beeped = useRef({}), ended = useRef(false);
  const now = useNow();
  const remMs = paused ? left.current : Math.max(0, endAt.current - now);
  const remS = Math.ceil(remMs / 1000);
  useEffect(() => {
    if (paused || ended.current) return;
    if (remMs <= 0) { ended.current = true; audio.beep(990, 0.45); onEnd && onEnd(); return; }
    if (seconds >= 40 && remS === 10 && !beeped.current.ten) { beeped.current.ten = 1; audio.say("Dix secondes"); }
    if (remS <= 3 && remS >= 1 && !beeped.current[remS]) { beeped.current[remS] = 1; audio.beep(620, 0.12); }
  }, [now]);
  const toggle = () => { if (!paused) { left.current = remMs; setPaused(true); } else { endAt.current = Date.now() + left.current; setPaused(false); } };
  return (
    <div>
      <Ring frac={remMs / (seconds * 1000)} color={color}>
        {big && <div className="ring-big">{big}</div>}
        <div className="t">{fmt(remMs / 1000)}</div>
        <div className="l">{paused ? "En pause" : label}</div>
        {sub && <div className="small mut" style={{ marginTop: 4 }}>{sub}</div>}
      </Ring>
      {controls && (
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn ghost" onClick={toggle}>{paused ? "▶ Reprendre" : "⏸ Pause"}</button>
          <button className="btn ghost" onClick={() => { ended.current = true; onEnd && onEnd(); }}>⏭ Passer</button>
        </div>
      )}
    </div>
  );
}

/* Chrono qui monte (pendant une série de renfo) */
function Elapsed({ label = "Temps de la série" }) {
  const t0 = useRef(Date.now()); const now = useNow(250);
  return <div className="elapsed"><span className="mut small">{label}</span><b>{fmt((now - t0.current) / 1000)}</b></div>;
}

function StartBtn({ label = "▶ Démarrer", onStart }) {
  return <button className="btn acc full big-btn" onClick={() => { audio.unlock(); onStart(); }}>{label}</button>;
}

/* ============ Étape : minuteur simple ============ */
function TimerStep({ step, onDone }) {
  const [go, setGo] = useState(false);
  if (!go) return <StartBtn label={"▶ Démarrer · " + fmt(step.dur)} onStart={() => { setGo(true); audio.say(step.title); }} />;
  return <Countdown seconds={step.dur} label={step.block} onEnd={() => { audio.say("Terminé"); setTimeout(onDone, 700); }} />;
}

/* ============ Étape : départs à intervalles (sprints, navettes) ============ */
function IntervalStep({ step, onDone, onTestTimes }) {
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
  const now = useNow(60);

  const next = () => {
    const n = i + 1;
    if (n >= phases.length) {
      if (step.test) { audio.say("Test terminé. Note tes temps."); setTimes(Array(step.reps).fill("")); return; }
      audio.say("Bloc terminé"); setTimeout(onDone, 800); return;
    }
    const p = phases[n];
    if (p.kind === "rep" && p.r === 1) audio.say(step.series > 1 ? "Série " + p.s + ", go !" : "Go !");
    if (p.kind === "rest") audio.say("Récupération, " + Math.round(p.dur / 60) + " minutes. Marche.");
    setPhaseStart(Date.now()); setI(n);
  };

  if (times) {
    return (
      <div className="card">
        <h3>Tes {step.reps} temps (en secondes)</h3>
        <p className="mut small">Ceux que tu as lus sur l'écran en passant la ligne. Laisse vide si tu ne l'as pas vu.</p>
        <div className="times">
          {times.map((v, j) => (
            <label key={j}><span>N°{j + 1}</span>
              <input className="f" inputMode="decimal" value={v} onChange={(e) => { const t = [...times]; t[j] = e.target.value.replace(",", "."); setTimes(t); }} />
            </label>
          ))}
        </div>
        <button className="btn acc full" style={{ marginTop: 10 }} onClick={() => { onTestTimes && onTestTimes(times); onDone(); }}>Enregistrer et continuer</button>
      </div>
    );
  }

  if (i < 0) {
    const n = step.reps;
    return (
      <div>
        <div className="card">
          <div className="sec-t">⏱ Heures de départ</div>
          {Array.from({ length: step.series }).map((_, s) => (
            <div key={s} style={{ marginTop: 6 }}>
              {step.series > 1 && <div className="small mut">Série {s + 1}{s > 0 ? ` (après ${fmt(step.seriesRest)} min de récup)` : ""}</div>}
              <div className="deps">{departures(step.every, n).map((d, j) => <span key={j}>{d}</span>)}</div>
            </div>
          ))}
          <p className="small mut" style={{ marginBottom: 0 }}>Tu n'as pas à regarder l'heure : l'appli bipe (3-2-1 puis un bip long = DÉPART) et annonce à la voix. Téléphone posé au départ, écran vers toi.</p>
        </div>
        <StartBtn onStart={() => { audio.say("Prépare-toi. Départ dans 10 secondes."); setPhaseStart(Date.now()); setI(0); }} />
      </div>
    );
  }

  const p = phases[i];
  const color = p.kind === "rep" ? "var(--acc)" : p.kind === "rest" ? "var(--acc2)" : "var(--warn)";
  const label = p.kind === "prep" ? "Prépare-toi" : p.kind === "rest" ? "Récup entre séries" : "Prochain départ";
  const sub = p.kind === "rep" ? `${step.test ? "Navette" : "Sprint"} ${p.r}/${step.reps}${step.series > 1 ? ` · série ${p.s}/${step.series}` : ""}` : p.kind === "rest" ? `Série ${p.s + 1} ensuite` : "";
  const elapsed = (now - phaseStart) / 1000;
  return (
    <div>
      {p.kind === "rep" && step.test && (
        <div className="testclock">
          <div className="small mut">TEMPS DEPUIS LE DÉPART</div>
          <div className="tc">{elapsed.toFixed(1)}<span> s</span></div>
        </div>
      )}
      {p.kind === "rep" && !step.test && <div className="bigrep" style={{ color: "var(--acc)" }}>SPRINT {p.r}</div>}
      <Countdown key={i} seconds={p.dur} label={label} color={color} sub={sub} onEnd={next} />
    </div>
  );
}

/* ============ Étape : circuit de renfo (séries + récup chronométrées) ============ */
function CircuitStep({ step, onDone, onExercise }) {
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
  useEffect(() => { onExercise && onExercise(i < 0 ? null : (cur.kind === "rest" ? cur.nextEx : cur.ex)); }, [i]);

  const go = (n) => {
    if (n >= phases.length) { audio.say("Bloc terminé, bravo"); setTimeout(onDone, 700); return; }
    const p = phases[n];
    if (p.kind === "work" || (p.kind === "timed" && !p.side)) audio.say(p.ex.name + ". " + p.ex.reps);
    if (p.kind === "timed" && p.side) audio.say(p.side);
    if (p.kind === "switch") audio.say("Change de côté");
    if (p.kind === "rest") audio.say("Récup");
    setI(n);
  };

  if (i < 0) {
    return (
      <div>
        <div className="card">
          <div className="sec-t">📋 Le circuit</div>
          <ol className="exlist">
            {step.exercises.map((e, j) => <li key={j}><b>{e.name}</b><span>{e.reps}</span></li>)}
          </ol>
          <p className="small mut" style={{ marginBottom: 0 }}>
            {step.rounds} tour{step.rounds > 1 ? "s" : ""}. Récup {step.restEach} s entre chaque exercice{step.restRound && step.restRound !== step.restEach ? `, ${step.restRound} s entre les tours` : ""}. L'appli chronomètre tout.
          </p>
        </div>
        {step.intro && <p className="mut">{step.intro}</p>}
        <StartBtn onStart={() => go(0)} />
      </div>
    );
  }

  const p = cur;
  const dots = step.exercises.length * step.rounds;
  const doneCount = phases.slice(0, i).filter((x) => x.kind === "work" || (x.kind === "timed" && x.side !== "Côté droit")).length;
  return (
    <div>
      <div className="setdots">{Array.from({ length: dots }).map((_, j) => <span key={j} className={j < doneCount ? "done" : j === doneCount ? "cur" : ""} />)}</div>
      <div className="small mut center-t">Tour {p.kind === "rest" ? p.nextR : p.r}/{step.rounds}</div>
      {p.kind === "work" && (
        <div>
          <div className="exname">{p.ex.name}</div>
          <div className="bigrep">{p.ex.reps}</div>
          <Elapsed />
          <button className="btn acc full big-btn" onClick={() => { audio.unlock(); go(i + 1); }}>✓ Série terminée</button>
        </div>
      )}
      {p.kind === "timed" && (
        <div>
          <div className="exname">{p.ex.name}{p.side ? " · " + p.side : ""}</div>
          <Countdown key={i} seconds={p.dur} label="Tiens !" onEnd={() => go(i + 1)} />
        </div>
      )}
      {p.kind === "switch" && (
        <div><div className="exname">Change de côté</div><Countdown key={i} seconds={p.dur} label="Installe-toi" color="var(--warn)" controls={false} onEnd={() => go(i + 1)} /></div>
      )}
      {p.kind === "rest" && (
        <div>
          <div className="nextup">Ensuite : <b>{p.nextEx.name}</b> · {p.nextEx.reps}</div>
          <Countdown key={i} seconds={p.dur} label="Récupération" color="var(--acc2)" onEnd={() => go(i + 1)} />
        </div>
      )}
    </div>
  );
}

/* ============ Écran : déroulé d'une séance ============ */
function Runner({ session, week, adapted, onExit, onFinish, onTestTimes }) {
  const steps = useMemo(() => buildSession(session, week, adapted), [session, week, adapted]);
  const [i, setI] = useState(0);
  const [quit, setQuit] = useState(false);
  const [curEx, setCurEx] = useState(null);
  const startedAt = useRef(Date.now());
  useEffect(() => { keepAwake(true); return () => keepAwake(false); }, []);
  useEffect(() => { setCurEx(null); window.scrollTo(0, 0); }, [i]);
  const st = steps[i];
  const next = () => { if (i + 1 >= steps.length) onFinish(Math.round((Date.now() - startedAt.current) / 60000)); else setI(i + 1); };
  const nextUp = steps[i + 1];
  const ex = st.kind === "circuit" ? curEx : null;

  return (
    <div>
      <div className="row between" style={{ marginBottom: 10 }}>
        <button className="btn ghost sm" onClick={() => setQuit(true)}>✕</button>
        <div className="small mut" style={{ fontWeight: 700 }}>SÉANCE {session} · S{week}{adapted ? " · ADAPTÉE" : ""}</div>
        <div className="small mut">{i + 1}/{steps.length}</div>
      </div>
      <div className="progress"><div style={{ width: (i / steps.length) * 100 + "%" }} /></div>

      <div style={{ marginTop: 14 }}>
        <span className="tag acc">{st.block}</span><span className="tag">{doseOf(st)}</span>
        <h2 style={{ marginTop: 8 }}>{st.title}</h2>
      </div>

      {st.setup && <div className="setup"><div className="sec-t">📍 À installer</div><ul>{st.setup.map((x, j) => <li key={j}>{x}</li>)}</ul></div>}
      <Diagram k={st.diagram} />

      <div key={i} style={{ marginTop: 8 }}>
        {st.kind === "timer" && <TimerStep step={st} onDone={next} />}
        {st.kind === "interval" && <IntervalStep step={st} onDone={next} onTestTimes={onTestTimes} />}
        {st.kind === "circuit" && <CircuitStep step={st} onDone={next} onExercise={setCurEx} />}
      </div>

      {ex ? (
        <div className="card">
          <div className="exname" style={{ textAlign: "left", fontSize: 22 }}>{ex.name}</div>
          <Section icon="👟" title="Comment faire" items={ex.how} ordered />
          <Section icon="💡" title="À savoir" items={ex.tips} />
          <Section icon="⚠️" title="Erreurs à éviter" items={ex.errors} tone="bad" />
        </div>
      ) : st.kind === "circuit" ? (
        <div className="card">
          {st.exercises.map((e, j) => (
            <details key={j} className="exdet" open={j === 0}>
              <summary><b>{e.name}</b> <span className="mut">· {e.reps}</span></summary>
              <Section icon="👟" title="Comment faire" items={e.how} ordered />
              <Section icon="💡" title="À savoir" items={e.tips} />
              <Section icon="⚠️" title="Erreurs à éviter" items={e.errors} tone="bad" />
            </details>
          ))}
        </div>
      ) : (
        <div className="card">
          <Section icon="👟" title="Comment faire" items={st.how} ordered />
          <Section icon="💡" title="À savoir" items={st.tips} />
          <Section icon="⚠️" title="Erreurs à éviter" items={st.errors} tone="bad" />
        </div>
      )}

      <div className="row between" style={{ marginTop: 14 }}>
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>◀ Précédent</button>
        <button className="btn ghost" onClick={next}>Suivant ▶</button>
      </div>
      {nextUp && <div className="card"><div className="small mut">À SUIVRE</div><div style={{ fontWeight: 700, marginTop: 4 }}>{nextUp.title}</div><div className="small mut">{doseOf(nextUp)}</div></div>}

      {quit && (
        <div className="overlay" onClick={() => setQuit(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Arrêter la séance ?</h3>
            <p className="mut">Elle ne sera pas enregistrée.</p>
            <div className="grid2">
              <button className="btn ghost" onClick={() => setQuit(false)}>Continuer</button>
              <button className="btn" style={{ background: "var(--bad)" }} onClick={onExit}>Arrêter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Écran : présentation de la séance (matériel, installation, tibia) ============ */
function Overview({ session, week, onBack, onGo }) {
  const steps = useMemo(() => buildSession(session, week, false), [session, week]);
  const [got, setGot] = useState({});
  const [pain, setPain] = useState(0);
  const lvl = pain >= 6 ? "bad" : pain >= 4 ? "warn" : "ok";
  const mise = MISE_EN_PLACE[session];
  const title = session === "A" ? "Vitesse & sprints répétés" : "Technique & appuis";
  const blocks = blocksOf(steps);
  return (
    <div>
      <button className="btn ghost sm" onClick={onBack}>← Retour</button>
      <div style={{ marginTop: 14 }}>
        <span className="tag acc">SÉANCE {session} · S{week}</span><span className="tag">≈ {sessionMinutes(steps)} min</span>
        <h1 style={{ marginTop: 8 }}>{title}</h1>
      </div>

      <div className="card">
        <div className="sec-t">🗓 Déroulé</div>
        {blocks.map((b, j) => <div key={j} className="row between line"><span>{b.block}</span><span className="mut">{fmtMin(b.sec)}</span></div>)}
      </div>

      <div className="card">
        <div className="sec-t">🎒 Matériel à prendre</div>
        {MATERIEL[session].map((m, j) => (
          <div key={j} className={"check" + (got[j] ? " on" : "")} onClick={() => setGot({ ...got, [j]: !got[j] })}>
            <span className="cb">{got[j] ? "✓" : ""}</span>{m}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="sec-t">📍 Mise en place sur le terrain</div>
        <Diagram k={mise.diagram} />
        <ol>{mise.lines.map((l, j) => <li key={j}>{l}</li>)}</ol>
      </div>

      <div className="card">
        <div className="sec-t">🦴 Check tibia</div>
        <p className="mut small" style={{ marginTop: 0 }}>Douleur au tibia ce matin (ou le lendemain de ta dernière séance / du match) ?</p>
        <div className="row between"><span className="mut">Douleur</span><span className="big" style={{ fontSize: 36, color: pain >= 6 ? "var(--bad)" : pain >= 4 ? "var(--warn)" : "var(--acc)" }}>{pain}/10</span></div>
        <input type="range" min="0" max="10" value={pain} onChange={(e) => setPain(+e.target.value)} />
        {lvl === "ok" && <div className="alert ok">Feu vert : séance normale. Pendant l'effort, 3/10 maximum.</div>}
        {lvl === "warn" && <div className="alert warn">Séance adaptée : {session === "A" ? "pas de sauts, moitié moins de sprints" : "parcours à vitesse réduite, moins de sprints"}. Le renfo reste.</div>}
        {lvl === "bad" && <div className="alert bad">Pas de course aujourd'hui. Fais seulement le renfo à la maison. Si la douleur est sur un point précis de l'os ou au repos : médecin ou kiné (risque de fracture de fatigue).</div>}
      </div>

      <button className="btn acc full big-btn" disabled={lvl === "bad"} onClick={() => { audio.unlock(); audio.say("C'est parti. Séance " + session); onGo(lvl === "warn", pain); }}>
        ▶ Commencer la séance {session}{lvl === "warn" ? " (adaptée)" : ""}
      </button>
    </div>
  );
}

function Finish({ session, week, minutes, adapted, painBefore, onSave }) {
  const [rpe, setRpe] = useState(7), [pain, setPain] = useState(0), [note, setNote] = useState("");
  return (
    <div>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <div style={{ fontSize: 56 }}>🔥</div>
        <h1>Séance {session} terminée</h1>
        <p className="mut">Semaine {week} · {minutes} min{adapted ? " · version adaptée" : ""}</p>
      </div>
      <div className="card">
        <div className="row between"><span>Difficulté ressentie</span><span className="big" style={{ fontSize: 30 }}>{rpe}/10</span></div>
        <input type="range" min="1" max="10" value={rpe} onChange={(e) => setRpe(+e.target.value)} />
      </div>
      <div className="card">
        <div className="row between"><span>Douleur tibia pendant</span><span className="big" style={{ fontSize: 30, color: pain > 3 ? "var(--warn)" : "var(--acc)" }}>{pain}/10</span></div>
        <input type="range" min="0" max="10" value={pain} onChange={(e) => setPain(+e.target.value)} />
        {pain > 3 && <div className="alert warn">Au-dessus de 3/10 : la prochaine séance sera automatiquement adaptée. Si ça fait encore mal demain matin, repos.</div>}
      </div>
      <textarea className="f" rows="3" placeholder="Notes (sensations, buts marqués, tractions…)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn acc full big-btn" onClick={() => onSave({ date: new Date().toISOString(), session, week, minutes, adapted, rpe, pain, painBefore, note })}>Enregistrer</button>
    </div>
  );
}

/* ============ Onglets ============ */
function Home({ data, setData, onPick }) {
  const week = data.week || 1, p = params(week);
  const hist = data.history || [];
  const done = (s) => hist.some((h) => h.week === week && h.session === s);
  const minsA = sessionMinutes(buildSession("A", week)), minsB = sessionMinutes(buildSession("B", week));
  return (
    <div>
      <div className="row between">
        <div><div className="small mut" style={{ fontWeight: 700, letterSpacing: 1 }}>WAWA FOOT COACH</div><h1>Semaine {week}</h1></div>
        <span className={"tag " + (week === 7 ? "warn" : "acc")}>{WEEK_LABEL[week]}</span>
      </div>
      <div className="chips">{[1, 2, 3, 4, 5, 6, 7, 8].map((w) => <div key={w} className={"chip" + (w === week ? " on" : "")} onClick={() => setData({ ...data, week: w })}>S{w}</div>)}</div>
      {done("A") && done("B") && week < 8 && (
        <div className="alert ok row between"><span>Semaine {week} bouclée 💪</span><button className="btn acc sm" onClick={() => setData({ ...data, week: week + 1 })}>Passer en S{week + 1}</button></div>
      )}

      <div className="card sess" onClick={() => onPick("A")}>
        <div className="letter">A</div>
        <div className="row between"><span className="tag">1re séance de la semaine</span>{done("A") && <span className="tag acc">✓ FAITE</span>}</div>
        <h2 style={{ marginTop: 10 }}>Vitesse & sprints répétés</h2>
        <p className="mut small" style={{ margin: "6px 0 4px" }}>≈ {minsA} min · {isTestWeek(week) ? "test des navettes" : `sprints ${p.rsa[0] > 1 ? p.rsa[0] + "×" : ""}${p.rsa[1]}`} · renfo jambes, ischios, mollets</p>
        <p className="small" style={{ margin: "0 0 10px" }}>🎒 3 cônes · kettlebell · sweat</p>
        <button className="btn acc">Voir la séance →</button>
      </div>
      <div className="card sess" onClick={() => onPick("B")}>
        <div className="letter">B</div>
        <div className="row between"><span className="tag">2-3 jours après · 2 jours avant le match</span>{done("B") && <span className="tag acc">✓ FAITE</span>}</div>
        <h2 style={{ marginTop: 10 }}>Technique & appuis</h2>
        <p className="mut small" style={{ margin: "6px 0 4px" }}>≈ {minsB} min · échelle · 4 parcours techniques · renfo prévention</p>
        <p className="small" style={{ margin: "0 0 10px" }}>🎒 échelle · 6-8 cônes · ballon(s) · sac</p>
        <button className="btn acc">Voir la séance →</button>
      </div>

      <div className="card row between">
        <div><div style={{ fontWeight: 700 }}>Coach vocal</div><div className="small mut">Annonces en français + bips</div></div>
        <div className={"toggle" + (data.voice !== false ? " on" : "")} onClick={() => setData({ ...data, voice: data.voice === false })} />
      </div>
    </div>
  );
}

const navStats = (arr) => {
  const v = (arr || []).map(Number).filter((x) => x > 0);
  if (!v.length) return null;
  const best = Math.min(...v), worst = Math.max(...v);
  return { best, worst, gap: worst - best, n: v.length };
};

function TestCard({ title, t, onChange }) {
  const st = navStats(t?.nav);
  const nav = t?.nav || Array(6).fill("");
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="sec-t" style={{ marginTop: 8 }}>Navettes 15 m aller-retour (s)</div>
      <div className="times">
        {nav.map((v, j) => (
          <label key={j}><span>N°{j + 1}</span>
            <input className="f" inputMode="decimal" value={v || ""} onChange={(e) => { const n = [...nav]; n[j] = e.target.value.replace(",", "."); onChange({ ...t, nav: n }); }} />
          </label>
        ))}
      </div>
      {st && <div className="stats"><div><b>{st.best.toFixed(1)}</b><span>meilleur</span></div><div><b>{st.worst.toFixed(1)}</b><span>pire</span></div><div><b>{st.gap.toFixed(1)}</b><span>écart</span></div></div>}
      <div className="sec-t" style={{ marginTop: 10 }}>Tractions max</div>
      <input className="f" inputMode="numeric" value={t?.pull || ""} onChange={(e) => onChange({ ...t, pull: e.target.value })} style={{ maxWidth: 120 }} />
    </div>
  );
}

function Tests({ data, setData }) {
  const t = data.tests || {};
  const set = (k, v) => setData({ ...data, tests: { ...t, [k]: v } });
  const a = navStats(t.s1?.nav), b = navStats(t.s8?.nav);
  return (
    <div>
      <h1>Tests</h1>
      <p className="mut">2 tests seulement, faits pendant la séance A des semaines 1 et 8. L'appli les guide et remplit cette page toute seule.</p>
      <div className="card">
        <div className="sec-t">Comment les lire</div>
        <ul>
          <li><b>Navettes</b> : regarde l'<b>écart</b> entre ton meilleur et ton pire temps. Plus il est petit, mieux tu enchaînes les sprints. Le meilleur temps montre ta vitesse pure.</li>
          <li><b>Tractions</b> : ta 1re série de tractions, au maximum.</li>
        </ul>
      </div>
      <TestCard title="Semaine 1" t={t.s1} onChange={(v) => set("s1", v)} />
      <TestCard title="Semaine 8" t={t.s8} onChange={(v) => set("s8", v)} />
      {a && b && <div className="alert ok">Écart : {a.gap.toFixed(1)} s → {b.gap.toFixed(1)} s · Meilleur : {a.best.toFixed(1)} s → {b.best.toFixed(1)} s</div>}
    </div>
  );
}

function History({ data }) {
  const h = [...(data.history || [])].reverse();
  return (
    <div>
      <h1>Historique</h1>
      <p className="mut">{h.length} séance{h.length > 1 ? "s" : ""}, sauvegardée{h.length > 1 ? "s" : ""} sur ton serveur.</p>
      {h.length === 0 && <div className="card mut">Aucune séance pour l'instant. Lance ta première séance A !</div>}
      {h.map((x, j) => (
        <div className="card" key={j}>
          <div className="row between">
            <h3>Séance {x.session} · S{x.week}</h3>
            <span className="small mut">{new Date(x.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="tag">{x.minutes} min</span><span className="tag">Difficulté {x.rpe}/10</span>
            <span className={"tag " + (x.pain > 3 ? "warn" : "acc")}>Tibia {x.pain}/10</span>{x.adapted && <span className="tag warn">adaptée</span>}
          </div>
          {x.note && <p className="small mut" style={{ marginBottom: 0 }}>{x.note}</p>}
        </div>
      ))}
    </div>
  );
}

function Guide() {
  return (
    <div>
      <h1>Guide</h1>
      <div className="card">
        <div className="sec-t">📏 Mesurer sans mètre</div>
        <p>1 grand pas d'adulte ≈ 1 m. Pour 25 m : 25 grands pas. L'important est de garder les mêmes repères chaque semaine. La surface de réparation fait 16,5 m de profondeur.</p>
      </div>
      <div className="card">
        <div className="sec-t">⏱ Les bips</div>
        <ul>
          <li>3 bips courts = « 3, 2, 1 ».</li>
          <li>1 bip long = DÉPART (ou fin du chrono).</li>
          <li>Pose le téléphone au cône de départ, écran vers toi, son à fond. L'écran reste allumé pendant la séance.</li>
        </ul>
      </div>
      <div className="card">
        <div className="sec-t">🦴 Règle du tibia (périostite)</div>
        <ul>
          <li>Ce matin 0-3/10 → séance normale.</li>
          <li>4-5/10 → séance adaptée automatiquement (pas de sauts, moins de sprints).</li>
          <li>6/10 et plus → pas de course, renfo seulement.</li>
          <li>Pendant l'effort : jamais plus de 3/10.</li>
          <li>Sauts et sprints sur herbe ou synthé, jamais sur bitume.</li>
          <li>Douleur sur un point précis de l'os, au repos ou la nuit → médecin ou kiné.</li>
        </ul>
      </div>
      <div className="card">
        <div className="sec-t">🗺 Lire les schémas</div>
        <Diagram k="legend" />
      </div>
      <div className="card">
        <div className="sec-t">📅 Ta semaine</div>
        <ul>
          <li>Lundi : match.</li>
          <li>Séance A : mercredi (ou 2 jours après le match).</li>
          <li>Séance B : samedi au plus tard (2 jours avant le match).</li>
          <li>Semaine 7 = décharge (moins de séries), semaine 8 = re-test.</li>
        </ul>
      </div>
    </div>
  );
}

function PinScreen({ onOk, error }) {
  const [v, setV] = useState("");
  return (
    <div style={{ marginTop: 60 }}>
      <h1>Foot Coach</h1>
      <p className="mut">Entre ton code d'accès.</p>
      <input className="f" inputMode="numeric" type="password" value={v} onChange={(e) => setV(e.target.value)} placeholder="Code" />
      {error && <div className="alert bad">Code incorrect.</div>}
      <button className="btn acc full" style={{ marginTop: 12 }} onClick={() => onOk(v)}>Entrer</button>
    </div>
  );
}

const EMPTY = { week: 1, history: [], tests: {}, voice: true, updatedAt: 0 };

export default function App() {
  const [data, setDataRaw] = useState(() => ({ ...EMPTY, ...loadLocal() }));
  const [sync, setSync] = useState("…");
  const [needPin, setNeedPin] = useState(false), [pinErr, setPinErr] = useState(false);
  const pushTimer = useRef(null);
  const dataRef = useRef(data); dataRef.current = data;

  const push = (d) => {
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      const r = await pushServer(d);
      setSync(r.ok ? "✓ Sauvegardé sur le serveur" : r.pin ? "Code requis" : "Hors ligne · gardé sur le téléphone");
      if (r.pin) setNeedPin(true);
    }, 600);
  };
  const setData = (d) => { const nd = { ...d, updatedAt: Date.now() }; setDataRaw(nd); saveLocal(nd); push(nd); };

  const pull = async () => {
    const r = await pullServer();
    if (r.pin) { setNeedPin(true); return false; }
    if (!r.ok) { setSync("Hors ligne · gardé sur le téléphone"); return true; }
    const local = loadLocal() || {};
    if ((r.data.updatedAt || 0) > (local.updatedAt || 0)) { const d = { ...EMPTY, ...r.data }; setDataRaw(d); saveLocal(d); setSync("✓ Synchronisé"); }
    else if ((local.updatedAt || 0) > (r.data.updatedAt || 0)) push({ ...EMPTY, ...local });
    else setSync("✓ Synchronisé");
    return true;
  };
  useEffect(() => { pull(); }, []);
  useEffect(() => { audio.voice = data.voice !== false; }, [data.voice]);

  const [tab, setTab] = useState("home");
  const [flow, setFlow] = useState(null);
  const lastPain = (data.history || []).slice(-1)[0]?.pain || 0;
  useEffect(() => { window.scrollTo(0, 0); }, [tab, flow?.stage]);

  const saveTestTimes = (times) => {
    const key = data.week === 8 ? "s8" : "s1";
    const d = dataRef.current; const t = d.tests || {};
    setData({ ...d, tests: { ...t, [key]: { ...(t[key] || {}), nav: times } } });
  };

  if (needPin) return <div className="app"><PinScreen error={pinErr} onOk={async (v) => { setPin(v); setPinErr(false); setNeedPin(false); const ok = await pull(); if (!ok) setPinErr(true); }} /></div>;

  let screen;
  if (flow?.stage === "overview") screen = <Overview session={flow.session} week={data.week} onBack={() => setFlow(null)} onGo={(adapted, pain) => setFlow({ ...flow, stage: "run", adapted: adapted || lastPain > 3, pain })} />;
  else if (flow?.stage === "run") screen = <Runner session={flow.session} week={data.week} adapted={flow.adapted} onTestTimes={saveTestTimes} onExit={() => setFlow(null)} onFinish={(m) => setFlow({ ...flow, stage: "done", minutes: m })} />;
  else if (flow?.stage === "done") screen = <Finish session={flow.session} week={data.week} minutes={flow.minutes} adapted={flow.adapted} painBefore={flow.pain} onSave={(e) => { const d = dataRef.current; setData({ ...d, history: [...(d.history || []), e] }); setFlow(null); setTab("home"); }} />;
  else if (tab === "tests") screen = <Tests data={data} setData={setData} />;
  else if (tab === "hist") screen = <History data={data} />;
  else if (tab === "guide") screen = <Guide />;
  else screen = <Home data={data} setData={setData} onPick={(s) => setFlow({ stage: "overview", session: s })} />;

  return (
    <div className="app">
      {screen}
      {!flow && <div className="sync">{sync}</div>}
      {!flow && (
        <div className="nav">
          <button className={tab === "home" ? "on" : ""} onClick={() => setTab("home")}><span className="ico">⚽</span>Séances</button>
          <button className={tab === "tests" ? "on" : ""} onClick={() => setTab("tests")}><span className="ico">⏱</span>Tests</button>
          <button className={tab === "hist" ? "on" : ""} onClick={() => setTab("hist")}><span className="ico">📈</span>Historique</button>
          <button className={tab === "guide" ? "on" : ""} onClick={() => setTab("guide")}><span className="ico">📖</span>Guide</button>
        </div>
      )}
    </div>
  );
}
