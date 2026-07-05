import { createAudioPlayer } from "expo-audio";

export type SfxName = "pop" | "thud" | "chime" | "zap" | "win";


const SOURCES: Record<SfxName, number> = {
  pop: require("../../assets/sfx/pop.wav"),
  thud: require("../../assets/sfx/thud.wav"),
  chime: require("../../assets/sfx/chime.wav"),
  zap: require("../../assets/sfx/zap.wav"),
  win: require("../../assets/sfx/win.wav")
};


type Player = ReturnType<typeof createAudioPlayer>;
const players = new Map<SfxName, Player>();

/**
 * Fire-and-forget arcade sound effects. Failures (autoplay policies,
 * missing audio output) must never affect gameplay.
 */
export function playSfx(name: SfxName, enabled: boolean): void {
  if (!enabled) {
    return;
  }
  try {
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      player.volume = 0.5;
      players.set(name, player);
    }
    void player.seekTo(0);
    player.play();
  } catch {
    // Sound is optional.
  }
}
