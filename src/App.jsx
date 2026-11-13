import React, { useState, useEffect, useRef, useMemo } from "react";
import { loadLocal, saveLocal, pullServer, pushServer, getPin, setPin } from "./sync.js";


/* ---------- audio / voix / vibration ---------- */
const audio = {
  ctx:null, voice:true,
  unlock(){ try{ if(!this.ctx) this.ctx = new (window.AudioContext||window.webkitAudioContext)(); if(this.ctx.state==="suspended") this.ctx.resume(); }catch(e){} },
  beep(freq=660, dur=0.15, vol=0.35){
    try{ if(!this.ctx) return; const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type="square"; o.frequency.value=freq; g.gain.value=vol; o.connect(g); g.connect(this.ctx.destination);
      const t=this.ctx.currentTime; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur); o.start(t); o.stop(t+dur+0.02);
    }catch(e){}
    try{ navigator.vibrate && navigator.vibrate(dur>0.3?400:60); }catch(e){}
  },
  say(txt){ if(!this.voice) return; try{ const s=window.speechSynthesis; s.cancel(); const u=new SpeechSynthesisUtterance(txt); u.lang="fr-FR"; u.rate=1.05; s.speak(u);}catch(e){} }
};
let wakeLock=null;
async function keepAwake(on){ try{ if(on && navigator.wakeLock){ wakeLock = await navigator.wakeLock.request("screen"); } else if(!on && wakeLock){ wakeLock.release(); wakeLock=null; } }catch(e){} }

/* ---------- programme ---------- */
const WEEK_LABEL = {1:"Test",2:"Installer",3:"Installer",4:"Charger",5:"Charger",6:"Charger",7:"Décharge",8:"Re-test"};
function params(w){
  return {
    plyo: w<=3?3 : w<=6?4 : w===7?2 : 3,
    rsaA: ({1:[1,6],2:[1,6],3:[2,6],4:[2,6],5:[2,7],6:[3,6],7:[1,6],8:[1,6]})[w],
    rsaB: ({1:[1,5],2:[1,5],3:[2,5],4:[2,5],5:[2,5],6:[2,5],7:[1,5],8:[2,5]})[w],
    nordic: ({1:[2,4],2:[2,4],3:[3,4],4:[3,4],5:[3,5],6:[3,5],7:[2,4],8:[3,6]})[w],
    cop: ({1:[2,5,"court (genou)"],2:[2,5,"court (genou)"],3:[3,6,"court (genou)"],4:[3,6,"court (genou)"],5:[3,5,"long (cheville)"],6:[3,6,"long (cheville)"],7:[2,5,"long (cheville)"],8:[3,6,"long (cheville)"]})[w],
    sets: w===7?2:3,
  };
}

const WARMUP = [
  {type:"timer", block:"Échauffement", title:"Footing + gammes légères", dur:180, bullets:["Footing léger","Pas chassés, montées de genoux, talons-fesses"]},
  {type:"timer", block:"Échauffement", title:"Mobilité hanches", dur:120, bullets:["Ouverture / fermeture de hanche en marchant","Fentes avant avec rotation : 8 par côté"]},
  {type:"timer", block:"Échauffement", title:"Activation", dur:120, bullets:["10 squats","10 relevés de mollets","Gainage 20 s face + 20 s par côté"]},
  {type:"timer", block:"Échauffement", title:"Gammes", dur:120, bullets:["2 × 20 m skipping bas","2 × 20 m foulées bondissantes légères"]},
  {type:"interval", block:"Échauffement", title:"Accélérations progressives", desc:"30 m à 60 %, puis 75 %, puis 90 %. Retour en marchant.", series:1, reps:3, every:45, seriesRest:0},
];

