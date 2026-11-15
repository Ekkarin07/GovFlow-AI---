
/**
 * GovFlow AI - Authentication utilities
 * Cloudflare Workers + D1
 *
 * No public login routes are enabled here.
 */

const ITERATIONS = 600_000;
const SESSION_SECONDS = 60 * 60 * 8;
const COOKIE_NAME = "govflow_session";

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
    throw new Error("Invalid hex");
  }

  return new Uint8Array(
    hex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const result = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: Uint8Array.from(salt),
      iterations
    },
    key,
    256
  );

  return toHex(new Uint8Array(result));
}

export async function hashPassword(
  password: string
): Promise<string> {
  if (
    password.length < 12 ||
    encoder.encode(password).length > 1024
  ) {
    throw new Error("Invalid password length");
  }

  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const hash = await derivePassword(
    password,
    salt,
    ITERATIONS
  );

  return [
    "pbkdf2-sha256",
    ITERATIONS,
    toHex(salt),
    hash
  ].join(":");
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (encoder.encode(password).length > 1024) {
    return false;
  }

  const parts = storedHash.split(":");

  if (
    parts.length !== 4 ||
    parts[0] !== "pbkdf2-sha256" ||
    Number(parts[1]) !== ITERATIONS ||
    !/^[0-9a-f]{32}$/i.test(parts[2]) ||
    !/^[0-9a-f]{64}$/i.test(parts[3])
  ) {
    return false;
  }

  const actual = await derivePassword(
    password,
    fromHex(parts[2]),
    ITERATIONS
  );

  // Compare all bytes, without early exit.
  const a = fromHex(actual);
  const b = fromHex(parts[3]);
  let difference = 0;

  for (let i = 0; i < a.length; i++) {
    difference |= a[i] ^ b[i];
  }

  return difference === 0;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(token)
  );

  return toHex(new Uint8Array(digest));
}

export async function createSession(
  db: D1Database,
  userId: string
): Promise<string> {
  const token = toHex(
    crypto.getRandomValues(new Uint8Array(32))
  );

  const expiresAt = new Date(
    Date.now() + SESSION_SECONDS * 1000
  ).toISOString();

  await db.prepare(
    `INSERT INTO auth_sessions
     (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    userId,
    await hashToken(token),
    expiresAt
  ).run();

  return token;
}

export function sessionCookie(
  token: string
): string {
  return [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_SECONDS}`
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    `${COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0"
  ].join("; ");
}

export function readSessionCookie(
  request: Request
): string | null {
  const cookie = request.headers.get("Cookie") ?? "";

  const entry = cookie.split(";").map(
    (part) => part.trim()
  ).find(
    (part) => part.startsWith(`${COOKIE_NAME}=`)
  );

  const token = entry?.slice(COOKIE_NAME.length + 1);

  return token && /^[0-9a-f]{64}$/i.test(token)
    ? token
    : null;
}

export async function getSessionUser(
  db: D1Database,
  token: string
): Promise<{
  id: string;
  email: string;
  display_name: string;
  role: string;
} | null> {
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return null;
  }

  return db.prepare(
    `SELECT u.id, u.email, u.display_name, u.role
     FROM auth_sessions s
     JOIN auth_users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND s.expires_at > ?
       AND u.status = 'ACTIVE'
     LIMIT 1`
  ).bind(
    await hashToken(token),
    new Date().toISOString()
  ).first();
}

export async function revokeSession(
  db: D1Database,
  token: string
): Promise<void> {
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return;
  }

  await db.prepare(
    "DELETE FROM auth_sessions WHERE token_hash = ?"
  ).bind(await hashToken(token)).run();
}
