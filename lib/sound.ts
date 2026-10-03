let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    ctx ??= new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol = 0.15) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = c.currentTime + start;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur);
}

export const MUTE_KEY = "requiz:muted";
export function isMuted() {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function setMuted(m: boolean) {
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { }
}

export type Sfx = "miss" | "correct" | "lost" | "duplicate";

export function playSfx(kind: Sfx) {
    if (isMuted()) return;
    switch (kind) {
        case "miss":      // short low buzz
            tone(160, 0, 0.18, "sawtooth"); break;
        case "duplicate": // soft double blip
            tone(330, 0, 0.07, "square", 0.08);
            tone(330, 0.1, 0.07, "square", 0.08); break;
        case "correct":   // rising arpeggio
            tone(523, 0, 0.12, "triangle");
            tone(659, 0.1, 0.12, "triangle");
            tone(784, 0.2, 0.22, "triangle"); break;
        case "lost":      // falling sad tones
            tone(330, 0, 0.2, "sawtooth");
            tone(247, 0.2, 0.2, "sawtooth");
            tone(165, 0.4, 0.4, "sawtooth"); break;
    }
}