function buildSession(id, w, adapted){
  const p = params(w);
  const s = [...WARMUP];
  const isTest = (w===1||w===8);
  if(id==="A"){
    if(isTest) s.push({type:"info", block:"Tests", title:"Tests de la semaine", bullets:["Sprint 20 m : 3 essais, garde le meilleur","5-10-5 : 2 essais par côté","Le bloc sprints répétés de cette séance sert de test RSA : chronomètre-les si tu peux","Note tes temps dans l'onglet Tests"]});
    if(!adapted){
      s.push({type:"sets", block:"Pliométrie", title:"Sauts en longueur pieds joints", reps:"3 sauts", sets:p.plyo, rest:45, cue:"Atterrissage silencieux, sur l'herbe."});
      s.push({type:"sets", block:"Pliométrie", title:"Bonds latéraux type patineur", reps:"3 / côté", sets:p.plyo, rest:45, cue:"Tiens l'atterrissage 1 seconde."});
    }
    s.push({type:"interval", block:"Vitesse", title:"Accélérations 15 m", desc:"À fond. Varie les départs : debout, dos au sens de course, après un pas chassé.", series:1, reps:adapted?4:6, every:75, seriesRest:0});
    let [se,re] = p.rsaA; if(adapted){ re = Math.max(3,Math.ceil(se*re/2)); se=1; }
    s.push({type:"interval", block:"Sprints répétés", title:"RSA – sprints 25 m", desc:"Sprint 25 m à fond, retour en marchant. Départ au bip, toutes les 25 s.", series:se, reps:re, every:25, seriesRest:240});
    s.push({type:"sets", block:"Renfo force", title:"Fente bulgare goblet (KB 12 kg)", reps:"8 / jambe", sets:p.sets, rest:90, cue:"Pied arrière sur la cage ou un banc. Descente en 3 s."});
    s.push({type:"sets", block:"Renfo force", title:"Swing kettlebell", reps:"12", sets:w===7?3:4, rest:60, cue:"Explosif, les hanches claquent."});
    s.push({type:"sets", block:"Renfo force", title:"Nordic ischios", reps:p.nordic[1]+" reps", sets:p.nordic[0], rest:120, cue:"Pieds bloqués sous la barre basse de la cage. Freine la chute le plus longtemps possible."});
    s.push({type:"sets", block:"Renfo force", title:"Mollet 1 jambe genou fléchi (soléaire)", reps:"12 / jambe", sets:p.sets, rest:60, cue:"KB en main. Monte vite, descends en 3 s."});
    s.push({type:"sets", block:"Renfo force", title:"Tractions pronation", reps:"max − 1", sets:p.sets, rest:120, cue:"Menton au-dessus de la barre."});
    s.push({type:"timer", block:"Retour au calme", title:"Marche + étirements légers", dur:180, bullets:["Marche","Mollets, ischios, adducteurs, quadriceps"]});
  } else {
    s.push({type:"timer", block:"Échelle", title:"Échelle de rythme", dur:480, bullets:["1 pied par case","2 pieds par case (rapide)","Latéral 2 pieds par case, deux sens","In-in-out-out (Icky shuffle)","Dernier passage : sortie d'échelle → sprint 10 m","2 passages de chaque, contacts légers sur l'avant-pied"]});
    s.push({type:"sets", block:"Changements de direction", title:"5-10-5", reps:"1 aller-retour", sets:4, rest:90, cue:"3 cônes à 5 m. Centre de gravité bas, pied d'appui à l'extérieur."});
    s.push({type:"sets", block:"Changements de direction", title:"Slalom 5 cônes → sprint 10 m", reps:"1 passage", sets:4, rest:90, cue:"Cônes en zigzag tous les 2 m."});
    s.push({type:"timer", block:"Finition", title:"Conduite + frappe", dur:360, bullets:["Conduite rapide 15 m, crochet autour d'un cône, frappe","8 frappes : 4 pied fort, 4 pied faible","Vise les coins"]});
    let [se,re] = p.rsaB; if(adapted){ re=Math.max(3,Math.ceil(se*re/2)); se=1; }
    s.push({type:"interval", block:"Finition", title:"Sprint + frappe", desc:"Ballon posé à 20 m de la cage. Sprint, frappe en 1-2 touches, retour au départ. Départ toutes les 30 s.", series:se, reps:re, every:30, seriesRest:180});
    s.push({type:"timer", block:"Finition", title:"Jeu de milieu", dur:300, bullets:["Contre un mur ou la cage","Contrôle orienté + passe ou frappe en 2 touches","Alterne les pieds"]});
    s.push({type:"sets", block:"Renfo prévention", title:"Copenhagen – levier "+p.cop[2], reps:p.cop[1]+" / côté", sets:p.cop[0], rest:60, cue:"Pied (ou genou) sur la barre de la cage. Corps gainé, bassin monté."});
    s.push({type:"sets", block:"Renfo prévention", title:"Mollet 1 jambe jambe tendue", reps:"15 / jambe", sets:p.sets, rest:45, cue:"Lent à la descente."});
    s.push({type:"sets", block:"Renfo prévention", title:"Relevés de pointes (tibial)", reps:"20", sets:p.sets, rest:45, cue:"Dos au mur, talons à 30 cm. C'est l'exercice anti-périostite."});
    s.push({type:"sets", block:"Renfo prévention", title:"Planche latérale", reps:"30 s / côté", sets:p.sets, rest:45});
    s.push({type:"sets", block:"Renfo prévention", title:"Tractions supination", reps:"max − 2", sets:p.sets, rest:120});
    s.push({type:"timer", block:"Retour au calme", title:"Marche + étirements", dur:120, bullets:["Marche","Étirements légers"]});
  }
  return s;
}
function estMinutes(steps){
  let t=0; steps.forEach(s=>{
    if(s.type==="timer") t+=s.dur;
    else if(s.type==="interval") t+=s.series*s.reps*s.every + (s.series-1)*s.seriesRest + 10;
    else if(s.type==="sets") t+=s.sets*40 + (s.sets-1)*s.rest + 30;
    else t+=240;
  }); return Math.round(t/60);
}
const fmt = s => { s=Math.max(0,Math.ceil(s)); const m=Math.floor(s/60), r=s%60; return m>0? m+":"+String(r).padStart(2,"0") : String(r); };

