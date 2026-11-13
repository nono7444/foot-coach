import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { C, S } from "./theme";
import { initSound, sound } from "./sound";
import { loadLocal, saveLocal, loadServer, saveServer, pullServer, pushServer } from "./storage";
import { Home, Overview, Runner, Finish, Tests, History, Guide } from "./screens";

const EMPTY = { week: 1, history: [], tests: {}, voice: true, updatedAt: 0 };

function Main() {
  const insets = useSafeAreaInsets();
  const [data, setDataRaw] = useState(EMPTY);
  const [server, setServerRaw] = useState({ url: "", pin: "" });
  const [syncText, setSyncText] = useState("Sauvegarde sur l'iPhone uniquement");
  const [tab, setTab] = useState("home");
  const [flow, setFlow] = useState(null);
  const dataRef = useRef(data); dataRef.current = data;
  const serverRef = useRef(server); serverRef.current = server;
  const pushTimer = useRef(null);
  const scroll = useRef(null);
  const scrollTop = () => { try { scroll.current && scroll.current.scrollTo({ y: 0, animated: false }); } catch (e) {} };

  const push = (d, cfg = serverRef.current) => {
    if (!cfg.url) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      const r = await pushServer(cfg, d);
      setSyncText(r.ok ? "✓ Sauvegardé sur le serveur" : r.pin ? "Code d'accès incorrect" : "Serveur injoignable · gardé sur l'iPhone");
    }, 600);
  };
  const setData = (d) => { const nd = { ...d, updatedAt: Date.now() }; setDataRaw(nd); saveLocal(nd); push(nd); };

  const syncNow = async (cfg) => {
    if (!cfg.url) { setSyncText("Sauvegarde sur l'iPhone uniquement"); return; }
    setSyncText("Synchronisation…");
    const r = await pullServer(cfg);
    if (r.pin) { setSyncText("Code d'accès incorrect"); return; }
    if (!r.ok) { setSyncText("Serveur injoignable · gardé sur l'iPhone"); return; }
    const local = dataRef.current;
    if ((r.data.updatedAt || 0) > (local.updatedAt || 0)) { const d = { ...EMPTY, ...r.data }; setDataRaw(d); saveLocal(d); setSyncText("✓ Synchronisé avec le serveur"); }
    else if ((local.updatedAt || 0) > (r.data.updatedAt || 0)) push(local, cfg);
    else setSyncText("✓ Synchronisé avec le serveur");
  };
  const setServer = (c) => { setServerRaw(c); saveServer(c); };

  useEffect(() => {
    initSound();
    (async () => {
      const d = await loadLocal(); if (d) { setDataRaw({ ...EMPTY, ...d }); dataRef.current = { ...EMPTY, ...d }; }
      const s = await loadServer(); setServerRaw(s); serverRef.current = s;
      syncNow(s);
    })();
  }, []);
  useEffect(() => { sound.voice = data.voice !== false; }, [data.voice]);
  useEffect(() => { scrollTop(); }, [tab, flow && flow.stage]);

  const lastPain = (data.history || []).slice(-1)[0]?.pain || 0;
  const saveTestTimes = (times) => {
    const key = dataRef.current.week === 8 ? "s8" : "s1";
    const d = dataRef.current; const t = d.tests || {};
    setData({ ...d, tests: { ...t, [key]: { ...(t[key] || {}), nav: times } } });
  };

  let screen;
  if (flow?.stage === "overview") screen = <Overview session={flow.session} week={data.week} onBack={() => setFlow(null)} onGo={(adapted, pain) => setFlow({ ...flow, stage: "run", adapted: adapted || lastPain > 3, pain })} />;
  else if (flow?.stage === "run") screen = <Runner session={flow.session} week={data.week} adapted={flow.adapted} scrollTop={scrollTop} onTestTimes={saveTestTimes} onExit={() => setFlow(null)} onFinish={(m) => setFlow({ ...flow, stage: "done", minutes: m })} />;
  else if (flow?.stage === "done") screen = <Finish session={flow.session} week={data.week} minutes={flow.minutes} adapted={flow.adapted} painBefore={flow.pain} onSave={(e) => { const d = dataRef.current; setData({ ...d, history: [...(d.history || []), e] }); setFlow(null); setTab("home"); }} />;
  else if (tab === "tests") screen = <Tests data={data} setData={setData} />;
  else if (tab === "hist") screen = <History data={data} />;
  else if (tab === "guide") screen = <Guide server={server} setServer={setServer} syncText={syncText} onSyncNow={syncNow} />;
  else screen = <Home data={data} setData={setData} onPick={(s) => setFlow({ stage: "overview", session: s })} />;

  const tabs = [["home", "⚽", "Séances"], ["tests", "⏱", "Tests"], ["hist", "📈", "Historique"], ["guide", "📖", "Guide"]];
  return (
    <View style={S.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[S.pad, { paddingTop: insets.top + 8 }]} keyboardShouldPersistTaps="handled">
          {screen}
        </ScrollView>
      </KeyboardAvoidingView>
      {!flow && (
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: C.line, backgroundColor: "rgba(11,12,14,0.97)", paddingBottom: insets.bottom + 6, paddingTop: 6, paddingHorizontal: 6 }}>
          {tabs.map(([k, ico, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 12, backgroundColor: tab === k ? C.card : "transparent" }}>
              <Text style={{ fontSize: 20 }}>{ico}</Text>
              <Text style={{ color: tab === k ? C.acc : C.mut, fontWeight: "700", fontSize: 12, marginTop: 2 }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
