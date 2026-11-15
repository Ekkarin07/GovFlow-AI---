
import {
  verifyPassword,
  createSession,
  sessionCookie
} from "./auth";

interface LoginUser {
  id: string;
  email: string;
  password_hash: string;
}

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json"
};

function errorResponse(
  message: string,
  status: number
): Response {
  return Response.json(
    { error: message },
    { status, headers }
  );
}

async function rateLimitKey(
  request: Request,
  email: string
): Promise<string> {
  const ip =
    request.headers.get("CF-Connecting-IP") ??
    "unknown";

  const data = new TextEncoder().encode(
    `${ip.toLowerCase()}:${email}`
  );

  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function handleLogin(
  request: Request,
  db: D1Database,
  rateLimiter: RateLimit
): Promise<Response> {

  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const origin = request.headers.get("Origin");

  if (
    !origin ||
    origin !== new URL(request.url).origin
  ) {
    return errorResponse("Forbidden", 403);
  }

  const contentType =
    request.headers.get("Content-Type") ?? "";

  if (
    !contentType.toLowerCase()
      .startsWith("application/json")
  ) {
    return errorResponse(
      "Unsupported media type",
      415
    );
  }

  const contentLength =
    Number(request.headers.get("Content-Length"));

  if (
    contentLength > 4096
  ) {
    return errorResponse("Invalid request", 400);
  }

  const raw = await request.text();

if (new TextEncoder().encode(raw).byteLength > 4096) {
  return errorResponse("Invalid request", 400);
}

  let body: unknown;

  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (
  !body ||
  typeof body !== "object" ||
  Array.isArray(body) ||
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return errorResponse("Invalid request", 400);
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (
    !email ||
    email.length > 254 ||
    !email.includes("@") ||
    !password ||
    new TextEncoder().encode(password).length > 1024
  ) {
    return errorResponse("Invalid request", 400);
  }

  
  // Cloudflare account-level rate limiting
  const emailBytes = new TextEncoder().encode(email);
  const emailDigest = await crypto.subtle.digest(
    "SHA-256",
    emailBytes
  );

  const emailKey = Array.from(
    new Uint8Array(emailDigest)
  ).map(
    b => b.toString(16).padStart(2, "0")
  ).join("");

  const { success } = await rateLimiter.limit({
    key: `login:${emailKey}`
  });

  if (!success) {
    return new Response(
      JSON.stringify({
        error: "Too many login requests"
      }),
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": "60"
        }
      }
    );
  }

  const key = await rateLimitKey(request, email);
  const now = Math.floor(Date.now() / 1000);

  // Count attempts before checking credentials.
  const attempt = await db.prepare(
    `INSERT INTO auth_login_attempts
       (key, attempts, window_until)
     VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       attempts = CASE
         WHEN window_until <= ?
         THEN 1
         ELSE attempts + 1
       END,
       window_until = CASE
         WHEN window_until <= ?
         THEN ?
         ELSE window_until
       END
     RETURNING attempts`
  ).bind(
    key,
    now + WINDOW_SECONDS,
    now,
    now,
    now + WINDOW_SECONDS
  ).first<{ attempts: number }>();

  if (
    !attempt ||
    attempt.attempts > MAX_ATTEMPTS
  ) {
    return new Response(
      JSON.stringify({
        error: "Too many login attempts"
      }),
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(WINDOW_SECONDS)
        }
      }
    );
  }

  const user = await db.prepare(
    `SELECT id, email, password_hash
     FROM auth_users
     WHERE email = ?
       AND status = 'ACTIVE'
     LIMIT 1`
  ).bind(email).first<LoginUser>();

  const valid = user
    ? await verifyPassword(
        password,
        user.password_hash
      )
    : false;

  if (!valid || !user) {
    return errorResponse(
      "Invalid email or password",
      401
    );
  }

  const token = await createSession(db, user.id);

  await db.prepare(
    "DELETE FROM auth_login_attempts WHERE key = ?"
  ).bind(key).run();

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        ...headers,
        "Set-Cookie": sessionCookie(token)
      }
    }
  );
}
