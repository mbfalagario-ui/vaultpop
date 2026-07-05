import { GAME_MODES } from "@/game/constants";
import type { GameModeId } from "@/game/models";

export function getModeDefinition(modeId: GameModeId) {
  return GAME_MODES.find((mode) => mode.id === modeId);
}