/* ---------- composants ---------- */
function Ring({frac, color, children}){
  const R=108, C=2*Math.PI*R;
  return <div className="ringwrap">
    <svg width="240" height="240" viewBox="0 0 240 240">
      <circle cx="120" cy="120" r={R} stroke="#1e2126" strokeWidth="14" fill="none"/>
      <circle cx="120" cy="120" r={R} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C*(1-frac)} transform="rotate(-90 120 120)" style={{transition:"stroke-dashoffset .2s linear"}}/>
    </svg>
    <div className="center">{children}</div>
  </div>;
}

function Countdown({seconds, onEnd, label, color="var(--acc)", sub, endBeep=true}){
  const [paused,setPaused]=useState(false);
  const endAt=useRef(Date.now()+seconds*1000), left=useRef(seconds*1000), beeped=useRef({}), ended=useRef(false);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{ const id=setInterval(()=>setNow(Date.now()),150); return ()=>clearInterval(id); },[]);
  const remMs = paused ? left.current : Math.max(0,endAt.current-now);
  const remS = Math.ceil(remMs/1000);
  useEffect(()=>{
    if(paused||ended.current) return;
    if(remMs<=0){ ended.current=true; if(endBeep) audio.beep(990,0.45); onEnd && onEnd(); return; }
    if(seconds>=40 && remS===10 && !beeped.current.ten){ beeped.current.ten=1; audio.say("Dix secondes"); }
    if(remS<=3 && remS>=1 && !beeped.current[remS]){ beeped.current[remS]=1; audio.beep(620,0.12); }
  },[now]);
  const toggle=()=>{ if(!paused){ left.current=remMs; setPaused(true);} else { endAt.current=Date.now()+left.current; setPaused(false);} };
  return <div>
    <Ring frac={remMs/(seconds*1000)} color={color}>
      <div className="t">{fmt(remMs/1000)}</div>
      <div className="l">{paused?"En pause":label}</div>
      {sub && <div className="small mut" style={{marginTop:6}}>{sub}</div>}
    </Ring>
    <div className="row" style={{justifyContent:"center"}}>
      <button className="btn ghost" onClick={toggle}>{paused?"▶ Reprendre":"⏸ Pause"}</button>
      <button className="btn ghost" onClick={()=>{ ended.current=true; onEnd&&onEnd(); }}>⏭ Passer</button>
    </div>
  </div>;
}

function StartGate({children, label="Démarrer", onStart}){
  return <button className="btn acc full" style={{marginTop:16,fontSize:18,padding:18}} onClick={()=>{audio.unlock(); onStart();}}>{label}</button>;
}

function TimerStep({step, onDone}){
  const [go,setGo]=useState(false);
  if(!go) return <StartGate label={"▶ Démarrer · "+fmt(step.dur)} onStart={()=>{ setGo(true); audio.say(step.title); }}/>;
  return <Countdown seconds={step.dur} label={step.block} onEnd={()=>{ audio.say("Terminé"); setTimeout(onDone,600); }}/>;
}

