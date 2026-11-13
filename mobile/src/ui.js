import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Svg, { Circle, SvgXml } from "react-native-svg";
import { C, S } from "./theme";
import { beep, say } from "./sound";
import { DIAGRAMS } from "./diagrams";

export const fmt = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60), r = s % 60; return m > 0 ? m + ":" + String(r).padStart(2, "0") : String(r); };
export const fmtMin = (sec) => Math.max(1, Math.round(sec / 60)) + " min";

export function useNow(ms = 150) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

export function Btn({ title, onPress, kind = "acc", style, big, disabled, small }) {
  const bg = kind === "acc" ? C.acc : kind === "bad" ? C.bad : kind === "ghost" ? "transparent" : C.card2;
  const fg = kind === "acc" ? "#0b0c0e" : C.txt;
  return (
    <Pressable disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ backgroundColor: bg, borderRadius: 14, paddingVertical: big ? 18 : small ? 9 : 14, paddingHorizontal: small ? 12 : 18, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : pressed ? 0.75 : 1, borderWidth: kind === "ghost" ? 1 : 0, borderColor: C.line }, style]}>
      <Text style={{ color: fg, fontWeight: "800", fontSize: big ? 19 : small ? 14 : 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }) { return <View style={[S.card, style]}>{children}</View>; }

export function Tag({ children, tone }) {
  return <Text style={[S.tag, tone === "acc" && S.tagAcc, tone === "warn" && S.tagWarn]}>{children}</Text>;
}

export function Section({ icon, title, items, ordered, tone }) {
  if (!items || !items.length) return null;
  return (
    <View style={{ marginTop: title ? 10 : 2 }}>
      {title ? <Text style={[S.secT, tone === "bad" && { color: C.bad }, tone === "info" && { color: C.acc2 }]}>{icon} {title}</Text> : null}
      {items.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", marginVertical: 3, paddingRight: 6 }}>
          <Text style={[S.txt, { width: 24, color: ordered ? C.acc : C.mut, fontWeight: "800" }]}>{ordered ? i + 1 + "." : "•"}</Text>
          <Text style={[S.txt, { flex: 1 }]}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

export function Diagram({ k }) {
  const { width } = useWindowDimensions();
  const xml = k && DIAGRAMS[k];
  if (!xml) return null;
  const m = xml.match(/viewBox="0 0 (\d+) (\d+)"/);
  const vw = m ? +m[1] : 400, vh = m ? +m[2] : 100;
  const w = Math.min(width - 48, 520);
  return (
    <View style={{ backgroundColor: "#f4f5f7", borderRadius: 14, padding: 8, marginVertical: 8, alignItems: "center" }}>
      <SvgXml xml={xml.replace(/width="\d+" height="\d+"/, "")} width={w - 16} height={((w - 16) * vh) / vw} />
    </View>
  );
}

export function Ring({ frac, color, children, size = 230 }) {
  const R = size / 2 - 12, Cc = 2 * Math.PI * R;
  const f = Math.max(0, Math.min(1, frac));
  return (
    <View style={{ width: size, height: size, alignSelf: "center", marginVertical: 10 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={R} stroke={C.card2} strokeWidth={14} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={R} stroke={color} strokeWidth={14} fill="none" strokeLinecap="round"
          strokeDasharray={`${Cc} ${Cc}`} strokeDashoffset={Cc * (1 - f)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}

/* Compte à rebours : bips 3-2-1, bip long à la fin, « dix secondes » à la voix */
export function Countdown({ seconds, onEnd, label, color = C.acc, controls = true }) {
  const [paused, setPaused] = useState(false);
  const endAt = useRef(Date.now() + seconds * 1000), left = useRef(seconds * 1000), beeped = useRef({}), ended = useRef(false);
  const now = useNow();
  const remMs = paused ? left.current : Math.max(0, endAt.current - now);
  const remS = Math.ceil(remMs / 1000);
  useEffect(() => {
    if (paused || ended.current) return;
    if (remMs <= 0) { ended.current = true; beep(true); onEnd && onEnd(); return; }
    if (seconds >= 40 && remS === 10 && !beeped.current.ten) { beeped.current.ten = 1; say("Dix secondes"); }
    if (remS <= 3 && remS >= 1 && !beeped.current[remS]) { beeped.current[remS] = 1; beep(false); }
  }, [now]);
  const toggle = () => { if (!paused) { left.current = remMs; setPaused(true); } else { endAt.current = Date.now() + left.current; setPaused(false); } };
  return (
    <View>
      <Ring frac={remMs / (seconds * 1000)} color={color}>
        <Text style={{ color: C.txt, fontSize: 72, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{fmt(remMs / 1000)}</Text>
        <Text style={{ color: C.mut, fontSize: 13, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>{paused ? "En pause" : label}</Text>
      </Ring>
      {controls && (
        <View style={[S.row, { justifyContent: "center" }]}>
          <Btn kind="ghost" title={paused ? "▶ Reprendre" : "⏸ Pause"} onPress={toggle} />
          <Btn kind="ghost" title="⏭ Passer" onPress={() => { ended.current = true; onEnd && onEnd(); }} />
        </View>
      )}
    </View>
  );
}

export function Elapsed({ label = "Temps de la série" }) {
  const t0 = useRef(Date.now()); const now = useNow(250);
  return (
    <View style={[S.row, { justifyContent: "center", marginVertical: 6 }]}>
      <Text style={S.small}>{label}</Text>
      <Text style={{ color: C.txt, fontSize: 28, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{fmt((now - t0.current) / 1000)}</Text>
    </View>
  );
}

/* Échelle 0-10 en boutons (douleur, difficulté) */
export function Scale({ value, onChange, min = 0, max = 10, danger }) {
  const vals = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {vals.map((v) => {
        const on = v === value;
        const col = danger ? (v >= 6 ? C.bad : v >= 4 ? C.warn : C.acc) : C.acc;
        return (
          <Pressable key={v} onPress={() => onChange(v)}
            style={{ width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: on ? col : C.card2, borderWidth: 1, borderColor: on ? col : C.line }}>
            <Text style={{ color: on ? "#0b0c0e" : C.txt, fontWeight: "800", fontSize: 16 }}>{v}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Alert({ tone = "ok", children }) {
  const col = tone === "bad" ? C.bad : tone === "warn" ? C.warn : C.acc;
  return (
    <View style={{ borderWidth: 1, borderColor: col, backgroundColor: col + "1f", borderRadius: 14, padding: 12, marginVertical: 8 }}>
      <Text style={[S.txt, { fontSize: 15 }]}>{children}</Text>
    </View>
  );
}
