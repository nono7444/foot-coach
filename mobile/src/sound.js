// Bips, voix et vibrations
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";

let short = null, long = null, ready = false;
export const sound = { voice: true };

export async function initSound() {
  if (ready) return;
  ready = true;
  try {
    // Les bips passent même en mode silencieux et baissent la musique au lieu de la couper
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" });
  } catch (e) {}
  try {
    short = createAudioPlayer(require("../assets/beep-short.wav"));
    long = createAudioPlayer(require("../assets/beep-long.wav"));
  } catch (e) {}
}

function play(p) {
  try { if (!p) return; p.seekTo(0); p.play(); } catch (e) {}
}

export function beep(isLong = false) {
  play(isLong ? long : short);
  try { Haptics.impactAsync(isLong ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
}

export function say(text) {
  if (!sound.voice) return;
  try { Speech.stop(); Speech.speak(text, { language: "fr-FR", rate: 1.0 }); } catch (e) {}
}
