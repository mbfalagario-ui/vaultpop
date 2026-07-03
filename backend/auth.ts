import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from "node:crypto";

const PASSWORD_KEY_BYTES = 64;

export function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex")
): { passwordHash: string; passwordSalt: string } {
  validatePassword(password);
  return {
    passwordHash: scryptSync(password, salt, PASSWORD_KEY_BYTES).toString("hex"),
    passwordSalt: salt
  };
}

export function verifyPassword(
  password: string,
  passwordHash: string,
  passwordSalt: string
): boolean {
  try {
    const expected = Buffer.from(passwordHash, "hex");
    const actual = scryptSync(password, passwordSalt, expected.length);
    return expected.length > 0 && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function validatePassword(password: string): void {
  if (password.length < 12 || password.length > 200) {
    throw new Error("Password must be between 12 and 200 characters.");
  }
}
