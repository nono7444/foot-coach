import { StyleSheet } from "react-native";

export const C = {
  bg: "#0b0c0e",
  card: "#16181c",
  card2: "#1e2126",
  line: "#2a2e35",
  txt: "#f4f5f7",
  mut: "#9aa1ac",
  acc: "#c6ff3d",
  acc2: "#3dd6ff",
  warn: "#ffb03d",
  bad: "#ff5a5a",
};

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  h1: { color: C.txt, fontSize: 32, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.3 },
  h2: { color: C.txt, fontSize: 24, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.3 },
  h3: { color: C.txt, fontSize: 18, fontWeight: "800" },
  txt: { color: C.txt, fontSize: 16, lineHeight: 23 },
  mut: { color: C.mut, fontSize: 15, lineHeight: 21 },
  small: { color: C.mut, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 16, marginVertical: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: { justifyContent: "space-between" },
  secT: { color: C.acc, fontWeight: "800", fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  tag: { backgroundColor: C.card2, color: C.mut, fontWeight: "800", fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: "hidden", marginRight: 6 },
  tagAcc: { backgroundColor: "rgba(198,255,61,0.15)", color: C.acc },
  tagWarn: { backgroundColor: "rgba(255,176,61,0.15)", color: C.warn },
  bigNum: { color: C.txt, fontSize: 56, fontWeight: "900", textAlign: "center", fontVariant: ["tabular-nums"] },
});
