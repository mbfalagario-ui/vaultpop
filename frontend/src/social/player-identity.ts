import { clientStorage } from "@/storage/client-storage";

const HANDLE_KEY = "vaultpop.player.handle";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function getPlayerHandle(): string {
  const existing = clientStorage.get<string>(HANDLE_KEY, "");
  if (existing) {
    return existing;
  }
  let suffix = "";
  for (let index = 0; index < 4; index += 1) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  const handle = `Vault-${suffix}`;
  clientStorage.set(HANDLE_KEY, handle);
  return handle;
}