function IntervalStep({step, onDone}){
  const phases = useMemo(()=>{
    const ph=[{kind:"prep",dur:10}];
    for(let s=1;s<=step.series;s++){
      for(let r=1;r<=step.reps;r++) ph.push({kind:"rep",dur:step.every,s,r});
      if(s<step.series) ph.push({kind:"rest",dur:step.seriesRest,s});
    }
    return ph;
  },[step]);
  const [i,setI]=useState(-1);
  const next=()=>{
    const n=i+1;
    if(n>=phases.length){ audio.say("Bloc terminé, bravo"); setTimeout(onDone,800); return; }
    const p=phases[n];
    if(p.kind==="rep"){ if(p.r===1) audio.say(step.series>1?"Série "+p.s+", go !":"Go !"); }
    if(p.kind==="rest") audio.say("Récupération, "+Math.round(p.dur/60)+" minutes. Marche.");
    setI(n);
  };
  if(i<0) return <div>
    <div className="card" style={{textAlign:"center"}}>
      <div className="bigrep">{step.series>1?step.series+" × ":""}{step.reps}</div>
      <div className="mut">départ toutes les {step.every} s{step.series>1?" · "+fmt(step.seriesRest)+" min de récup entre séries":""}</div>
    </div>
    <div className="small mut" style={{textAlign:"center"}}>Bips à 3-2-1, long bip = DÉPART. Garde le téléphone en poche ou posé près du départ.</div>
    <StartGate label="▶ Démarrer" onStart={()=>{ audio.say("Prépare-toi. Départ dans 10 secondes."); setI(0); }}/>
  </div>;
  const p=phases[i];
  const color = p.kind==="rep"?"var(--acc)":p.kind==="rest"?"var(--acc2)":"var(--warn)";
  const label = p.kind==="prep"?"Prépare-toi":p.kind==="rest"?"Récup série":"Prochain départ";
  const sub = p.kind==="rep" ? `Sprint ${p.r}/${step.reps}`+(step.series>1?` · série ${p.s}/${step.series}`:"") : p.kind==="rest"?`Série ${p.s+1} ensuite`:"";
  return <div>
    {p.kind==="rep" && <div className="bigrep" style={{color:"var(--acc)"}}>SPRINT {p.r}</div>}
    <Countdown key={i} seconds={p.dur} label={label} color={color} sub={sub} onEnd={next}/>
  </div>;
}

function SetsStep({step, onDone}){
  const [k,setK]=useState(1); const [rest,setRest]=useState(false);
  const done=()=>{
    audio.unlock();
    if(k>=step.sets){ audio.say("Exercice terminé"); onDone(); return; }
    setRest(true); audio.say("Récup");
  };
  return <div>
    <div className="setdots">{Array.from({length:step.sets}).map((_,j)=><span key={j} className={j+1<k||(j+1===k&&rest)?"done":j+1===k?"cur":""}/>)}</div>
    {rest
      ? <div>
          <Countdown key={"r"+k} seconds={step.rest} label="Récupération" color="var(--acc2)" sub={`Série ${k+1}/${step.sets} ensuite`} onEnd={()=>{ setRest(false); setK(k+1); audio.say("Série "+(k+1)+". "+step.reps); }}/>
        </div>
      : <div>
          <div className="card" style={{textAlign:"center"}}>
            <div className="mut small" style={{textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Série {k} / {step.sets}</div>
            <div className="bigrep">{step.reps}</div>
          </div>
          <button className="btn acc full" style={{fontSize:18,padding:18}} onClick={done}>✓ Série terminée</button>
        </div>}
  </div>;
}

function InfoStep({onDone}){ return <button className="btn acc full" style={{marginTop:16}} onClick={onDone}>C'est fait →</button>; }

/* ---------- écrans ---------- */
function Runner({session, week, adapted, onExit, onFinish}){
  const steps = useMemo(()=>buildSession(session,week,adapted),[session,week,adapted]);
  const [i,setI]=useState(0); const [quit,setQuit]=useState(false);
  const startedAt=useRef(Date.now());
  useEffect(()=>{ keepAwake(true); return ()=>keepAwake(false); },[]);
  const st=steps[i];
  const next=()=>{ if(i+1>=steps.length) onFinish(Math.round((Date.now()-startedAt.current)/60000)); else setI(i+1); };
  const nextUp = steps[i+1];
  return <div>
    <div className="row between" style={{marginBottom:10}}>
      <button className="btn ghost" style={{padding:"8px 12px"}} onClick={()=>setQuit(true)}>✕</button>
      <div className="small mut" style={{fontWeight:700}}>SÉANCE {session} · S{week}{adapted?" · ADAPTÉE":""}</div>
      <div className="small mut">{i+1}/{steps.length}</div>
    </div>
    <div className="progress"><div style={{width:((i)/steps.length*100)+"%"}}/></div>
    <div style={{marginTop:18}}>
      <span className="tag acc">{st.block}</span>
      <h2 style={{marginTop:8}}>{st.title}</h2>
      {st.desc && <p className="mut" style={{margin:"6px 0 0",lineHeight:1.45}}>{st.desc}</p>}
      {st.cue && <p className="mut" style={{margin:"6px 0 0",lineHeight:1.45}}>💡 {st.cue}</p>}
      {st.bullets && <ul className="b">{st.bullets.map((b,j)=><li key={j}>{b}</li>)}</ul>}
    </div>
    <div key={i}>
      {st.type==="timer" && <TimerStep step={st} onDone={next}/>}
      {st.type==="interval" && <IntervalStep step={st} onDone={next}/>}
      {st.type==="sets" && <SetsStep step={st} onDone={next}/>}
      {st.type==="info" && <InfoStep onDone={next}/>}
    </div>
    <div className="row between" style={{marginTop:20}}>
      <button className="btn ghost" disabled={i===0} onClick={()=>setI(i-1)}>◀ Précédent</button>
      <button className="btn ghost" onClick={next}>Suivant ▶</button>
    </div>
    {nextUp && <div className="card" style={{marginTop:16}}>
      <div className="small mut">À SUIVRE</div>
      <div style={{fontWeight:700,marginTop:4}}>{nextUp.title}</div>
    </div>}
    {quit && <div className="overlay" onClick={()=>setQuit(false)}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <h3>Arrêter la séance ?</h3>
        <p className="mut">Ta progression dans cette séance sera perdue.</p>
        <div className="grid2">
          <button className="btn ghost" onClick={()=>setQuit(false)}>Continuer</button>
          <button className="btn" style={{background:"var(--bad)"}} onClick={onExit}>Arrêter</button>
        </div>
      </div>
    </div>}
  </div>;
}

function PreCheck({session, week, onGo, onBack}){
  const [pain,setPain]=useState(0);
  const lvl = pain>=6?"bad":pain>=4?"warn":"ok";
  return <div>
    <button className="btn ghost" style={{padding:"8px 12px"}} onClick={onBack}>← Retour</button>
    <h1 style={{marginTop:16}}>Check tibia</h1>
    <p className="mut">Douleur au tibia ce matin, ou le lendemain de ta dernière séance / du match ?</p>
    <div className="card">
      <div className="row between"><span className="mut">Douleur</span><span className="big" style={{fontSize:40,color:pain>=6?"var(--bad)":pain>=4?"var(--warn)":"var(--acc)"}}>{pain}/10</span></div>
      <input type="range" min="0" max="10" value={pain} onChange={e=>setPain(+e.target.value)}/>
    </div>
    {lvl==="ok" && <div className="alert ok">Feu vert : séance normale. Pendant l'effort, la douleur doit rester à 3/10 maximum.</div>}
    {lvl==="warn" && <div className="alert warn">Séance adaptée : sans sauts, sprints réduits de moitié. Le renfo mollet/tibial reste, c'est ce qui aide ton tibia.</div>}
    {lvl==="bad" && <div className="alert bad">Douleur trop forte pour courir aujourd'hui. Fais seulement le renfo à la maison, et consulte un médecin ou un kiné si c'est un point précis sur l'os ou si ça fait mal au repos (risque de fracture de fatigue).</div>}
    <button className="btn acc full" style={{marginTop:10,fontSize:18,padding:18}} disabled={lvl==="bad"}
      onClick={()=>{ audio.unlock(); audio.say("C'est parti. Séance "+session); onGo(lvl==="warn", pain); }}>
      Lancer la séance {session}{lvl==="warn"?" (adaptée)":""}
    </button>
  </div>;
}

function Finish({session, week, minutes, adapted, painBefore, onSave}){
  const [rpe,setRpe]=useState(7), [pain,setPain]=useState(0), [note,setNote]=useState("");
  return <div>
    <div style={{textAlign:"center",marginTop:20}}>
      <div style={{fontSize:56}}>🔥</div>
      <h1>Séance {session} terminée</h1>
      <p className="mut">Semaine {week} · {minutes} min{adapted?" · version adaptée":""}</p>
    </div>
    <div className="card">
      <div className="row between"><span>Difficulté ressentie</span><span className="big" style={{fontSize:30}}>{rpe}/10</span></div>
      <input type="range" min="1" max="10" value={rpe} onChange={e=>setRpe(+e.target.value)}/>
    </div>
    <div className="card">
      <div className="row between"><span>Douleur tibia pendant</span><span className="big" style={{fontSize:30,color:pain>3?"var(--warn)":"var(--acc)"}}>{pain}/10</span></div>
      <input type="range" min="0" max="10" value={pain} onChange={e=>setPain(+e.target.value)}/>
      {pain>3 && <div className="alert warn">Au-dessus de 3/10 : prochaine séance sans sauts, sprints réduits. Si ça ne passe pas d'ici demain matin, repos.</div>}
    </div>
    <textarea className="f" rows="3" placeholder="Notes (temps, sensations, frappes…)" value={note} onChange={e=>setNote(e.target.value)}/>
    <button className="btn acc full" style={{marginTop:12,fontSize:18,padding:18}} onClick={()=>onSave({date:new Date().toISOString(),session,week,minutes,adapted,rpe,pain,painBefore,note})}>Enregistrer</button>
  </div>;
}

function Home({data, setData, onPick}){
  const week=data.week||1, p=params(week);
  const hist=data.history||[];
  const doneThisWeek = s => hist.some(h=>h.week===week && h.session===s);
  const minsA=estMinutes(buildSession("A",week,false)), minsB=estMinutes(buildSession("B",week,false));
  const bothDone = doneThisWeek("A") && doneThisWeek("B");
  return <div>
    <div className="row between">
      <div><div className="small mut" style={{fontWeight:700,letterSpacing:1}}>WAWA FOOT COACH</div><h1>Semaine {week}</h1></div>
      <span className={"tag "+(week===7?"warn":"acc")}>{WEEK_LABEL[week]}</span>
    </div>
    <div className="chips">{[1,2,3,4,5,6,7,8].map(w=><div key={w} className={"chip"+(w===week?" on":"")} onClick={()=>setData({...data,week:w})}>S{w}</div>)}</div>
    {bothDone && week<8 && <div className="alert ok row between"><span>Semaine {week} bouclée 💪</span><button className="btn acc" style={{padding:"8px 12px"}} onClick={()=>setData({...data,week:week+1})}>Passer en S{week+1}</button></div>}

    <div className="card sess" onClick={()=>onPick("A")}>
      <div className="letter">A</div>
      <div className="row between"><span className="tag">MERCREDI</span>{doneThisWeek("A") && <span className="tag acc">✓ FAITE</span>}</div>
      <h2 style={{marginTop:10}}>Vitesse & sprints répétés</h2>
      <p className="mut small" style={{margin:"6px 0 10px"}}>~{minsA} min · RSA {p.rsaA[0]}×{p.rsaA[1]} · Nordic {p.nordic[0]}×{p.nordic[1]} · force</p>
      <button className="btn acc">▶ Lancer</button>
    </div>
    <div className="card sess" onClick={()=>onPick("B")}>
      <div className="letter">B</div>
      <div className="row between"><span className="tag">SAMEDI</span>{doneThisWeek("B") && <span className="tag acc">✓ FAITE</span>}</div>
      <h2 style={{marginTop:10}}>Agilité, échelle & finition</h2>
      <p className="mut small" style={{margin:"6px 0 10px"}}>~{minsB} min · sprint + frappe {p.rsaB[0]}×{p.rsaB[1]} · Copenhagen {p.cop[0]}×{p.cop[1]}</p>
      <button className="btn acc">▶ Lancer</button>
    </div>

    <div className="card row between">
      <div><div style={{fontWeight:700}}>Coach vocal</div><div className="small mut">Annonces en français + bips</div></div>
      <div className={"toggle"+(data.voice!==false?" on":"")} onClick={()=>{ const v=data.voice===false; audio.voice=v; setData({...data,voice:v}); }}/>
    </div>
    <div className="card small mut" style={{lineHeight:1.5}}>
      <b style={{color:"var(--txt)"}}>Rappel tibia</b> : sauts et sprints sur herbe ou synthétique, douleur ≤ 3/10 pendant, rien le lendemain matin. Bonus : refais les 3 exos mollet/tibial de la séance B à la maison une 3e fois dans la semaine.
    </div>
  </div>;
}

function Stopwatch(){
  const [run,setRun]=useState(false), [t0,setT0]=useState(0), [acc,setAcc]=useState(0), [now,setNow]=useState(0), [laps,setLaps]=useState([]);
  useEffect(()=>{ if(!run) return; const id=setInterval(()=>setNow(Date.now()),31); return ()=>clearInterval(id); },[run]);
  const ms = run ? acc + (now-t0) : acc;
  const startCount=()=>{ audio.unlock(); let c=3; audio.beep(620,0.12); const id=setInterval(()=>{ c--; if(c>0) audio.beep(620,0.12); else { clearInterval(id); audio.beep(990,0.4); const n=Date.now(); setT0(n); setNow(n); setRun(true);} },1000); };
  return <div className="card">
    <h3>Chrono</h3>
    <div className="stopwatch">{(ms/1000).toFixed(2)}<span className="mut" style={{fontSize:28}}> s</span></div>
    <div className="grid2">
      {!run ? <button className="btn acc" onClick={startCount}>Départ 3-2-1</button>
            : <button className="btn" style={{background:"var(--bad)"}} onClick={()=>{ setAcc(ms); setRun(false); setLaps([(ms/1000).toFixed(2),...laps].slice(0,8)); }}>Stop</button>}
      <button className="btn ghost" onClick={()=>{ setRun(false); setAcc(0); }}>Remise à zéro</button>
    </div>
    {laps.length>0 && <div className="small mut" style={{marginTop:10}}>Derniers : {laps.join(" · ")} s</div>}
  </div>;
}

const TESTS = [["s20","Sprint 20 m (s)"],["agi","5-10-5 (s)"],["rsaB","RSA meilleur (s)"],["rsaM","RSA moyenne (s)"],["pull","Tractions max"]];
function Tests({data,setData}){
  const t=data.tests||{};
  const set=(k,col,v)=>setData({...data,tests:{...t,[k]:{...(t[k]||{}),[col]:v}}});
  return <div>
    <h1>Tests</h1>
    <p className="mut">À faire en semaine 1 et en semaine 8, au début de la séance A.</p>
    <div className="card">
      <table className="t"><thead><tr><th>Test</th><th>S1</th><th>S8</th></tr></thead>
      <tbody>{TESTS.map(([k,l])=><tr key={k}><td>{l}</td>
        <td><input className="f" inputMode="decimal" value={(t[k]||{}).s1||""} onChange={e=>set(k,"s1",e.target.value)}/></td>
        <td><input className="f" inputMode="decimal" value={(t[k]||{}).s8||""} onChange={e=>set(k,"s8",e.target.value)}/></td></tr>)}</tbody></table>
      <p className="small mut">Pour la RSA, l'objectif est que la moyenne se rapproche du meilleur temps.</p>
    </div>
    <Stopwatch/>
    <p className="small mut">Astuce solo : filme-toi au téléphone posé à l'arrivée, puis lis le temps image par image. C'est plus précis que le chrono à la main.</p>
  </div>;
}

function History({data}){
  const h=[...(data.history||[])].reverse();
  return <div>
    <h1>Historique</h1>
    <p className="mut">{h.length} séance{h.length>1?"s":""} enregistrée{h.length>1?"s":""} (sauvegardées sur ton serveur).</p>
    {h.length===0 && <div className="card mut">Aucune séance pour l'instant. Lance ta première séance A !</div>}
    {h.map((x,j)=><div className="card" key={j}>
      <div className="row between">
        <h3>Séance {x.session} · S{x.week}</h3>
        <span className="small mut">{new Date(x.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}</span>
      </div>
      <div style={{marginTop:6}}>
        <span className="tag">{x.minutes} min</span><span className="tag">Difficulté {x.rpe}/10</span>
        <span className={"tag "+(x.pain>3?"warn":"acc")}>Tibia {x.pain}/10</span>{x.adapted && <span className="tag warn">adaptée</span>}
      </div>
      {x.note && <p className="small mut" style={{marginBottom:0}}>{x.note}</p>}
    </div>)}
  </div>;
}

function PinScreen({onOk, error}){
  const [v,setV]=useState("");
  return <div style={{marginTop:60}}>
    <h1>Foot Coach</h1>
    <p className="mut">Entre ton code d'accès.</p>
    <input className="f" inputMode="numeric" type="password" value={v} onChange={e=>setV(e.target.value)} placeholder="Code"/>
    {error && <div className="alert bad">Code incorrect.</div>}
    <button className="btn acc full" style={{marginTop:12}} onClick={()=>onOk(v)}>Entrer</button>
  </div>;
}

const EMPTY = {week:1,history:[],tests:{},voice:true,updatedAt:0};

function App(){
  const [data,setDataRaw]=useState(()=>({...EMPTY,...loadLocal()}));
  const [sync,setSync]=useState("…");          // texte d'état de la sauvegarde
  const [needPin,setNeedPin]=useState(false), [pinErr,setPinErr]=useState(false);
  const pushTimer=useRef(null);

  const push = d => {
    clearTimeout(pushTimer.current);
    pushTimer.current=setTimeout(async()=>{
      const r=await pushServer(d);
      setSync(r.ok?"✓ Sauvegardé sur le serveur":r.pin?"Code requis":"Hors ligne · gardé sur le téléphone");
      if(r.pin) setNeedPin(true);
    },600);
  };
  const setData=d=>{ const nd={...d,updatedAt:Date.now()}; setDataRaw(nd); saveLocal(nd); push(nd); };

  // Au démarrage : on récupère la version du serveur et on garde la plus récente
  const pull = async()=>{
    const r=await pullServer();
    if(r.pin){ setNeedPin(true); return false; }
    if(!r.ok){ setSync("Hors ligne · gardé sur le téléphone"); return true; }
    const local=loadLocal()||{};
    if((r.data.updatedAt||0) > (local.updatedAt||0)){ const d={...EMPTY,...r.data}; setDataRaw(d); saveLocal(d); setSync("✓ Synchronisé"); }
    else if((local.updatedAt||0) > (r.data.updatedAt||0)){ push({...EMPTY,...local}); }
    else setSync("✓ Synchronisé");
    return true;
  };
  useEffect(()=>{ pull(); },[]);
  useEffect(()=>{ audio.voice = data.voice!==false; },[data.voice]);

  const [tab,setTab]=useState("home");
  const [flow,setFlow]=useState(null); // {stage, session, adapted, pain, minutes}
  const lastPain = (data.history||[]).slice(-1)[0]?.pain || 0;

  if(needPin) return <div className="app"><PinScreen error={pinErr} onOk={async v=>{ setPin(v); setPinErr(false); setNeedPin(false); const ok=await pull(); if(!ok){ setPinErr(true); } }}/></div>;

  let screen;
  if(flow?.stage==="check") screen=<PreCheck session={flow.session} week={data.week} onBack={()=>setFlow(null)} onGo={(adapted,pain)=>setFlow({...flow,stage:"run",adapted:adapted||lastPain>3,pain})}/>;
  else if(flow?.stage==="run") screen=<Runner session={flow.session} week={data.week} adapted={flow.adapted} onExit={()=>setFlow(null)} onFinish={m=>setFlow({...flow,stage:"done",minutes:m})}/>;
  else if(flow?.stage==="done") screen=<Finish session={flow.session} week={data.week} minutes={flow.minutes} adapted={flow.adapted} painBefore={flow.pain} onSave={e=>{ setData({...data,history:[...(data.history||[]),e]}); setFlow(null); setTab("home"); }}/>;
  else if(tab==="tests") screen=<Tests data={data} setData={setData}/>;
  else if(tab==="hist") screen=<History data={data}/>;
  else screen=<Home data={data} setData={setData} onPick={s=>setFlow({stage:"check",session:s})}/>;

  return <div className="app">
    {screen}
    {!flow && <div className="sync">{sync}</div>}
    {!flow && <div className="nav">
      <button className={tab==="home"?"on":""} onClick={()=>setTab("home")}><span className="ico">⚽</span>Séances</button>
      <button className={tab==="tests"?"on":""} onClick={()=>setTab("tests")}><span className="ico">⏱</span>Tests</button>
      <button className={tab==="hist"?"on":""} onClick={()=>setTab("hist")}><span className="ico">📈</span>Historique</button>
    </div>}
  </div>;
}

export default App;
